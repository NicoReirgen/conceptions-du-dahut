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
 * Deux moitiés indépendantes, dont une seule sert aux deux appelants : le
 * carrousel des avis ne fait que défiler, celui des réalisations s'anime tout
 * seul. Elles sont séparées ici, et l'arithmétique commune est sortie à part
 * pour être éprouvée sans navigateur.
 */

/* ------------------------------------------------------------------ calculs */

/** Ramène un rang quelconque dans les bornes, en bouclant. */
export const rangBoucle = (rang, total) => (total > 0 ? ((rang % total) + total) % total : 0)

/**
 * Le rang qu'indique une position de défilement.
 *
 * Le plancher à zéro n'est pas une précaution de principe : sur macOS, le
 * défilement élastique rend un `scrollLeft` négatif en bout de course, et le
 * calcul désignait alors la diapositive -1.
 */
export const rangDepuisDefilement = (defilement, pas, total) => {
    if (!(pas > 0) || !(total > 0)) return 0

    return Math.min(total - 1, Math.max(0, Math.round(defilement / pas)))
}

/**
 * Distance entre deux diapositives.
 *
 * Elle ne vaut pas la largeur du conteneur : le carrousel des avis n'affiche
 * qu'une diapo et demie, l'aperçu de la suivante faisant partie du parti pris
 * graphique. On mesure donc la diapo réelle, espacement compris.
 */
const pasDuCarrousel = (element) => {
    const premiere = element?.firstElementChild

    if (!element || !premiere) {
        return element?.clientWidth || 0
    }

    const styles = getComputedStyle(element)
    const espacement = parseFloat(styles.columnGap || styles.gap || '0') || 0

    return premiere.getBoundingClientRect().width + espacement
}

/** Respecte le réglage système : pas de défilement animé ni de lecture auto. */
const animationsReduites = () =>
    import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* --------------------------------------------------------------- défilement */

const useDefilement = ({ container, index, total, auRepositionnement }) => {
    const goTo = (cible, doux = true) => {
        const element = container.value
        if (!element || !total.value) return

        element.scrollTo({
            left: rangBoucle(cible, total.value) * pasDuCarrousel(element),
            behavior: doux && !animationsReduites() ? 'smooth' : 'auto',
        })

        auRepositionnement()
    }

    /** Position courante, déduite du défilement plutôt que maintenue en double. */
    const onScroll = () => {
        const element = container.value
        if (!element) return

        index.value = rangDepuisDefilement(element.scrollLeft, pasDuCarrousel(element), total.value)
    }

    onMounted(() => container.value?.addEventListener('scroll', onScroll, { passive: true }))
    onBeforeUnmount(() => container.value?.removeEventListener('scroll', onScroll))

    return { goTo, next: () => goTo(index.value + 1), prev: () => goTo(index.value - 1) }
}

/* ------------------------------------------------------------- lecture auto */

/**
 * Compte à rebours de la lecture automatique.
 *
 * `maintenant` est injectable, et c'est tout l'intérêt de l'avoir sorti : la
 * reprise après une pause ne se vérifie pas autrement qu'en attendant cinq
 * secondes devant l'écran.
 */
export const creerChronometre = (delai, maintenant = () => performance.now()) => {
    const avancement = ref(0)

    let depuis = null
    let enPause = false

    return {
        avancement,

        relancer() {
            depuis = maintenant()
            avancement.value = 0
        },

        pause() {
            enPause = true
        },

        reprendre() {
            // Reprendre sans rejouer le temps écoulé pendant la pause.
            depuis = maintenant() - avancement.value * delai
            enPause = false
        },

        /** Avance le compteur, et dit si le délai est écoulé. */
        battre() {
            if (enPause || depuis === null) return false

            const ecoule = maintenant() - depuis
            avancement.value = Math.min(1, ecoule / delai)

            return ecoule >= delai
        },
    }
}

/**
 * Fait avancer le carrousel tout seul.
 *
 * Rien n'est installé quand la lecture automatique n'est pas demandée : le
 * carrousel des avis ne pose donc aucun observateur.
 */
const useLectureAuto = ({ delai, avancer }) => {
    const chronometre = creerChronometre(delai)

    let image = null

    const battement = () => {
        // `avancer` repositionne, ce qui relance le compte à rebours.
        if (chronometre.battre()) avancer()

        image = requestAnimationFrame(battement)
    }

    /*
       requestAnimationFrame est suspendu quand l'onglet passe en arrière-plan :
       la lecture automatique s'arrête d'elle-même, ce qui est souhaitable — rien
       ne sert d'animer du contenu que personne ne regarde. Mais au retour, le
       compteur de temps serait périmé et ferait défiler aussitôt : on le
       réarme.
    */
    const auRetour = () => {
        if (!document.hidden) chronometre.relancer()
    }

    const installer = (element) => {
        if (!element || !(delai > 0) || animationsReduites()) return

        element.addEventListener('mouseenter', chronometre.pause)
        element.addEventListener('mouseleave', chronometre.reprendre)
        document.addEventListener('visibilitychange', auRetour)

        chronometre.relancer()
        image = requestAnimationFrame(battement)
    }

    const retirer = (element) => {
        element?.removeEventListener('mouseenter', chronometre.pause)
        element?.removeEventListener('mouseleave', chronometre.reprendre)
        document.removeEventListener('visibilitychange', auRetour)

        if (image !== null) cancelAnimationFrame(image)
    }

    return { progress: chronometre.avancement, relancer: chronometre.relancer, installer, retirer }
}

/* ------------------------------------------------------------------ montage */

/**
 * @param {object} options
 * @param {number} options.count       Nombre de diapositives.
 * @param {number} options.autoplay    Délai entre deux diapositives, en ms. 0 pour désactiver.
 */
export const useCarousel = ({ count, autoplay = 0 } = {}) => {
    const container = ref(null)
    const index = ref(0)

    const total = computed(() => (typeof count === 'function' ? count() : unref(count)) || 0)

    const lecture = useLectureAuto({ delai: autoplay, avancer: () => next() })

    const { goTo, next, prev } = useDefilement({
        container,
        index,
        total,
        auRepositionnement: lecture.relancer,
    })

    onMounted(() => lecture.installer(container.value))
    onBeforeUnmount(() => lecture.retirer(container.value))

    return { container, index, progress: lecture.progress, goTo, next, prev }
}
