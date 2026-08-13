/**
 * Défilement doux, et remise en haut à chaque changement de page.
 *
 * Deux choses à concilier :
 *
 * — Lenis tient sa propre position interne. Nuxt remet bien `window.scrollY` à
 *   zéro en changeant de route, mais Lenis l'ignore : au premier geste de
 *   molette, il ramène le visiteur là où il en était sur la page précédente.
 *   Il faut donc le resynchroniser explicitement.
 *
 * — la bibliothèque n'est chargée que si l'utilisateur n'a pas demandé de
 *   réduire les animations. Dans ce cas, la remise en haut passe par le
 *   navigateur, qui la fait déjà.
 */
let instance = null

export const useSmoothScroll = () => {
    if (import.meta.server) {
        return
    }

    const route = useRoute()

    /** Remonte en haut sans animation : on ouvre une nouvelle page, pas un ancrage. */
    const remonter = () => {
        if (instance) {
            instance.scrollTo(0, { immediate: true, force: true })
        } else {
            window.scrollTo({ top: 0, behavior: 'auto' })
        }
    }

    onMounted(async () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return
        }

        const { default: Lenis } = await import('lenis')

        instance = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(1 - t, 5)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            syncTouch: true,
            touchMultiplier: 2,
            wheelMultiplier: 1,
            autoRaf: true,
            anchors: { offset: -150 },
        })
    })

    watch(
        () => route.fullPath,
        async () => {
            await nextTick()

            // La hauteur du document vient de changer : Lenis doit la remesurer
            // avant qu'on le repositionne, sinon il borne le déplacement sur
            // l'ancienne page.
            instance?.resize()
            remonter()
        }
    )

    onBeforeUnmount(() => {
        instance?.destroy()
        instance = null
    })
}
