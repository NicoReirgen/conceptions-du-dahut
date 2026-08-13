import { describe, it, expect } from 'vitest'
import { imageSystem } from '~~/app/composables/useVehicleImages'

/*
   Recherche des « feuilles » de sélection : les options les plus profondes
   effectivement retenues, dont les clés composent le nom du fichier image.

   C'est la fonction la plus imbriquée du module — six niveaux — et celle qui
   décide de ce que le visiteur voit dans l'aperçu. Elle n'avait aucun test.
   Ces cas sont écrits avant son découpage, pour qu'il se fasse à comportement
   constant.

   Convention observée : les segments sont joints par un tiret, et `mainKey`
   ouvre toujours le chemin.
*/

const trouver = (deepOptions, selection, mainKey = 'finitions') =>
    imageSystem.findDeepestInBranch(deepOptions, selection, mainKey)

describe('findDeepestInBranch', () => {
    it('ne rend rien sans sélection', () => {
        const options = [{ key: 'teinte', type: 'color_selection', options: [{ key: 'clair' }] }]
        expect(trouver(options, { deepOptions: {} })).toEqual([])
    })

    describe('coloris', () => {
        const options = [{
            key: 'teinte',
            type: 'color_selection',
            options: [{ key: 'clair' }, { key: 'fonce', disableImageHandling: true }],
        }]

        it('compose le chemin à partir de la clé retenue', () => {
            expect(trouver(options, { deepOptions: { 'finitions.teinte': 'clair' } }))
                .toEqual(['finitions-clair'])
        })

        it('écarte un coloris exclu des images', () => {
            expect(trouver(options, { deepOptions: { 'finitions.teinte': 'fonce' } })).toEqual([])
        })
    })

    describe('case à cocher', () => {
        const options = [{ key: 'vernis', type: 'checkbox' }]

        it('retient la case quand la valeur porte sa propre clé', () => {
            expect(trouver(options, { deepOptions: { 'finitions.vernis': 'vernis' } }))
                .toEqual(['finitions-vernis'])
        })

        it('accepte aussi un booléen', () => {
            expect(trouver(options, { deepOptions: { 'finitions.vernis': true } }))
                .toEqual(['finitions-vernis'])
        })

        it('ignore toute autre valeur', () => {
            expect(trouver(options, { deepOptions: { 'finitions.vernis': 'autre' } })).toEqual([])
            expect(trouver(options, { deepOptions: { 'finitions.vernis': false } })).toEqual([])
        })
    })

    describe('option unique', () => {
        it('est terminale quand elle n’ouvre rien', () => {
            const options = [{ key: 'essence', type: 'unique', options: [{ key: 'bouleau' }] }]
            expect(trouver(options, { deepOptions: { 'finitions.essence': 'bouleau' } }))
                .toEqual(['finitions-bouleau'])
        })

        it('descend d’un cran quand elle ouvre des coloris', () => {
            const options = [{
                key: 'essence',
                type: 'unique',
                options: [{
                    key: 'bouleau',
                    deepOptions: [{ key: 'finition', type: 'color_selection', options: [{ key: 'mat' }] }],
                }],
            }]

            const chemins = trouver(options, {
                deepOptions: { 'finitions.essence': 'bouleau' },
                subDeepOptions: { 'finitions.essence.bouleau.finition': 'mat' },
            })

            expect(chemins).toEqual(['finitions-bouleau-mat'])
        })

        /*
           Si l'option ouvre un niveau supplémentaire mais qu'aucune feuille n'y
           est retenue, rien n'est produit — pas même le chemin partiel.
        */
        it('ne rend rien si le niveau ouvert reste vide', () => {
            const options = [{
                key: 'essence',
                type: 'unique',
                options: [{
                    key: 'bouleau',
                    deepOptions: [{ key: 'finition', type: 'color_selection', options: [{ key: 'mat' }] }],
                }],
            }]

            expect(trouver(options, { deepOptions: { 'finitions.essence': 'bouleau' }, subDeepOptions: {} }))
                .toEqual([])
        })

        it('écarte une option exclue des images', () => {
            const options = [{
                key: 'essence',
                type: 'unique',
                options: [{ key: 'bouleau', disableImageHandling: true }],
            }]
            expect(trouver(options, { deepOptions: { 'finitions.essence': 'bouleau' } })).toEqual([])
        })
    })

    it('écarte une option profonde entièrement exclue des images', () => {
        const options = [
            { key: 'teinte', type: 'color_selection', disableImageHandling: true, options: [{ key: 'clair' }] },
            { key: 'vernis', type: 'checkbox' },
        ]

        expect(trouver(options, {
            deepOptions: { 'finitions.teinte': 'clair', 'finitions.vernis': 'vernis' },
        })).toEqual(['finitions-vernis'])
    })

    it('ignore les types qu’elle ne connaît pas', () => {
        const options = [{ key: 'note', type: 'textarea' }]
        expect(trouver(options, { deepOptions: { 'finitions.note': 'un texte' } })).toEqual([])
    })

    it('accumule les feuilles de plusieurs options profondes, dans l’ordre', () => {
        const options = [
            { key: 'teinte', type: 'color_selection', options: [{ key: 'clair' }] },
            { key: 'vernis', type: 'checkbox' },
        ]

        expect(trouver(options, {
            deepOptions: { 'finitions.teinte': 'clair', 'finitions.vernis': 'vernis' },
        })).toEqual(['finitions-clair', 'finitions-vernis'])
    })
})

describe('findDeepestInSubBranch', () => {
    /*
       Le niveau le plus profond ne traite que les coloris, et rend la valeur
       brute — c'est l'appelant qui compose le chemin.
    */
    it('rend la valeur retenue, sans la préfixer', () => {
        const options = [{ key: 'finition', type: 'color_selection', options: [{ key: 'mat' }] }]
        expect(imageSystem.findDeepestInSubBranch(options, { 'a.b.finition': 'mat' }, 'a.b'))
            .toEqual(['mat'])
    })

    it('écarte un coloris exclu des images', () => {
        const options = [{
            key: 'finition',
            type: 'color_selection',
            options: [{ key: 'mat', disableImageHandling: true }],
        }]
        expect(imageSystem.findDeepestInSubBranch(options, { 'a.b.finition': 'mat' }, 'a.b')).toEqual([])
    })

    it('ne traite que les coloris', () => {
        const options = [{ key: 'taille', type: 'unique', options: [{ key: 'L1' }] }]
        expect(imageSystem.findDeepestInSubBranch(options, { 'a.b.taille': 'L1' }, 'a.b')).toEqual([])
    })
})
