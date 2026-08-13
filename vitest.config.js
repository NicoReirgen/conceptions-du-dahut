import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const racine = fileURLToPath(new URL('.', import.meta.url))

/*
   Les tests tournent hors de Nuxt, sur du Vue nu.

   C'est un choix : la logique qu'on veut couvrir — calcul de prix, règles
   d'incompatibilité, dérivation des chemins d'images — ne dépend ni du routeur,
   ni du rendu serveur, ni des auto-imports. La charger sans Nuxt rend les tests
   rapides et leurs échecs lisibles.

   Deux conséquences à assumer : les alias `~~` et `~` sont reconstitués ici, et
   les auto-imports de Vue doivent être déclarés explicitement dans les fichiers
   de test.
*/
export default defineConfig({
    plugins: [vue()],

    resolve: {
        alias: {
            '~~': racine,
            '~': fileURLToPath(new URL('./app', import.meta.url)),
        },
    },

    test: {
        environment: 'happy-dom',
        include: ['tests/**/*.test.js'],
        globals: true,

        // Rétablit les auto-imports que Nuxt fournit à la compilation.
        setupFiles: ['tests/setup.js'],

        // Les tests de bout en bout pilotent un vrai navigateur : ils ne
        // relèvent pas de ce lanceur.
        exclude: ['tests/e2e/**', 'node_modules/**'],
    },
})
