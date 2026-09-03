import vue from 'eslint-plugin-vue'
import globals from 'globals'

/*
   Analyse statique du projet.

   Le choix des règles n'est pas générique : il vise les défauts que ce projet a
   réellement produits, et qui sont tous passés au travers d'une relecture
   humaine.

     · un attribut statique contenant une expression Vue —
       `aria-pressed="modelValue?.main === option.key"` s'écrit tel quel dans le
       HTML, et l'attribut ne vaut ni « true » ni « false ». Trouvé quatre fois.

     · une interpolation dans un attribut — `aria-label="Select option {{ x }}"`
       n'interpole pas, les lecteurs d'écran énonçaient les accolades.

     · une variable utilisée avant sa déclaration — deux `watch` posés avant les
       `ref` qu'ils observaient, ce qui casse à l'évaluation du module.

     · des imports et des variables morts — 1 020 lignes supprimées cette
       semaine, dont une fonction de 98 lignes sans appelant.

   Les fichiers générés et le catalogue de données sont hors du champ.
*/
export default [
    {
        ignores: ['.output/**', '.nuxt/**', 'node_modules/**', 'public/**', 'app/data/**'],
    },

    ...vue.configs['flat/recommended'],

    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                // Auto-imports de Nuxt et de Vue : présents à l'exécution, sans
                // déclaration dans les fichiers.
                ref: 'readonly', computed: 'readonly', reactive: 'readonly',
                watch: 'readonly', watchEffect: 'readonly', nextTick: 'readonly',
                onMounted: 'readonly', onUnmounted: 'readonly', onBeforeUnmount: 'readonly',
                defineProps: 'readonly', defineEmits: 'readonly', defineExpose: 'readonly',
                definePageMeta: 'readonly', defineNuxtConfig: 'readonly',
                defineAsyncComponent: 'readonly', useRoute: 'readonly', useRouter: 'readonly',
                useHead: 'readonly', useSeoMeta: 'readonly', useRuntimeConfig: 'readonly',
                useFetch: 'readonly', useAsyncData: 'readonly', useState: 'readonly',
                $fetch: 'readonly', navigateTo: 'readonly', useNuxtApp: 'readonly',
                // Composables et utilitaires du projet, auto-importés.
                useApiBase: 'readonly', useBootstrap: 'readonly', useContent: 'readonly',
                useCollection: 'readonly', useContentSeo: 'readonly', useCarousel: 'readonly',
                useScrollReveal: 'readonly', useSmoothScroll: 'readonly',
                useTransitionRealisation: 'readonly', useContactForm: 'readonly',
                useEnvoiVitrine: 'readonly', envoyerFormulaire: 'readonly',
                MENTION_VITRINE: 'readonly', TEXTE_VITRINE: 'readonly',
                useValidationContact: 'readonly', validationContact: 'readonly',
                useChampOption: 'readonly', prixLisible: 'readonly', libelleOption: 'readonly',
                contrasteSuffisant: 'readonly', optionProfondeChoisie: 'readonly',
                useAnnonce: 'readonly', useVehicleImages: 'readonly',
                configuratorSrcset: 'readonly', CONFIGURATOR_WIDTHS: 'readonly',
            },
        },

        rules: {
            /* --- les défauts que ce projet a produits --- */

            // `aria-pressed="expression"` au lieu de `:aria-pressed="expression"`.
            'vue/no-useless-mustaches': 'error',
            'vue/no-parsing-error': 'error',

            /*
               Variable lue avant d'exister. Réglé en alerte et non en erreur :
               sur 50 signalements, la quasi-totalité sont des fonctions fléchées
               appelées depuis le corps d'une autre — résolues à l'appel, donc
               sans danger. Le cas qui compte, une `watch` posée avant le `ref`
               qu'elle observe, lève de toute façon une erreur au chargement.
            */
            'no-use-before-define': ['warn', { functions: false, variables: true }],

            // Mise en forme : sans intérêt tant qu'aucun formateur n'est en place.
            'vue/html-closing-bracket-spacing': 'off',
            'vue/no-multi-spaces': 'off',

            /*
               `v-html` sert à poser le HTML rédigé dans WordPress, qui est notre
               propre source. L'alerte reste utile si un jour on affiche du
               contenu venu d'ailleurs.
            */
            'vue/no-v-html': 'warn',

            /*
               Code mort. `ignoreRestSiblings` couvre l'écriture qui sert à
               écarter une clé d'un objet — `const { configuration, ...reste }` —
               où la variable nommée n'a pas vocation à être lue.
            */
            'no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true },
            ],

            /* --- garde-fous Vue courants --- */
            'vue/multi-word-component-names': 'off',   // Header.vue, Footer.vue…
            'vue/require-default-prop': 'off',
            'vue/attributes-order': 'off',             // trop bruyant sur l'existant
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/html-indent': 'off',
            'vue/html-self-closing': 'off',
            'vue/html-closing-bracket-newline': 'off',
            'vue/first-attribute-linebreak': 'off',

            // Ceux-là restent : ils signalent de vraies fautes.
            'vue/no-unused-components': 'error',
            'vue/require-v-for-key': 'error',
            'vue/no-use-v-if-with-v-for': 'error',
            'vue/no-mutating-props': 'error',
            'vue/valid-v-for': 'error',
        },
    },
]
