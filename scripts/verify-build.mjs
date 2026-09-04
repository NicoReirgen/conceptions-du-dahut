/**
 * Vérification du site généré.
 *
 * Le prérendu n'échoue pas sur un lien mort saisi dans WordPress : ce serait
 * bloquer un déploiement pour un problème de contenu. La garantie est donc ici.
 *
 * Quatre contrôles :
 *   — toute route déclarée par l'API a bien produit une page (sinon, échec) ;
 *   — les liens internes qui ne mènent nulle part sont listés (sans échec) ;
 *   — tout fichier référencé par une page existe (sinon, échec) ;
 *   — le sprite des partenaires est à jour (sinon, échec).
 *
 *   node scripts/verify-build.mjs
 */
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { pagesHtml, referencesManquantes, rendreCompte } from './references-manquantes.mjs'

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

    // --- Ressources référencées : images, polices, vidéos, scripts, feuilles de style
    /*
       Le même contrôle sert deux fois : ici sur la sortie, et à la publication
       sur la copie qui part en ligne. Les deux ont divergé une fois, et c'est la
       copie qui est servie.

       Il échoue aussi, volontairement, quand les assets n'ont pas été préparés :
       `npm run assets` avant `npm run generate`.
    */
    if (!rendreCompte(await referencesManquantes(OUTPUT, BASE), OUTPUT)) {
        console.error('\nLes assets ont-ils été préparés ? npm run assets')
        process.exit(1)
    }

    if (missing.length) {
        console.error(`ÉCHEC : ${missing.length} route(s) déclarée(s) non générée(s) :`)
        missing.forEach((route) => console.error(`  ${route}`))
        process.exit(1)
    }

    // --- Sprite des partenaires
    /*
       Le bandeau du pied de page n'affiche plus treize images mais une seule,
       composée au build. Un partenaire ajouté dans WordPress n'y apparaîtrait
       donc pas, et rien ne le signalerait : la bande resterait belle, et fausse.
    */
    const { options } = await (await fetch(`${WP_BASE}/wp-json/dahut/v1/bootstrap`)).json()
    const declares = (options?.logos_des_partenaires || []).map(
        (logo) => logo.alt || logo.title || ''
    )
    const composes = JSON.parse(
        await readFile(path.join(ROOT, 'app/data/partenaires-sprite.json'), 'utf-8')
    ).partenaires

    if (declares.join('|') !== composes.join('|')) {
        console.error('ÉCHEC : le sprite des partenaires ne correspond plus à WordPress.')
        console.error(`  WordPress : ${declares.join(', ') || '(aucun)'}`)
        console.error(`  sprite    : ${composes.join(', ') || '(aucun)'}`)
        console.error('\nLe régénérer : npm run sprite')
        process.exit(1)
    }

    // --- Aucune adresse de machine dans la sortie
    /*
       Le build grave l'origine WordPress dans sa configuration publique. Celle
       du serveur de rejeu — `127.0.0.1` — s'y est retrouvée le 4 septembre
       2026 : les pages publiées désignaient une adresse locale, chez le
       visiteur. Le mode rejeu la remet en place après coup ; ce contrôle
       vérifie qu'il l'a fait.
    */
    const locales = new Set()

    for (const page of await pagesHtml(OUTPUT)) {
        for (const [, adresse] of (await readFile(page, 'utf-8')).matchAll(
            /(https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?)/g
        )) {
            locales.add(adresse)
        }
    }

    if (locales.size) {
        console.error(`ÉCHEC : la sortie désigne une adresse locale : ${[...locales].join(', ')}`)
        process.exit(1)
    }

    console.log('Toutes les routes déclarées ont été générées.')
}

main().catch((error) => {
    console.error(error.message)
    process.exit(1)
})
