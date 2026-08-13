<template>
    <main class="realisations pt-42.5 md:pt-58 lg:pt-66 *:px-5">
        <header class="grid grid-cols-12 mb85">
            <h1 class="hidden col-span-full md:col-span-10">{{ content.title }}</h1>

            <p class="h1-size col-span-full md:col-span-10">
                Découvrez toutes nos réalisations depuis la création du Dahut.
            </p>
        </header>

        <section class="px-0!">
            <HomeArticle
                v-for="article in articles"
                :key="article.id"
                :article="article"
            />

            <!--
                Pagination reprise de la maquette : des liens centrés, pas le
                couple « Previous / Next » du thème.

                La maquette ne dessine que le lien vers la suite, puisqu'elle ne
                montre que la première page. Le retour est ajouté pour les pages
                suivantes, sans quoi elles seraient sans issue.

                La liste numérotée reste dans le balisage mais masquée — c'est ce
                que faisait le thème, et c'est par elle que les robots atteignent
                les autres pages.
            -->
            <nav
                v-if="pages > 1"
                class="flex justify-center items-center gap-10 py-10"
                aria-label="Pagination des réalisations"
            >
                <ul class="pages hidden">
                    <li v-for="n in pages" :key="`page-${n}`">
                        <span v-if="n === page" class="page-number page-numbers current">{{ n }}</span>
                        <NuxtLink v-else :to="lien(n)" class="page-number page-numbers">{{ n }}</NuxtLink>
                    </li>
                </ul>

                <ArrowLink
                    v-if="precedent"
                    :to="precedent"
                    label="Projets précédents"
                    class="py-2.5 px-1 [&>svg]:rotate-180"
                />

                <ArrowLink
                    v-if="suivant"
                    :to="suivant"
                    label="Voir plus de projets"
                    class="py-2.5 px-1"
                />
            </nav>
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

// L'API embarque la liste des articles dans la charge utile de la page de blog :
// pas de requête séparée pour l'index des réalisations.
const articles = computed(() => props.content.posts || [])

const pagination = computed(() => props.content.pagination || { page: 1, pages: 1, base: '/realisations' })
const page = computed(() => pagination.value.page)
const pages = computed(() => pagination.value.pages)

/** La première page vit à la racine, les suivantes sous /page/N. */
const lien = (n) => (n <= 1 ? pagination.value.base : `${pagination.value.base}/page/${n}`)

const suivant = computed(() => (page.value < pages.value ? lien(page.value + 1) : null))
const precedent = computed(() => (page.value > 1 ? lien(page.value - 1) : null))
</script>
