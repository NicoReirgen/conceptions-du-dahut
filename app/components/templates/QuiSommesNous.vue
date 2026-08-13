<template>
    <main class="qui-sommes-nous pt-42.5 md:pt-58 lg:pt-66 *:px-5">
        <header class="grid grid-cols-12">
            <h1 class="hidden">{{ content.title }}</h1>

            <p class="animate h2-size md:text-justify col-span-full md:col-span-10 md:col-start-2 md:indent-100">
                {{ acf.introduction }}
            </p>
        </header>

        <section class="animate px-0!">
            <AppImage
                    :media="content.thumbnail"
                    :fallback-alt="content.title"
                    priority
                    class="w-full rounded-none"
                />
        </section>

        <section class="grid grid-cols-12">
            <div class="animate col-span-full md:col-span-3">
                <h2>Histoire</h2>
            </div>
            <div class="animate col-span-full md:col-span-4" v-html="acf.premier_texte"></div>
            <div class="animate col-span-full md:col-span-4 md:col-end-13 space-y-5" v-html="acf.deuxieme_texte"></div>
        </section>

        <section class="grid grid-cols-12 gap-y-10! [&_img]:w-full">
            <BrandWordmark class="animate col-span-full" />

            <template v-for="(layout, index) in grille" :key="`grille-${index}`">
                <div v-if="layout.layout === 'grande_image'" class="animate col-span-full">
                    <AppImage :media="layout.image" class="aspect-1240/689 w-full object-cover" />
                </div>

                <div v-else-if="layout.layout === 'petite_image'" class="animate col-span-full">
                    <AppImage :media="layout.image" class="aspect-1240/490 w-full object-cover" />
                </div>

                <template v-else-if="layout.layout === 'image_et_texte'">
                    <div class="animate col-span-full md:col-span-6 flex flex-col justify-end gap-21.25 md:px-7.5 md:pb-9.5">
                        <h2>{{ layout.titre }}</h2>

                        <div v-html="layout.texte"></div>
                    </div>

                    <div class="animate col-span-full md:col-span-6">
                        <AppImage :media="layout.image" class="aspect-610/454 w-full object-cover" />
                    </div>
                </template>

                <template v-else-if="layout.layout === 'texte'">
                    <div class="animate col-span-full md:col-span-3">
                        <h2>{{ layout.titre }}</h2>
                    </div>

                    <div class="animate col-span-full md:col-span-6" v-html="layout.texte"></div>
                </template>
            </template>
        </section>

        <section>
            <h2 class="animate text-center mb85">On parle du Dahut</h2>

            <div v-if="videos.length" class="animate grid grid-cols-3 gap-y-10 gap-x-5 mb85">
                <div v-for="(item, index) in videos" :key="`video-${index}`" class="col-span-full md:col-span-1">
                    <a
                        :href="item.lien_de_la_video?.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        :aria-label="`Vidéo YouTube : ${item.lien_de_la_video?.title || 'Les Conceptions du Dahut'}`"
                    >
                        <AppImage :media="item.image_a_la_une" class="aspect-400/225 w-full object-cover" />
                    </a>
                </div>
            </div>

            <div v-if="articles.length" class="animate grid grid-cols-3 gap-y-10 gap-x-5">
                <div class="col-span-full md:col-span-1">
                    <h3>Articles</h3>
                </div>

                <div class="col-span-full md:col-span-2">
                    <article v-for="(item, index) in articles" :key="`presse-${index}`" class="mb-15">
                        <a
                            :href="item.lien_de_larticle?.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            :aria-label="item.titre_de_larticle"
                            class="flex flex-col md:flex-row items-start gap-7.5 pt-3.75 pl-5"
                        >
                            <span class="flex-1">
                                <h4 class="h3-size mb-7.5">{{ item.titre_de_larticle }}</h4>

                                <p>{{ item.resume_de_larticle }}</p>
                            </span>

                            <span class="flex items-center gap-1 w-18.75 text-right underline">
                                Lire

                                <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 9 9"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                    class="rounded-none shrink-0"
                                >
                                    <path
                                        d="M8.7058 1.44989C8.70579 1.17576 8.4803 0.953541 8.20217 0.953551L3.66964 0.953707C3.3915 0.953716 3.16603 1.17595 3.16604 1.45008C3.16605 1.72422 3.39153 1.94643 3.66967 1.94643L7.69859 1.94629L7.69872 5.91716C7.69873 6.19129 7.92422 6.41351 8.20235 6.4135C8.48049 6.41349 8.70596 6.19126 8.70595 5.91713L8.7058 1.44989ZM1.35612 8.89979L8.5583 1.80088L7.84606 1.09894L0.643879 8.19786L1.35612 8.89979Z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </span>
                        </a>
                    </article>
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
})

const acf = computed(() => props.content.acf || {})
const grille = computed(() => acf.value.grille || [])
const videos = computed(() => acf.value.videos_youtube || [])
const articles = computed(() => acf.value.articles_de_presse || [])
</script>
