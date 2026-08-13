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

    const { data, error } = await useFetch(`${base}/content`, {
        key: computed(() => `dahut-content:${target.value}`),
        query: { path: target },
    })

    if (!data.value || error.value) {
        throw createError({
            statusCode: error.value?.statusCode === 404 ? 404 : 500,
            statusMessage:
                error.value?.statusCode === 404 ? 'Page introuvable' : 'Contenu indisponible',
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
