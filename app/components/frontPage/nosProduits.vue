<template>
    <section class="px-5">
        <div class="animate flex justify-between mb85">
            <h2>{{ acf.produits_titre }}</h2>

            <ArrowLink to="/produits" label="Tous nos produits" />
        </div>

        <div class="grid grid-cols-3">
            <figure
                v-for="produit in produits"
                :key="produit.id"
                class="animate col-span-full md:col-span-1 relative"
            >
                <AppImage
                    :media="produit.thumbnail"
                    :fallback-alt="stripHtml(produit.title)"
                    sizes="(min-width: 768px) 33vw, 100vw"
                    class="aspect-3/2 md:aspect-400/558 w-full object-cover"
                />

                <figcaption class="flex flex-col justify-end w-full h-full px-5 py-4 absolute bottom-0">
                    <div class="flex items-center h-3.5 w-27.5 mb-3 border-l border-b rounded-bl-xs pl-1.5 pr-5.5 uppercase text-[0.625rem] leading-0">
                        {{ produit.terms?.[0]?.name }}
                    </div>

                    <div class="flex justify-between items-end">
                        <h3>{{ produit.title }}</h3>

                        <ArrowLink
                            :to="produit.path"
                            label="Le produit"
                            class="before:content-[''] before:block before:inset-0 before:absolute"
                        />
                    </div>
                </figcaption>
            </figure>
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

// Les produits arrivent résolus avec vignette, catégorie et chemin front.
const produits = computed(() => props.acf.selection_de_produits || [])

const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').trim()
</script>
