<template>
    <main class="sur-mesure w-full pt-42.5 md:pt-58 lg:pt-66 *:px-5">
        <DevisModal v-model="devisOuvert" />

        <header class="mb-35 grid grid-cols-12">
            <h1 class="hidden col-span-12">{{ content.title }}</h1>

            <p class="animate h1-size col-span-11">
                Confiez-nous votre aménagement, de la création à l'optimisation.
            </p>
        </header>

        <section class="grid grid-cols-12 items-end">
            <div class="col-span-3">
                <p class="max-w-52.5 text-balance">Nous proposons plusieurs prestations sur-mesure</p>
            </div>

            <div class="col-span-3">
                <ul>
                    <li v-for="prestation in prestations" :key="prestation.id">{{ prestation.name }}</li>
                </ul>
            </div>
        </section>

        <FrontPageVideoWrap :acf="acf" class="px-0!" />

        <section class="grid grid-cols-12 px-5">
            <div class="col-span-full md:col-span-8 space-y-21.25 md:space-y-42.5 order-2 md:order-none">
                <div
                    v-for="prestation in prestations"
                    :id="prestation.slug"
                    :key="prestation.id"
                    class="animate grid grid-cols-2 gap-y-0 scroll-mt-40"
                >
                    <h2 class="col-span-full mb85">{{ prestation.name }}</h2>

                    <div
                        v-if="prestation.description"
                        class="col-span-full mb-12.5 space-y-5"
                        v-html="prestation.description"
                    ></div>

                    <div class="col-span-full flex flex-col md:flex-row gap-5 md:gap-10 mb85">
                        <ArrowLink :to="prestation.path" label="Nos réalisations sur-mesure" />

                        <button
                            type="button"
                            class="flex items-center gap-2.5 underline group"
                            @click="devisOuvert = true"
                        >
                            <span>Demander un devis</span>
                            <DevisArrow />
                        </button>
                    </div>

                    <div
                        v-for="image in prestation.acf?.images || []"
                        :key="image.id"
                        class="col-span-1"
                    >
                        <AppImage
                                :media="image"
                                class="w-full object-cover"
                                :style="ratioStyle(prestation)"
                            />
                    </div>
                </div>
            </div>

            <div class="col-span-full md:col-span-4 order-1 md:order-none mb85">
                <ul class="flex flex-col gap-2.5 rounded-[10px] border-[0.2px] border-white px-4.5 py-4 sticky top-23">
                    <li v-for="prestation in prestations" :key="prestation.id" class="h3-size">
                        <ArrowLink :to="`#${prestation.slug}`" :label="prestation.name" />
                    </li>
                </ul>
            </div>
        </section>

        <section class="grid grid-cols-12 px-5">
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
    /** Catégories de prestations, chargées par l'aiguillage de gabarits. */
    prestations: {
        type: Array,
        default: () => [],
    },
})

const acf = computed(() => props.content.acf || {})

// Le même répéteur qu'en bas des mentions légales.
const sections = computed(() => acf.value.ajouter_une_section || [])

const devisOuvert = ref(false)

/**
 * Le ratio des images est réglable par catégorie (champ ACF « 4/5 », « 3/2 »…).
 * Le thème l'injectait dans un nom de classe Tailwind construit à la volée, que
 * le compilateur ne pouvait pas voir : ces classes n'existaient donc pas dans le
 * CSS produit. On passe par la propriété CSS aspect-ratio, qui accepte la valeur
 * telle quelle.
 */
const ratioStyle = (prestation) => {
    const ratio = prestation.acf?.choisir_le_ratio_des_images
    return ratio ? { aspectRatio: String(ratio).replace('/', ' / ') } : {}
}
</script>
