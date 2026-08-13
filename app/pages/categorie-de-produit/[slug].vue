<template>
    <TemplatesCategorieProduit :content="content" />
</template>

<script setup>
const route = useRoute()
const content = await useContent(computed(() => `/categorie-de-produit/${route.params.slug}`))

useContentSeo(content)
</script>
