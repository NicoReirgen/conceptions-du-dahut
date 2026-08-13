/**
 * Applique les métadonnées SEO renvoyées par WordPress (SEOPress) à la page.
 *
 * Le contenu est déjà résolu côté API : on se contente de poser les balises,
 * sans requête ni calcul supplémentaire au rendu.
 *
 * @param {import('vue').Ref<object>} content Contenu renvoyé par useContent.
 */
export const useContentSeo = (content) => {
    const seo = computed(() => unref(content)?.seo || {})

    const meta = computed(() => {
        const tags = []
        const { description, og, noindex, nofollow } = seo.value

        if (description) {
            tags.push({ name: 'description', content: description })
        }

        if (noindex || nofollow) {
            tags.push({
                name: 'robots',
                content: [noindex ? 'noindex' : 'index', nofollow ? 'nofollow' : 'follow'].join(', '),
            })
        }

        if (og?.title) {
            tags.push({ property: 'og:title', content: og.title })
        }
        if (og?.description) {
            tags.push({ property: 'og:description', content: og.description })
        }
        if (og?.image) {
            tags.push({ property: 'og:image', content: og.image })
        }

        tags.push({ property: 'og:type', content: 'website' })

        return tags
    })

    useHead({
        title: computed(() => seo.value.title || unref(content)?.title || ''),
        meta,
        link: computed(() => (seo.value.canonical ? [{ rel: 'canonical', href: seo.value.canonical }] : [])),
    })
}
