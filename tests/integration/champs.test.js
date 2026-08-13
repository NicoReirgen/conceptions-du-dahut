import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import UniqueField from '~~/app/components/van/fields/UniqueField.vue'
import MultipleField from '~~/app/components/van/fields/MultipleField.vue'
import DeepMultipleField from '~~/app/components/van/fields/DeepMultipleField.vue'
import SelectField from '~~/app/components/van/fields/SelectField.vue'
import QuantitySelector from '~~/app/components/van/QuantitySelector.vue'

/*
   Les composants de champ, montés pour de vrai.

   Ce niveau attrape ce que les tests unitaires ne voient pas : un attribut
   écrit en statique là où il fallait une liaison, un émission qui ne part pas,
   un état visuel qui ne suit pas la sélection. Trois des défauts trouvés cette
   semaine étaient exactement de cette nature.
*/

describe('UniqueField', () => {
    const options = [
        { key: 'stratifie', name: 'Stratifié', price: 0, subOptions: [
            { key: 'galet', name: 'Gris Galet', hexa: '#D9D4CB' },
            { key: 'velvet', name: 'Bleu Velvet', hexa: '#1B3A5C' },
        ] },
        { key: 'bouleau', name: 'Bouleau Vernis', price: 1345 },
    ]
    const monter = (modelValue) => mount(UniqueField, {
        props: { modelValue, options, title: 'Finitions' },
    })

    it('rend une carte par option, avec son prix', () => {
        const vue = monter({ main: null })
        const cartes = vue.findAll('.option-card')

        expect(cartes).toHaveLength(2)
        expect(cartes[1].text()).toContain('Bouleau Vernis')
        expect(cartes[1].text()).toContain('+1345€')
    })

    it('n’affiche pas de prix pour une option incluse', () => {
        const carte = monter({ main: null }).findAll('.option-card')[0]
        expect(carte.find('.price').text()).toBe('')
    })

    /*
       `aria-pressed` doit refléter la sélection. Sur `MultipleField`, il était
       écrit en dur à « false » : les cartes retenues s'annonçaient non pressées.
    */
    it('annonce l’option retenue par aria-pressed', () => {
        const cartes = monter({ main: 'bouleau' }).findAll('.option-card')

        expect(cartes[0].attributes('aria-pressed')).toBe('false')
        expect(cartes[1].attributes('aria-pressed')).toBe('true')
    })

    /*
       Le champ n'émet plus de prix : il en calculait un que le configurateur
       jetait pour refaire le sien. Seul le choix remonte.
    */
    it('émet la sélection au clic, sans muter ses props', () => {
        const vue = monter({ main: null })
        vue.findAll('.option-card')[1].trigger('click')

        expect(vue.emitted('update:modelValue')[0][0]).toEqual({ main: 'bouleau', sub: null })
        expect(vue.emitted('update-price')).toBeFalsy()
    })

    it('abandonne le coloris quand la finition change', () => {
        const vue = monter({ main: 'stratifie', sub: 'galet' })
        vue.findAll('.option-card')[1].trigger('click')

        expect(vue.emitted('update:modelValue')[0][0]).toEqual({ main: 'bouleau', sub: null })
    })

    it('retire le coloris déjà retenu si on le reclique', () => {
        const vue = monter({ main: 'stratifie', sub: 'galet' })
        vue.findAll('.sub-option-card')[0].trigger('click')

        expect(vue.emitted('update:modelValue')[0][0]).toEqual({ main: 'stratifie', sub: null })
    })

    it('répond à Entrée comme au clic', () => {
        const vue = monter({ main: null })
        vue.findAll('.option-card')[1].trigger('keydown', { key: 'Enter' })

        expect(vue.emitted('update:modelValue')).toBeTruthy()
    })

    it('ne réémet rien si l’option est déjà retenue', () => {
        const vue = monter({ main: 'bouleau' })
        vue.findAll('.option-card')[1].trigger('click')

        expect(vue.emitted('update:modelValue')).toBeFalsy()
    })

    describe('groupe de coloris', () => {
        it('reste caché tant qu’aucune finition n’est retenue', () => {
            expect(monter({ main: null }).find('.subOptions_wrap').exists()).toBe(false)
        })

        it('paraît avec la finition qui en porte, et se nomme', () => {
            const vue = monter({ main: 'stratifie' })
            const groupe = vue.find('.subOptions_wrap')

            expect(groupe.exists()).toBe(true)
            expect(groupe.attributes('role')).toBe('group')

            const titre = vue.find(`#${groupe.attributes('aria-labelledby')}`)
            expect(titre.exists()).toBe(true)
        })

        it('donne à chaque pastille un libellé français', () => {
            const pastille = monter({ main: 'stratifie' }).find('.sub-option-card')
            expect(pastille.attributes('aria-label')).toBe('Choisir le coloris Gris Galet')
        })
    })

    /*
       Ce champ disait « Choisir l'option X » quand les autres annonçaient le
       nom et le prix. Les cartes partagent désormais un seul libellé.
    */
    it('annonce le prix de l’option, comme les autres champs', () => {
        const carte = monter({ main: null }).findAll('.option-card')[1]

        expect(carte.attributes('aria-label')).toBe('Bouleau Vernis, +1345€')
    })
})

