<template>
  <div>
    <!--
      Seize liens précèdent le contenu sur chaque page : la navigation, le
      bouton du configurateur, le menu. Sans ce raccourci, un visiteur au
      clavier ou au lecteur d'écran les retraverse à chaque page (WCAG 2.4.1).

      Il n'apparaît qu'au focus — premier élément atteignable du document.
    -->
    <a class="lien-evitement" href="#contenu">Aller au contenu</a>

    <Preloader />

    <div class="scroll-watcher"></div>

    <Nav />

    <!--
      `tabindex="-1"` rend la cible programmatiquement focalisable : sans lui,
      certains navigateurs déplacent la vue sans déplacer le focus, et la
      tabulation suivante repartirait du haut de la page.
    -->
    <div id="contenu" tabindex="-1">
      <slot />
    </div>

    <Footer />
  </div>
</template>

<script setup>
// Repli de révélation au défilement pour les navigateurs sans
// `animation-timeline` (voir useScrollReveal).
useScrollReveal()
</script>
