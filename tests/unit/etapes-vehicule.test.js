import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { etapeAuRang, champsDuVehicule, useEtapesVehicule } from '~~/app/composables/useEtapesVehicule'

/*
   La traduction des étapes du catalogue en écrans du tunnel.

   Elle vivait dans le composant, en six calculs qui redescendaient chacun
   l'arborescence. Rien ne la couvrait, alors que c'est elle qui décide de ce
   que le visiteur voit à chaque clic sur « Suivant ».
*/

const ETAPES = [
    {
        key: 'presentation',
        name: 'Présentation',
        subSteps: [
            { key: 'presentation.details', type: 'presentation' },
            { key: 'presentation.chassis', type: 'group', fields: [{ key: 'chassis', type: 'unique' }] },
        ],
    },
    {
        key: 'customization',
        name: 'Personnalisation',
        subSteps: [
            { key: 'mobilier', type: 'group', fields: [{ key: 'mobilier', type: 'multiple' }] },
        ],
    },
    { key: 'summary', name: 'Résumé', type: 'summary' },
]

describe('étape au rang', () => {
    it('donne le choix du véhicule au premier rang', () => {
        expect(etapeAuRang(ETAPES, 1)).toEqual({ key: 'model_selection', name: 'Modèle', type: 'vehicle' })
    })

    it('déplie les sous-étapes dans l’ordre', () => {
        expect(etapeAuRang(ETAPES, 2).key).toBe('presentation.details')
        expect(etapeAuRang(ETAPES, 3).key).toBe('presentation.chassis')
        expect(etapeAuRang(ETAPES, 4).key).toBe('mobilier')
    })

    /* La fraction « 2/3 » affichée dans le titre vient de là. */
    it('situe la sous-étape dans son groupe', () => {
        expect(etapeAuRang(ETAPES, 3)).toMatchObject({ subStepIndex: 1, totalSubSteps: 2 })
    })

    it('rend les étapes sans sous-étape telles quelles', () => {
        expect(etapeAuRang(ETAPES, 5)).toMatchObject({ key: 'summary', type: 'summary' })
    })

    it('ne rend rien au-delà de la dernière', () => {
        expect(etapeAuRang(ETAPES, 12)).toBeNull()
    })
})

describe('champs d’un véhicule', () => {
    it('rassemble ceux des sous-étapes et des étapes simples', () => {
        expect(champsDuVehicule(ETAPES).map((c) => c.key)).toEqual(['chassis', 'mobilier'])
    })

    it('accepte un véhicule sans étapes', () => {
        expect(champsDuVehicule(undefined)).toEqual([])
    })
})

describe('navigation', () => {
    const monter = (vehicule = { id: 'orion' }, rang = 1) => useEtapesVehicule(
        ref(vehicule ? ETAPES : []),
        ref(vehicule),
        ref(rang)
    )

    it('compte un écran par sous-étape, plus le choix du véhicule', () => {
        expect(monter().nombreDEtapes.value).toBe(5)
    })

    it('numérote les étapes principales pour la barre de progression', () => {
        expect(monter().toutesLesEtapes.value.map((e) => e.name))
            .toEqual(['1. Modèle', '2. Présentation', '3. Personnalisation', '4. Résumé'])
    })

    it('donne un fil d’Ariane à plat', () => {
        expect(monter().toutesLesSousEtapes.value).toHaveLength(5)
    })

    /*
       Tant qu'aucun véhicule n'est retenu, le tunnel n'a qu'un écran : celui
       qui demande d'en choisir un.
    */
    it('se réduit au choix du véhicule quand aucun n’est retenu', () => {
        const sans = monter(null)

        expect(sans.toutesLesEtapes.value).toHaveLength(1)
        expect(sans.toutesLesSousEtapes.value).toHaveLength(1)
        expect(sans.etapeCourante.value.type).toBe('vehicle')
    })

    it('reconnaît la dernière étape', () => {
        expect(monter({ id: 'orion' }, 5).estDerniereEtape.value).toBe(true)
        expect(monter({ id: 'orion' }, 4).estDerniereEtape.value).toBe(false)
    })

    it('suit le rang courant', () => {
        expect(monter({ id: 'orion' }, 4).etapeCourante.value.key).toBe('mobilier')
    })
})
