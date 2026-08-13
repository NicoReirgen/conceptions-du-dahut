/*
   Validation des formulaires du site.

   `emailValide` sert les trois : le contact, la demande de devis et le
   configurateur, qui écrivaient chacun la même expression régulière. `verifier`
   ne concerne que le configurateur — les trois formulaires n'exigent pas les
   mêmes champs, et les rassembler serait une invention plutôt qu'une mise en
   commun.

   Ce qui subsiste de `services/emailService.js`, 985 lignes dont deux méthodes
   seulement étaient encore appelées. Tout le reste servait à composer et à
   expédier un e-mail vers deux adresses inexistantes : la mise en vitrine des
   formulaires a rendu ce code sans objet, et le supprimer évite qu'il resserve
   par erreur.

   Les clés sont préfixées `contact.` parce que le configurateur nomme ses
   champs d'après leur étape.
*/
export const validationContact = {
    /** Contrôle de forme, volontairement permissif : le doute profite à l'adresse. */
    emailValide(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))
    },

    /**
     * @param  {object} donnees Champs saisis, indexés par clé de configurateur.
     * @return {{ valide: boolean, erreurs: string[] }}
     */
    verifier(donnees) {
        const erreurs = []
        const rempli = (cle) => String(donnees?.[cle] ?? '').trim().length > 0

        if (!rempli('contact.prenom')) erreurs.push('Le prénom est requis')
        if (!rempli('contact.nom')) erreurs.push('Le nom est requis')

        if (!rempli('contact.email')) {
            erreurs.push("L'email est requis")
        } else if (!this.emailValide(donnees['contact.email'])) {
            erreurs.push("L'email n'est pas valide")
        }

        if (!rempli('contact.telephone')) erreurs.push('Le téléphone est requis')

        return { valide: erreurs.length === 0, erreurs }
    },
}
