<template>
    <main :class="content.slug" class="pt-25 md:pt-34 lg:pt-38.5">
        <section class="grid grid-cols-12 px-5">
            <div class="order-2 md:order-1 col-span-full md:col-span-6 space-y-10">
                <AppImage
                        :media="content.thumbnail"
                        :fallback-alt="plainTitle"
                        priority
                        class="animate aspect-6/7 w-full object-cover"
                    />

                <AppImage
                    v-for="(image, index) in acf.images_annexes || []"
                    :key="image?.id || index"
                    :media="image"
                    class="animate aspect-3/2 w-full object-cover"
                />
            </div>

            <div class="order-1 md:order-2 col-span-full md:col-span-6 md:col-start-8 md:col-end-12">
                <div class="sticky top-25">
                    <h1 class="mb-10">{{ content.title }}</h1>

                    <p v-if="acf.prix" class="mb85">Prix: {{ acf.prix }}</p>

                    <div class="mb85 space-y-5" v-html="acf.description_courte"></div>

                    <div>
                        <div class="flex items-center gap-2 mb-6.25">
                            Choisir ma taille*

                            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M4 2.81944V2H5V2.81944H4ZM4 7V3.3125H5V7H4Z" fill="currentColor"/>
                                <circle cx="4.5" cy="4.5" r="4" stroke="currentColor"/>
                            </svg>
                        </div>

                        <fieldset class="flex justify-between gap-4 mb-3.75">
                            <legend class="sr-only">Taille</legend>

                            <label v-for="taille in TAILLES" :key="taille" class="flex-1 max-w-25" :for="`taille-${taille}`">
                                <input
                                    :id="`taille-${taille}`"
                                    v-model="tailleChoisie"
                                    type="radio"
                                    name="taille"
                                    :value="taille"
                                    class="hidden peer"
                                >
                                <span class="w-full h-11 flex justify-center items-center border border-white rounded-lg cursor-pointer transition text-white font-medium peer-checked:bg-white peer-checked:text-black">
                                    {{ taille }}
                                </span>
                            </label>
                        </fieldset>

                        <NuxtLink
                            :to="configurateurPath"
                            class="w-full h-11.25 flex justify-center items-center bg-white text-black uppercase font-medium rounded-lg"
                        >
                            Configurer {{ plainTitle }}
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </section>

        <section class="grid grid-cols-12 gap-y-21.25! px-5 grid-rows-auto">
            <template v-for="(item, index) in grille" :key="`grille-${index}`">
                <template v-if="item.layout === 'image_et_texte'">
                    <div class="animate flex flex-col gap-21.25! col-span-full md:col-span-4 pr-11.5">
                        <h2>{{ item.titre }}</h2>

                        <div class="flex-1" v-html="item.texte"></div>

                        <div class="flex flex-col text-[0.5625rem]" v-html="item.legende"></div>
                    </div>

                    <AppImage :media="item.image" class="animate col-span-full md:col-span-8 aspect-3/2 w-full object-cover" />
                </template>

                <template v-else-if="item.layout === 'images'">
                    <AppImage :media="item.premiere_image" class="animate h-screen col-span-full md:col-span-5 w-full h-full object-cover" />

                    <AppImage :media="item.deuxieme_image" class="animate h-screen col-span-full md:col-span-6 md:col-end-13 w-full h-full object-cover" />
                </template>
            </template>
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

const TAILLES = ['S', 'M', 'L']

const acf = computed(() => props.content.acf || {})
const grille = computed(() => acf.value.grille || [])

const plainTitle = computed(() =>
    String(props.content.title || '').replace(/<[^>]*>/g, '').trim()
)

const tailleChoisie = ref('')

// Le thème pointait ce bouton sur « # ». On l'envoie sur le configurateur en
// transmettant produit et taille, seule destination cohérente.
const configurateurPath = computed(() => {
    const params = new URLSearchParams({ produit: props.content.slug })
    if (tailleChoisie.value) {
        params.set('taille', tailleChoisie.value)
    }

    return `/configurateur?${params.toString()}`
})
</script>
