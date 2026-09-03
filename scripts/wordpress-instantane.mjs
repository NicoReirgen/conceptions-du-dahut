/**
 * Instantané de l'API WordPress, pour construire sans elle.
 *
 * Le site se génère à partir de WordPress, qui n'existe que sur la machine de
 * développement. Une correction qui ne touche que le code — un favicon, une
 * feuille de style, un composant — restait donc impubliable dès que Local était
 * éteint. C'est ce que ce script débloque.
 *
 * Deux modes :
 *
 *   capture  Intercale un mandataire entre le build et WordPress, et note
 *            chaque réponse. Ce qui est enregistré est exactement ce que le
 *            build demande — pas une liste de points d'API tenue à la main,
 *            qui se démoderait en silence.
 *
 *   rejeu    Sert l'instantané à la place de WordPress, et lance le même build.
 *            Une requête absente de l'instantané fait échouer la génération :
 *            cela signifie que le contenu a changé, donc qu'il faut une vraie
 *            capture.
 *
 * L'instantané est versionné. Il fait du dépôt une copie complète du site —
 * contenu compris — là où la base Local en est aujourd'hui l'unique exemplaire.
 *
 *   npm run instantane          (WordPress démarré)
 *   npm run generate:instantane (WordPress éteint)
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const INSTANTANE = path.join(ROOT, 'wordpress-instantane')
const PORT = 4010

const WP_BASE = (process.env.NUXT_PUBLIC_WP_BASE_URL || 'http://les-conceptions-du-dahut.withni.local')
    .replace(/\/+$/, '')

/**
 * Nom de fichier d'une requête.
 *
 * Lisible d'abord — on doit pouvoir reconnaître une page dans le dossier —, et
 * suffixé d'une empreinte pour que deux requêtes proches ne se recouvrent pas.
 */
const nomDe = (url) => {
    const lisible = url
        .replace(/^\/wp-json\/dahut\/v1\//, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)

    return `${lisible || 'racine'}.${createHash('sha1').update(url).digest('hex').slice(0, 8)}.json`
}

/** Le mode capture : mandataire vers WordPress, qui garde une copie au passage. */
async function capture() {
    await mkdir(INSTANTANE, { recursive: true })

    const vues = new Map()

    const serveur = createServer(async (requete, reponse) => {
        try {
            const amont = await fetch(`${WP_BASE}${requete.url}`)
            const corps = await amont.text()

            vues.set(requete.url, { statut: amont.status, corps })

            reponse.writeHead(amont.status, {
                'content-type': amont.headers.get('content-type') || 'application/json',
            })
            reponse.end(corps)
        } catch (erreur) {
            console.error(`\n[instantané] WordPress n'a pas répondu sur ${requete.url}`)
            console.error(`             ${erreur.message}`)
            reponse.writeHead(502).end('{}')
        }
    })

    await new Promise((pret) => serveur.listen(PORT, pret))

    const code = await genererAvec(`http://127.0.0.1:${PORT}`)

    serveur.close()

    if (code !== 0) {
        console.error("\nLa génération a échoué : l'instantané n'est pas écrit.")
        process.exit(code)
    }

    // L'ancien instantané est remplacé en entier : une page supprimée dans
    // WordPress doit disparaître d'ici aussi, plutôt que d'y survivre en
    // orpheline et de servir un contenu que plus rien ne produit.
    for (const fichier of await readdir(INSTANTANE)) {
        if (fichier.endsWith('.json')) {
            await unlink(path.join(INSTANTANE, fichier))
        }
    }

    const index = []

    for (const [url, { statut, corps }] of vues) {
        const nom = nomDe(url)
        await writeFile(path.join(INSTANTANE, nom), corps)
        index.push({ url, statut, fichier: nom, octets: Buffer.byteLength(corps) })
    }

    index.sort((a, b) => a.url.localeCompare(b.url))

    await writeFile(
        path.join(INSTANTANE, 'index.json'),
        `${JSON.stringify({ pris: new Date().toISOString(), origine: WP_BASE, requetes: index }, null, 4)}\n`
    )

    const poids = index.reduce((somme, r) => somme + r.octets, 0)
    console.log(`\n[instantané] ${index.length} requêtes enregistrées — ${(poids / 1024).toFixed(0)} Ko`)
}

/** Le mode rejeu : l'instantané tient lieu de WordPress. */
async function rejeu() {
    if (!existsSync(path.join(INSTANTANE, 'index.json'))) {
        console.error("Aucun instantané. En prendre un pendant que WordPress tourne : npm run instantane")
        process.exit(1)
    }

    const { pris, requetes } = JSON.parse(
        await readFile(path.join(INSTANTANE, 'index.json'), 'utf-8')
    )

    const connues = new Map(requetes.map((r) => [r.url, r]))
    const manquantes = new Set()

    const serveur = createServer(async (requete, reponse) => {
        const connue = connues.get(requete.url)

        if (!connue) {
            manquantes.add(requete.url)
            reponse.writeHead(404, { 'content-type': 'application/json' }).end('{}')
            return
        }

        reponse.writeHead(connue.statut, { 'content-type': 'application/json' })
        reponse.end(await readFile(path.join(INSTANTANE, connue.fichier), 'utf-8'))
    })

    await new Promise((pret) => serveur.listen(PORT, pret))

    const age = Math.round((Date.now() - new Date(pris).getTime()) / 86400000)
    console.log(`[instantané] pris le ${new Date(pris).toLocaleString('fr-FR')}${age > 0 ? ` — il y a ${age} jour(s)` : ''}\n`)

    const code = await genererAvec(`http://127.0.0.1:${PORT}`)

    serveur.close()

    if (manquantes.size) {
        console.error(`\n[instantané] ${manquantes.size} requête(s) hors de l'instantané :`)
        for (const url of [...manquantes].slice(0, 10)) {
            console.error(`  ${url}`)
        }
        console.error('\nLe contenu a changé depuis la capture. Démarrer WordPress, puis : npm run instantane')
        process.exit(1)
    }

    process.exit(code)
}

/** Lance la génération habituelle, contrôles compris, contre l'origine donnée. */
function genererAvec(origine) {
    const enfant = spawn('npm', ['run', 'generate'], {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env, NUXT_PUBLIC_WP_BASE_URL: origine },
    })

    return new Promise((fini) => enfant.on('close', fini))
}

const mode = process.argv[2]

if (mode === 'capture') {
    await capture()
} else if (mode === 'rejeu') {
    await rejeu()
} else {
    console.error('Usage : node scripts/wordpress-instantane.mjs capture|rejeu')
    process.exit(1)
}
