/*
   Annonces vocales du configurateur.

   Deux informations essentielles n'existaient qu'à l'œil : le prix, affiché
   dans un pied de page loin du geste qui vient de le changer, et l'apparition
   d'un choix obligatoire — sélectionner « Stratifié » révèle trois coloris, et
   « Suivant » reste désactivé tant qu'aucun n'est retenu. Quelqu'un qui
   n'aperçoit pas ces changements se retrouve devant un bouton qui ne répond
   plus, sans explication.

   Une seule région live sert les deux : elle est rendue une fois dans
   `configurator.vue`, hors de l'écran mais lisible par les lecteurs d'écran.
   `polite` et non `assertive` : ces messages accompagnent l'action, ils ne
   doivent pas interrompre la lecture en cours.
*/
const message = ref('')

let minuteur = null

export const useAnnonce = () => {
    /**
     * Fait lire un message.
     *
     * La région est vidée avant d'être remplie : sans cela, deux messages
     * identiques d'affilée — « Prix total : 5 900 € » après un aller-retour —
     * ne seraient pas relus, le contenu n'ayant pas changé.
     *
     * @param {string} texte
     */
    const annoncer = (texte) => {
        if (!texte) return

        message.value = ''
        clearTimeout(minuteur)
        minuteur = setTimeout(() => {
            message.value = texte
        }, 100)
    }

    return { message, annoncer }
}
