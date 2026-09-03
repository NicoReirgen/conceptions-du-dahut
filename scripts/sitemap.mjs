/**
 * Sitemap du site généré.
 *
 * Les moteurs découvrent le site par ses liens, ce qui suffit pour vingt-huit
 * pages toutes reliées entre elles. Le sitemap sert à autre chose : il dit
 * quelles adresses sont canoniques, et signale une page dès sa publication
 * plutôt qu'au prochain passage du robot.
 *
 * Il est dérivé de la **sortie**, pas de WordPress : ce qui est publié fait foi,
 * et ce fichier reste juste même si le contenu a bougé depuis la capture d'un
 * instantané.
 *
 * `robots.txt` est complété au passage : un sitemap que rien n'annonce n'est
 * trouvé que par chance.
 *
 *   node scripts/sitemap.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SORTIE = path.join(ROOT, '.output/public')

/** Origine publique, sans barre finale. */
const ORIGINE = (process.env.NUXT_SITE_URL || 'https://nicoreirgen.github.io').replace(/\/+$/, '')

/** Sous-chemin de publication, aligné sur celui du build. */
const BASE = (process.env.NUXT_APP_BASE_URL || '/').replace(/\/+$/, '')

/** Les routes réellement écrites, en chemins. */
async function routes(dossier = SORTIE, prefixe = '') {
    const trouvees = []

    for (const entree of await readdir(dossier, { withFileTypes: true })) {
        // Les dossiers techniques ne sont pas des pages.
        if (entree.name.startsWith('_') || ['media', 'assets'].includes(entree.name)) {
            continue
        }

        if (entree.isDirectory()) {
            trouvees.push(...(await routes(path.join(dossier, entree.name), `${prefixe}/${entree.name}`)))
        } else if (entree.name === 'index.html') {
            trouvees.push(prefixe || '/')
        }
    }

    return trouvees
}

async function main() {
    if (!existsSync(SORTIE)) {
        console.error(`Aucune sortie dans ${SORTIE}. Lancer d'abord : npm run generate`)
        process.exit(1)
    }

    const chemins = (await routes()).sort()

    const urls = chemins
        .map((chemin) => `${ORIGINE}${BASE}${chemin === '/' ? '/' : chemin}`)
        .map((url) => `    <url>\n        <loc>${url}</loc>\n    </url>`)
        .join('\n')

    await writeFile(
        path.join(SORTIE, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    )

    const robots = path.join(SORTIE, 'robots.txt')
    const contenu = existsSync(robots) ? await readFile(robots, 'utf-8') : 'User-Agent: *\nDisallow:\n'
    const annonce = `Sitemap: ${ORIGINE}${BASE}/sitemap.xml`

    if (!contenu.includes('Sitemap:')) {
        await writeFile(robots, `${contenu.trimEnd()}\n\n${annonce}\n`)
    }

    console.log(`sitemap.xml : ${chemins.length} adresses, annoncées dans robots.txt`)
}

main().catch((erreur) => {
    console.error(erreur.message)
    process.exit(1)
})
