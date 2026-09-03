import tailwindcss from '@tailwindcss/vite'

// L'origine WordPress n'existe qu'au build : le site publié est statique et ne
// contacte jamais WordPress. On la surcharge avec NUXT_PUBLIC_WP_BASE_URL.
const wpBaseUrl =
  process.env.NUXT_PUBLIC_WP_BASE_URL || 'http://les-conceptions-du-dahut.withni.local'

// Sous-chemin de publication : « / » en local, « /dahut/ » sur GitHub Pages.
// Les fichiers de `public/` ne passent pas par la réécriture de Nuxt : les
// chemins écrits à la main dans la configuration doivent le porter eux-mêmes.
const baseURL = process.env.NUXT_APP_BASE_URL || '/'

/**
 * Liste des pages à prégénérer, demandée à WordPress.
 *
 * Le crawl de liens ne suffit pas : une page orpheline (accessible seulement
 * depuis un menu conditionnel ou une redirection) serait oubliée. Le mu-plugin
 * énumère l'ensemble des contenus publiés, c'est la seule source fiable.
 */
async function fetchRoutes(): Promise<string[]> {
  const url = `${wpBaseUrl}/wp-json/dahut/v1/routes`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`${response.status}`)
    }

    const { routes } = (await response.json()) as { routes: { path: string }[] }

    return routes.map((route) => route.path)
  } catch (error) {
    // Un build silencieusement amputé serait pire qu'un build qui échoue.
    throw new Error(
      `Impossible de récupérer les routes depuis ${url} (${(error as Error).message}). ` +
        'WordPress est-il démarré et accessible ?'
    )
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        // La police du titre est visible d'emblée : la demander tôt évite que le
        // texte s'affiche d'abord dans la police système puis saute.
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: `${baseURL}assets/fonts/Switzer-Variable.woff2`,
          crossorigin: 'anonymous',
        },
      ],
    },
  },

  /*
     Nuxt inline par défaut le CSS des composants dans le HTML rendu, puis le
     bundle client réinjecte ces mêmes styles à l'hydratation. Mesuré : deux
     feuilles supplémentaires arrivent vers 2 s et bousculent l'ordre des
     couches Tailwind — le paragraphe d'introduction passait de 31 px à 12 px,
     soit un décalage de 0,27 sur les pages riches en texte.

     Servir tout le CSS en amont, dans un ordre stable, supprime ce reflux.
  */
  /*
     Transition de page native. Le thème clonait l'image cliquée et l'animait
     au plein écran avec GSAP ; le navigateur sait le faire seul à partir de
     `view-transition-name`, sans bibliothèque ni clone dans le DOM.

     Là où l'API n'est pas prise en charge, la navigation reste instantanée —
     aucune dégradation, aucun script de repli.
  */
  experimental: {
    viewTransition: true,
  },

  features: {
    inlineStyles: false,
  },

  nitro: {
    prerender: {
      // Le crawl reste actif : il sert de filet et révèle les liens cassés du
      // contenu rédactionnel.
      crawlLinks: true,

      /*
         Un lien mort saisi dans WordPress ne doit pas empêcher un déploiement :
         c'est un problème de contenu, pas de build. La garantie est déplacée
         dans `scripts/verify-build.mjs`, qui échoue si l'une des routes
         déclarées par l'API n'a pas été générée — et liste les liens cassés.
      */
      failOnError: false,
      routes: ['/', '/404.html'],
    },

    // Sert des fichiers déjà compressés plutôt que de les compresser à chaque
    // requête : moins de calcul côté hébergeur, moins d'octets sur le réseau.
    compressPublicAssets: { gzip: true, brotli: true },
  },

  hooks: {
    async 'nitro:config'(nitroConfig) {
      if (!nitroConfig.prerender) {
        return
      }

      const routes = await fetchRoutes()
      nitroConfig.prerender.routes = [
        ...new Set([...(nitroConfig.prerender.routes || []), ...routes]),
      ]

      console.info(`\n[dahut] ${routes.length} route(s) à prégénérer\n`)
    },
  },

  runtimeConfig: {
    public: {
      // Seule origine configurable : tout le reste en est dérivé (voir useApi).
      wpBaseUrl,
    },
  },
})
