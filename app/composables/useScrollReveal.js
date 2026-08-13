/**
 * Révélation des éléments `.animate` au défilement.
 *
 * Le CSS anime ces éléments avec `animation-timeline: view()`, une animation
 * pilotée par le défilement qui ne coûte aucun JavaScript. Mais tous les
 * navigateurs ne la prennent pas encore en charge, et le CSS les laisse alors à
 * `opacity: 0` — donc invisibles.
 *
 * Le thème couvrait ce cas avec un IntersectionObserver qui déclenchait une
 * animation GSAP. On garde l'observateur, on remplace GSAP par une transition
 * CSS : même rendu, une dépendance de moins.
 *
 * L'observateur n'est instancié que si le navigateur en a besoin.
 */
export const useScrollReveal = () => {
    if (import.meta.server) {
        return
    }

    let observer = null

    const setup = () => {
        // Navigateur capable d'animations liées au défilement : le CSS suffit.
        if (CSS.supports('animation-timeline: view()')) {
            return
        }

        observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) {
                        continue
                    }

                    entry.target.classList.add('is-revealed')
                    // Une fois révélé, l'élément n'a plus besoin d'être observé.
                    observer.unobserve(entry.target)
                }
            },
            { threshold: 0.2 }
        )

        document.querySelectorAll('.animate:not(.is-revealed)').forEach((element) => {
            observer.observe(element)
        })
    }

    onMounted(setup)

    // Les pages changent sans rechargement : il faut observer les nouveaux
    // éléments à chaque navigation.
    const route = useRoute()
    watch(
        () => route.fullPath,
        async () => {
            if (!observer) {
                return
            }

            await nextTick()
            document.querySelectorAll('.animate:not(.is-revealed)').forEach((element) => {
                observer.observe(element)
            })
        }
    )

    onBeforeUnmount(() => {
        observer?.disconnect()
    })
}