describe('MultipleField', () => {
    const options = [
        { key: 'toit', name: 'Toit relevable', price: 8485, incompatibleWith: ['galerie'] },
        { key: 'galerie', name: 'Galerie', price: 1490, incompatibleWith: ['toit'] },
        { key: 'auvent', name: 'Auvent', price: 1214 },
    ]

    const monter = (retenues) => mount(MultipleField, {
        props: { fieldKey: 'exterieur', options, selectedOptions: { exterieur: retenues } },
    })

    it('marque les cartes retenues, dans la classe et dans aria-pressed', () => {
        const cartes = monter(['galerie']).findAll('.option-card')

        expect(cartes[1].classes()).toContain('selected')
        expect(cartes[1].attributes('aria-pressed')).toBe('true')
        expect(cartes[0].attributes('aria-pressed')).toBe('false')
    })

    it('signale l’option devenue incompatible', () => {
        const cartes = monter(['galerie']).findAll('.option-card')

        expect(cartes[0].classes()).toContain('incompatible')
        expect(cartes[0].text()).toContain('Incompatible avec')
    })

    it('écrit ses libellés d’accessibilité en français', () => {
        const carte = monter([]).findAll('.option-card')[0]
        const libelle = carte.attributes('aria-label')

        expect(libelle).toContain('Toit relevable')
        expect(libelle).not.toMatch(/Price|Option:/)
    })

    it('émet la mise à jour plutôt que d’écrire dans ses props', () => {
        const props = { exterieur: [] }
        const vue = mount(MultipleField, { props: { fieldKey: 'exterieur', options, selectedOptions: props } })

        vue.findAll('.option-card')[2].trigger('click')

        expect(vue.emitted('update-options')).toBeTruthy()
        expect(props.exterieur).toEqual([])   // le prop n'a pas bougé
    })
})

