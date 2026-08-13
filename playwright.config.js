import { defineConfig, devices } from '@playwright/test'

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
        command: 'node scripts/serve-static.mjs 3011',
        url: 'http://localhost:3011',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
})
