/**
 * Les fichiers qu'une page réclame et qui n'existent pas à côté d'elle.
 *
 * Une variante d'image absente ne se voit pas à la lecture du code : le
 * navigateur retient la <source> qui lui convient, et une <source> en échec ne
 * retombe pas sur le <img>. L'image disparaît, sans rien dans la console du
 * build. Ce contrôle a révélé 22 variantes proposées mais jamais produites — un
 * filtre de largeurs qui ne répétait pas la règle de `fetch-media.mjs`.
 *
 * Un script absent est plus grave encore : la page ne démarre pas. Le 404.html
 * publié a désigné pendant deux mises en ligne des scripts effacés par la
 * construction en cours — toute adresse inconnue restait blanche.
 *
 * Le contrôle porte donc sur un dossier, quel qu'il soit : `verify-build`
 * l'applique à la sortie, la publication à la copie qui part en ligne. Les deux
 * peuvent différer, et c'est la seconde qui est servie.
 *
 *   node scripts/references-manquantes.mjs .output/public
 */
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

/** Toutes les pages HTML d'un dossier. */
export async function pagesHtml(dossier) {
    const fichiers = []

    for (const entree of await readdir(dossier, { withFileTypes: true })) {
        // Un worktree git porte son propre dossier de suivi : ce ne sont pas des pages.
        if (entree.name === '.git') {
            continue
        }

        const complet = path.join(dossier, entree.name)

        if (entree.isDirectory()) {
            fichiers.push(...(await pagesHtml(complet)))
        } else if (entree.name.endsWith('.html')) {
            fichiers.push(complet)
        }
    }

    return fichiers
}

/**
 * Les références mortes d'un dossier, par URL, avec les pages qui les portent.
 *
 * `base` est le sous-chemin de publication : les fichiers sont écrits à la
 * racine dans tous les cas, seuls les liens du HTML le portent.
 */
export async function referencesManquantes(racine, base = '') {
    const prefixe = base.replace(/\/+$/, '')

    const sansBase = (href) => {
        if (!prefixe) return href
        if (href === prefixe) return '/'

        return href.startsWith(`${prefixe}/`) ? href.slice(prefixe.length) : href
    }

    const absentes = new Map()

    for (const page of await pagesHtml(racine)) {
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

            // Sans extension, c'est une page : elle relève d'un autre contrôle.
            if (!/\.[a-z0-9]{2,5}$/i.test(url)) {
                continue
            }

            if (!existsSync(path.join(racine, sansBase(url).replace(/^\//, '')))) {
                if (!absentes.has(url)) {
                    absentes.set(url, new Set())
                }
                absentes.get(url).add(path.relative(racine, page))
            }
        }
    }

    return absentes
}

/** Rend compte des manquants et rend vrai si le dossier se tient. */
export function rendreCompte(absentes, racine) {
    if (!absentes.size) {
        return true
    }

    console.error(`ÉCHEC : ${absentes.size} fichier(s) référencé(s) mais absent(s) de ${racine} :`)

    for (const [url, sources] of [...absentes].slice(0, 10)) {
        console.error(`  ${url}  ←  ${[...sources].slice(0, 3).join(', ')}`)
    }
    if (absentes.size > 10) {
        console.error(`  … et ${absentes.size - 10} autre(s)`)
    }

    return false
}

// Appelé directement : le dossier en argument, le sous-chemin dans l'environnement.
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
    const racine = process.argv[2]

    if (!racine || !existsSync(racine)) {
        console.error('Quel dossier vérifier ?  node scripts/references-manquantes.mjs .output/public')
        process.exit(1)
    }

    const absentes = await referencesManquantes(racine, process.env.NUXT_APP_BASE_URL || '')

    if (!rendreCompte(absentes, racine)) {
        process.exit(1)
    }

    console.log(`  ${(await pagesHtml(racine)).length} pages relues, tous leurs fichiers présents`)
}