/*
   Ce champ n'avait aucun test : ses branches ne s'atteignent qu'après plusieurs
   clics, dans une étape tardive du tunnel. C'est pourtant lui qui porte le
   ménage le plus délicat — décocher une option doit emporter tout ce qu'elle
   avait ouvert, sur quatre niveaux.
*/
describe('DeepMultipleField', () => {
    const options = [
        {
            key: 'fenetres',
            name: 'Fenêtres',
            price: 500,
            deepOptions: [
                { key: 'coloris', type: 'color_selection', title: 'Coloris', options: [
                    { key: 'noir', name: 'Noir', hexa: '#000000' },
                    { key: 'blanc', name: 'Blanc', hexa: '#FFFFFF', price: 120 },
                ] },
                { key: 'moustiquaire', type: 'checkbox', name: 'Moustiquaire', price: 90 },
                { key: 'store', type: 'unique', title: 'Store', options: [
                    { key: 'manuel', name: 'Manuel', deepOptions: [
                        { key: 'toile', type: 'color_selection', title: 'Toile', options: [
                            { key: 'sable', name: 'Sable', hexa: '#D9D4CB' },
                        ] },
                    ] },
                    { key: 'electrique', name: 'Électrique', price: 340 },
                ] },
            ],
        },
    ]

    const garnie = {
        mainOptions: ['fenetres'],
        deepOptions: { 'fenetres.coloris': 'noir', 'fenetres.store': 'manuel' },
        subDeepOptions: { 'fenetres.store.manuel.toile': 'sable' },
    }

    const monter = (retenues) => mount(DeepMultipleField, {
        props: { fieldKey: 'amenagement', options, selectedOptions: { amenagement: retenues } },
    })

    const emis = (vue) => vue.emitted('update-options')[0][0].value

    it('coche une option principale', () => {
        const vue = monter(undefined)
        vue.find('.option-card').trigger('click')

        expect(emis(vue).mainOptions).toEqual(['fenetres'])
    })

    it('décocher emporte tout ce que l’option avait ouvert', () => {
        const vue = monter(garnie)
        vue.find('.option-card').trigger('click')

        expect(emis(vue)).toEqual({ mainOptions: [], deepOptions: {}, subDeepOptions: {} })
    })

    it('retient un coloris, et le retire si on le reclique', () => {
        const vue = monter(garnie)
        const pastilles = vue.findAll('.sub-option-card')

        pastilles[1].trigger('click')
        expect(emis(vue).deepOptions['fenetres.coloris']).toBe('blanc')

        pastilles[0].trigger('click')
        expect(vue.emitted('update-options')[1][0].value.deepOptions).not.toHaveProperty('fenetres.coloris')
    })

    it('coche une case profonde sous sa propre clé', () => {
        const vue = monter(garnie)
        vue.find('.checkbox-option-card').trigger('click')

        expect(emis(vue).deepOptions['fenetres.moustiquaire']).toBe('moustiquaire')
    })

    /*
       Le cas qui justifiait le ménage par branche : la toile appartient au
       store manuel. En choisir un autre doit l'oublier, sans quoi elle reste
       dans l'état — invisible, et comptée dans le total.
    */
    it('changer de store oublie la toile du précédent', () => {
        const vue = monter(garnie)
        vue.findAll('.unique-option-card')[1].trigger('click')

        expect(emis(vue).deepOptions['fenetres.store']).toBe('electrique')
        expect(emis(vue).subDeepOptions).toEqual({})
    })

    it('retient la toile d’un store sans toucher au reste', () => {
        const vue = monter({ ...garnie, subDeepOptions: {} })
        vue.findAll('.sub-option-card')[2].trigger('click')

        expect(emis(vue).subDeepOptions).toEqual({ 'fenetres.store.manuel.toile': 'sable' })
        expect(emis(vue).deepOptions).toEqual(garnie.deepOptions)
    })

    /*
       Ces cartes et ces pastilles se déclarent `role="button"` sans rien
       annoncer : ni nom, ni état. La couleur d'une pastille n'étant qu'un fond
       CSS, un lecteur d'écran n'y trouvait qu'un bouton vide.
    */
    it('annonce ses cartes et leur état', () => {
        const carte = monter(garnie).find('.option-card')

        expect(carte.attributes('aria-label')).toBe('Fenêtres, +500€')
        expect(carte.attributes('aria-pressed')).toBe('true')
    })

    it('annonce ses pastilles de coloris', () => {
        const pastilles = monter(garnie).findAll('.sub-option-card')

        expect(pastilles[0].attributes('aria-label')).toBe('Choisir le coloris Noir')
        expect(pastilles[0].attributes('aria-pressed')).toBe('true')
        expect(pastilles[1].attributes('aria-pressed')).toBe('false')
    })

    it('rassemble les coloris dans un groupe nommé', () => {
        const vue = monter(garnie)
        const groupe = vue.find('.subOptions_wrap')

        expect(groupe.attributes('role')).toBe('group')
        expect(vue.find(`#${groupe.attributes('aria-labelledby')}`).text()).toBe('Coloris')
    })

    it('n’émet plus de prix — le configurateur le calcule', () => {
        const vue = monter(garnie)
        vue.find('.option-card').trigger('click')

        expect(vue.emitted('update-price')).toBeFalsy()
    })

    it('n’écrit pas dans ses props', () => {
        const retenues = { amenagement: garnie }
        const vue = mount(DeepMultipleField, {
            props: { fieldKey: 'amenagement', options, selectedOptions: retenues },
        })

        vue.find('.option-card').trigger('click')

        expect(retenues.amenagement).toEqual(garnie)
    })
})

