<template>
    <main class="404 flex justify-between h-screen w-full px-5 py-7 relative overflow-hidden">
        <h1 class="pointer-events-none text-[85.5vmax] absolute top-1/2 left-1/2 -translate-1/2 rotate-17">{{ error.statusCode }}</h1>

        <NuxtLink class="self-end" to="/">
            <img width="190" height="66" src="/assets/svg/logo_full.svg" alt="Les Conceptions du Dahut">
        </NuxtLink>

        <div>
            <p class="w-66.75 mb85 text-[1.3681rem]" v-html="errorMessage"></p>

            <ArrowLink to="/" label="Retour à la page d'accueil" />
        </div>
    </main>
</template>

<script setup>
const props = defineProps({
    error: {
        type: Object,
        required: true,
    },
})

const errorMessages = {
    404: 'La page que vous <br>cherchez n\'existe pas',
    403: 'Vous n\'avez pas <br>accès à cette page',
    500: 'Une erreur <br>s\'est produite côté serveur',
    503: 'Le service est <br>temporairement indisponible',
}

const errorMessage = computed(
    () => errorMessages[props.error.statusCode] ?? 'Une erreur <br>inattendue est survenue',
)
</script>