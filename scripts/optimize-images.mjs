/**
 * Génération des images servies, à partir des originaux.
 *
 * Les rendus du configurateur sont livrés en 3840x2160 JPEG, jusqu'à 1,6 Mo
 * pièce, alors qu'ils s'affichent en 100vw/100vh — et qu'ils sont rechargés à
 * chaque changement d'option. C'est le premier poste d'empreinte du site.
 *
 * Les originaux vivent dans `assets-source/` (hors du dossier servi) et ne sont
 * jamais publiés. Ce script en dérive des variantes AVIF et WebP à deux
 * largeurs, plus un JPEG de repli.
 *
 *   node scripts/optimize-images.mjs            génère ce qui manque
 *   node scripts/optimize-images.mjs --force    régénère tout
 */
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const SOURCE = path.join(ROOT, 'assets-source/images')
const OUTPUT = path.join(ROOT, 'public/assets/images')

/** Largeurs générées. La plus grande couvre un plein écran desktop. */
const WIDTHS = [960, 1920]

/** Largeur unique du repli JPEG, pour les navigateurs sans AVIF ni WebP. */
const FALLBACK_WIDTH = 1440

const FORCE = process.argv.includes('--force')

const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png'])

/** Parcourt récursivement un dossier et renvoie les fichiers image. */
async function walk(dir) {
    const found = []

    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            found.push(...(await walk(full)))
        } else if (SOURCE_EXT.has(path.extname(entry.name).toLowerCase())) {
            found.push(full)
        }
    }

    return found
}

/** Écrit un fichier seulement s'il manque, sauf en --force. */
async function emit(target, produce) {
    if (!FORCE && existsSync(target)) {
        return (await stat(target)).size
    }

    await mkdir(path.dirname(target), { recursive: true })
    const buffer = await produce()
    await writeFile(target, buffer)

    return buffer.length
}

async function main() {
    if (!existsSync(SOURCE)) {
        console.error(`Dossier source introuvable : ${SOURCE}`)
        console.error('Déplacer les originaux avec : mv public/assets/images assets-source/images')
        process.exit(1)
    }

    const files = await walk(SOURCE)
    console.log(`${files.length} image(s) source à traiter\n`)

    let sourceBytes = 0
    let outputBytes = 0
    let done = 0

    for (const file of files) {
        const relative = path.relative(SOURCE, file)
        const base = path.join(OUTPUT, relative).replace(/\.(jpe?g|png)$/i, '')

        sourceBytes += (await stat(file)).size

        const image = sharp(file)
        const { width: sourceWidth } = await image.metadata()

        for (const width of WIDTHS) {
            // Ne jamais agrandir : une source plus petite reste à sa taille.
            const target = Math.min(width, sourceWidth || width)
            const suffix = width === WIDTHS.at(-1) ? '' : `@${width}`

            outputBytes += await emit(`${base}${suffix}.avif`, () =>
                sharp(file).resize({ width: target }).avif({ quality: 55, effort: 6 }).toBuffer()
            )

            outputBytes += await emit(`${base}${suffix}.webp`, () =>
                sharp(file).resize({ width: target }).webp({ quality: 72 }).toBuffer()
            )
        }

        outputBytes += await emit(`${base}.jpg`, () =>
            sharp(file)
                .resize({ width: Math.min(FALLBACK_WIDTH, sourceWidth || FALLBACK_WIDTH) })
                .jpeg({ quality: 74, mozjpeg: true })
                .toBuffer()
        )

        done += 1
        if (done % 25 === 0 || done === files.length) {
            process.stdout.write(`\r  ${done}/${files.length}`)
        }
    }

    const mo = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} Mo`
    console.log('\n')
    console.log(`sources : ${mo(sourceBytes)}`)
    console.log(`servi   : ${mo(outputBytes)}`)
    console.log(`gain    : facteur ${(sourceBytes / outputBytes).toFixed(1)}`)
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
