/**
 * Carrousel en défilement natif.
 *
 * Remplace Swiper, qui pesait une quarantaine de kilo-octets de JavaScript plus
 * sa feuille de style, pour deux carrousels au comportement simple. Le
 * défilement, l'inertie et le magnétisme sont ici assurés par le navigateur
 * (`scroll-snap-type`) : il ne reste qu'à suivre la position et à piloter la
 * lecture automatique.
 *
 * Bénéfices au-delà du poids : le carrousel reste utilisable au clavier et à la
 * molette même si le JavaScript n'a pas encore été exécuté, et le contenu est
 * accessible sans lui.
 *
 * @param {object} options
 * @param {number} options.count       Nombre de diapositives.
 * @param {number} options.autoplay    Délai entre deux diapositives, en ms. 0 pour désactiver.
 */
export const useCarousel = ({ count, autoplay = 0 } = {}) => {
    const container = ref(null)
    const index = ref(0)
    const progress = ref(0)

    let raf = null
    let started = null
    let paused = false

    const total = computed(() => (typeof count === 'function' ? count() : unref(count)) || 0)

    /** Respecte le réglage système : pas de défilement animé ni de lecture auto. */
    const reducedMotion = () =>
        import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /**
     * Distance entre deux diapositives.
     *
     * Elle ne vaut pas la largeur du conteneur : le carrousel des avis n'affiche
     * qu'une diapo et demie, l'aperçu de la suivante faisant partie du parti pris
     * graphique. On mesure donc la diapo réelle, espacement compris.
     */
    const pas = () => {
        const element = container.value
        const premiere = element?.firstElementChild

        if (!element || !premiere) {
            return element?.clientWidth || 0
        }

        const styles = getComputedStyle(element)
        const espacement = parseFloat(styles.columnGap || styles.gap || '0') || 0

        return premiere.getBoundingClientRect().width + espacement
    }

    const goTo = (target, smooth = true) => {
        const element = container.value
        if (!element || !total.value) {
            return
        }

        const next = ((target % total.value) + total.value) % total.value

        element.scrollTo({
            left: next * pas(),
            behavior: smooth && !reducedMotion() ? 'smooth' : 'auto',
        })

        restart()
    }

    const next = () => goTo(index.value + 1)
    const prev = () => goTo(index.value - 1)

    /** Position courante, déduite du défilement plutôt que maintenue en double. */
    const onScroll = () => {
        const element = container.value
        const largeur = pas()

        if (!element || !largeur) {
            return
        }

        index.value = Math.min(total.value - 1, Math.round(element.scrollLeft / largeur))
    }

    /* --------------------------------------------------------- Lecture auto */

    const restart = () => {
        started = performance.now()
        progress.value = 0
    }

    const tick = (now) => {
        if (!paused && started !== null) {
            const elapsed = now - started
            progress.value = Math.min(1, elapsed / autoplay)

            if (elapsed >= autoplay) {
                const element = container.value
                if (element) {
                    const target = (index.value + 1) % total.value
                    element.scrollTo({ left: target * pas(), behavior: 'smooth' })
                }
                restart()
            }
        }

        raf = requestAnimationFrame(tick)
    }

    const pause = () => {
        paused = true
    }

    const resume = () => {
        // Reprendre sans rejouer le temps écoulé pendant la pause.
        started = performance.now() - progress.value * autoplay
        paused = false
    }

    /*
       requestAnimationFrame est suspendu quand l'onglet passe en arrière-plan :
       la lecture automatique s'arrête d'elle-même, ce qui est souhaitable — rien
       ne sert d'animer du contenu que personne ne regarde. Mais au retour, le
       compteur de temps serait périmé et ferait défiler aussitôt : on le
       réarme.
    */
    const onVisibility = () => {
        if (!document.hidden) {
            restart()
        }
    }

    onMounted(() => {
        const element = container.value
        if (!element) {
            return
        }

        element.addEventListener('scroll', onScroll, { passive: true })

        if (autoplay > 0 && !reducedMotion()) {
            element.addEventListener('mouseenter', pause)
            element.addEventListener('mouseleave', resume)
            document.addEventListener('visibilitychange', onVisibility)
            restart()
            raf = requestAnimationFrame(tick)
        }
    })

    onBeforeUnmount(() => {
        const element = container.value

        if (element) {
            element.removeEventListener('scroll', onScroll)
            element.removeEventListener('mouseenter', pause)
            element.removeEventListener('mouseleave', resume)
        }

        document.removeEventListener('visibilitychange', onVisibility)

        if (raf !== null) {
            cancelAnimationFrame(raf)
        }
    })

    return { container, index, progress, goTo, next, prev }
}
