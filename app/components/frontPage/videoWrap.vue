<template>
    <section id="video-wrap" class="animate h-screen w-full relative">
        <video
            ref="videoEl"
            id="play-video"
            class="h-full w-full object-cover"
            :poster="posterSrc"
            playsinline
            preload="none"
            @ended="playing = false"
        >
            <source v-if="sources.av1" :src="sources.av1" type="video/mp4; codecs=av01.0.05M.08" />
            <source v-if="sources.h264" :src="sources.h264" type="video/mp4" />
        </video>

        <div
            class="flex flex-col md:flex-row justify-between items-center w-full px-5 py-11 absolute inset-0 transition-opacity duration-300"
            :class="playing ? 'opacity-0 pointer-events-none' : 'opacity-100'"
        >
            <span class="flex-1">{{ video?.title }}</span>

            <button
                type="button"
                class="flex justify-center items-center w-56.25 h-11 uppercase relative button-underlined"
                @click="play"
            >
                Regarder la vidéo
            </button>

            <span class="flex-1 flex md:flex-col items-end">{{ video?.caption }}</span>
        </div>

        <div
            class="justify-center items-center opacity-0 hover:opacity-100 transition-opacity duration-300 absolute inset-0 bg-black/50"
            :class="playing ? 'flex' : 'hidden'"
        >
            <button
                type="button"
                class="flex gap-4 text-4xl cursor-pointer"
                aria-label="Mettre en pause"
                @click="pause"
            >
                <span v-for="i in 2" :key="i" class="block w-3 h-15 bg-white rounded-xs"></span>
            </button>
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

const video = computed(() => props.acf.fichier_video || null)
const poster = computed(() => props.acf.image_dattente || null)

/*
   L'attribut `poster` ne prend qu'une seule URL : impossible de négocier le
   format comme avec <picture>. On sert donc la variante WebP, prise en charge
   à peu près partout, plutôt que le JPEG d'origine — 78 Ko économisés sur une
   image affichée avant toute lecture.
*/
const posterSrc = computed(() => {
    const src = poster.value?.src
    if (!src) {
        return undefined
    }

    const chemin = cheminPublic(src)

    return /\.(jpe?g|png)$/i.test(chemin)
        ? `${chemin.replace(/\.(jpe?g|png)$/i, '')}@1280.webp`
        : chemin
})

/**
 * Versions réencodées par `scripts/optimize-video.sh`. L'original WordPress fait
 * 82 Mo en 4K ; il n'est pas publié. Le navigateur retient la première source
 * qu'il sait lire : AV1 (4 Mo) sinon H.264 (9 Mo).
 */
const sources = computed(() => {
    const src = video.value?.src
    if (!src) {
        return {}
    }

    const base = cheminPublic(src).replace(/\.(mp4|mov|webm)$/i, '')

    return { av1: `${base}.av1.mp4`, h264: `${base}.h264.mp4` }
})

// preload="none" : sans ça le navigateur commence à télécharger la vidéo au
// chargement de la page, même si elle n'est jamais lue. C'est le poste le plus
// lourd du site.
const videoEl = ref(null)
const playing = ref(false)

const play = () => {
    videoEl.value?.play()
    playing.value = true
}

const pause = () => {
    videoEl.value?.pause()
    playing.value = false
}
</script>
