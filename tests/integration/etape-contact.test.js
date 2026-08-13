import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import ContactStep from '~~/app/components/van/ContactStep.vue'

/*
   L'étape de contact du configurateur, qui adresse ses demandes au même point
   d'entrée `devis` que la modale du site.

   Deux défauts s'y cachaient, invisibles tant que le site reste une vitrine :
   la demande partait deux fois, et le succès se lisait sur un champ que seul le
   mode vitrine produit.
*/

const CHAMPS = [
    { key: 'contact.nom', type: 'text', placeholder: 'Nom *', required: true },
    { key: 'contact.prenom', type: 'text', placeholder: 'Prénom *', required: true },
    { key: 'contact.email', type: 'email', placeholder: 'Email *', required: true },
    { key: 'contact.telephone', type: 'tel', placeholder: 'Téléphone *', required: true },
    { key: 'contact.message', type: 'textarea', placeholder: 'Message', required: false },
]

const VEHICULE = { id: 'orion', name: 'Orion', price: 5900 }

const ETAPES = [
    {
        type: 'group',
        title: 'Finitions',
        fields: [{ key: 'finitions', type: 'unique', title: 'Finitions', options: [{ key: 'bouleau', name: 'Bouleau', price: 1345 }] }],
    },
]

let envois

const monter = () => mount(ContactStep, {
    props: {
        content: { fields: CHAMPS },
        name: 'Formulaire',
        selectedVehicle: VEHICULE,
        selectedOptions: { finitions: { main: 'bouleau' } },
        totalPrice: 7245,
        vehicleSteps: ETAPES,
    },
})

const remplir = async (vue) => {
    const champs = vue.findAll('input')

    await champs[0].setValue('Dupont')
    await champs[1].setValue('Marie')
    await champs[2].setValue('marie@exemple.fr')
    await champs[3].setValue('0102030405')
}

beforeEach(() => {
    envois = []
    globalThis.envoyerFormulaire = async (chemin, charge) => {
        envois.push({ chemin, charge })
        return { success: true, simule: true }
    }
})

afterEach(() => {
    delete globalThis.envoyerFormulaire
})

describe('ContactStep', () => {
    it('n’expédie la demande qu’une fois', async () => {
        const vue = monter()
        await remplir(vue)

        await vue.vm.submitForm()

        expect(envois).toHaveLength(1)
        expect(envois[0].chemin).toBe('devis')
    })

    /*
       Le configurateur nomme ses champs d'après leur étape ; la modale du site
       poste des noms nus vers le même point d'entrée. Le serveur recevait deux
       formes pour une seule demande.
    */
    it('poste des noms de champs nus, comme la modale du site', async () => {
        const vue = monter()
        await remplir(vue)

        await vue.vm.submitForm()

        const { configuration, ...coordonnees } = envois[0].charge

        expect(coordonnees).toEqual({
            nom: 'Dupont',
            prenom: 'Marie',
            email: 'marie@exemple.fr',
            telephone: '0102030405',
        })
    })

    it('joint la configuration composée', async () => {
        const vue = monter()
        await remplir(vue)

        await vue.vm.submitForm()

        const { configuration } = envois[0].charge

        expect(configuration.vehicle).toEqual(VEHICULE)
        expect(configuration.totalPrice).toBe(7245)
        expect(configuration.completedSteps.length).toBeGreaterThan(0)
    })

    /*
       `envoyerFormulaire` lève en cas d'échec ; tout ce qui en revient est un
       succès. Le module guettait un `result.success` que seul le mode vitrine
       produit — le jour où les messages repartent, une demande arrivée à bon
       port se serait affichée en erreur.
    */
    it('tient pour envoyée toute réponse qui ne lève pas', async () => {
        globalThis.envoyerFormulaire = async () => ({ id: 412 })

        const vue = monter()
        await remplir(vue)

        const resultat = await vue.vm.submitForm()

        expect(resultat.success).toBe(true)
        expect(vue.find('.submit-success').exists()).toBe(true)
        expect(vue.find('.submit-error').exists()).toBe(false)
    })

    it('annonce l’échec avec les mots des autres formulaires du site', async () => {
        globalThis.envoyerFormulaire = async () => {
            throw new Error('réseau')
        }

        const vue = monter()
        await remplir(vue)

        const resultat = await vue.vm.submitForm()

        expect(resultat.success).toBe(false)
        expect(vue.find('.submit-error').text()).toBe("L'envoi a échoué. Merci de réessayer dans un instant.")
    })

    it('refuse de partir sans les champs requis', async () => {
        const vue = monter()

        const resultat = await vue.vm.submitForm()

        expect(resultat.success).toBe(false)
        expect(envois).toHaveLength(0)
    })
})
