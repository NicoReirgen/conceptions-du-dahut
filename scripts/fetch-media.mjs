/**
 * Rapatriement et optimisation des médias WordPress, au build.
 *
 * En développement, /media/* est relayé à la volée vers WordPress. En
 * production ce relais n'existe pas : le site est statique et ne doit
 * dépendre d'aucun serveur WordPress au runtime.
 *
 * Ce script parcourt les routes exposées par le mu-plugin, collecte tous les
 * médias réellement référencés — et rien d'autre : les uploads pèsent 742 Mo,
 * dont l'essentiel n'est jamais affiché — puis les télécharge et en dérive des
 * variantes AVIF et WebP.
 *
 *   node scripts/fetch-media.mjs            télécharge ce qui manque
 *   node scripts/fetch-media.mjs --force    régénère tout
 */
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { demanderAWordPress } from './wordpress-injoignable.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUTPUT = path.join(ROOT, 'public/media')

const WP_BASE = (process.env.NUXT_PUBLIC_WP_BASE_URL || 'http://les-conceptions-du-dahut.withni.local')
    .replace(/\/+$/, '')
const API = `${WP_BASE}/wp-json/dahut/v1`

const FORCE = process.argv.includes('--force')

/** Largeurs générées pour les images éditoriales. */
const WIDTHS = [640, 1280, 1920]

const RASTER = /\.(jpe?g|png)$/i

/** Récupère du JSON en signalant clairement une API injoignable. */
const json = (url) => demanderAWordPress(url)

/**
 * Parcourt une structure et collecte tous les chemins `src` de médias.
 * Les médias sont imbriqués à des profondeurs très variables (galeries,
 * répéteurs, contenus flexibles) : un parcours générique évite d'avoir à
 * connaître chaque champ.
 */
function collectMedia(node, found = new Set()) {
    if (!node || typeof node !== 'object') {
        return found
    }

    if (Array.isArray(node)) {
        node.forEach((item) => collectMedia(item, found))
        return found
    }

    if (typeof node.src === 'string' && node.src.startsWith('/media/')) {
        found.add(node.src)
    }

    /*
       Les déclinaisons de WordPress — `sizes.medium`, `sizes.large`, et les
       quatre autres — ne sont servies nulle part : le site ne lit que le `src`
       principal, et fabrique ses propres variantes en AVIF et WebP. Les
       rapatrier revenait à télécharger six fichiers par photo pour n'en
       utiliser qu'un, puis à décliner les cinq autres à leur tour.

       Sur les 174 photos des réalisations, cela faisait plus de mille fichiers
       et 240 Mo de sortie. Le garde-fou est en aval : `verify-build` échoue si
       une page réclame un fichier absent — si une taille WordPress venait à
       être utilisée un jour, le build le dirait.
    */
    Object.entries(node).forEach(([cle, valeur]) => {
        if (cle !== 'sizes') {
            collectMedia(valeur, found)
        }
    })

    return found
}

async function main() {
    console.log(`Source WordPress : ${WP_BASE}\n`)

    const { routes } = await json(`${API}/routes`)
    const media = new Set()

    // Les données transverses (logos partenaires, logo du pied de page).
    collectMedia(await json(`${API}/bootstrap`), media)

    for (const route of routes) {
        if (route.type === 'app') {
            continue
        }

        try {
            collectMedia(await json(`${API}/content?path=${encodeURIComponent(route.path)}`), media)
        } catch (error) {
            console.warn(`  ignoré ${route.path} : ${error.message}`)
        }
    }

    console.log(`${media.size} média(s) référencé(s) sur ${routes.length} route(s)\n`)

    let downloaded = 0
    let sourceBytes = 0
    let outputBytes = 0

    for (const src of media) {
        const relative = src.replace(/^\/media\//, '')
        const target = path.join(OUTPUT, relative)

        if (!FORCE && existsSync(target)) {
            outputBytes += (await stat(target)).size
            continue
        }

        const upstream = `${WP_BASE}/wp-content/uploads/${relative}`
        const response = await fetch(upstream)

        if (!response.ok) {
            console.warn(`  absent ${relative} (${response.status})`)
            continue
        }

        const buffer = Buffer.from(await response.arrayBuffer())
        sourceBytes += buffer.length

        await mkdir(path.dirname(target), { recursive: true })

        if (!RASTER.test(relative)) {
            // SVG, vidéos, PDF : recopiés tels quels, sans réencodage.
            await writeFile(target, buffer)
            outputBytes += buffer.length
            downloaded += 1
            continue
        }

        const base = target.replace(RASTER, '')
        const { width: sourceWidth } = await sharp(buffer).metadata()

        for (const width of WIDTHS) {
            if (sourceWidth && width > sourceWidth && width !== WIDTHS[0]) {
                continue
            }

            const resize = { width: Math.min(width, sourceWidth || width) }
            const suffix = `@${width}`

            const avif = await sharp(buffer).resize(resize).avif({ quality: 55, effort: 5 }).toBuffer()
            await writeFile(`${base}${suffix}.avif`, avif)

            const webp = await sharp(buffer).resize(resize).webp({ quality: 74 }).toBuffer()
            await writeFile(`${base}${suffix}.webp`, webp)

            outputBytes += avif.length + webp.length
        }

        // Repli conservant l'extension d'origine, celle que renvoie l'API.
        const fallback = await sharp(buffer)
            .resize({ width: Math.min(1280, sourceWidth || 1280) })
            .jpeg({ quality: 76, mozjpeg: true })
            .toBuffer()

        await writeFile(target, fallback)
        outputBytes += fallback.length

        downloaded += 1
        process.stdout.write(`\r  ${downloaded}/${media.size}`)
    }

    const mo = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} Mo`
    console.log('\n')
    console.log(`téléchargés : ${downloaded}`)
    if (sourceBytes) {
        console.log(`sources     : ${mo(sourceBytes)}`)
        console.log(`servi       : ${mo(outputBytes)}`)
        console.log(`gain        : facteur ${(sourceBytes / outputBytes).toFixed(1)}`)
    }
}

main().catch((error) => {
    console.error(`\nÉchec : ${error.message}`)
    console.error('WordPress est-il démarré ? (Local by Flywheel)')
    process.exit(1)
})
