import { test, expect } from '@playwright/test'

/*
   Le site autour du configurateur.

   On couvre ici ce qui a réellement cassé pendant la reprise : des pages qui
   ne se généraient plus, des formulaires qui postaient dans le vide, une
   feuille de style de module qui débarquait partout, et les métadonnées que
   l'on vient d'écrire.
*/

const PAGES = [
    { chemin: '/', titre: /Conception et réalisation/ },
    { chemin: '/realisations', titre: /Réalisations/ },
    { chemin: '/produits', titre: /Produits/ },
    { chemin: '/produits/orion', titre: /Orion/ },
    { chemin: '/qui-sommes-nous', titre: /Qui sommes-nous/ },
    { chemin: '/contact', titre: /Contact/ },
    { chemin: '/sur-mesure', titre: /Sur-mesure/ },
    { chemin: '/mentions-legales', titre: /Mentions légales/ },
]

test.describe('intégrité des pages', () => {
    for (const { chemin, titre } of PAGES) {
        test(`${chemin} se charge, se nomme et se décrit`, async ({ page }) => {
            const erreurs = []
            page.on('pageerror', (e) => erreurs.push(e.message))

            const reponse = await page.goto(chemin)
            expect(reponse.status()).toBe(200)

            await expect(page).toHaveTitle(titre)

            // Toutes les pages ont désormais une description : c'était le
            // dernier audit SEO en échec.
            const description = page.locator('meta[name="description"]')
            await expect(description).toHaveCount(1)
            expect((await description.getAttribute('content')).length).toBeGreaterThan(50)

            expect(erreurs).toEqual([])
        })
    }
})

test.describe('cloisonnement du configurateur', () => {
    /*
       Sa feuille de style était appliquée sur chaque page — préchargement de
       route déclenché par le bouton de l'en-tête — alors qu'aucune de ses
       règles n'y trouve de cible.
    */
    test('sa feuille ne suit pas le visiteur sur le site', async ({ page }) => {
        const feuilles = []
        page.on('response', (r) => {
            if (/configurateur\..*\.css/.test(r.url())) feuilles.push(r.url())
        })

        await page.goto('/contact')
        await page.waitForLoadState('networkidle')

        expect(feuilles).toEqual([])
    })

    test('mais le bouton y mène toujours', async ({ page }) => {
        await page.goto('/contact')
        await page.locator('a[href="/configurateur"]').first().click()

        await expect(page).toHaveURL(/\/configurateur/)
        await expect(page.locator('.option-card').first()).toBeVisible()
    })
})

test.describe('formulaires en mode vitrine', () => {
    test('la page contact confirme sans rien envoyer', async ({ page }) => {
        const envois = []
        page.on('request', (r) => {
            if (r.method() === 'POST') envois.push(r.url())
        })

        await page.goto('/contact')

        await page.locator('#contact-nom').fill('Negrier')
        await page.locator('#contact-prenom').fill('Nicolas')
        await page.locator('#contact-email').fill('test@sobr.studio')
        await page.locator('#contact-telephone').fill('0600000000')
        await page.locator('#contact-message').fill('Essai de bout en bout.')
        await page.locator('#contact-consent').check()

        await page.getByRole('button', { name: /envoyer/i }).click()

        const confirmation = page.locator('[role="status"]')
        await expect(confirmation).toBeVisible({ timeout: 5000 })
        await expect(confirmation).toContainText('titre de référence')

        expect(envois).toEqual([])
    })

    test('refuse un formulaire incomplet', async ({ page }) => {
        await page.goto('/contact')
        await page.getByRole('button', { name: /envoyer/i }).click()

        await expect(page.locator('[role="status"]')).toHaveCount(0)
    })
})

test.describe('transition entre l’archive et une fiche', () => {
    /*
       Un seul appariement doit exister à la fois : nommer toutes les cartes
       faisait rester les autres en fondu par-dessus la fiche.
    */
    test('une seule réalisation porte un nom de transition', async ({ page }) => {
        await page.goto('/realisations')

        const nommes = await page.evaluate(() =>
            [...document.querySelectorAll('[data-transition]')]
                .map((e) => getComputedStyle(e).viewTransitionName)
                .filter((n) => n && n !== 'none').length
        )

        expect(nommes).toBe(0)
    })

    test('mène bien à la fiche', async ({ page }) => {
        await page.goto('/realisations')
        const premier = page.locator('article a').first()
        const cible = await premier.getAttribute('href')

        await premier.click()
        await expect(page).toHaveURL(new RegExp(cible))
        await expect(page.locator('h1')).toBeVisible()
    })
})
