import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

/*
   Le sous-chemin de publication. Les tests l'appliquent à chaque navigation
   (voir tests/e2e/chemin.js) et le serveur le retire comme le fait l'hébergeur :
   c'est la forme réellement mise en ligne qui est éprouvée.
*/
const BASE = (process.env.NUXT_APP_BASE_URL || '/conceptions-du-dahut/').replace(/\/+$/, '')

/*
   Un build à la racine servi sous un sous-chemin — ou l'inverse — ferait
   échouer les vingt-deux tests sur des 404, sans qu'on comprenne pourquoi.
   Autant le dire tout de suite, et dire quoi lancer.
*/
const accueil = path.join(import.meta.dirname, '.output/public/index.html')

if (!existsSync(accueil)) {
    throw new Error(`Aucun site construit dans .output/public.\n  NUXT_APP_BASE_URL=${BASE}/ npm run generate`)
}

const construitAvec = (readFileSync(accueil, 'utf-8').match(/href="([^"]*)\/_nuxt\//) || [, ''])[1]

if (construitAvec !== BASE) {
    throw new Error(
        `Le site construit porte le sous-chemin « ${construitAvec || '/'} », les tests attendent « ${BASE || '/'} ».\n` +
            `  NUXT_APP_BASE_URL=${BASE}/ npm run generate` +
            `\n  (ou npm run generate:instantane si WordPress est éteint)`
    )
}

/*
   Tests de bout en bout, sur le site réellement généré.

   Pas sur le serveur de développement : c'est le build statique qui part en
   ligne, et plusieurs pannes de ce projet n'existaient que là — la route
   serveur qui répondait en développement et retournait 404 une fois prégénérée,
   par exemple. Tester le dev aurait laissé passer les deux.

   Le serveur de mesure sert les fichiers pré-compressés et pose les en-têtes de
   cache, comme le ferait un hébergeur.
*/
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'list' : [['list']],

    use: {
        baseURL: 'http://localhost:3011',
        trace: 'on-first-retry',
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],

    webServer: {
        command: `node scripts/serve-static.mjs 3011 ${BASE}`,
        url: `http://localhost:3011${BASE}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
})
