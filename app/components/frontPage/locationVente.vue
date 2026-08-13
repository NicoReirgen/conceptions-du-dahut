<template>
    <section class="px-5">
        <h2 class="animate mb85 text-center">{{ acf.titre_de_la_section_location_et_vente }}</h2>

        <div class="grid grid-cols-2">
            <NuxtLink
                v-for="card in cards"
                :key="card.id"
                :to="card.path"
                class="animate col-span-full md:col-span-1 relative"
            >
                <AppImage
                    :media="card.thumbnail"
                    :fallback-alt="card.title"
                    sizes="(min-width: 768px) 50vw, 100vw"
                    class="aspect-611/346 w-full object-cover"
                />

                <div class="w-full px-4 absolute bottom-4">
                    <div class="flex items-center h-3.5 w-27.5 mb-3 border-l border-b rounded-bl-xs pl-1.5 pr-5.5 uppercase text-[0.625rem] leading-0">
                        {{ card.title }}
                    </div>

                    <h3>{{ card.label }}</h3>
                </div>
            </NuxtLink>
        </div>
    </section>
</template>

<script setup>
const props = defineProps({
    acf: {
        type: Object,
        default: () => ({}),
    },
})

// Les deux pages cibles arrivent résolues (titre, vignette, chemin) : aucune
// requête supplémentaire, contrairement à la version précédente.
const first = (value) => (Array.isArray(value) ? value[0] : value)

const cards = computed(() =>
    [
        { page: first(props.acf.lien_de_la_page_location), label: props.acf.texte_du_lien_location },
        { page: first(props.acf.lien_de_la_page_vente), label: props.acf.texte_du_lien_vente },
    ]
        .filter((entry) => entry.page)
        .map((entry) => ({
            id: entry.page.id,
            title: entry.page.title,
            path: entry.page.path,
            thumbnail: entry.page.thumbnail,
            label: entry.label || '',
        }))
)
</script>
