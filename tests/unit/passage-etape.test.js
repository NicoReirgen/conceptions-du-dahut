import { describe, it, expect, vi } from 'vitest'
import { configuratorLogic } from '~~/app/composables/useConfigurator'

/*
   Un champ laisse-t-il passer à l'étape suivante ?

   C'est cette règle qui active ou désactive « Suivant ». Elle vivait dans un
   `computed` du composant, où elle pesait 153 lignes sur 176 — impossible à
   éprouver autrement qu'en cliquant.

   Ces cas décrivent le comportement d'aujourd'hui, avant découpage. Y compris
   ses bizarreries : elles sont signalées comme telles plutôt que corrigées en
   passant, pour que le découpage reste à comportement constant.
*/

const passe = (field, valeur, ecrire) =>
    configuratorLogic.champLaissePasser(field, valeur, ecrire)

describe('select', () => {
    const champ = { type: 'select', options: [{ key: 'trafic' }] }

    it('exige une valeur', () => {
        expect(passe(champ, 'trafic')).toBe(true)
        expect(passe(champ, '')).toBe(false)
        expect(passe(champ, undefined)).toBe(false)
    })
})

describe('unique', () => {
    it('exige une option principale', () => {
        const champ = { type: 'unique', options: [{ key: 'bouleau' }] }

        expect(passe(champ, { main: 'bouleau' })).toBe(true)
        expect(passe(champ, {})).toBe(false)
        expect(passe(champ, undefined)).toBe(false)
    })

    describe('avec des sous-options', () => {
        const avecColoris = (required) => ({
            type: 'unique',
            options: [{ key: 'stratifie', subOptions: [{ key: 'galet', required }] }],
        })

        it('exige un coloris quand il est obligatoire', () => {
            const champ = avecColoris(true)

            expect(passe(champ, { main: 'stratifie' })).toBe(false)
            expect(passe(champ, { main: 'stratifie', sub: 'galet' })).toBe(true)
        })

        /*
           Le code teste `subOpt.required !== false` : une sous-option sans
           marqueur est donc considérée obligatoire. Seul un `false` explicite
           la rend facultative.
        */
        it('traite une sous-option sans marqueur comme obligatoire', () => {
            const champ = { type: 'unique', options: [{ key: 'stratifie', subOptions: [{ key: 'galet' }] }] }
            expect(passe(champ, { main: 'stratifie' })).toBe(false)
        })

        it('laisse passer quand aucune sous-option n’est obligatoire', () => {
            expect(passe(avecColoris(false), { main: 'stratifie' })).toBe(true)
        })

        it('refuse un coloris qui n’existe pas', () => {
            expect(passe(avecColoris(true), { main: 'stratifie', sub: 'fantome' })).toBe(false)
        })
    })
})

describe('multiple', () => {
    describe('sans option par défaut', () => {
        const obligatoire = { type: 'multiple', required: true, options: [{ key: 'a' }, { key: 'b' }] }
        const facultatif = { type: 'multiple', options: [{ key: 'a' }, { key: 'b' }] }

        it('exige une sélection quand le champ est obligatoire', () => {
            expect(passe(obligatoire, [])).toBe(false)
            expect(passe(obligatoire, ['a'])).toBe(true)
        })

        it('laisse passer un champ facultatif vide', () => {
            expect(passe(facultatif, [])).toBe(true)
        })

        it('exige le coloris des options qui en réclament', () => {
            const champ = {
                type: 'multiple',
                options: [{ key: 'a', subOptions: [{ key: 'rouge' }] }],
            }

            expect(passe(champ, { options: ['a'], subOptions: {} })).toBe(false)
            expect(passe(champ, { options: ['a'], subOptions: { a: 'rouge' } })).toBe(true)
        })
    })

    describe('avec option par défaut', () => {
        const champ = {
            type: 'multiple',
            hasDefaultOption: true,
            options: [{ key: 'base', isDefault: true }, { key: 'tiroirs' }],
        }

        /*
           Le seul effet de bord de la fonction : sans sélection, elle active
           l'option par défaut. Le calcul d'origine écrivait directement dans
           l'état du composant ; il passe désormais par `ecrire`.
        */
        it('active l’option par défaut quand rien n’est retenu', () => {
            const ecrire = vi.fn()

            expect(passe(champ, [], ecrire)).toBe(true)
            expect(ecrire).toHaveBeenCalledOnce()
            expect(ecrire.mock.calls[0][0]).toContain('base')
        })

        it('n’écrit rien quand une sélection existe déjà', () => {
            const ecrire = vi.fn()

            expect(passe(champ, ['tiroirs'], ecrire)).toBe(true)
            expect(ecrire).not.toHaveBeenCalled()
        })

        it('se passe d’un `ecrire` fourni', () => {
            expect(() => passe(champ, [])).not.toThrow()
        })
    })
})

describe('deep_multiple', () => {
    const champ = {
        type: 'deep_multiple',
        options: [{
            key: 'parements',
            deepOptions: [
                { key: 'teinte', type: 'color_selection', options: [{ key: 'clair' }] },
                { key: 'pose', type: 'checkbox' },
            ],
        }],
    }

    it('exige au moins une option principale', () => {
        expect(passe(champ, { mainOptions: [] })).toBe(false)
        expect(passe(champ, undefined)).toBe(false)
    })

    it('exige un choix pour chaque coloris ouvert', () => {
        expect(passe(champ, { mainOptions: ['parements'], deepOptions: {} })).toBe(false)
        expect(passe(champ, {
            mainOptions: ['parements'],
            deepOptions: { 'parements.teinte': 'clair' },
        })).toBe(true)
    })

    it('n’exige rien d’une case à cocher', () => {
        const sansColoris = { type: 'deep_multiple', options: [{ key: 'a', deepOptions: [{ key: 'p', type: 'checkbox' }] }] }
        expect(passe(sansColoris, { mainOptions: ['a'], deepOptions: {} })).toBe(true)
    })

    it('descend au niveau suivant quand une option unique en ouvre un', () => {
        const profond = {
            type: 'deep_multiple',
            options: [{
                key: 'a',
                deepOptions: [{
                    key: 'essence',
                    type: 'unique',
                    options: [{
                        key: 'bouleau',
                        deepOptions: [{ key: 'finition', type: 'color_selection' }],
                    }],
                }],
            }],
        }

        expect(passe(profond, {
            mainOptions: ['a'], deepOptions: { 'a.essence': 'bouleau' }, subDeepOptions: {},
        })).toBe(false)

        expect(passe(profond, {
            mainOptions: ['a'],
            deepOptions: { 'a.essence': 'bouleau' },
            subDeepOptions: { 'a.essence.bouleau.finition': 'mat' },
        })).toBe(true)
    })
})

describe('openings', () => {
    const champ = {
        type: 'openings',
        options: { main: { options: [{ key: 'fixe', quantity: { min: 0, max: 4 } }] } },
    }

    it('laisse passer sans aucune fenêtre', () => {
        expect(passe(champ, { quantities: {} })).toBe(true)
        expect(passe(champ, undefined)).toBe(true)
    })

    it('vérifie les bornes de quantité', () => {
        expect(passe(champ, { quantities: { fixe: 2 } })).toBe(true)
        expect(passe(champ, { quantities: { fixe: 9 } })).toBe(false)
    })
})

describe('types non gérés', () => {
    it('laissent passer', () => {
        expect(passe({ type: 'presentation' }, undefined)).toBe(true)
        expect(passe({ type: 'inconnu' }, 'peu importe')).toBe(true)
    })
})
