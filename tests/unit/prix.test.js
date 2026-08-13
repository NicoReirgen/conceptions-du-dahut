import { describe, it, expect } from 'vitest'
import { configuratorLogic } from '~~/app/composables/useConfigurator'

/*
   Calcul du prix d'un champ.

   C'est la fonction qui décide de ce que le visiteur voit s'afficher, et la
   plus complexe du module : 119 lignes, un `switch` sur sept types de champ.
   Elle est aussi celle qu'on veut découper — d'où ces cas, écrits avant le
   découpage pour qu'il se fasse à comportement constant.

   Les champs sont volontairement minimaux : on teste la règle de calcul, pas
   la forme du catalogue.
*/
describe('calculateFieldPrice', () => {
    it('rend zéro quand il manque le champ ou la sélection', () => {
        expect(configuratorLogic.calculateFieldPrice(null, { main: 'a' })).toBe(0)
        expect(configuratorLogic.calculateFieldPrice({ type: 'unique' }, null)).toBe(0)
    })

    it('ignore un type de champ qu’il ne connaît pas', () => {
        const champ = { type: 'inconnu', options: [{ key: 'a', price: 500 }] }
        expect(configuratorLogic.calculateFieldPrice(champ, 'a')).toBe(0)
    })

    describe('select', () => {
        const champ = { type: 'select', options: [{ key: 'trafic', price: 0 }, { key: 'jumpy', price: 300 }] }

        it('prend le prix de l’option désignée par sa clé', () => {
            expect(configuratorLogic.calculateFieldPrice(champ, 'jumpy')).toBe(300)
        })

        it('rend zéro pour une clé absente du catalogue', () => {
            expect(configuratorLogic.calculateFieldPrice(champ, 'inexistant')).toBe(0)
        })
    })

    describe('unique', () => {
        const champ = {
            type: 'unique',
            options: [
                { key: 'stratifie', price: 0, subOptions: [{ key: 'galet', price: 0 }, { key: 'velvet', price: 120 }] },
                { key: 'bouleau', price: 1345 },
            ],
        }

        it('additionne l’option principale et sa sous-option', () => {
            expect(configuratorLogic.calculateFieldPrice(champ, { main: 'stratifie', sub: 'velvet' })).toBe(120)
            expect(configuratorLogic.calculateFieldPrice(champ, { main: 'bouleau' })).toBe(1345)
        })

        it('n’ajoute rien pour une sous-option qui n’existe pas', () => {
            expect(configuratorLogic.calculateFieldPrice(champ, { main: 'stratifie', sub: 'fantome' })).toBe(0)
        })
    })

    describe('multiple', () => {
        /*
           L'option par défaut porte ici un prix non nul, et le marqueur est
           bien `isDefault` — celui que lit le code. Avec `default: true` et un
           prix à zéro, le test passait sans jamais éprouver l'exclusion.
        */
        const champ = {
            type: 'multiple',
            hasDefaultOption: true,
            options: [
                { key: 'base', price: 700, isDefault: true },
                { key: 'tiroirs', price: 1454 },
                { key: 'rangements', price: 1763 },
            ],
        }

        it('additionne les options cochées', () => {
            expect(configuratorLogic.calculateFieldPrice(champ, ['tiroirs', 'rangements'])).toBe(3217)
        })

        it('exclut l’option par défaut du total, même si elle a un prix', () => {
            expect(configuratorLogic.calculateFieldPrice(champ, ['base', 'tiroirs'])).toBe(1454)
        })

        it('rend zéro sur une liste vide', () => {
            expect(configuratorLogic.calculateFieldPrice(champ, [])).toBe(0)
        })
    })

    describe('openings — les quantités', () => {
        const champ = {
            type: 'openings',
            options: { main: { options: [{ key: 'fixe', price: 366 }, { key: 'coulissante', price: 464 }] } },
        }

        it('multiplie le prix par la quantité', () => {
            expect(configuratorLogic.calculateFieldPrice(
                champ, { quantities: { fixe: 2, coulissante: 1 } }
            )).toBe(366 * 2 + 464)
        })

        it('ignore les quantités nulles', () => {
            expect(configuratorLogic.calculateFieldPrice(champ, { quantities: { fixe: 0 } })).toBe(0)
        })
    })
})

/*
   `deep_multiple` est la branche la plus profonde du calcul : options
   principales, options profondes de trois types, et un quatrième niveau pour
   les coloris d'une option profonde unique. Ces cas sont écrits avant le
   découpage de la fonction, pour qu'il se fasse à comportement constant.
*/
describe('calculateFieldPrice — deep_multiple', () => {
    const champ = {
        type: 'deep_multiple',
        options: [
            {
                key: 'parements',
                price: 200,
                deepOptions: [
                    { key: 'teinte', type: 'color_selection', options: [{ key: 'clair', price: 40 }] },
                    { key: 'vernis', type: 'checkbox', price: 90 },
                    {
                        key: 'essence',
                        type: 'unique',
                        options: [
                            {
                                key: 'bouleau',
                                price: 300,
                                deepOptions: [
                                    { key: 'finition', type: 'color_selection', options: [{ key: 'mat', price: 25 }] },
                                ],
                            },
                        ],
                    },
                ],
            },
            { key: 'sol', price: 150, deepOptions: [] },
        ],
    }

    it('additionne les options principales cochées', () => {
        expect(configuratorLogic.calculateFieldPrice(champ, { mainOptions: ['parements', 'sol'] })).toBe(350)
    })

    it('ajoute le coloris d’une option profonde', () => {
        expect(configuratorLogic.calculateFieldPrice(champ, {
            mainOptions: ['parements'],
            deepOptions: { 'parements.teinte': 'clair' },
        })).toBe(240)
    })

    it('ne compte la case à cocher que si elle porte sa propre clé', () => {
        expect(configuratorLogic.calculateFieldPrice(champ, {
            mainOptions: ['parements'], deepOptions: { 'parements.vernis': 'vernis' },
        })).toBe(290)

        expect(configuratorLogic.calculateFieldPrice(champ, {
            mainOptions: ['parements'], deepOptions: { 'parements.vernis': 'autre' },
        })).toBe(200)
    })

    it('descend jusqu’au coloris d’une option profonde unique', () => {
        expect(configuratorLogic.calculateFieldPrice(champ, {
            mainOptions: ['parements'],
            deepOptions: { 'parements.essence': 'bouleau' },
            subDeepOptions: { 'parements.essence.bouleau.finition': 'mat' },
        })).toBe(200 + 300 + 25)
    })

    it('ignore une option principale absente du catalogue', () => {
        expect(configuratorLogic.calculateFieldPrice(champ, { mainOptions: ['fantome'] })).toBe(0)
    })

    it('rend zéro sans sélection principale', () => {
        expect(configuratorLogic.calculateFieldPrice(champ, { mainOptions: [] })).toBe(0)
        expect(configuratorLogic.calculateFieldPrice(champ, { deepOptions: {} })).toBe(0)
    })
})
