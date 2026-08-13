<template>
  <div>
    <Preloader />

    <div class="scroll-watcher"></div>

    <Nav />

    <slot />

    <Footer />
  </div>
</template>

<script setup>
// Repli de révélation au défilement pour les navigateurs sans
// `animation-timeline` (voir useScrollReveal).
useScrollReveal()
</script>
