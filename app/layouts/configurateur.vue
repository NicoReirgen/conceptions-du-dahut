<template>
  <div data-barba="container" data-barba-namespace="configurateur" class="configurateur-layout">
    <a class="lien-evitement" href="#contenu">Aller au contenu</a>

    <div id="contenu" tabindex="-1">
      <slot />
    </div>
  </div>
</template>
