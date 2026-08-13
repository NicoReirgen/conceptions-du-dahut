/*
   Appariement des éléments entre la liste des réalisations et une fiche.

   Le navigateur photographie tout élément portant un `view-transition-name`.
   Si les cinq cartes de la liste en portaient un, les quatre qu'on ne suit pas
   seraient capturées sans équivalent sur la page d'arrivée : elles resteraient
   affichées en fondu par-dessus la fiche pendant toute la transition. Une seule
   réalisation à la fois est donc nommée.

   L'état est déclaré hors du composable : il doit survivre au démontage de la
   liste, puisque c'est lui qui permet à la fiche de retrouver sa carte au
   retour en arrière.
*/
const slugActif = ref(null)

export const useTransitionRealisation = () => {
    /**
     * Nom de transition d'une réalisation, ou `none` si ce n'est pas celle
     * qu'on suit. Le préfixe distingue l'image du titre.
     *
     * Le slug est préfixé pour rester un identifiant CSS valide même s'il
     * commence par un chiffre.
     */
    const nomPour = (slug, prefixe = '') =>
        slugActif.value === slug ? `${prefixe}realisation-${slug}` : 'none'

    /**
     * Désigne la réalisation qui participe à la transition, au moment du clic.
     *
     * L'affectation est faite deux fois, et c'est voulu. La photographie de la
     * page sortante est prise avant que Vue n'ait appliqué la mise à jour du
     * `:style` : seule l'écriture directe dans le DOM arrive à temps. L'état
     * réactif, lui, sert à la page d'arrivée — et au retour en arrière.
     *
     * @param {string} slug   Réalisation suivie.
     * @param {Element} carte Racine de la carte cliquée.
     */
    const marquer = (slug, carte) => {
        slugActif.value = slug

        // Une carte nommée lors d'une navigation précédente le serait encore.
        document.querySelectorAll('[data-transition]').forEach((element) => {
            element.style.viewTransitionName = ''
        })

        carte?.querySelectorAll('[data-transition]').forEach((element) => {
            element.style.viewTransitionName = element.dataset.transition
        })
    }

    return { slugActif, nomPour, marquer }
}
