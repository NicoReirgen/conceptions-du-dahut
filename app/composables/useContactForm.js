/**
 * Formulaire de contact.
 *
 * Le thème passait par admin-ajax avec un nonce WordPress, ce qui suppose une
 * page servie par WordPress. Le site étant statique, la soumission passe par
 * `useEnvoiVitrine` — qui simule l'envoi tant que le site est une référence,
 * et sait reposter sur le mu-plugin le jour venu.
 *
 * La validation reste faite ici pour un retour immédiat, et le mu-plugin la
 * refait de son côté : celle du navigateur ne protège rien.
 */
export const useContactForm = () => {
    const form = reactive({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        message: '',
        consent: false,
    })

    const errors = ref([])
    const pending = ref(false)
    const sent = ref(false)

    const validate = () => {
        const found = []

        if (!form.nom.trim()) found.push('Le nom est requis.')
        if (!form.prenom.trim()) found.push('Le prénom est requis.')
        if (!validationContact.emailValide(form.email)) found.push("L'adresse email n'est pas valide.")
        if (!form.telephone.trim()) found.push('Le téléphone est requis.')
        if (!form.message.trim()) found.push('Le message est requis.')
        if (!form.consent) found.push("Merci d'accepter l'utilisation de vos informations.")

        return found
    }

    const submit = async () => {
        errors.value = validate()
        sent.value = false

        if (errors.value.length) {
            return
        }

        pending.value = true

        try {
            await envoyerFormulaire('contact', {
                nom: form.nom,
                prenom: form.prenom,
                email: form.email,
                telephone: form.telephone,
                message: form.message,
            })

            sent.value = true
            Object.assign(form, {
                nom: '',
                prenom: '',
                email: '',
                telephone: '',
                message: '',
                consent: false,
            })
        } catch (error) {
            errors.value = [
                error?.data?.message || "L'envoi a échoué. Merci de réessayer dans un instant.",
            ]
        } finally {
            pending.value = false
        }
    }

    return { form, errors, pending, sent, submit }
}
