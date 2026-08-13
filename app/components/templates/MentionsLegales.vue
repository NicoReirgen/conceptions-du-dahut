<template>
    <main class="mentions-legales w-full pt-42.5 md:pt-58 lg:pt-66 *:px-5">
        <header class="mb-42.5">
            <h1>{{ content.title }}</h1>
        </header>

        <section class="grid grid-cols-12">
            <div class="col-span-full md:col-start-2 md:col-end-9">
                <template v-for="(item, index) in sections" :key="`section-${index}`">
                    <h2>{{ index + 1 }}. {{ item.titre_de_section }}</h2>

                    <div v-html="item.contenu_de_section"></div>
                </template>
            </div>
        </section>
    </main>
</template>

<script setup>
const props = defineProps({
    content: {
        type: Object,
        required: true,
    },
})

// Le même répéteur alimente aussi le bas de la page sur-mesure.
const sections = computed(() => props.content.acf?.ajouter_une_section || [])
</script>
