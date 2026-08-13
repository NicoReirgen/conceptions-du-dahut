<template>
    <article class="last-of-type:mb85">
        <NuxtLink :to="article.path" @click="marquer(article.slug, carte)">
            <figure ref="carte" class="relative">
                <AppImage
                    v-if="article.thumbnail"
                    :media="article.thumbnail"
                    :fallback-alt="`Image de l'article ${plainTitle}`"
                    sizes="100vw"
                    class="aspect-1280/422 w-full object-cover rounded-none"
                    :data-transition="`realisation-${article.slug}`"
                    :style="{ viewTransitionName: nomPour(article.slug) }"
                />
                <div v-else class="aspect-1280/422 rounded-none bg-neutral-800"></div>

                <figcaption class="flex items-center absolute inset-0 px-5">
                    <h2 class="flex items-center gap-2">
                        <span
                            :data-transition="`titre-realisation-${article.slug}`"
                            :style="{ viewTransitionName: nomPour(article.slug, 'titre-') }"
                        >
                            {{ article.title }}
                        </span>

                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 9 9"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            class="rounded-none shrink-0"
                        >
                            <path
                                d="M8.7058 1.44989C8.70579 1.17576 8.4803 0.953541 8.20217 0.953551L3.66964 0.953707C3.3915 0.953716 3.16603 1.17595 3.16604 1.45008C3.16605 1.72422 3.39153 1.94643 3.66967 1.94643L7.69859 1.94629L7.69872 5.91716C7.69873 6.19129 7.92422 6.41351 8.20235 6.4135C8.48049 6.41349 8.70596 6.19126 8.70595 5.91713L8.7058 1.44989ZM1.35612 8.89979L8.5583 1.80088L7.84606 1.09894L0.643879 8.19786L1.35612 8.89979Z"
                                fill="currentColor"
                            />
                        </svg>
                    </h2>
                </figcaption>
            </figure>
        </NuxtLink>
    </article>
</template>

<script setup>
const props = defineProps({
    /** Référence d'article résolue par l'API : { title, path, thumbnail }. */
    article: {
        type: Object,
        required: true,
    },
})

const plainTitle = computed(() =>
    String(props.article?.title || '').replace(/<[^>]*>/g, '').trim()
)

/*
   Transition vers la fiche : le navigateur relie l'image et le titre de cette
   carte à leurs équivalents sur la page d'arrivée, et les anime de l'un à
   l'autre. Voir `Realisation.vue`, qui porte les mêmes noms.
*/
const carte = ref(null)
const { nomPour, marquer } = useTransitionRealisation()
</script>
