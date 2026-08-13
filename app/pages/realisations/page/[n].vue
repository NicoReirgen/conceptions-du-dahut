<template>
    <TemplatesRealisations :content="content" />
</template>

<script setup>
/**
 * Pages suivantes de la liste des réalisations : /realisations/page/2, /3…
 *
 * Le thème découpe la liste par `posts_per_page` et expose ces URLs ; l'API
 * renvoie la tranche correspondante et de quoi construire les liens.
 */
const route = useRoute()

const content = await useContent(
    computed(() => `/realisations/page/${route.params.n}`)
)

useContentSeo(content)
</script>
