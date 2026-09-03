/**
 * Préfixe un chemin de fichier public par la baseURL de l'application.
 *
 * Deux familles de chemins échappent à Nuxt : les médias, qui arrivent de
 * WordPress en absolu (`/media/2025/03/photo.jpg`), et les logos, écrits en dur
 * dans les gabarits. Nuxt réécrit ses propres URL quand le site est servi sous
 * un sous-chemin — `/dahut/` sur GitHub Pages — mais pas ces chaînes-là :
 * publiées telles quelles, elles pointeraient à la racine du domaine, où il n'y
 * a rien.
 *
 * Sans sous-chemin, la fonction rend le chemin inchangé : le site servi à la
 * racine ne paie donc rien pour cette précaution.
 *
 * Voir aussi `app/composables/images/cheminsImage.js`, qui applique la même
 * règle aux images du configurateur, construites par sa logique de résolution.
 */
export const cheminPublic = (chemin, baseFournie = null) => {
    // Les URL externes, les data: et les chemins relatifs se passent de préfixe.
    if (typeof chemin !== 'string' || !chemin.startsWith('/')) {
        return chemin
    }

    /*
       La baseURL se lit d'ordinaire sur la configuration du moment. Certains
       appels ont lieu hors contexte Nuxt — la résolution des balises <head>,
       que unhead évalue après le rendu, et les tests unitaires : ils passent
       alors la base eux-mêmes, captée pendant leur setup.
    */
    const configuration =
        baseFournie === null && typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null
    const base = baseFournie || configuration?.app?.baseURL || '/'

    if (base === '/') {
        return chemin
    }

    const racine = base.endsWith('/') ? base.slice(0, -1) : base

    // Idempotent : un chemin déjà préfixé traverse la fonction sans grossir.
    return chemin.startsWith(`${racine}/`) ? chemin : `${racine}${chemin}`
}
