import { describe, it, expect } from 'vitest'
import { imageSystem } from '~~/app/composables/useVehicleImages'

/*
   Traduction d'une sélection en segment de chemin d'image.

   C'est l'étage au-dessus de `findDeepestInBranch` : là où celle-ci trouve les
   feuilles, celle-ci les met en forme — normalisation, tri, jonction par des
   tirets. Le tri compte : c'est lui qui rend le nom de fichier indépendant de
   l'ordre dans lequel le visiteur a coché.

   Les options portant `disableImageHandling` sont écartées ici aussi : toutes
   les sélections ne changent pas l'aperçu.
*/

const valeurs = (value, type, fieldInfo = null) =>
    imageSystem.getSelectedValues(value, type, fieldInfo)

/** Enveloppe une liste d'options dans la forme attendue par la fonction. */
const infos = (options) => ({ key: 'finitions', field: { options } })

describe('normalizeValue', () => {
    it('met en minuscules et remplace ce qui n’est pas alphanumérique', () => {
        expect(imageSystem.normalizeValue('Bouleau Vernis')).toBe('bouleau_vernis')
        expect(imageSystem.normalizeValue('Auvent 180°')).toBe('auvent_180_')
    })

    it('conserve les tirets et les soulignés', () => {
        expect(imageSystem.normalizeValue('bas_de-caisse')).toBe('bas_de-caisse')
    })

    it('rend une chaîne vide sur une valeur absente', () => {
        expect(imageSystem.normalizeValue('')).toBe('')
        expect(imageSystem.normalizeValue(null)).toBe('')
        expect(imageSystem.normalizeValue(undefined)).toBe('')
    })
})

describe('unique', () => {
    it('joint l’option principale et sa sous-option', () => {
        expect(valeurs({ main: 'Stratifie', sub: 'Bleu Velvet' }, 'unique'))
            .toBe('stratifie-bleu_velvet')
    })

    it('se limite à la principale quand il n’y a pas de sous-option', () => {
        expect(valeurs({ main: 'bouleau' }, 'unique')).toBe('bouleau')
    })

    it('ne rend rien sans option principale', () => {
        expect(valeurs({}, 'unique')).toBeNull()
        expect(valeurs({ sub: 'velvet' }, 'unique')).toBeNull()
    })

    describe('options écartées des images', () => {
        it('écarte tout si la principale est exclue', () => {
            const champ = infos([{ key: 'stratifie', disableImageHandling: true }])

            expect(valeurs({ main: 'stratifie', sub: 'galet' }, 'unique', champ)).toBeNull()
            expect(valeurs({ main: 'stratifie' }, 'unique', champ)).toBeNull()
        })

        it('retombe sur la principale si seule la sous-option est exclue', () => {
            const champ = infos([
                { key: 'stratifie', subOptions: [{ key: 'galet', disableImageHandling: true }] },
            ])

            expect(valeurs({ main: 'stratifie', sub: 'galet' }, 'unique', champ)).toBe('stratifie')
        })

        it('garde une option absente du catalogue, par prudence', () => {
            const champ = infos([{ key: 'autre' }])
            expect(valeurs({ main: 'inconnue' }, 'unique', champ)).toBe('inconnue')
        })
    })
})

describe('multiple', () => {
    it('trie les valeurs, pour que l’ordre de saisie ne compte pas', () => {
        expect(valeurs(['toit', 'auvent', 'bas'], 'multiple')).toBe('auvent-bas-toit')
        expect(valeurs(['bas', 'toit', 'auvent'], 'multiple')).toBe('auvent-bas-toit')
    })

    it('normalise chaque valeur', () => {
        expect(valeurs(['Auvent 180°', 'Bas De Caisse'], 'multiple'))
            .toBe('auvent_180_-bas_de_caisse')
    })

    it('écarte les options exclues des images', () => {
        const champ = infos([{ key: 'toit' }, { key: 'galerie', disableImageHandling: true }])
        expect(valeurs(['toit', 'galerie'], 'multiple', champ)).toBe('toit')
    })

    it('ne rend rien si tout est écarté', () => {
        const champ = infos([{ key: 'galerie', disableImageHandling: true }])
        expect(valeurs(['galerie'], 'multiple', champ)).toBeNull()
    })

    it('ne rend rien sur une liste vide ou une forme inattendue', () => {
        expect(valeurs([], 'multiple')).toBeNull()
        expect(valeurs({ options: ['a'] }, 'multiple')).toBeNull()
    })
})

describe('deep_multiple', () => {
    /*
       `fieldInfo` doit porter son `type` : `extractDeepestOptions` s'y fie pour
       refuser de traiter un champ qui n'est pas un `deep_multiple`. C'est la
       forme que produit `detectImageFields`.
    */
    const champ = {
        key: 'parements',
        type: 'deep_multiple',
        field: {
            options: [{
                key: 'mur',
                deepOptions: [{ key: 'teinte', type: 'color_selection', options: [{ key: 'clair' }] }],
            }],
        },
    }

    it('met en forme les feuilles trouvées, triées', () => {
        const rendu = valeurs(
            { mainOptions: ['mur'], deepOptions: { 'mur.teinte': 'clair' } },
            'deep_multiple',
            champ
        )
        expect(rendu).toBe('mur-clair')
    })

    it('ne rend rien sans feuille', () => {
        expect(valeurs({ mainOptions: ['mur'], deepOptions: {} }, 'deep_multiple', champ)).toBeNull()
    })

    /*
       Sans description du champ, la fonction est incapable de distinguer les
       feuilles : elle préfère ne produire aucune URL plutôt qu'une fausse.
    */
    it('ne rend rien sans description du champ', () => {
        expect(valeurs({ mainOptions: ['mur'] }, 'deep_multiple')).toBeNull()
    })
})

describe('select et types non prévus', () => {
    it('normalisent simplement la valeur', () => {
        expect(valeurs('Renault Trafic', 'select')).toBe('renault_trafic')
        expect(valeurs('Valeur Libre', 'inconnu')).toBe('valeur_libre')
    })
})
