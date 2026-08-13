import { describe, it, expect } from 'vitest'
import { resumeConfiguration } from '~~/app/composables/useResumeConfiguration'

/*
   Récapitulatif d'une configuration.

   Il alimente deux choses : l'étape « Résumé » que voit le visiteur, et la
   charge utile du devis. Jusqu'ici chacune avait sa version, et celle du devis
   était cassée — elle testait des types de champ sur des étapes et ne rendait
   jamais que la ligne du véhicule.

   Ces cas fixent le contrat de l'implémentation unique : une entrée par étape
   ayant au moins une option retenue, chacune portant `stepKey`, `stepName` et
   une liste `options` de `{ name, price, pricePrefix }`.
*/

const etape = (key, name, fields) => ({ key, name, fields })

describe('structure du récapitulatif', () => {
    it('ne rend rien sans étape', () => {
        expect(resumeConfiguration([], {})).toEqual([])
    })

    it('écarte les étapes sans champ', () => {
        expect(resumeConfiguration([{ key: 'vide', name: 'Vide' }], {})).toEqual([])
    })

    it('écarte les étapes dont rien n’est retenu', () => {
        const etapes = [etape('finitions', 'Finitions', [
            { key: 'finitions', type: 'unique', options: [{ key: 'bouleau', name: 'Bouleau', price: 100 }] },
        ])]

        expect(resumeConfiguration(etapes, {})).toEqual([])
    })

    it('nomme chaque groupe d’après l’étape', () => {
        const etapes = [etape('finitions', 'Finitions', [
            { key: 'finitions', type: 'select', options: [{ key: 'bouleau', name: 'Bouleau', price: 100 }] },
        ])]

        const [groupe] = resumeConfiguration(etapes, { finitions: 'bouleau' })

        expect(groupe.stepKey).toBe('finitions')
        expect(groupe.stepName).toBe('Finitions')
        expect(groupe.options).toEqual([{ name: 'Bouleau', price: 100, pricePrefix: '' }])
    })

    /*
       C'est la descente que l'ancienne version du devis ne faisait pas : le
       catalogue range ses étapes sous des sous-étapes.
    */
    it('descend dans les sous-étapes', () => {
        const etapes = [{
            key: 'personnalisation',
            subSteps: [
                etape('finitions', 'Finitions', [
                    { key: 'finitions', type: 'select', options: [{ key: 'a', name: 'A', price: 10 }] },
                ]),
                etape('isolation', 'Isolation', [
                    { key: 'isolation', type: 'select', options: [{ key: 'b', name: 'B', price: 20 }] },
                ]),
            ],
        }]

        const groupes = resumeConfiguration(etapes, { finitions: 'a', isolation: 'b' })

        expect(groupes.map((g) => g.stepName)).toEqual(['Finitions', 'Isolation'])
    })
})

describe('champs simples — select et unique', () => {
    const champ = {
        key: 'finitions',
        type: 'unique',
        options: [{
            key: 'stratifie',
            name: 'Stratifié',
            price: 0,
            subOptions: [{ key: 'velvet', name: 'Bleu Velvet', price: 120 }],
        }],
    }
    const etapes = [etape('f', 'Finitions', [champ])]

    it('joint le nom de la sous-option et additionne son prix', () => {
        const [groupe] = resumeConfiguration(etapes, { finitions: { main: 'stratifie', sub: 'velvet' } })

        expect(groupe.options).toEqual([{ name: 'Stratifié - Bleu Velvet', price: 120, pricePrefix: '' }])
    })

    it('se limite à l’option principale sans sous-option', () => {
        const [groupe] = resumeConfiguration(etapes, { finitions: { main: 'stratifie' } })

        expect(groupe.options[0].name).toBe('Stratifié')
    })

    it('conserve le préfixe de prix', () => {
        const avecPrefixe = [etape('e', 'E', [{
            key: 'toit', type: 'select',
            options: [{ key: 'sca', name: 'Toit SCA', price: 8485, pricePrefix: 'à partir de ' }],
        }])]

        const [groupe] = resumeConfiguration(avecPrefixe, { toit: 'sca' })
        expect(groupe.options[0].pricePrefix).toBe('à partir de ')
    })
})

