/**
 * Sprite des logos partenaires.
 *
 * Le bandeau du pied de page affiche treize logos, sur chaque page du site.
 * Treize images, c'est treize requêtes et une cinquantaine de nœuds de DOM —
 * les deux postes qu'EcoIndex pénalise le plus lourdement. Réunies en une seule
 * image, elles ne coûtent plus qu'une requête et un nœud par logo.
 *
 * Les logos sont mis à la hauteur d'affichage doublée (300 px pour 150 px
 * affichés), afin de rester nets sur un écran à haute densité, puis posés côte
 * à côte sur un fond transparent, séparés par l'écart du bandeau.
 *
 * Le sprite reproduit donc la bande telle qu'elle s'affiche : le pied de page
 * n'a plus qu'à en poser deux exemplaires côte à côte, sans découpe ni
 * positionnement. Le manifeste ne porte que ses dimensions et la liste des
 * partenaires, dont se compose le texte alternatif.
 *
 * Les logos sont pris dans `app/assets/partenaires/`, et non dans la médiathèque
 * WordPress : celle-ci les avait convertis en JPEG opaques plafonnés à 1280 px.
 * Chaque logo y traînait un rectangle noir cuit dans l'image, invisible sur le
 * fond noir du site — et qui l'aurait rattrapé au premier fond clair. Les
 * fichiers versionnés ici sont les PNG d'origine du studio, en vraie
 * transparence et jusqu'à 3000 px.
 *
 * WordPress reste la source de la *liste* et des noms : l'ordre du bandeau et
 * les textes alternatifs viennent de lui, et `verify-build` échoue si les deux
 * divergent.
 *
 * Le sprite est écrit dans `public/assets/images/`, régénérable donc hors dépôt.
 * Le manifeste, lui, est versionné : le composant l'importe, et un dépôt fraî-
 * chement cloné doit pouvoir se construire avant que les assets ne soient prêts.
 *
 *   npm run sprite
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { demanderAWordPress } from './wordpress-injoignable.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const LOGOS = path.join(ROOT, 'app/assets/partenaires')
const SORTIE = path.join(ROOT, 'public/assets/images')
const MANIFESTE = path.join(ROOT, 'app/data/partenaires-sprite.json')

const WP_BASE = (process.env.NUXT_PUBLIC_WP_BASE_URL || 'http://les-conceptions-du-dahut.withni.local')
    .replace(/\/+$/, '')

/** Hauteur d'affichage du bandeau, doublée pour les écrans à haute densité. */
const HAUTEUR = 300

/** Écart entre deux logos : `gap-15` du bandeau, soit 60 px, doublé lui aussi. */
const ECART = 120

async function main() {
    const { options } = await demanderAWordPress(`${WP_BASE}/wp-json/dahut/v1/bootstrap`)
    const logos = options?.logos_des_partenaires || []

    if (!logos.length) {
        console.error('Aucun logo partenaire déclaré : rien à composer.')
        process.exit(1)
    }

    const pieces = []
    let x = 0

    for (const logo of logos) {
        const source = path.join(LOGOS, path.basename(logo.src))

        if (!existsSync(source)) {
            throw new Error(
                `Logo absent : ${path.relative(ROOT, source)}\n` +
                    `  « ${logo.alt || logo.title} » est déclaré dans WordPress, mais son fichier d'origine\n` +
                    `  n'est pas dans le dépôt. L'ajouter là plutôt que de retomber sur la médiathèque,\n` +
                    `  dont les copies sont opaques et plafonnées à 1280 px.`
            )
        }

        // `fit: inside` conserve le rapport d'origine ; la largeur en découle.
        const redimensionne = await sharp(source)
            .resize({ height: HAUTEUR, fit: 'inside', withoutEnlargement: false })
            .png()
            .toBuffer()

        const { width } = await sharp(redimensionne).metadata()

        pieces.push({
            nom: logo.alt || logo.title || path.basename(logo.src, path.extname(logo.src)),
            x,
            largeur: width,
            tampon: redimensionne,
        })

        // L'écart sépare deux logos ; il n'y en a pas après le dernier, la
        // gouttière du bandeau assurant la jointure entre les deux exemplaires.
        x += width + ECART
    }

    const largeurTotale = x - ECART

    const canevas = sharp({
        create: {
            width: largeurTotale,
            height: HAUTEUR,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    }).composite(pieces.map((p) => ({ input: p.tampon, left: p.x, top: 0 })))

    await mkdir(SORTIE, { recursive: true })

    const png = await canevas.png().toBuffer()
    /*
       Des marques blanches sur fond transparent : peu de dégradés, donc peu à
       préserver. Descendre la qualité AVIF de 60 à 50 rend les trente kilo-
       octets qu'avait coûtés le passage à la vraie transparence, sans
       différence visible. Le WebP ne sert que de repli — les navigateurs qui
       lisent l'AVIF ne le téléchargent jamais.
    */
    const webp = await sharp(png).webp({ quality: 78 }).toBuffer()
    const avif = await sharp(png).avif({ quality: 50, effort: 6 }).toBuffer()

    await writeFile(path.join(SORTIE, 'partenaires.webp'), webp)
    await writeFile(path.join(SORTIE, 'partenaires.avif'), avif)

    await writeFile(
        MANIFESTE,
        `${JSON.stringify(
            {
                hauteur: HAUTEUR,
                largeurTotale,
                ecart: ECART,
                partenaires: pieces.map(({ nom }) => nom),
            },
            null,
            4
        )}\n`
    )

    const total = pieces.reduce((somme, p) => somme + p.tampon.length, 0)

    console.log(`${pieces.length} logos réunis — ${largeurTotale}×${HAUTEUR}`)
    console.log(`  webp ${(webp.length / 1024).toFixed(0)} Ko`)
    console.log(`  avif ${(avif.length / 1024).toFixed(0)} Ko`)
    console.log(`  (les mêmes logos servis séparément en PNG : ${(total / 1024).toFixed(0)} Ko)`)
}

main().catch((erreur) => {
    console.error(erreur.message)
    process.exit(1)
})
