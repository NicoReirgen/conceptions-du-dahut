<template>
    <main :class="content.slug" class="w-full pt-42.5 md:pt-58 lg:pt-66 px-5">
        <header class="mb-35 grid grid-cols-12">
            <h1 class="hidden col-span-12">{{ content.title }}</h1>

            <p class="animate h1-size col-span-11">{{ accroche }}</p>
        </header>

        <section class="grid grid-cols-12 items-end">
            <div class="col-span-3">
                <p class="text-balance">Nous proposons plusieurs prestations sur-mesure</p>
            </div>

            <div class="col-span-3">
                <ul>
                    <li v-for="prestation in prestations" :key="prestation.id">
                        {{ prestation.name }}
                    </li>
                </ul>
            </div>
        </section>

        <section v-if="content.content" class="grid grid-cols-12 mt-42.5">
            <div class="col-span-full md:col-start-2 md:col-end-9" v-html="content.content"></div>
        </section>
    </main>
</template>

<script setup>
const props = defineProps({
    content: {
        type: Object,
        required: true,
    },
    /**
     * Les catégories de prestations, partagées avec la page sur-mesure. Le thème
     * les codait en dur dans chaque gabarit ; elles viennent maintenant de la
     * taxonomie.
     */
    prestations: {
        type: Array,
        default: () => [],
    },
})

// Le thème codait l'accroche en dur par page. Faute de champ dédié, on retombe
// sur l'extrait WordPress, éditable, sinon sur le titre.
const accroche = computed(
    () => props.content.excerpt?.replace(/<[^>]*>/g, '').trim() || props.content.title
)
</script>
