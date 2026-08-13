<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
const { site } = await useBootstrap()

useHead({
  titleTemplate: (title) => {
    const name = site.value.name || 'Les Conceptions du Dahut'
    return title && title !== name ? `${title}` : name
  },
})

// Défilement doux, et remise en haut de page à chaque navigation.
useSmoothScroll()
</script>
