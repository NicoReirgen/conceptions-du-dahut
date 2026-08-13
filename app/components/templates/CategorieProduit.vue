<template>
    <main class="categorie-de-produit *:px-5">
        <header class="h-screen px-0!">
            <figure class="h-full w-full relative">
                <AppImage
                    :media="content.acf?.image_a_la_une"
                    :fallback-alt="content.title"
                    priority
                    class="w-full h-full object-cover rounded-none"
                />

                <figcaption class="flex flex-col justify-between absolute inset-0 pt-42.5 md:pt-58 lg:pt-66 pb-8 md:pb-11 lg:pb-12.5 *:px-5">
                    <div class="grid grid-cols-12">
                        <div class="col-span-7">
                            <h1>{{ content.title }}</h1>
                        </div>
                    </div>

                    <div class="grid grid-cols-12 items-end">
                        <p class="col-span-full md:col-span-3">
                            {{ intro }}
                        </p>

                        <ul class="col-span-full md:col-span-3 md:col-start-5">
                            <li v-for="item in content.items" :key="item.id">{{ item.title }}</li>
                        </ul>
                    </div>
                </figcaption>
            </figure>
        </header>

        <section class="grid grid-cols-12 gap-y-20!">
            <div v-for="produit in content.items" :key="produit.id" class="col-span-full md:col-span-4">
                <figure class="relative">
                    <AppImage
                            :media="produit.thumbnail"
                            :fallback-alt="produit.title"
                            class="mb-6.5 aspect-25/32 w-full object-cover"
                        />

                    <figcaption class="flex items-center gap-5">
                        <h2 class="h3-size">{{ produit.title }}</h2>

                        <ArrowLink :to="produit.path" label="Découvrir" />
                    </figcaption>
                </figure>
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

// Le thème codait cette accroche en dur dans le gabarit. On prend d'abord la
// description du terme, éditable depuis WordPress.
const intro = computed(
    () =>
        String(props.content.description || '').replace(/<[^>]*>/g, '').trim() ||
        "Tous les produits que nous vous proposons sont dédiés aux voyages et s'adaptent à votre situation."
)
</script>
