/**
 * Accès à l'API headless WordPress.
 *
 * Toutes les requêtes passent par ici pour deux raisons :
 * — une seule origine à changer quand WordPress déménage ;
 * — les données transverses (menus, coordonnées, avis) sont mises en cache pour
 *   la durée du rendu, donc récupérées une fois par build et non une fois par
 *   page.
 */

/** Base de l'API headless, dérivée de l'origine WordPress. */
export const useApiBase = () => {
    const config = useRuntimeConfig()
    const origin = String(config.public.wpBaseUrl || '').replace(/\/+$/, '')

    return `${origin}/wp-json/dahut/v1`
}

/**
 * Données transverses : identité du site, menus, options globales, avis.
 * Partagées entre le layout et toutes les pages via une clé unique.
 */
export const useBootstrap = async () => {
    const base = useApiBase()

    const { data } = await useFetch(`${base}/bootstrap`, {
        key: 'dahut-bootstrap',
        getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
        default: () => ({ site: {}, menus: {}, options: {}, avis: [] }),
    })

    return {
        site: computed(() => data.value?.site || {}),
        menus: computed(() => data.value?.menus || {}),
        options: computed(() => data.value?.options || {}),
        avis: computed(() => data.value?.avis || []),
    }
}

/**
 * Contenu d'un chemin front. Renvoie page, article, produit ou catégorie —
 * l'API se charge de résoudre le type.
 *
 * @param {string|import('vue').Ref<string>} path Chemin front, ex. « /produits/orion ».
 */
export const useContent = async (path) => {
    const base = useApiBase()
    const target = computed(() => {
        const raw = unref(path) || '/'
        return raw.startsWith('/') ? raw : `/${raw}`
    })

    const cle = computed(() => `dahut-content:${target.value}`)
    const nuxtApp = useNuxtApp()

    /*
       Le site publié est statique : chaque page prégénérée porte son contenu
       dans sa charge utile, et le navigateur n'a jamais besoin d'appeler
       WordPress — dont l'origine n'existe que sur la machine de développement.

       Un chemin absent de la charge utile est donc un chemin qui n'existe pas.
       Sans cette sortie, le navigateur lançait la requête quand même : elle
       n'aboutissait jamais, et la page d'erreur ne s'affichait pas — mesuré en
       ligne, toujours blanche après quarante-cinq secondes.
    */
    if (import.meta.client && !nuxtApp.payload?.data?.[cle.value] && !nuxtApp.static?.data?.[cle.value]) {
        throw createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true })
    }

    const { data, error } = await useFetch(`${base}/content`, {
        key: cle,
        query: { path: target },
        getCachedData: (k, app) => app.payload.data[k] ?? app.static.data[k],
    })

    /*
       Dans le navigateur, une requête qui échoue ne veut pas dire « erreur
       serveur » : le site publié est statique et complet, et il n'a pas de
       serveur. Toutes les pages prégénérées portent leur contenu dans leur
       charge utile ; si un chemin n'en a pas, c'est qu'il n'existe pas.

       Sans cette distinction, une adresse inconnue affichait « 500 — une erreur
       s'est produite côté serveur » après avoir tenté sept fois de joindre
       l'origine WordPress, qui n'est joignable que sur la machine de
       développement. Le visiteur voyait une panne là où il n'y a qu'une page
       absente.

       Au build, en revanche, un échec reste un échec : c'est WordPress qui
       manque, et le mieux est de le dire.
    */
    if (!data.value || error.value) {
        const introuvable = error.value?.statusCode === 404 || import.meta.client

        throw createError({
            statusCode: introuvable ? 404 : 500,
            statusMessage: introuvable ? 'Page introuvable' : 'Contenu indisponible',
            fatal: true,
        })
    }

    return data
}

/**
 * Collection paginée : « produits », « realisations », « categories-produit ».
 */
export const useCollection = async (type, query = {}) => {
    const base = useApiBase()

    const { data } = await useFetch(`${base}/collection/${type}`, {
        key: `dahut-collection:${type}`,
        query,
        default: () => [],
    })

    return data
}
