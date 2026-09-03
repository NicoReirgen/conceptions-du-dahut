import { test, expect } from '@playwright/test'
import { chemin } from './chemin'

/*
   Le tunnel du configurateur, de bout en bout.

   Reprend l'empreinte comportementale qui a servi à valider quatre refontes
   successives : on parcourt les treize étapes en choisissant toujours la
   première possibilité, et on vérifie que le prix final ne bouge pas.

   Ce parcours a attrapé chaque régression de la semaine. Il vivait dans une
   console de navigateur ; il vit désormais dans le dépôt.
*/

/** Débloque l'étape courante en prenant la première possibilité offerte. */
async function debloquer(page) {
    const suivant = page.locator('button.next')

    for (let essai = 0; essai < 6; essai++) {
        if (!(await suivant.isDisabled())) return

        const pastille = page.locator('.sub-option-card:not(.selected)').first()
        if (await pastille.count()) {
            await pastille.click()
            continue
        }

        const select = page.locator('.content-section select')
        if (await select.count() && !(await select.inputValue())) {
            await select.selectOption({ index: 1 })
            continue
        }

        const carte = page
            .locator('.option-card:not(.disabled):not(.selected), .unique-option-card:not(.selected)')
            .first()
        if (await carte.count()) {
            await carte.click()
            continue
        }

        return
    }
}

async function ouvrirOrion(page) {
    await page.goto(chemin('/configurateur'))
    await page.getByRole('button', { name: /choisir l.option orion|^orion$/i }).first().click()
        .catch(async () => {
            await page.locator('.option-card', { hasText: 'Orion' }).first().click()
        })
}

test.describe('tunnel de configuration', () => {
    test('se parcourt en entier et aboutit au prix attendu', async ({ page }) => {
        const erreurs = []
        page.on('pageerror', (e) => erreurs.push(e.message))

        await ouvrirOrion(page)

        const titres = []
        for (let i = 0; i < 20; i++) {
            const titre = await page.locator('.content-section h2').first().textContent()
            titres.push(titre.replace(/\s+/g, ' ').trim())

            if (await page.locator('.contact-step').count()) break

            await debloquer(page)
            await page.locator('button.next').click()
            await page.waitForTimeout(250)
        }

        expect(titres).toContain('Ouvrants 3/7')
        expect(titres).toContain('Équipements extérieurs 7/7')
        expect(titres.at(-1)).toBe('Formulaire')

        // Le prix de ce parcours précis, stable depuis la première mesure.
        await expect(page.locator('.van-configurator > footer')).toContainText('8 417,00');

        expect(erreurs).toEqual([])
    })

    test('affiche le prix de base dès le choix du véhicule', async ({ page }) => {
        await ouvrirOrion(page)
        await expect(page.locator('.van-configurator > footer')).toContainText('5 900,00')
    })

    /*
       L'aperçu ne suivait pas les choix.

       L'observateur qui le rafraîchit n'était pas `deep`, et les sélections
       sont écrites dans un objet modifié en place : il ne partait donc qu'au
       changement de véhicule. Le système d'images calculait le bon chemin à
       chaque clic, le panneau de débogage l'affichait — et le visiteur gardait
       sous les yeux l'image de la première étape.

       Rien ne le voyait : le prix, lui, suivait. D'où ce test, qui regarde
       l'image plutôt que le chiffre.
    */
    test('l’aperçu suit les sélections', async ({ page }) => {
        await ouvrirOrion(page)

        const apercu = page.locator('.choice-preview')
        const depart = await apercu.getAttribute('src')

        // Jusqu'à la première étape qui porte des options d'aménagement.
        for (let i = 0; i < 6; i++) {
            if (await page.locator('.content-section h2').first().textContent()
                .then((t) => /mobilier/i.test(t))) break

            await debloquer(page)
            await page.locator('button.next').click()
            await page.waitForTimeout(250)
        }

        await page.locator('.option-card:not(.selected)').first().click()

        await expect(apercu).not.toHaveAttribute('src', depart)
        await expect(apercu).toHaveJSProperty('naturalWidth', 1280)
    })
})

test.describe('accessibilité au clavier', () => {
    /*
       Le choix du véhicule était un `div` ouvert au clic : sans souris, on ne
       pouvait pas dépasser l'étape 2. C'est le blocage le plus grave qu'on ait
       trouvé, et celui qu'on veut voir échouer bruyamment s'il revient.
    */
    test('le choix du véhicule est un select natif, atteignable au clavier', async ({ page }) => {
        await ouvrirOrion(page)
        await page.locator('button.next').click()
        await page.locator('button.next').click()

        const select = page.locator('.content-section select')
        await expect(select).toBeVisible()

        await select.focus()
        await expect(select).toBeFocused()

        await select.selectOption({ index: 1 })
        await expect(page.locator('button.next')).toBeEnabled()
    })

    test('les véhicules indisponibles sortent de l’ordre de tabulation', async ({ page }) => {
        await page.goto(chemin('/configurateur'))

        const indisponibles = page.locator('.option-card.disabled')
        await expect(indisponibles.first()).toHaveAttribute('tabindex', '-1')
        await expect(indisponibles.first()).toHaveAttribute('aria-disabled', 'true')
    })

    test('Entrée retient une option', async ({ page }) => {
        await page.goto(chemin('/configurateur'))

        const orion = page.locator('.option-card', { hasText: 'Orion' }).first()
        await orion.focus()
        await orion.press('Enter')

        await expect(orion).toHaveClass(/selected/)
    })

    test('le focus se porte sur le titre de la nouvelle étape', async ({ page }) => {
        await ouvrirOrion(page)
        await page.locator('button.next').click()

        await expect(page.locator('.content-section h2').first()).toBeFocused()
    })
})

test.describe('formulaire en mode vitrine', () => {
    test('confirme l’envoi sans qu’aucune requête ne parte', async ({ page }) => {
        const envois = []
        page.on('request', (r) => {
            if (r.method() === 'POST') envois.push(r.url())
        })

        await ouvrirOrion(page)
        for (let i = 0; i < 16; i++) {
            if (await page.locator('.contact-step').count()) break
            await debloquer(page)
            await page.locator('button.next').click()
            await page.waitForTimeout(200)
        }

        await page.locator('.contact-step input').nth(0).fill('Negrier')
        await page.locator('.contact-step input').nth(1).fill('Nicolas')
        await page.locator('.contact-step input').nth(2).fill('test@sobr.studio')
        await page.locator('.contact-step input').nth(3).fill('0600000000')
        await page.locator('.contact-step textarea').fill('Essai de bout en bout.')

        await page.getByRole('button', { name: /terminer/i }).click()

        const confirmation = page.locator('.submit-success')
        await expect(confirmation).toBeVisible({ timeout: 5000 })
        await expect(confirmation).toContainText('titre de référence')
        await expect(confirmation).toHaveAttribute('role', 'status')

        expect(envois).toEqual([])
    })
})
