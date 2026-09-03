import { test, expect } from '@playwright/test'
import { BASE, chemin } from './chemin'

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
    for (const { chemin: route, titre } of PAGES) {
        test(`${route} se charge, se nomme et se décrit`, async ({ page }) => {
            const erreurs = []
            page.on('pageerror', (e) => erreurs.push(e.message))

            const reponse = await page.goto(chemin(route))
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

test.describe('sous-chemin de publication', () => {
    /*
       Le site est servi sous /conceptions-du-dahut/, et Nuxt ne réécrit que ses
       propres URL : les médias, qui arrivent de WordPress en absolu, et les
       logos écrits dans les gabarits passent par `app/utils/cheminPublic.js`.

       Les autres tests ne verraient pas cette panne : une image qui manque ne
       lève aucune erreur JavaScript, elle ne s'affiche simplement pas. On
       écoute donc les réponses elles-mêmes.
    */
    for (const route of ['/', '/qui-sommes-nous', '/configurateur']) {
        test(`${route} ne demande rien hors du sous-chemin, ni rien qui manque`, async ({ page }) => {
            const egarees = []
            const manquantes = []

            page.on('response', (reponse) => {
                const url = new URL(reponse.url())

                if (url.host !== 'localhost:3011') {
                    return
                }

                if (BASE && !url.pathname.startsWith(`${BASE}/`)) {
                    egarees.push(url.pathname)
                }

                if (reponse.status() >= 400) {
                    manquantes.push(`${reponse.status()} ${url.pathname}`)
                }
            })

            await page.goto(chemin(route))

            // Le défilement déclenche le chargement des images différées, que
            // le seul rendu initial laisserait en dehors de la mesure.
            await page.evaluate(async () => {
                for (let y = 0; y < document.body.scrollHeight; y += 800) {
                    window.scrollTo(0, y)
                    await new Promise((suite) => setTimeout(suite, 60))
                }
            })
            await page.waitForLoadState('networkidle')

            expect(egarees).toEqual([])
            expect(manquantes).toEqual([])
        })
    }
})

test.describe('hydratation', () => {
    /*
       Une divergence entre le HTML servi et l'arbre reconstruit par Vue ne se
       voit pas : la page finit par s'afficher correctement. Elle se lit dans la
       console, et se paie en travail inutile au chargement.

       Les adresses sont demandées **avec une barre finale**, parce que c'est
       ainsi que l'hébergeur les sert : `/mentions-legales` y est redirigé vers
       `/mentions-legales/`. C'est cette barre qui avait fait diverger le pied
       de page, dont une comparaison de chemin était trop stricte.
    */
    for (const route of ['/', '/mentions-legales/', '/qui-sommes-nous/', '/produits/']) {
        test(`${route} s’hydrate sans divergence`, async ({ page }) => {
            const erreurs = []
            page.on('console', (message) => {
                if (message.type() === 'error') {
                    erreurs.push(message.text().slice(0, 120))
                }
            })

            await page.goto(chemin(route))
            await page.waitForLoadState('networkidle')

            expect(erreurs).toEqual([])
        })
    }
})

test.describe('page d’erreur', () => {
    test('se nomme, et refuse d’être indexée', async ({ page }) => {
        const reponse = await page.goto(chemin('/adresse-qui-nexiste-pas'))

        // GitHub Pages sert 404.html avec le bon code ; en local, le serveur de
        // mesure fait de même.
        expect(reponse.status()).toBe(404)

        await expect(page.locator('h1')).toHaveText('404')
        await expect(page).toHaveTitle(/^404 —/)

        const robots = page.locator('meta[name="robots"]')
        await expect(robots).toHaveAttribute('content', 'noindex')
    })
})

test.describe('navigation au clavier', () => {
    /*
       Seize liens précèdent le contenu sur chaque page. Le lien d'évitement
       doit donc être le premier élément atteignable, et mener réellement au
       contenu — pas seulement y faire défiler la vue.
    */
    test('le premier tabulateur atteint le lien d’évitement, qui donne le focus au contenu', async ({ page }) => {
        await page.goto(chemin('/qui-sommes-nous'))

        await page.keyboard.press('Tab')

        const premier = page.locator(':focus')
        await expect(premier).toHaveText('Aller au contenu')

        await page.keyboard.press('Enter')

        expect(await page.evaluate(() => document.activeElement?.id)).toBe('contenu')
    })

    test('le focus au clavier est visible', async ({ page }) => {
        await page.goto(chemin('/produits'))

        // Le premier lien du contenu, après le lien d'évitement et l'en-tête.
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')

        const contour = await page.evaluate(() => {
            const style = getComputedStyle(document.activeElement)
            return { style: style.outlineStyle, epaisseur: style.outlineWidth }
        })

        expect(contour.style).not.toBe('none')
        expect(parseFloat(contour.epaisseur)).toBeGreaterThanOrEqual(2)
    })
})

test.describe('mouvement réduit', () => {
    /*
       Le site anime beaucoup au défilement : révélation du contenu, bande des
       partenaires, transitions de vue. Ces animations sont pilotées par le
       défilement, ce qui ne les dispense pas d'être coupées — un mouvement
       déclenché par l'interaction reste un mouvement (WCAG 2.3.3).

       Le piège, et la raison d'être de ce test : couper l'animation sans
       rétablir l'état d'arrivée laisserait tout le contenu à `opacity: 0`.
       Une page muette passerait pour une page sobre.

       La préférence est posée par `page.emulateMedia` plutôt que par l'option
       `reducedMotion` de Playwright : dans cette installation, l'option reste
       sans effet sur la page fournie par le runner, qu'elle soit déclarée dans
       la configuration ou par `test.use` — vérifié en lisant `matchMedia` dans
       la page, qui répondait « false ». `emulateMedia` agit, lui.
    */
    const avecMouvementReduit = async (page, route) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(chemin(route))

        // Sans cette vérification, une émulation qui cesserait de fonctionner
        // rendrait les deux tests ci-dessous verts et vides de sens.
        expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
    }

    test('le contenu reste visible, sans animation', async ({ page }) => {
        await avecMouvementReduit(page, '/qui-sommes-nous')

        /*
           On vérifie l'opacité, mais aussi l'échelle : le minificateur avait
           supprimé un `scale: 1` en le croyant redondant, laissant le contenu
           figé à 99 % de sa taille.
        */
        const restes = await page.evaluate(() =>
            [...document.querySelectorAll('.animate')]
                .filter((element) => {
                    const style = getComputedStyle(element)
                    return Number(style.opacity) < 1 || !['none', '1'].includes(style.scale)
                })
                .map((element) => `${element.getAttribute('class').slice(0, 30)} — ${getComputedStyle(element).opacity} / ${getComputedStyle(element).scale}`)
        )

        expect(restes).toEqual([])
    })

    test('la bande des partenaires ne défile plus', async ({ page }) => {
        await avecMouvementReduit(page, '/contact')

        const animation = await page.evaluate(
            () => getComputedStyle(document.querySelector('.banner-scroll')).animationName
        )

        expect(animation).toBe('none')
    })
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

        await page.goto(chemin('/contact'))
        await page.waitForLoadState('networkidle')

        expect(feuilles).toEqual([])
    })

    test('mais le bouton y mène toujours', async ({ page }) => {
        await page.goto(chemin('/contact'))
        await page.locator(`a[href="${chemin('/configurateur')}"]`).first().click()

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

        await page.goto(chemin('/contact'))

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
        await page.goto(chemin('/contact'))
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
        await page.goto(chemin('/realisations'))

        const nommes = await page.evaluate(() =>
            [...document.querySelectorAll('[data-transition]')]
                .map((e) => getComputedStyle(e).viewTransitionName)
                .filter((n) => n && n !== 'none').length
        )

        expect(nommes).toBe(0)
    })

    test('mène bien à la fiche', async ({ page }) => {
        await page.goto(chemin('/realisations'))
        const premier = page.locator('article a').first()
        const cible = await premier.getAttribute('href')

        await premier.click()
        await expect(page).toHaveURL(new RegExp(cible))
        await expect(page.locator('h1')).toBeVisible()
    })
})
