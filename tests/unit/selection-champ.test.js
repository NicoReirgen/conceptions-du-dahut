import { describe, it, expect } from 'vitest'
import { avecOption, basculer, lireSelection, optionsEcartees, sansBranche } from '~~/app/composables/useSelectionChamp'

/*
   Les trois gestes que les champs profonds enchaînaient chacun de leur côté.

   Ils étaient recopiés onze fois, jamais éprouvés : leurs défauts ne se
   voyaient qu'au clic, sur une branche du tunnel qu'il fallait atteindre.
*/

describe('lireSelection', () => {
    const forme = { mainOptions: [], deepOptions: {} }

    it('rend la forme vide quand le champ n’a rien reçu', () => {
        expect(lireSelection({}, 'amenagement', forme)).toEqual(forme)
    })

    it('rend la forme vide devant une valeur d’une autre forme', () => {
        // Un tableau laissé par une version précédente de l'état.
        expect(lireSelection({ amenagement: ['toit'] }, 'amenagement', forme)).toEqual(forme)
    })

    it('complète les propriétés absentes sans toucher aux autres', () => {
        const lu = lireSelection({ amenagement: { mainOptions: ['toit'] } }, 'amenagement', forme)

        expect(lu).toEqual({ mainOptions: ['toit'], deepOptions: {} })
    })

    /*
       Deux lectures ne doivent pas partager la même table vide : les
       gestionnaires écrivent dedans après l'avoir recopiée, et une table
       partagée ferait passer une sélection d'un champ à l'autre.
    */
    it('ne partage jamais ses valeurs vides', () => {
        const premiere = lireSelection({}, 'amenagement', forme)
        premiere.deepOptions['toit.coloris'] = 'noir'

        expect(lireSelection({}, 'amenagement', forme).deepOptions).toEqual({})
        expect(forme.deepOptions).toEqual({})
    })
})

describe('basculer', () => {
    it('retient une valeur pour un chemin libre', () => {
        expect(basculer({}, 'toit.coloris', 'noir')).toEqual({ 'toit.coloris': 'noir' })
    })

    it('remplace la valeur retenue par une autre', () => {
        expect(basculer({ 'toit.coloris': 'noir' }, 'toit.coloris', 'blanc')).toEqual({ 'toit.coloris': 'blanc' })
    })

    it('oublie la valeur si c’était déjà elle', () => {
        expect(basculer({ 'toit.coloris': 'noir' }, 'toit.coloris', 'noir')).toEqual({})
    })

    it('laisse la table d’origine intacte — elle vient d’un prop', () => {
        const table = { 'toit.coloris': 'noir' }
        basculer(table, 'toit.coloris', 'blanc')

        expect(table).toEqual({ 'toit.coloris': 'noir' })
    })
})

describe('sansBranche', () => {
    const table = {
        'toit.coloris': 'noir',
        'toit.store': 'manuel',
        'galerie.coloris': 'gris',
    }

    it('oublie tout ce qui pend sous un chemin', () => {
        expect(sansBranche(table, 'toit.')).toEqual({ 'galerie.coloris': 'gris' })
    })

    it('ne confond pas deux clés de même début', () => {
        expect(sansBranche({ toiture: 'a', 'toit.x': 'b' }, 'toit.')).toEqual({ toiture: 'a' })
    })

    it('accepte une table absente', () => {
        expect(sansBranche(undefined, 'toit.')).toEqual({})
    })
})

describe('avecOption', () => {
    const options = [
        { key: 'toit', name: 'Toit relevable', incompatibleWith: ['galerie'] },
        { key: 'galerie', name: 'Galerie', incompatibleWith: ['toit'] },
        { key: 'auvent', name: 'Auvent' },
    ]

    it('ajoute une option qui n’exclut rien', () => {
        expect(avecOption(options, ['toit'], 'auvent')).toEqual(['toit', 'auvent'])
    })

    it('écarte ce que la nouvelle option exclut', () => {
        expect(avecOption(options, ['galerie', 'auvent'], 'toit')).toEqual(['auvent', 'toit'])
    })

    it('n’inscrit pas deux fois une option déjà retenue', () => {
        expect(avecOption(options, ['auvent'], 'auvent')).toEqual(['auvent'])
    })

    it('nomme les options écartées, pour qu’on nettoie ce qu’elles portaient', () => {
        expect(optionsEcartees(options, ['galerie', 'auvent'], 'toit')).toEqual(['galerie'])
    })
})
