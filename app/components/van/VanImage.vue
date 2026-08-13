<template>
    <picture style="display: contents">
        <source v-if="variantes" type="image/avif" :srcset="configuratorSrcset(src, 'avif')" :sizes="sizes">
        <source v-if="variantes" type="image/webp" :srcset="configuratorSrcset(src, 'webp')" :sizes="sizes">
        <img
            v-bind="$attrs"
            :src="src"
            :alt="alt"
            :width="width || undefined"
            :height="height || undefined"
            :loading="priority ? 'eager' : 'lazy'"
            :fetchpriority="priority ? 'high' : undefined"
            decoding="async"
            @error="emit('error', $event)"
        >
    </picture>
</template>

<script>
/*
   Les classes des appelants doivent atterrir sur l'image, pas sur le
   `<picture>` : c'est l'image que la mise en page dimensionne.
*/
export default { inheritAttrs: false }
</script>

<script setup>
/**
 * Image du configurateur.
 *
 * Même politique que `AppImage`, qui sert les images venues de l'API : un
 * `<picture>` transparent au flux, le chargement différé sauf mention
 * contraire, `decoding="async"`, et le chemin d'origine sur le `<img>` comme
 * repli. Seule la convention de nommage des variantes diffère, parce que les
 * deux jeux d'images sortent de deux générateurs : `fetch-media.mjs` pour le
 * site, `optimize-images.mjs` pour le configurateur.
 *
 * Ce composant remplace deux `<picture>` écrits à la main — l'aperçu et les
 * visuels de présentation — qui déclaraient chacun leur propre politique de
 * chargement, et dont les parents devaient ensuite défaire la boîte.
 */
const props = defineProps({
    /** Chemin `.jpg` résolu par le système d'images du configurateur. */
    src: {
        type: String,
        default: '',
    },
    alt: {
        type: String,
        default: '',
    },
    /** Image visible sans défilement : chargement immédiat et prioritaire. */
    priority: {
        type: Boolean,
        default: false,
    },
    /** Largeur d'affichage annoncée au navigateur, pour qu'il choisisse. */
    sizes: {
        type: String,
        default: '100vw',
    },
    /* Dimensions intrinsèques, quand on les connaît : elles réservent la place. */
    width: {
        type: [Number, String],
        default: null,
    },
    height: {
        type: [Number, String],
        default: null,
    },
})

const emit = defineEmits(['error'])

/*
   SVG et compagnie n'ont pas de variantes. Sans ce garde, les `<source>`
   porteraient un `srcset` vide — et une `<source>` en échec ne retombe pas sur
   le `<img>` : l'image casserait au lieu de s'afficher telle quelle.
*/
const variantes = computed(() => /\.(jpe?g|png)$/i.test(props.src || ''))
</script>
