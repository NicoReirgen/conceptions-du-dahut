/**
 * Contrôle du catalogue du configurateur.
 *
 * Les données sont sorties du code (app/data/orion.json), et rien ne garantit
 * plus qu'un JSON édité à la main reste cohérent. Deux familles d'erreurs sont
 * traquées :
 *
 *   1. la forme — clés manquantes ou dupliquées entre voisines, prix non
 *      numériques, incompatibilités qui désignent une option inexistante ;
 *
 *   2. le lien aux images — la clé d'une option EST le nom de son dossier ou de
 *      son fichier (`getFolderName(key) => key`). Renommer une clé casse
 *      l'aperçu sans le moindre message : le système retombe silencieusement
 *      sur l'image de base. 905 fichiers dépendent de cette convention.
 *
 * Le script n'essaie pas de prédire les chemins complets : ceux-ci dépendent de
 * l'ordre de sélection du visiteur et sont donc combinatoires. Il compare les
 * *segments* de part et d'autre, ce qui suffit à repérer un renommage.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/*
   Branches sous lesquelles un nœud peut porter des enfants.

   `content` et `main` avaient été oubliés : le champ « Ouvrants » range ses
   options sous `content.main.options`, et la moitié de l'étape 3 échappait
   donc au contrôle.
*/
const BRANCHES = ['steps', 'subSteps', 'fields', 'options', 'deepOptions', 'subOptions', 'content', 'main']

const CATALOGUE = 'app/data/orion.json'
const IMAGES = 'public/assets/images'

const erreurs = []
const alertes = []

/* ------------------------------------------------------------------ forme */

const catalogue = JSON.parse(readFileSync(CATALOGUE, 'utf8'))

/** Parcourt tout nœud portant des `fields`, `options`, `deepOptions`… */
const parcourir = (noeud, chemin, visiter) => {
    if (Array.isArray(noeud)) {
        noeud.forEach((enfant) => parcourir(enfant, chemin, visiter))
        return
    }
    if (!noeud || typeof noeud !== 'object') return

    if (noeud.key) {
        visiter(noeud, chemin)
        chemin = [...chemin, noeud.key]
    }

    for (const branche of BRANCHES) {
        if (noeud[branche]) parcourir(noeud[branche], chemin, visiter)
    }
}

const toutesLesCles = new Set()
const clesImage = new Set()

for (const vehicule of catalogue) {
    if (!vehicule.id) erreurs.push('Un véhicule est déclaré sans `id`.')

    // Les clés doivent être uniques entre voisines : c'est ce qui permet de
    // désigner une option par son chemin.
    const verifierFratrie = (liste, ou) => {
        if (!Array.isArray(liste)) return
        const vues = new Set()
        for (const item of liste) {
            if (!item?.key) continue
            if (vues.has(item.key)) {
                erreurs.push(`Clé « ${item.key} » déclarée deux fois au même niveau, sous ${ou}.`)
            }
            vues.add(item.key)
        }
    }

    parcourir(vehicule, [vehicule.id], (noeud, chemin) => {
        toutesLesCles.add(noeud.key)

        if (noeud.price !== undefined && typeof noeud.price !== 'number') {
            erreurs.push(`Prix non numérique sur « ${[...chemin, noeud.key].join('.')} » : ${JSON.stringify(noeud.price)}.`)
        }

        for (const branche of ['fields', 'options', 'deepOptions', 'subOptions']) {
            verifierFratrie(noeud[branche], `« ${noeud.key} »`)
        }

        // Un champ traité en image transmet la convention à ses options.
        if (noeud.traitementImage === true) {
            clesImage.add(noeud.key)
            for (const option of noeud.options || []) {
                if (option.key && option.disableImageHandling !== true) {
                    clesImage.add(option.key)
                }
            }
        }
    })
}

/* ------------------------------------------------- types de champs rendus */

/*
   Un champ dont l'interface ignore le type ne proteste pas : `StepContent` n'a
   pas de branche pour lui et n'affiche rien, `calculateFieldPrice` renvoie zéro
   pour un type inconnu plutôt que de faire échouer le tunnel. L'étape paraît
   vide et ne coûte rien, sans un mot.

   C'est ce qui attend le champ `deep_unique` du véhicule « Autres », resté seul
   quand son composant a été supprimé.

   La liste des types n'est pas recopiée ici : elle est relue dans le gabarit
   qui aiguille les champs. Ajouter un composant suffit donc à autoriser son
   type, et ce contrôle ne peut pas prendre du retard sur l'interface.
*/
const AIGUILLAGE = 'app/components/van/StepContent.vue'

const typesRendus = new Set(
    [...readFileSync(AIGUILLAGE, 'utf8').matchAll(/field\.type === '([a-z_]+)'/g)].map(([, type]) => type)
)

// Sans quoi le contrôle validerait tout en silence, ce qu'il est censé empêcher.
if (typesRendus.size === 0) {
    erreurs.push(`Aucun type de champ lisible dans ${AIGUILLAGE} : l'aiguillage a changé de forme.`)
}

