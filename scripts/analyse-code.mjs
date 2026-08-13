/**
 * Relevé de complexité du code, par analyse syntaxique réelle.
 *
 * Les mesures faites à l'expression régulière se sont révélées fausses trois
 * fois de suite — `if` compté comme une fonction, accolades mal appariées,
 * règles CSS imbriquées ignorées. On passe donc par le vrai analyseur : celui
 * de Vue pour découper les composants, `acorn` pour lire le script.
 *
 * Trois indicateurs, choisis parce qu'ils se dégradent lentement et sans bruit :
 *
 *   longueur      — une fonction de plus de 60 lignes ne tient plus en tête ;
 *   imbrication   — au-delà de 4 niveaux, le raisonnement devient coûteux ;
 *   complexité    — nombre de chemins d'exécution, ce qu'il faudrait de cas de
 *                   test pour couvrir la fonction.
 *
 * Usage : node scripts/analyse-code.mjs [dossier…]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'
import { parse as parseSfc } from '@vue/compiler-sfc'
import * as acorn from 'acorn'

const RACINES = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ['app/components/van', 'app/composables']

const SEUILS = { longueur: 60, imbrication: 4, complexite: 15 }

/* ------------------------------------------------------------ collecte */

const fichiers = []
const explorer = (chemin) => {
    for (const entree of readdirSync(chemin)) {
        const complet = join(chemin, entree)
        if (statSync(complet).isDirectory()) explorer(complet)
        else if (['.vue', '.js', '.mjs'].includes(extname(entree))) fichiers.push(complet)
    }
}
for (const racine of RACINES) explorer(racine)

/** Le script d'un fichier, quel que soit son emballage. */
const scriptDe = (chemin) => {
    const source = readFileSync(chemin, 'utf8')
    if (extname(chemin) !== '.vue') return source

    const { descriptor } = parseSfc(source)
    return [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean).join('\n')
}

/* ------------------------------------------------------------- analyse */

const EMBRANCHEMENTS = new Set([
    'IfStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement',
    'DoWhileStatement', 'SwitchCase', 'ConditionalExpression', 'CatchClause',
])
const FONCTIONS = new Set([
    'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
])

const nommer = (noeud, parent) =>
    noeud.id?.name ||
    parent?.id?.name ||
    parent?.key?.name ||
    (parent?.type === 'Property' ? parent.key?.name : null) ||
    '(anonyme)'

const releves = []

for (const chemin of fichiers) {
    let arbre
    try {
        arbre = acorn.parse(scriptDe(chemin), {
            ecmaVersion: 'latest', sourceType: 'module', locations: true,
        })
    } catch (erreur) {
        console.error(`  ! ${chemin} : ${erreur.message}`)
        continue
    }

    const parcourir = (noeud, parent, profondeur, fonction) => {
        if (!noeud || typeof noeud.type !== 'string') return

        if (FONCTIONS.has(noeud.type)) {
            const releve = {
                fichier: relative(process.cwd(), chemin),
                nom: nommer(noeud, parent),
                lignes: noeud.loc.end.line - noeud.loc.start.line,
                ligne: noeud.loc.start.line,
                complexite: 1,
                imbrication: 0,
            }
            releves.push(releve)
            fonction = releve
            profondeur = 0
        }

        if (fonction) {
            if (EMBRANCHEMENTS.has(noeud.type)) {
                fonction.complexite += 1
                profondeur += 1
                fonction.imbrication = Math.max(fonction.imbrication, profondeur)
            }
            if (noeud.type === 'LogicalExpression' && ['&&', '||', '??'].includes(noeud.operator)) {
                fonction.complexite += 1
            }
        }

        for (const cle of Object.keys(noeud)) {
            if (cle === 'loc' || cle === 'parent') continue
            const valeur = noeud[cle]
            if (Array.isArray(valeur)) valeur.forEach((e) => parcourir(e, noeud, profondeur, fonction))
            else if (valeur && typeof valeur.type === 'string') parcourir(valeur, noeud, profondeur, fonction)
        }
    }

    parcourir(arbre, null, 0, null)
}

/* -------------------------------------------------------------- bilan */

const depassements = releves.filter(
    (r) => r.lignes > SEUILS.longueur || r.imbrication > SEUILS.imbrication || r.complexite > SEUILS.complexite
)

console.log(`\n${releves.length} fonctions dans ${fichiers.length} fichiers\n`)

const repartition = { '≤ 10': 0, '11 à 30': 0, '31 à 60': 0, '> 60': 0 }
for (const r of releves) {
    repartition[r.lignes > 60 ? '> 60' : r.lignes > 30 ? '31 à 60' : r.lignes > 10 ? '11 à 30' : '≤ 10'] += 1
}
console.log('Longueur :')
for (const [k, n] of Object.entries(repartition)) {
    console.log(`  ${k.padEnd(9)} ${String(n).padStart(3)}  ${'▏'.repeat(Math.round(n / 3))}`)
}

console.log(`\n${depassements.length} fonction(s) au-delà des seuils ` +
    `(${SEUILS.longueur} lignes · ${SEUILS.imbrication} niveaux · complexité ${SEUILS.complexite}) :\n`)

for (const r of depassements.sort((a, b) => b.complexite - a.complexite).slice(0, 15)) {
    const marques = [
        r.lignes > SEUILS.longueur ? `${r.lignes} l.` : '',
        r.imbrication > SEUILS.imbrication ? `${r.imbrication} niv.` : '',
        r.complexite > SEUILS.complexite ? `compl. ${r.complexite}` : '',
    ].filter(Boolean).join(' · ')
    console.log(`  ${r.nom.padEnd(32)} ${marques.padEnd(30)} ${r.fichier}:${r.ligne}`)
}

console.log('')