describe('champs à choix multiple', () => {
    const champ = {
        key: 'equipements',
        type: 'multiple',
        options: [
            { key: 'eau', name: 'Pack eau', price: 502 },
            { key: 'chauffage', name: 'Chauffage', price: 1494 },
        ],
    }
    const etapes = [etape('e', 'Équipements', [champ])]

    it('rend une ligne par option cochée', () => {
        const [groupe] = resumeConfiguration(etapes, { equipements: ['eau', 'chauffage'] })

        expect(groupe.options.map((o) => o.name)).toEqual(['Pack eau', 'Chauffage'])
        expect(groupe.options.map((o) => o.price)).toEqual([502, 1494])
    })

    it('accepte aussi la forme complexe', () => {
        const [groupe] = resumeConfiguration(etapes, { equipements: { options: ['eau'] } })
        expect(groupe.options).toHaveLength(1)
    })

    /*
       Le coloris d'une option cochée.

       `MultipleField` en retient un seul par option et l'écrit sous forme de
       clé ; le récapitulatif n'acceptait qu'un tableau et laissait donc tomber
       la ligne — dans l'affichage comme dans la demande de devis.
    */
    it('nomme le coloris retenu sous une option', () => {
        const avecColoris = [etape('h', 'Housses', [{
            key: 'housses', type: 'multiple',
            options: [{
                key: 'banquette',
                name: 'Banquette',
                price: 300,
                subOptions: [{ key: 'ecru', name: 'Écru', price: 90 }],
            }],
        }])]

        const [groupe] = resumeConfiguration(avecColoris, {
            housses: { options: ['banquette'], subOptions: { banquette: 'ecru' } },
        })

        expect(groupe.options.map((o) => o.name)).toEqual(['Banquette', 'Banquette - Écru'])
        expect(groupe.options.map((o) => o.price)).toEqual([300, 90])
    })

    it('accepte aussi plusieurs coloris sous une même option', () => {
        const avecColoris = [etape('h', 'Housses', [{
            key: 'housses', type: 'multiple',
            options: [{
                key: 'banquette',
                name: 'Banquette',
                subOptions: [{ key: 'ecru', name: 'Écru' }, { key: 'anthracite', name: 'Anthracite' }],
            }],
        }])]

        const [groupe] = resumeConfiguration(avecColoris, {
            housses: { options: ['banquette'], subOptions: { banquette: ['ecru', 'anthracite'] } },
        })

        expect(groupe.options).toHaveLength(3)
    })
})

describe('ouvrants', () => {
    const etapes = [etape('o', 'Ouvrants', [{
        key: 'ouvertures',
        type: 'openings',
        options: {
            main: { options: [{ key: 'fixe', name: 'Fenêtre fixe', price: 366 }] },
            optional: { name: 'Moustiquaire', price: 200 },
        },
    }])]

    it('multiplie par la quantité', () => {
        const [groupe] = resumeConfiguration(etapes, { ouvertures: { quantities: { fixe: 3 } } })

        expect(groupe.options[0].name).toContain('Fenêtre fixe')
        expect(groupe.options[0].price).toBe(1098)
    })

    it('ajoute l’option facultative quand elle est retenue', () => {
        const [groupe] = resumeConfiguration(etapes, {
            ouvertures: { quantities: { fixe: 1 }, optional: true },
        })

        expect(groupe.options.map((o) => o.name)).toContain('Moustiquaire')
    })
})

describe('champs profonds', () => {
    const etapes = [etape('p', 'Parements', [{
        key: 'parements',
        type: 'deep_multiple',
        options: [{
            key: 'mur',
            name: 'Mur',
            price: 200,
            deepOptions: [{ key: 'teinte', type: 'color_selection', options: [{ key: 'clair', name: 'Clair', price: 40 }] }],
        }],
    }])]

    it('rend l’option principale et son coloris', () => {
        const [groupe] = resumeConfiguration(etapes, {
            parements: { mainOptions: ['mur'], deepOptions: { 'mur.teinte': 'clair' } },
        })

        const noms = groupe.options.map((o) => o.name)
        expect(noms.some((n) => n.includes('Mur'))).toBe(true)
        expect(noms.some((n) => n.includes('Clair'))).toBe(true)
    })
})