const verifierTypes = (noeud, vehicule) => {
    if (Array.isArray(noeud)) return noeud.forEach((enfant) => verifierTypes(enfant, vehicule))
    if (!noeud || typeof noeud !== 'object') return

    /*
       Seules les étapes « group » passent par l'aiguillage. L'étape de contact
       porte elle aussi des `fields` — nom, courriel, message — mais c'est
       `ContactStep` qui les affiche, avec ses propres types.
    */
    for (const champ of (noeud.type === 'group' && noeud.fields) || []) {
        if (!typesRendus.size || typesRendus.has(champ.type)) continue

        const ou = `« ${champ.key || 'un champ sans clé'} » (${vehicule.id})`
        const quoi = `est de type « ${champ.type} », qu'aucun composant n'affiche`

        /*
           Un véhicule fermé a le droit d'être incomplet — c'est déjà la règle
           pour ses images. L'erreur l'attendra au jour de son ouverture, qui
           est précisément le moment où le champ vide se verrait.
        */
        if (vehicule.soonAvailable === true) {
            alertes.push(`${ou} ${quoi} — sans effet tant que ce véhicule reste fermé.`)
        } else {
            erreurs.push(`${ou} ${quoi} : l'étape s'afficherait vide et ne coûterait rien.`)
        }
    }

    for (const branche of ['steps', 'subSteps']) {
        if (noeud[branche]) verifierTypes(noeud[branche], vehicule)
    }
}
catalogue.forEach((vehicule) => verifierTypes(vehicule, vehicule))

// Les incompatibilités doivent désigner des options qui existent.
const verifierIncompatibilites = (noeud) => {
    if (Array.isArray(noeud)) return noeud.forEach(verifierIncompatibilites)
    if (!noeud || typeof noeud !== 'object') return

    for (const cible of noeud.incompatibleWith || []) {
        if (!toutesLesCles.has(cible)) {
            erreurs.push(`« ${noeud.key} » se déclare incompatible avec « ${cible} », qui n'existe pas.`)
        }
    }
    for (const branche of BRANCHES) {
        if (noeud[branche]) verifierIncompatibilites(noeud[branche])
    }
}
catalogue.forEach(verifierIncompatibilites)

/* ----------------------------------------------------------------- images */

/** Tous les segments de nom présents dans l'arbre d'images d'un véhicule. */
const segmentsDeLArbre = (racine) => {
    const atomes = new Set()

    const descendre = (dossier) => {
        for (const entree of readdirSync(dossier)) {
            const complet = join(dossier, entree)
            const nom = entree
                .replace(/\.[a-z0-9]+$/i, '')   // extension
                .replace(/@\d+$/, '')           // variante responsive du pipeline

            // Un nom de fichier joint les options sélectionnées par un tiret.
            nom.split('-').forEach((atome) => atome && atomes.add(atome))

            if (statSync(complet).isDirectory()) descendre(complet)
        }
    }

    descendre(racine)
    return atomes
}

for (const vehicule of catalogue) {
    const racine = join(IMAGES, vehicule.id)

    if (!existsSync(racine)) {
        // Les véhicules « bientôt disponibles » n'ont pas encore d'images.
        if (vehicule.soonAvailable !== true && (vehicule.steps || []).length) {
            alertes.push(`Aucun dossier d'images pour « ${vehicule.id} » (${racine}).`)
        }
        continue
    }

    const atomes = segmentsDeLArbre(racine)

    for (const cle of clesImage) {
        if (!atomes.has(cle)) {
            erreurs.push(
                `« ${cle} » participe aux images mais n'apparaît nulle part dans ${racine} — ` +
                `l'aperçu retombera en silence sur l'image de base.`
            )
        }
    }

    // Images qui n'appartiennent à aucune option : l'image de repli, les deux
    // visuels de présentation et le rendu d'ensemble `orion-global`.
    const HORS_CATALOGUE = ['base', 'global', 'orion', 'orion_view_1', 'orion_view_2']

    // Sens inverse : des images que plus aucune option ne peut atteindre.
    const orphelins = [...atomes].filter(
        (a) => !toutesLesCles.has(a) && !HORS_CATALOGUE.includes(a)
    )
    if (orphelins.length) {
        alertes.push(
            `${orphelins.length} segment(s) d'image ne correspondent à aucune clé : ` +
            orphelins.slice(0, 8).join(', ') + (orphelins.length > 8 ? '…' : '')
        )
    }
}

/* ------------------------------------------------------------------ bilan */

console.log(`\n[catalogue] ${toutesLesCles.size} clés, ${clesImage.size} liées aux images`)

for (const a of alertes) console.log(`  ⚠︎  ${a}`)

if (erreurs.length) {
    console.error(`\n${erreurs.length} incohérence(s) dans ${CATALOGUE} :\n`)
    for (const e of erreurs) console.error(`  ✗ ${e}`)
    console.error('')
    process.exit(1)
}

console.log('  catalogue cohérent.\n')
