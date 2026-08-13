/*
   Soumission des formulaires en mode vitrine.

   Le site est republié comme référence : l'entreprise n'existe plus, aucune
   adresse ne relève les messages. Les formulaires doivent donc se comporter
   normalement — validation, attente, confirmation — sans rien envoyer.

   Ce n'est pas seulement un choix éditorial, c'est aussi la seule option qui
   tienne debout : les deux formulaires du site postaient vers l'origine
   WordPress, qui reste privée une fois le site déployé, et celui du
   configurateur visait deux adresses inexistantes. Les trois auraient échoué en
   ligne, celui du configurateur en silence.

   Tout passe désormais par ce fichier : c'est le seul endroit à modifier le
   jour où les messages devront repartir pour de bon.
*/

/**
 * Passer à `false` rétablit l'envoi réel vers le mu-plugin WordPress.
 * Voir `envoyerReellement()` plus bas, qui n'attend que ça.
 */
export const MODE_VITRINE = true

/**
 * Affiche « aucun message n'est transmis » sous la confirmation.
 *
 * Sans cette mention, quelqu'un qui écrit vraiment attendrait une réponse qui
 * ne viendra jamais. Passer à `false` pour une démonstration muette.
 */
export const MENTION_VITRINE = true

/** Ce que l'écran de confirmation ajoute quand la mention est active. */
export const TEXTE_VITRINE =
    "Ce site est présenté à titre de référence : votre message n'est pas transmis."

/*
   Une confirmation instantanée trahit la simulation — un envoi réel prend le
   temps d'un aller-retour réseau. On reproduit cette latence, avec un peu de
   variation pour que deux envois de suite ne soient pas identiques.
*/
const attendreCommeUnReseau = () =>
    new Promise((resoudre) => setTimeout(resoudre, 550 + Math.random() * 450))

/**
 * Envoi réel vers le mu-plugin. Conservé intact et prêt à resservir.
 *
 * @param {string} chemin  `contact` ou `devis`.
 * @param {object} charge  Corps de la requête.
 */
const envoyerReellement = (chemin, charge) =>
    $fetch(`${useApiBase()}/${chemin}`, { method: 'POST', body: charge })

/**
 * Soumet un formulaire, réellement ou en apparence selon `MODE_VITRINE`.
 *
 * Lève une erreur en cas d'échec réel, comme le faisait `$fetch` : les
 * formulaires appelants gardent leur gestion d'erreur telle quelle.
 *
 * @param {string} chemin  `contact` ou `devis`.
 * @param {object} charge  Données déjà validées par l'appelant.
 */
export const envoyerFormulaire = async (chemin, charge) => {
    if (!MODE_VITRINE) {
        return envoyerReellement(chemin, charge)
    }

    await attendreCommeUnReseau()

    // En développement, la charge reste consultable pour vérifier qu'un
    // formulaire collecte bien ce qu'on croit.
    if (import.meta.dev) {
        console.info(`[vitrine] ${chemin} — envoi simulé`, charge)
    }

    return { success: true, simule: true }
}
