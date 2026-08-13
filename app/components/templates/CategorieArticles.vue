<template>
    <main class="categorie-articles pt-42.5 md:pt-58 lg:pt-66 *:px-5">
        <header class="grid grid-cols-12 mb85">
            <h1 class="col-span-full md:col-span-10">{{ content.title }}</h1>

            <p v-if="intro" class="col-span-full md:col-span-10 mt-8" v-html="intro"></p>
        </header>

        <section class="px-0!">
            <HomeArticle
                v-for="article in articles"
                :key="article.id"
                :article="article"
            />

            <p v-if="!articles.length" class="px-5">
                Aucune réalisation n'est encore rattachée à cette prestation.
            </p>
        </section>

        <section class="pb-42.5">
            <ArrowLink to="/realisations" label="Toutes nos réalisations" />
        </section>
    </main>
</template>

<script setup>
/**
 * Archive d'une catégorie d'articles — l'équivalent de `category.php` dans le
 * thème, qui réutilisait la liste des réalisations.
 *
 * Ces pages sont atteintes depuis les liens « Nos réalisations sur-mesure » de
 * la page sur-mesure. Elles vivent à la racine du site : la base de catégorie
 * est vide dans les permaliens WordPress.
 */
const props = defineProps({
    content: {
        type: Object,
        required: true,
    },
})

const articles = computed(() => props.content.items || [])
const intro = computed(() => props.content.description || '')
</script>
