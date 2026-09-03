/**
 * Le sous-chemin de publication, pour les tests de bout en bout.
 *
 * Le site part en ligne sous `/conceptions-du-dahut/` : c'est cette forme-là
 * qu'il faut éprouver, sans quoi une régression dans `app/utils/cheminPublic.js`
 * — le mécanisme qui préfixe les chemins que Nuxt ne réécrit pas — passerait
 * inaperçue jusqu'à la mise en ligne.
 *
 * Les chemins restent écrits en absolu dans les tests, et traversent cette
 * fonction : le jour où un domaine propre servira le site à la racine, il
 * suffira de changer la variable d'environnement.
 */
export const BASE = (process.env.NUXT_APP_BASE_URL || '/conceptions-du-dahut/').replace(/\/+$/, '')

/** Un chemin du site, préfixé du sous-chemin de publication. */
export const chemin = (c) => `${BASE}${c === '/' ? '/' : c}`
