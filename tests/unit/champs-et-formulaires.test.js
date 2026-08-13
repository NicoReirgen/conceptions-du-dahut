import { describe, it, expect } from 'vitest'
import { prixLisible, libelleOption, optionProfondeChoisie } from '~~/app/composables/useChampOption'
import { validationContact } from '~~/app/composables/useValidationContact'

/*
   Les petites unités partagées, extraites lors de la factorisation des champs.

   `prixLisible` remplace huit copies qui divergeaient : l'une oubliait le
   préfixe « à partir de », les autres le complément « /par fenêtre ». Ces
   tests fixent la forme unique.
*/

describe('prixLisible', () => {
    it('n’écrit rien pour une option incluse', () => {
        expect(prixLisible({ price: 0 })).toBe('')
        expect(prixLisible({})).toBe('')
        expect(prixLisible(null)).toBe('')
    })

    it('préfixe d’un plus les suppléments', () => {
        expect(prixLisible({ price: 1454 })).toBe('+1454€')
    })

    it('conserve le préfixe éditorial', () => {
        expect(prixLisible({ price: 8485, pricePrefix: 'à partir de ' })).toBe('à partir de +8485€')
    })

    it('conserve le complément d’unité', () => {
        expect(prixLisible({ price: 366, price_comment: '/par fenêtre' })).toBe('+366€/par fenêtre')
    })

    it('n’invente pas de signe sur un montant négatif', () => {
        expect(prixLisible({ price: -50 })).toBe('-50€')
    })
})

describe('libelleOption', () => {
    it('se limite au nom quand l’option est incluse', () => {
        expect(libelleOption({ name: 'Base', price: 0 })).toBe('Base')
    })

    it('ajoute le prix quand il y en a un', () => {
        expect(libelleOption({ name: 'Tiroirs', price: 1454 })).toBe('Tiroirs, +1454€')
    })

    it('signale l’incompatibilité en français', () => {
        const rendu = libelleOption({ name: 'Galerie', price: 1490 }, { incompatibleAvec: 'Toit relevable' })
        expect(rendu).toBe('Galerie, +1490€, incompatible avec Toit relevable')
        expect(rendu).not.toMatch(/Price|Option:/)
    })
})

describe('optionProfondeChoisie', () => {
    const donnees = { deepOptions: { 'bouleau.couleur': 'clair' } }

    it('reconnaît l’option retenue', () => {
        expect(optionProfondeChoisie(donnees, 'bouleau', 'couleur', 'clair')).toBe(true)
    })

    it('écarte les autres', () => {
        expect(optionProfondeChoisie(donnees, 'bouleau', 'couleur', 'fonce')).toBe(false)
        expect(optionProfondeChoisie(donnees, 'peuplier', 'couleur', 'clair')).toBe(false)
    })

    it('supporte une sélection vide', () => {
        expect(optionProfondeChoisie({}, 'a', 'b', 'c')).toBe(false)
        expect(optionProfondeChoisie(null, 'a', 'b', 'c')).toBe(false)
    })
})

describe('validation du formulaire de contact', () => {
    const complet = {
        'contact.nom': 'Negrier',
        'contact.prenom': 'Nicolas',
        'contact.email': 'nicolas@sobr.studio',
        'contact.telephone': '0600000000',
    }

    it('accepte un formulaire complet', () => {
        expect(validationContact.verifier(complet)).toEqual({ valide: true, erreurs: [] })
    })

    it('signale chaque champ manquant', () => {
        const { valide, erreurs } = validationContact.verifier({})
        expect(valide).toBe(false)
        expect(erreurs).toHaveLength(4)
    })

    it('refuse une adresse mal formée', () => {
        const { erreurs } = validationContact.verifier({ ...complet, 'contact.email': 'pasunemail' })
        expect(erreurs).toContain("L'email n'est pas valide")
    })

    it('traite un champ d’espaces comme vide', () => {
        const { valide } = validationContact.verifier({ ...complet, 'contact.nom': '   ' })
        expect(valide).toBe(false)
    })

    it('juge la forme de l’adresse, sans excès de zèle', () => {
        expect(validationContact.emailValide('a@b.fr')).toBe(true)
        expect(validationContact.emailValide('a@b')).toBe(false)
        expect(validationContact.emailValide('a b@c.fr')).toBe(false)
        expect(validationContact.emailValide('')).toBe(false)
    })
})
