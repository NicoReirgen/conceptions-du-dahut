import { describe, it, expect } from 'vitest'
import { champsRetenus } from '~~/app/composables/images/champsImage'
import { buildImageUrl, generateFallbackUrls } from '~~/app/composables/images/cheminsImage'
import { getLastFallbacks, getVehicleImageSync, repliSuivant } from '~~/app/composables/useVehicleImages'

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

const chemin = (selections, etapes = ETAPES) => buildImageUrl(selections, 'orion', etapes)

describe('chemin de l’aperçu', () => {
    it('retombe sur l’image de base sans sélection', () => {
        expect(chemin({})).toBe('/assets/images/orion/orion-base.jpg')
    })

    it('retombe sur l’image de base sans étapes', () => {
        expect(buildImageUrl({ mobilier: ['tiroirs'] }, 'orion', null))
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
    const champs = (selections, etapes = ETAPES) => champsRetenus(selections, etapes)

    it('retire les sélections une à une, en finissant par l’image de base', () => {
        const replis = generateFallbackUrls(
            champs({ mobilier: ['tiroirs'], finitions: { main: 'stratifie', sub: 'bleu_velvet' } }),
            'orion'
        )

        expect(replis[0]).toBe('/assets/images/orion/mobilier/tiroirs.jpg')
        expect(replis.at(-1)).toBe('/assets/images/orion/orion-base.jpg')
    })

    it('ne propose que l’image de base quand rien n’est retenu', () => {
        expect(generateFallbackUrls([], 'orion')).toEqual(['/assets/images/orion/orion-base.jpg'])
    })
})

/*
   Le repli d'aperçu.

   L'existence d'un fichier n'est plus vérifiée avant de l'afficher : c'est
   l'échec de chargement qui fait avancer dans la liste. Encore faut-il ne pas
   revenir sur ses pas — l'ancienne version écartait seulement l'image courante,
   si bien que deux replis en échec se renvoyaient la balle indéfiniment.
*/
describe('repli suivant', () => {
    /*
       La liste vient de la dernière résolution, comme dans le composant — et
       elle ne contient pas l'image demandée, seulement ce vers quoi se rabattre.
    */
    const replis = () => {
        getVehicleImageSync(
            { mobilier: ['tiroirs'], finitions: { main: 'stratifie', sub: 'bleu_velvet' } },
            'orion',
            ETAPES
        )

        return getLastFallbacks()
    }

    it('propose le premier repli quand rien n’a été essayé', () => {
        const [premier] = replis()

        expect(premier).toBe('/assets/images/orion/mobilier/tiroirs.jpg')
        expect(repliSuivant([])).toBe(premier)
    })

    it('passe au suivant une fois le premier en échec', () => {
        const [premier, second] = replis()

        expect(repliSuivant([premier])).toBe(second)
    })

    it('ne rend rien quand tout a échoué, plutôt que de tourner en rond', () => {
        expect(repliSuivant(replis())).toBeNull()
    })
})
