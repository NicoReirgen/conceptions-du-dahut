/**
 * Vérification du site généré.
 *
 * Le prérendu n'échoue pas sur un lien mort saisi dans WordPress : ce serait
 * bloquer un déploiement pour un problème de contenu. La garantie est donc ici.
 *
 * Deux contrôles :
 *   — toute route déclarée par l'API a bien produit une page (sinon, échec) ;
 *   — les liens internes qui ne mènent nulle part sont listés (sans échec).
 *
 *   node scripts/verify-build.mjs
 */
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { readdir } from 'node:fs/promises'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUTPUT = path.join(ROOT, '.output/public')

const WP_BASE = (process.env.NUXT_PUBLIC_WP_BASE_URL || 'http://les-conceptions-du-dahut.withni.local')
    .replace(/\/+$/, '')

/** Chemin du fichier HTML attendu pour une route. */
const fileFor = (route) =>
    route === '/'
        ? path.join(OUTPUT, 'index.html')
        : path.join(OUTPUT, route.replace(/^\//, ''), 'index.html')

/** Toutes les pages générées, en chemins de route. */
async function generatedRoutes(dir = OUTPUT, prefix = '') {
    const routes = new Set()

    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('_') || entry.name === 'media' || entry.name === 'assets') {
            continue
        }

        const full = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            for (const nested of await generatedRoutes(full, `${prefix}/${entry.name}`)) {
                routes.add(nested)
            }
        } else if (entry.name === 'index.html') {
            routes.add(prefix || '/')
        }
    }

    return routes
}

async function main() {
    if (!existsSync(OUTPUT)) {
        console.error(`Aucune sortie dans ${OUTPUT}. Lancer d'abord : npm run generate`)
        process.exit(1)
    }

    const response = await fetch(`${WP_BASE}/wp-json/dahut/v1/routes`)
    const { routes } = await response.json()

    const declared = routes.map((route) => route.path)
    const missing = []

    for (const route of declared) {
        try {
            await stat(fileFor(route))
        } catch {
            missing.push(route)
        }
    }

    console.log(`${declared.length} route(s) déclarée(s) par WordPress`)
    console.log(`${declared.length - missing.length} générée(s)\n`)

    // --- Liens internes morts, révélés par le contenu rédactionnel
    const built = await generatedRoutes()
    const broken = new Map()

    for (const route of declared) {
        const file = fileFor(route)
        if (!existsSync(file)) {
            continue
        }

        const html = await readFile(file, 'utf-8')
        const hrefs = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((match) => match[1])

        for (const href of new Set(hrefs)) {
            const target = href.replace(/\/$/, '') || '/'

            // Les fichiers servis directement (médias, polices) ne sont pas des pages.
            if (/\.[a-z0-9]{2,5}$/i.test(target) || target.startsWith('/media/') || target.startsWith('/assets/')) {
                continue
            }

            if (!built.has(target)) {
                if (!broken.has(target)) {
                    broken.set(target, new Set())
                }
                broken.get(target).add(route)
            }
        }
    }

    if (broken.size) {
        console.warn(`${broken.size} lien(s) interne(s) mort(s) — à corriger dans WordPress :`)
        for (const [target, sources] of broken) {
            console.warn(`  ${target}  ←  ${[...sources].join(', ')}`)
        }
        console.warn('')
    }

    if (missing.length) {
        console.error(`ÉCHEC : ${missing.length} route(s) déclarée(s) non générée(s) :`)
        missing.forEach((route) => console.error(`  ${route}`))
        process.exit(1)
    }

    console.log('Toutes les routes déclarées ont été générées.')
}

main().catch((error) => {
    console.error(error.message)
    process.exit(1)
})
