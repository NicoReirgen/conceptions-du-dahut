/**
 * Vérification du site généré.
 *
 * Le prérendu n'échoue pas sur un lien mort saisi dans WordPress : ce serait
 * bloquer un déploiement pour un problème de contenu. La garantie est donc ici.
 *
 * Trois contrôles :
 *   — toute route déclarée par l'API a bien produit une page (sinon, échec) ;
 *   — les liens internes qui ne mènent nulle part sont listés (sans échec) ;
 *   — tout fichier référencé par une page existe (sinon, échec).
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

/*
   Sous-chemin de publication : « /dahut » sur GitHub Pages, vide à la racine.
   Les fichiers sont écrits à la racine de la sortie dans les deux cas — seuls
   les liens du HTML portent le préfixe. Sans le retirer avant comparaison,
   chaque lien du site passerait pour mort.
*/
const BASE = (process.env.NUXT_APP_BASE_URL || '/').replace(/\/+$/, '')

/** Le chemin d'un lien, ramené à la racine du site. */
const sansBase = (href) => {
    if (!BASE) {
        return href
    }
    if (href === BASE) {
        return '/'
    }

    return href.startsWith(`${BASE}/`) ? href.slice(BASE.length) : href
}

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

/** Toutes les pages HTML écrites dans la sortie. */
async function htmlFiles(dir = OUTPUT) {
    const fichiers = []

    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            fichiers.push(...(await htmlFiles(full)))
        } else if (entry.name.endsWith('.html')) {
            fichiers.push(full)
        }
    }

    return fichiers
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
            const target = sansBase(href).replace(/\/$/, '') || '/'

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

    // --- Ressources référencées : images, polices, vidéos, feuilles de style
    /*
       Une variante d'image absente ne se voit pas à la lecture du code : le
       navigateur retient la <source> qui lui convient, et une <source> en échec
       ne retombe pas sur le <img>. L'image disparaît, sans rien dans la console
       du build. Ce contrôle a révélé 22 variantes proposées mais jamais
       produites — un filtre de largeurs qui ne répétait pas la règle de
       `fetch-media.mjs`.

       Il échoue aussi, volontairement, quand les assets n'ont pas été préparés :
       `npm run assets` avant `npm run generate`.
    */
    const pages = await htmlFiles()
    const absentes = new Map()

    for (const page of pages) {
        const html = await readFile(page, 'utf-8')
        const references = new Set()

        for (const [, url] of html.matchAll(/(?:src|href|content)="(\/[^"]+)"/g)) {
            references.add(url)
        }
        for (const [, liste] of html.matchAll(/srcset="([^"]+)"/g)) {
            for (const candidat of liste.split(',')) {
                const url = candidat.trim().split(' ')[0]
                if (url.startsWith('/')) {
                    references.add(url)
                }
            }
        }

        for (const reference of references) {
            const url = reference.split('?')[0].split('#')[0]

            // Sans extension, c'est une page : déjà traitée au-dessus.
            if (!/\.[a-z0-9]{2,5}$/i.test(url)) {
                continue
            }

            const fichier = path.join(OUTPUT, sansBase(url).replace(/^\//, ''))

            if (!existsSync(fichier)) {
                if (!absentes.has(url)) {
                    absentes.set(url, new Set())
                }
                absentes.get(url).add(path.relative(OUTPUT, page))
            }
        }
    }

    if (absentes.size) {
        console.error(`ÉCHEC : ${absentes.size} fichier(s) référencé(s) mais absent(s) de la sortie :`)
        for (const [url, sources] of [...absentes].slice(0, 10)) {
            console.error(`  ${url}  ←  ${[...sources].slice(0, 3).join(', ')}`)
        }
        if (absentes.size > 10) {
            console.error(`  … et ${absentes.size - 10} autre(s)`)
        }
        console.error('\nLes assets ont-ils été préparés ? npm run assets')
        process.exit(1)
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
