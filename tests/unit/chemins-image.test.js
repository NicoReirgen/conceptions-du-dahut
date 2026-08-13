import { describe, it, expect } from 'vitest'
import { imageSystem } from '~~/app/composables/useVehicleImages'

/*
   Composition des chemins d'aperçu.

   `getSelectedValues` et `findDeepestInBranch` étaient couverts ; ce qui les
   assemble en URL ne l'était pas — soit la moitié du système d'images, et
   précisément celle qui décide du fichier finalement demandé.

   La règle : la dernière sélection devient le dossier principal, les
   précédentes forment des sous-dossiers imbriqués.
*/

const MOBILIER = {
    key: 'mobilier',
    type: 'multiple',
    traitementImage: true,
    options: [
        { key: 'base', name: 'Base', isDefault: true },
        { key: 'tiroirs', name: 'Tiroirs' },
        { key: 'rangement', name: 'Rangement' },
    ],
}

const FINITIONS = {
    key: 'finitions',
    type: 'unique',
    traitementImage: true,
    options: [
        { key: 'stratifie', name: 'Stratifié', subOptions: [{ key: 'bleu_velvet', name: 'Bleu Velvet' }] },
    ],
}

const ETAPES = [{ subSteps: [{ fields: [MOBILIER] }, { fields: [FINITIONS] }] }]

const chemin = (selections, etapes = ETAPES) => imageSystem.buildImageUrl(selections, 'orion', etapes)

describe('chemin de l’aperçu', () => {
    it('retombe sur l’image de base sans sélection', () => {
        expect(chemin({})).toBe('/assets/images/orion/orion-base.jpg')
    })

    it('retombe sur l’image de base sans étapes', () => {
        expect(imageSystem.buildImageUrl({ mobilier: ['tiroirs'] }, 'orion', null))
            .toBe('/assets/images/orion/orion-base.jpg')
    })

    it('nomme le dossier d’après la clé du champ, le fichier d’après l’option', () => {
        expect(chemin({ mobilier: ['tiroirs'] })).toBe('/assets/images/orion/mobilier/tiroirs.jpg')
    })

    /*
       Le cœur de la convention : deux sélections s'imbriquent, la dernière
       venue en tête. C'est ce qui permet à une même option de mobilier d'avoir
       un rendu par finition.
    */
    it('imbrique les sélections, la dernière en dossier principal', () => {
        const url = chemin({
            mobilier: ['tiroirs'],
            finitions: { main: 'stratifie', sub: 'bleu_velvet' },
        })

        expect(url).toBe('/assets/images/orion/finitions/stratifie-bleu_velvet/mobilier/tiroirs.jpg')
    })

    it('ignore un champ dont l’option est écartée des images', () => {
        const etapes = [{ subSteps: [{ fields: [{
            ...MOBILIER,
            options: [{ key: 'tiroirs', disableImageHandling: true }],
        }] }] }]

        expect(chemin({ mobilier: ['tiroirs'] }, etapes)).toBe('/assets/images/orion/orion-base.jpg')
    })

    /*
       Un champ déclaré indépendant ne s'imbrique pas : son image existe seule,
       quelles que soient les autres sélections.
    */
    it('sort un champ indépendant de la hiérarchie', () => {
        const etapes = [{ subSteps: [{ fields: [MOBILIER] }, { fields: [{ ...FINITIONS, independant: true }] }] }]

        const url = chemin({
            mobilier: ['tiroirs'],
            finitions: { main: 'stratifie', sub: 'bleu_velvet' },
        }, etapes)

        expect(url).toBe('/assets/images/orion/finitions/stratifie-bleu_velvet.jpg')
    })
})

describe('chemins de repli', () => {
    const champs = (selections, etapes = ETAPES) => imageSystem.extractValidatedFields(
        selections,
        imageSystem.detectImageFields(etapes)
    )

    it('retire les sélections une à une, en finissant par l’image de base', () => {
        const replis = imageSystem.generateFallbackUrls(
            champs({ mobilier: ['tiroirs'], finitions: { main: 'stratifie', sub: 'bleu_velvet' } }),
            'orion'
        )

        expect(replis[0]).toBe('/assets/images/orion/mobilier/tiroirs.jpg')
        expect(replis.at(-1)).toBe('/assets/images/orion/orion-base.jpg')
    })

    it('ne propose que l’image de base quand rien n’est retenu', () => {
        expect(imageSystem.generateFallbackUrls([], 'orion')).toEqual(['/assets/images/orion/orion-base.jpg'])
    })
})
