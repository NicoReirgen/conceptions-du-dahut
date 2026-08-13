<template>
    <TemplatesProduit :content="content" />
</template>

<script setup>
const route = useRoute()
const content = await useContent(computed(() => `/produits/${route.params.slug}`))

useContentSeo(content)
</script>
