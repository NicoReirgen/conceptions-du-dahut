<template>
    <section class="grid grid-cols-2 w-full px-5">
        <div class="col-span-full lg:col-span-1">
            <h2 class="animate mb85">{{ acf['titre_qui_sommes-nous'] }}</h2>

            <div class="animate md:pl-52.5 text-[1.3681rem]/5.5 font-normal">
                <div class="flex flex-col gap-5.5 max-w-78.75 mb-9.5" v-html="acf['texte_qui_sommes-nous']"></div>

                <div class="flex flex-col gap-5 max-w-73.75 mb-13.5 text-base normal" v-html="acf['texte_qui_sommes-nous_petit']"></div>

                <ArrowLink v-if="lien" :link="lien" class="text-base" />
            </div>
        </div>

        <!--
            Les largeurs et décalages étaient portés par le conteneur via `*:` et
            `:nth-child(even)`. AppImage enveloppant son image dans un <picture>
            en `display: contents`, cette boîte disparaît de la mise en page :
            ces sélecteurs ne ciblaient plus rien. Les classes vivent donc sur
            l'image, et l'alternance est calculée depuis l'index de la boucle.
        -->
        <div class="col-span-full lg:col-span-1">
            <AppImage
                v-for="(image, index) in images"
                :key="image.id"
                :media="image"
                sizes="(min-width: 1024px) 33vw, 65vw"
                class="animate w-[65%] aspect-3/2 object-cover"
                :class="index % 2 === 1 ? '-mt-10.5 ml-auto' : ''"
            />
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

const images = computed(() => props.acf['images_qui_sommes-nous'] || [])
const lien = computed(() => props.acf['lien_qui_sommes-nous'] || null)
</script>
