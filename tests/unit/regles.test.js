import { describe, it, expect, vi } from 'vitest'
import { configuratorLogic } from '~~/app/composables/useConfigurator'

/*
   Les règles qui gouvernent le tunnel : incompatibilités entre options,
   option par défaut, validation d'étape, contraste des pastilles de couleur.

   Ce sont elles qui décident si « Suivant » s'active, et quelles options se
   décochent toutes seules. Une régression ici est invisible à la relecture et
   coûteuse à l'usage.
*/

describe('incompatibilités', () => {
    const champ = {
        options: [
            { key: 'toit_relevable', incompatibleWith: ['galerie'] },
            { key: 'galerie', incompatibleWith: ['toit_relevable'] },
            { key: 'bas_de_caisse' },
        ],
    }

    it('reconnaît une paire déclarée incompatible, dans les deux sens', () => {
        expect(configuratorLogic.areOptionsIncompatible(champ, 'toit_relevable', 'galerie')).toBe(true)
        expect(configuratorLogic.areOptionsIncompatible(champ, 'galerie', 'toit_relevable')).toBe(true)
    })

    it('laisse passer une paire sans conflit', () => {
        expect(configuratorLogic.areOptionsIncompatible(champ, 'bas_de_caisse', 'galerie')).toBe(false)
    })

    it('liste les options en conflit avec une option donnée', () => {
        expect(configuratorLogic.getIncompatibleOptions(champ, 'toit_relevable')).toContain('galerie')
    })

    it('retire l’option en conflit quand on en coche une nouvelle', () => {
        const retenues = configuratorLogic.handleIncompatibleOptions(champ, ['galerie'], 'toit_relevable')
        expect(retenues).toContain('toit_relevable')
        expect(retenues).not.toContain('galerie')
    })
})

describe('option par défaut', () => {
    const avecDefaut = {
        hasDefaultOption: true,
        options: [{ key: 'base', isDefault: true }, { key: 'tiroirs' }],
    }
    const sansDefaut = { options: [{ key: 'a' }, { key: 'b' }] }

    it('détecte la présence d’une option par défaut', () => {
        expect(configuratorLogic.hasDefaultOption(avecDefaut)).toBe(true)
        expect(configuratorLogic.hasDefaultOption(sansDefaut)).toBe(false)
    })

    it('la retrouve, et rend null quand il n’y en a pas', () => {
        expect(configuratorLogic.getDefaultOption(avecDefaut)?.key).toBe('base')
        expect(configuratorLogic.getDefaultOption(sansDefaut)).toBeNull()
    })

    /*
       `isOnlyDefaultSelected` couvrait ce cas. Elle n'avait aucun appelant et a
       été supprimée avec le reste de la grappe morte : un test ne rend pas
       vivant du code que personne n'utilise.
    */
})

describe('contraste des pastilles', () => {
    /*
       Décide si la coche posée sur une pastille de couleur s'écrit en blanc ou
       en noir. Le seuil du code est de 3:1 contre le blanc.
    */
    it('demande une coche claire sur les teintes sombres', () => {
        expect(configuratorLogic.hasEnoughContrast('#000000')).toBe(true)
        expect(configuratorLogic.hasEnoughContrast('#1B3A5C')).toBe(true)
    })

    it('ne la demande pas sur les teintes claires', () => {
        expect(configuratorLogic.hasEnoughContrast('#FFFFFF')).toBe(false)
        expect(configuratorLogic.hasEnoughContrast('#E8E2D5')).toBe(false)
    })
})

describe('mise en forme du prix', () => {
    it('produit un montant en euros à la française', () => {
        const rendu = configuratorLogic.formatPrice(8417)
        expect(rendu).toContain('8')
        expect(rendu).toContain('417')
        expect(rendu).toContain('€')
        expect(rendu).toContain(',00')
    })

    it('accepte zéro', () => {
        expect(configuratorLogic.formatPrice(0)).toContain('0,00')
    })
})

describe('clavier', () => {
    /*
       Les cartes d'option sont des `div` avec `role="button"` : c'est ce
       gestionnaire qui leur donne Entrée et Espace. Sans lui, le configurateur
       redevient inutilisable au clavier.
    */
    it('déclenche l’action sur Entrée et sur Espace', () => {
        for (const key of ['Enter', ' ']) {
            const action = vi.fn()
            const evenement = { key, preventDefault: vi.fn() }

            configuratorLogic.handleKeyDown(evenement, action)

            expect(action).toHaveBeenCalledOnce()
            expect(evenement.preventDefault).toHaveBeenCalledOnce()
        }
    })

    it('laisse passer les autres touches', () => {
        const action = vi.fn()
        configuratorLogic.handleKeyDown({ key: 'Tab', preventDefault: vi.fn() }, action)
        expect(action).not.toHaveBeenCalled()
    })
})
