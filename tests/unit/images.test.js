import { describe, it, expect } from 'vitest'
import { imageSystem } from '~~/app/composables/useVehicleImages'
import { configuratorSrcset, CONFIGURATOR_WIDTHS } from '~~/app/utils/imageVariants'

/*
   Dérivation des chemins d'images.

   C'est la convention la plus fragile du projet : la clé d'une option EST le
   nom de son dossier ou de son fichier. 905 fichiers en dépendent, et une clé
   renommée ne casse rien de visible — le système retombe en silence sur
   l'image de base.

   `scripts/verify-catalogue.mjs` vérifie que les clés du catalogue existent
   bien dans l'arborescence. Ces tests-ci vérifient l'autre moitié : que la
   règle de composition reste celle qu'on croit.
*/

describe('nom de dossier', () => {
    it('reprend la clé telle quelle', () => {
        expect(imageSystem.getFolderName('mobilier')).toBe('mobilier')
        expect(imageSystem.getFolderName('equipement_exterieur')).toBe('equipement_exterieur')
    })
})

describe('champs participant aux images', () => {
    const etapes = [
        {
            subSteps: [
                { fields: [
                    { key: 'mobilier', type: 'multiple', traitementImage: true },
                    { key: 'notes', type: 'textarea' },
                ] },
                { fields: [{ key: 'finitions', type: 'unique', traitementImage: true }] },
            ],
        },
    ]

    it('ne retient que les champs marqués', () => {
        const trouves = imageSystem.detectImageFields(etapes).map((f) => f.key)
        expect(trouves).toEqual(['mobilier', 'finitions'])
    })

    it('conserve l’ordre de déclaration — il détermine le chemin', () => {
        const trouves = imageSystem.detectImageFields(etapes)
        expect(trouves[0].order).toBeLessThan(trouves[1].order)
    })

    it('descend dans les champs de type groupe', () => {
        const groupe = [{ subSteps: [{ fields: [
            { key: 'bloc', type: 'group', fields: [{ key: 'interieur', traitementImage: true }] },
        ] }] }]
        expect(imageSystem.detectImageFields(groupe).map((f) => f.key)).toContain('interieur')
    })
})

describe('image de repli', () => {
    it('désigne un fichier du dossier du véhicule', () => {
        const base = imageSystem.getBaseImage('orion')
        expect(base).toContain('assets/images/orion/')
        expect(base).toMatch(/\.(jpe?g|png)$/)
    })
})

describe('srcset des variantes', () => {
    it('génère une entrée par largeur, la plus grande sans suffixe', () => {
        const rendu = configuratorSrcset('/assets/images/orion/mobilier/base.jpg', 'avif')

        expect(rendu).toContain('/assets/images/orion/mobilier/base@960.avif 960w')
        expect(rendu).toContain('/assets/images/orion/mobilier/base.avif 1920w')
        expect(rendu.split(',')).toHaveLength(CONFIGURATOR_WIDTHS.length)
    })

    it('accepte aussi le PNG en source', () => {
        expect(configuratorSrcset('/a/b.png', 'webp')).toContain('/a/b.webp 1920w')
    })

    /*
       Les SVG et les chemins vides n'ont pas de variantes : renvoyer une chaîne
       vide évite d'émettre un `<source>` qui pointerait dans le vide.
    */
    it('reste silencieux sur ce qui n’est pas matriciel', () => {
        expect(configuratorSrcset('/logo.svg', 'avif')).toBe('')
        expect(configuratorSrcset('', 'avif')).toBe('')
        expect(configuratorSrcset(null, 'avif')).toBe('')
    })
})
