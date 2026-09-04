/**
 * Remet l'origine WordPress réelle dans la sortie construite.
 *
 * Nuxt grave l'origine de son `runtimeConfig.public` dans les pages : celle qui
 * a servi à construire. En mode rejeu, cette origine est le serveur temporaire
 * de `wordpress-instantane.mjs` — `http://127.0.0.1:4010`. Publiée telle
 * quelle, elle désignerait une adresse locale chez le visiteur.
 *
 * Ce passage n'a lieu que si les deux variables sont posées, ce que fait le
 * mode rejeu et lui seul : un build ordinaire traverse ce script sans rien
 * changer.
 *
 * Il se place après `nuxt generate` et avant `verify-build`, qui refuse une
 * sortie contenant une adresse locale.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SORTIE = path.join(ROOT, '.output/public')

const REMPLACEE = process.env.DAHUT_ORIGINE_REJEU
const REELLE = process.env.DAHUT_ORIGINE_REELLE

if (!REMPLACEE || !REELLE || !existsSync(SORTIE)) {
    process.exit(0)
}

let touches = 0

async function parcourir(dossier) {
    for (const entree of await readdir(dossier, { withFileTypes: true })) {
        const complet = path.join(dossier, entree.name)

        if (entree.isDirectory()) {
            await parcourir(complet)
            continue
        }

        if (!/\.(html|js|json)$/.test(entree.name)) {
            continue
        }

        const contenu = await readFile(complet, 'utf-8')

        if (contenu.includes(REMPLACEE)) {
            await writeFile(complet, contenu.split(REMPLACEE).join(REELLE))
            touches++
        }
    }
}

await parcourir(SORTIE)

console.log(`[instantané] origine rétablie dans ${touches} fichier(s) : ${REELLE}`)
