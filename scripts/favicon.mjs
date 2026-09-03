/**
 * Fabrication du favicon à partir du picto du Dahut.
 *
 * Le site portait encore celui de Nuxt — le logo vert de l'échafaudage, resté
 * en place depuis l'installation.
 *
 * Le picto est blanc sur fond transparent : tel quel, il disparaîtrait dans un
 * onglet clair. Il est donc posé sur le noir du site, ce qui le rend lisible
 * sur les deux thèmes et reprend l'identité de la marque.
 *
 * Trois fichiers, parce qu'aucun format ne suffit seul :
 *   — `favicon.svg`, net à toute taille, préféré par les navigateurs récents ;
 *   — `favicon.ico`, qui embarque trois tailles, pour les plus anciens ;
 *   — `apple-touch-icon.png`, réclamé par iOS pour l'écran d'accueil.
 *
 *   npm run favicon
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const PICTO = path.join(ROOT, 'public/assets/svg/logo_picto.svg')
const SORTIE = path.join(ROOT, 'public')

/** Le noir du site. */
const FOND = '#000000'

/** Part du carré occupée par le picto : le reste est la marge. */
const OCCUPATION = 0.68

/** Tailles embarquées dans le .ico, celles que réclament les navigateurs. */
const TAILLES_ICO = [16, 32, 48]

/**
 * Le picto centré sur un carré noir, en SVG.
 *
 * Le fichier d'origine est réenveloppé plutôt que redessiné : ses tracés
 * restent la seule source, et une retouche du logo se répercutera ici.
 */
async function composer() {
    const source = await readFile(PICTO, 'utf-8')

    const [, largeur, hauteur] = source.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number)
    const interieur = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

    const cote = 512
    const echelle = (cote * OCCUPATION) / Math.max(largeur, hauteur)
    const x = (cote - largeur * echelle) / 2
    const y = (cote - hauteur * echelle) / 2

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}" viewBox="0 0 ${cote} ${cote}">
  <rect width="${cote}" height="${cote}" fill="${FOND}"/>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${echelle.toFixed(4)})">
${interieur.trim()}
  </g>
</svg>
`
}

/**
 * Assemble un .ico autour de PNG déjà encodés.
 *
 * Le format accepte des PNG tels quels depuis Vista : un en-tête de six octets,
 * une entrée de seize par image, puis les données. C'est plus court que d'ajouter
 * une dépendance pour trois icônes.
 */
function assemblerIco(images) {
    const enTete = Buffer.alloc(6)
    enTete.writeUInt16LE(0, 0) // réservé
    enTete.writeUInt16LE(1, 2) // type : icône
    enTete.writeUInt16LE(images.length, 4)

    let decalage = 6 + images.length * 16

    const entrees = images.map(({ taille, donnees }) => {
        const entree = Buffer.alloc(16)
        entree.writeUInt8(taille >= 256 ? 0 : taille, 0)
        entree.writeUInt8(taille >= 256 ? 0 : taille, 1)
        entree.writeUInt8(0, 2) // palette : sans objet en 32 bits
        entree.writeUInt8(0, 3) // réservé
        entree.writeUInt16LE(1, 4) // plans
        entree.writeUInt16LE(32, 6) // bits par pixel
        entree.writeUInt32LE(donnees.length, 8)
        entree.writeUInt32LE(decalage, 12)

        decalage += donnees.length

        return entree
    })

    return Buffer.concat([enTete, ...entrees, ...images.map(({ donnees }) => donnees)])
}

async function main() {
    const svg = await composer()
    const tampon = Buffer.from(svg)

    await writeFile(path.join(SORTIE, 'favicon.svg'), svg)

    const images = []
    for (const taille of TAILLES_ICO) {
        images.push({
            taille,
            donnees: await sharp(tampon, { density: 384 }).resize(taille, taille).png().toBuffer(),
        })
    }

    await writeFile(path.join(SORTIE, 'favicon.ico'), assemblerIco(images))

    await sharp(tampon, { density: 384 })
        .resize(180, 180)
        .png()
        .toFile(path.join(SORTIE, 'apple-touch-icon.png'))

    console.log('favicon.svg, favicon.ico (16/32/48) et apple-touch-icon.png écrits dans public/')
}

main().catch((erreur) => {
    console.error(erreur.message)
    process.exit(1)
})
