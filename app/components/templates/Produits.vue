<template>
    <main :class="content.slug" class="pt-42.5 md:pt-58 lg:pt-66 *:px-5">
        <header class="mb-42.5">
            <h1 class="mb-30">{{ content.title }}</h1>

            <div class="grid grid-cols-12 items-end">
                <p class="col-span-8 sm:col-span-3">
                    Tous les produits que nous vous proposons sont dédiés aux voyages et s'adaptent à votre situation.
                </p>

                <ul class="col-span-8 sm:col-span-3 sm:col-start-5">
                    <li v-for="produit in gamme" :key="`${produit.type}-${produit.id}`">
                        {{ produit.title || produit.name }}
                    </li>
                </ul>
            </div>
        </header>

        <section class="grid grid-cols-12 gap-y-21.25!">
            <div
                v-for="(item, index) in items"
                :key="`${item.type}-${item.id}`"
                class="animate col-span-12 sm:col-span-6"
                :class="[spanClass(index), index % 2 === 1 ? 'md:-col-end-1' : '']"
            >
                <AppImage
                    :media="item.image"
                    :fallback-alt="item.title"
                    class="h-115 w-full object-cover mb-6.25"
                />

                <div class="flex gap-5">
                    <h2 class="h3-size">{{ item.title }}</h2>

                    <ArrowLink :to="item.path" label="Découvrir" />
                </div>
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
    /** La gamme de produits, chargée par l'aiguillage de gabarits. */
    produits: {
        type: Array,
        default: () => [],
    },
})

/**
 * Le contenu flexible mélange deux types d'entrées : un produit précis ou une
 * catégorie entière. On les ramène à une forme commune pour n'avoir qu'une
 * seule boucle d'affichage.
 */
const items = computed(() =>
    (props.content.acf?.selections_de_produits_categories || [])
        .map((row) => {
            if (row.layout === 'produit') {
                const produit = Array.isArray(row.produit) ? row.produit[0] : row.produit
                if (!produit) return null

                return {
                    type: 'produit',
                    id: produit.id,
                    title: produit.title,
                    path: produit.path,
                    image: produit.thumbnail,
                }
            }

            const categorie = row.categorie
            if (!categorie) return null

            return {
                type: 'categorie',
                id: categorie.id,
                title: categorie.name,
                path: categorie.path,
                image: categorie.image,
            }
        })
        .filter(Boolean)
)

/*
   Le thème listait ici six intitulés écrits en dur — Orion, Modular,
   Équipements… — identiques sur les trois pages qui partagent ce gabarit. Ce
   sont des noms de produits, pas de catégories : on affiche donc la gamme
   réelle, et à défaut ce que porte la sélection de la page.
*/
const gamme = computed(() => {
    if (props.produits.length) {
        return props.produits
    }

    return items.value
})

/**
 * Largeurs en quinconce, sur un cycle de six. Les classes sont écrites en toutes
 * lettres : Tailwind analyse le source statiquement et ne verrait pas une classe
 * assemblée à la volée.
 */
const SPANS = [
    'md:col-span-5',
    'md:col-span-6',
    'md:col-span-4',
    'md:col-span-7',
    'md:col-span-7',
    'md:col-span-4',
]

const spanClass = (index) => SPANS[index % SPANS.length]
</script>