describe('SelectField', () => {
    const options = [{ key: 'trafic', name: 'Renault Trafic' }, { key: 'jumpy', name: 'Citroën Jumpy' }]

    /*
       C'était un `div` ouvert au clic, sans tabindex ni rôle : une personne au
       clavier ne pouvait pas choisir de véhicule, et « Suivant » restait
       désactivé. Le natif règle tout cela — encore faut-il qu'il le reste.
    */
    it('emploie un select natif', () => {
        const vue = mount(SelectField, { props: { modelValue: '', options } })
        expect(vue.find('select').exists()).toBe(true)
    })

    it('propose un choix par option, plus l’invite', () => {
        const vue = mount(SelectField, { props: { modelValue: '', options, placeholder: 'Sélectionnez' } })
        const choix = vue.findAll('option')

        expect(choix).toHaveLength(3)
        expect(choix[0].text()).toBe('Sélectionnez')
    })

    it('émet le choix au changement', async () => {
        const vue = mount(SelectField, { props: { modelValue: '', options } })
        await vue.find('select').setValue('jumpy')

        expect(vue.emitted('update:modelValue')[0]).toEqual(['jumpy'])
        expect(vue.emitted('select')[0][0]).toEqual({ key: 'jumpy', value: 'jumpy' })
    })

    it('reflète la valeur reçue', () => {
        const vue = mount(SelectField, { props: { modelValue: 'jumpy', options } })
        expect(vue.find('select').element.value).toBe('jumpy')
    })
})

describe('QuantitySelector', () => {
    const monter = (props) => mount(QuantitySelector, { props: { min: 0, max: 4, ...props } })

    it('affiche la quantité courante', () => {
        expect(monter({ modelValue: 2 }).find('input').element.value).toBe('2')
    })

    it('émet l’incrément et le décrément', () => {
        const vue = monter({ modelValue: 2 })
        const [moins, plus] = vue.findAll('button')

        plus.trigger('click')
        moins.trigger('click')

        expect(vue.emitted('increment')).toBeTruthy()
        expect(vue.emitted('decrement')).toBeTruthy()
    })

    it('bloque aux bornes', () => {
        expect(monter({ modelValue: 0 }).findAll('button')[0].attributes('disabled')).toBeDefined()
        expect(monter({ modelValue: 4 }).findAll('button')[1].attributes('disabled')).toBeDefined()
    })

    /*
       Le champ portait 12 px de padding dans une boîte haute de 21 px imposée
       par le socle du site : le chiffre était intégralement rogné.
    */
    it('ne laisse pas le socle du site rogner le chiffre', () => {
        const champ = monter({ modelValue: 2 }).find('.quantity-input')
        expect(champ.attributes('readonly')).toBeDefined()
        expect(champ.attributes('tabindex')).toBe('-1')
    })
})
