/**
 * Pourquoi WordPress ne répond pas.
 *
 * `fetch failed` ne dit rien de la seule cause qu'on rencontre vraiment ici.
 * Local sert ses sites derrière un routeur qui prend le port 80 ; DDEV en fait
 * autant pour les siens. Le second démarré n'obtient pas le port, et le premier
 * répond à sa place — un 404 poli pour un nom d'hôte qu'il ne connaît pas.
 *
 * Le symptôme est trompeur : Local affiche le site comme démarré, son nginx
 * tourne bien, mais rien de ce qui passe par son nom d'hôte ne l'atteint. Le
 * contournement par le port direct échoue à son tour, WordPress redirigeant
 * vers son adresse canonique — donc vers le port 80.
 *
 * Ce module sonde le port 80 et nomme ce qu'il y trouve.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const executer = promisify(execFile)

/** Ce qui écoute sur le port 80, en une ligne, ou rien. */
async function occupantDuPort80() {
    try {
        const { stdout } = await executer('lsof', ['-nP', '-iTCP:80', '-sTCP:LISTEN'], { timeout: 3000 })
        const lignes = stdout.trim().split('\n').slice(1)

        return lignes.length ? lignes[0].split(/\s+/)[0] : null
    } catch {
        // lsof absent ou muet : la sonde HTTP en dira peut-être plus.
        return null
    }
}

/** L'identité de ce qui répond sur le port 80, s'il se nomme. */
async function quiRepondSurLe80() {
    try {
        const reponse = await fetch('http://127.0.0.1/', {
            signal: AbortSignal.timeout(3000),
            redirect: 'manual',
        })

        // DDEV signe ses 404 ; c'est le seul indice fiable qu'on ait.
        if (reponse.headers.get('x-ddev-404-source')) {
            return 'ddev'
        }

        return 'autre'
    } catch {
        return null
    }
}

/**
 * Le message à afficher quand une requête vers WordPress a échoué.
 * Toujours un texte : le diagnostic ne doit jamais empêcher de rapporter la panne.
 */
export async function expliquerInjoignable(origine) {
    /*
       Le serveur de rejeu écoute sur un port à lui, et répond 404 à une requête
       qu'il n'a pas enregistrée. Lui coller le diagnostic du port 80 enverrait
       chercher une panne qui n'existe pas : ce qui manque ici, c'est une entrée
       dans l'instantané.
    */
    const { port } = new URL(origine)

    if (port && port !== '80') {
        return [
            `${origine} n'a pas de réponse enregistrée pour cette requête.`,
            '',
            "L'instantané de l'API date d'une capture antérieure et ne couvre pas ce que",
            'le build demande aujourd’hui. Le rafraîchir demande WordPress démarré :',
            '',
            '  npm run instantane',
        ].join('\n')
    }

    const lignes = [`WordPress ne répond pas sur ${origine}.`]

    const [occupant, identite] = await Promise.all([occupantDuPort80(), quiRepondSurLe80()])

    if (identite === 'ddev') {
        lignes.push(
            '',
            'Le port 80 est tenu par le routeur de DDEV : il répond à la place de Local,',
            "et ne connaît pas ce nom d'hôte. Local a beau afficher le site comme démarré,",
            'rien ne lui parvient.',
            '',
            '  ddev poweroff          libère le port ; redémarrer le site dans Local ensuite',
            '  ddev start             pour rendre la main à l’autre projet',
            '',
            'Ou construire sans WordPress, depuis la copie enregistrée de son API :',
            '',
            '  npm run generate:instantane',
            '  npm run publier -- --instantane'
        )
    } else if (occupant) {
        lignes.push(
            '',
            `Le port 80 est tenu par « ${occupant} », qui répond à la place de Local.`,
            'Arrêter ce service, puis redémarrer le site dans Local.',
            '',
            'Ou construire sans WordPress : npm run generate:instantane'
        )
    } else {
        lignes.push(
            '',
            'Rien n’écoute sur le port 80 : le site est probablement arrêté dans Local.',
            '',
            'Ou construire sans WordPress : npm run generate:instantane'
        )
    }

    return lignes.join('\n')
}

/**
 * Une requête vers l'API de WordPress, qui explique son échec au lieu de le
 * subir. Rend la réponse analysée.
 *
 * Un 404 compte pour un échec de joignabilité : c'est ce que renvoie le routeur
 * d'un autre projet quand il répond à la place de Local.
 */
export async function demanderAWordPress(url) {
    const origine = new URL(url).origin

    let reponse

    try {
        reponse = await fetch(url)
    } catch (erreur) {
        throw new Error(`${await expliquerInjoignable(origine)}\n\n(${erreur.message})`)
    }

    if (reponse.status === 404) {
        throw new Error(await expliquerInjoignable(origine))
    }

    if (!reponse.ok) {
        throw new Error(`${origine} a répondu ${reponse.status} à ${new URL(url).pathname}.`)
    }

    return reponse.json()
}
