import { describe, it, expect } from 'vitest'
import { creerChronometre, rangBoucle, rangDepuisDefilement } from '~~/app/composables/useCarousel'

/*
   L'arithmétique des carrousels, sortie du composable pour être éprouvée sans
   navigateur : c'est elle qui décide de la diapositive affichée, et elle n'était
   couverte par rien.
*/

describe('rang bouclé', () => {
    it('laisse un rang valide en place', () => {
        expect(rangBoucle(2, 5)).toBe(2)
    })

    it('revient au début après la dernière', () => {
        expect(rangBoucle(5, 5)).toBe(0)
        expect(rangBoucle(6, 5)).toBe(1)
    })

    /* « Précédent » depuis la première diapositive mène à la dernière. */
    it('revient à la fin avant la première', () => {
        expect(rangBoucle(-1, 5)).toBe(4)
        expect(rangBoucle(-6, 5)).toBe(4)
    })

    it('rend zéro sans diapositive', () => {
        expect(rangBoucle(3, 0)).toBe(0)
    })
})

describe('rang déduit du défilement', () => {
    it('arrondit à la diapositive la plus proche', () => {
        expect(rangDepuisDefilement(0, 300, 4)).toBe(0)
        expect(rangDepuisDefilement(140, 300, 4)).toBe(0)
        expect(rangDepuisDefilement(160, 300, 4)).toBe(1)
        expect(rangDepuisDefilement(600, 300, 4)).toBe(2)
    })

    it('ne dépasse pas la dernière', () => {
        expect(rangDepuisDefilement(99999, 300, 4)).toBe(3)
    })

    /*
       Sur macOS, le défilement élastique rend un `scrollLeft` négatif en bout
       de course : le calcul désignait alors la diapositive -1.
    */
    it('ne descend pas sous la première, malgré le défilement élastique', () => {
        expect(rangDepuisDefilement(-80, 300, 4)).toBe(0)
    })

    it('rend zéro tant que rien n’est mesurable', () => {
        expect(rangDepuisDefilement(500, 0, 4)).toBe(0)
        expect(rangDepuisDefilement(500, 300, 0)).toBe(0)
    })
})

describe('chronomètre de la lecture automatique', () => {
    /* L'horloge est fournie par le test : rien ici n'attend cinq secondes. */
    const monter = (delai = 5000) => {
        let instant = 1000
        const chronometre = creerChronometre(delai, () => instant)

        return { chronometre, avancer: (ms) => { instant += ms } }
    }

    it('part de zéro', () => {
        const { chronometre } = monter()
        chronometre.relancer()

        expect(chronometre.avancement.value).toBe(0)
    })

    it('rend l’avancement du délai', () => {
        const { chronometre, avancer } = monter(5000)
        chronometre.relancer()

        avancer(2500)
        expect(chronometre.battre()).toBe(false)
        expect(chronometre.avancement.value).toBe(0.5)
    })

    it('signale le délai écoulé, une fois plein', () => {
        const { chronometre, avancer } = monter(5000)
        chronometre.relancer()

        avancer(5000)
        expect(chronometre.battre()).toBe(true)
        expect(chronometre.avancement.value).toBe(1)
    })

    it('ne bat pas tant qu’il n’a pas été lancé', () => {
        expect(monter().chronometre.battre()).toBe(false)
    })

    describe('pause au survol', () => {
        it('fige l’avancement', () => {
            const { chronometre, avancer } = monter(5000)
            chronometre.relancer()
            avancer(2500)
            chronometre.battre()

            chronometre.pause()
            avancer(10000)

            expect(chronometre.battre()).toBe(false)
            expect(chronometre.avancement.value).toBe(0.5)
        })

        /*
           Le point délicat : à la reprise, le temps passé sous le curseur ne
           doit pas être rattrapé d'un coup — sans quoi la diapositive saute au
           moment où l'on retire la souris.
        */
        it('reprend là où elle s’était arrêtée', () => {
            const { chronometre, avancer } = monter(5000)
            chronometre.relancer()
            avancer(2500)
            chronometre.battre()

            chronometre.pause()
            avancer(60000)
            chronometre.reprendre()

            expect(chronometre.battre()).toBe(false)
            expect(chronometre.avancement.value).toBe(0.5)

            avancer(2500)
            expect(chronometre.battre()).toBe(true)
        })
    })
})
