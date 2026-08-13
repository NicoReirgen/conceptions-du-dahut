<template>
    <div v-if="visible" class="preloader flex" :class="{ 'preloader-done': done }" aria-hidden="true">
        <div class="logoPicto flex-1">
            <img class="w-15 h-15 rounded-none" width="60" height="60" src="/assets/svg/logo_picto.svg" alt="">
        </div>

        <div class="logoText flex-1 mr-[13.5vw]">
            <img class="rounded-none" width="124" height="55" src="/assets/svg/logo_textuel.svg" alt="">
        </div>

        <div class="counter">{{ String(count).padStart(3, '0') }}</div>
    </div>
</template>

<script setup>
/**
 * Écran d'attente.
 *
 * Reprend celui du thème, dont l'animation était pilotée par GSAP : ici les
 * mouvements sont des animations CSS, seul le compteur a besoin de JavaScript.
 *
 * Ce composant a une seconde fonction, moins visible mais essentielle : le CSS
 * du thème pose `body { overflow: hidden }` et ne le libère que sur
 * `body.loaded`. Sans quelqu'un pour ajouter cette classe, la page ne défile
 * pas — et les animations liées au défilement (`animation-timeline: view()`)
 * ne progressent jamais, laissant tout le contenu à `opacity: 0`.
 *
 * Rien, dans le thème d'origine, n'ajoutait cette classe.
 */

/** Durée totale, calée sur la chronologie GSAP du thème. */
const DURATION = 1500

const visible = ref(true)
const done = ref(false)
const count = ref(0)

let raf = null
const timers = []

const unlock = () => {
    document.body.classList.add('loaded')
}

const finish = () => {
    count.value = 100
    done.value = true
    unlock()

    // Retiré du DOM après le fondu, comme le faisait le thème.
    timers.push(setTimeout(() => {
        visible.value = false
    }, 500))
}

onMounted(() => {
    // Sans animation, on ne retient pas l'utilisateur : on libère aussitôt.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        visible.value = false
        unlock()
        return
    }

    /*
       La fin du préloader repose sur un minuteur, jamais sur requestAnimationFrame :
       ce dernier est suspendu dans un onglet d'arrière-plan. Une page ouverte en
       second plan resterait sinon verrouillée sur `body { overflow: hidden }`,
       donc non défilable, indéfiniment.

       rAF ne sert qu'au compteur, purement décoratif.
    */
    timers.push(setTimeout(finish, DURATION))

    const start = performance.now()

    const tick = (now) => {
        count.value = Math.min(100, Math.floor(((now - start) / DURATION) * 100))

        if (!done.value) {
            raf = requestAnimationFrame(tick)
        }
    }

    raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
    if (raf !== null) {
        cancelAnimationFrame(raf)
    }

    timers.forEach(clearTimeout)

    // Filet de sécurité : la page doit rester défilable quoi qu'il arrive.
    if (import.meta.client) {
        unlock()
    }
})
</script>

<style scoped>
.logoPicto,
.logoText {
    opacity: 0;
    transform: translateY(1.25rem);
    animation: preloader-in 0.5s ease-in-out forwards;
}

.logoPicto {
    animation-delay: 0.5s;
}

.logoText {
    animation-delay: 0.75s;
}

.preloader-done {
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
}

@keyframes preloader-in {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .logoPicto,
    .logoText {
        animation: none;
        opacity: 1;
        transform: none;
    }
}
</style>
