<template>
    <picture v-if="media?.src" style="display: contents">
        <source v-if="variants" type="image/avif" :srcset="srcset('avif')" :sizes="sizes">
        <source v-if="variants" type="image/webp" :srcset="srcset('webp')" :sizes="sizes">
        <img
            v-bind="$attrs"
            :src="cheminPublic(media.src)"
            :alt="alt"
            :width="media.width"
            :height="media.height"
            :loading="priority ? 'eager' : 'lazy'"
            :fetchpriority="priority ? 'high' : undefined"
            decoding="async"
        >
    </picture>

    <!--
        Média absent : on réserve quand même la place. Le thème rendait un
        <img src=""> — une image cassée, mais qui occupait son bloc et tenait la
        grille. Sans cet emplacement, une fiche produit sans vignette fait
        s'effondrer la mise en page autour d'elle.
    -->
    <div v-else-if="placeholder" v-bind="$attrs" aria-hidden="true"></div>
</template>

<script>
/*
   Le composant rendait un <img> à sa racine ; il rend désormais un <picture>.
   Sans cette option, les classes passées par les appelants atterriraient sur le
   <picture> au lieu de l'image, et toute la mise en page sauterait.
   `display: contents` rend en plus le <picture> transparent au flux.
*/
export default { inheritAttrs: false }
</script>

<script setup>
/**
 * Image issue de l'API.
 *
 * Centralise trois choses qu'on oubliait au cas par cas : les dimensions
 * intrinsèques (sans lesquelles la page saute au chargement, ce que Lighthouse
 * sanctionne), le chargement différé par défaut, et le service en AVIF/WebP.
 *
 * Les variantes sont produites par `scripts/fetch-media.mjs` au build, et
 * reproduites à la volée par la route /media en développement — sinon les
 * <source> renverraient 404, et une <source> en échec ne retombe pas sur le
 * <img> : l'image casserait.
 *
 * Le <img> garde le chemin d'origine, qui sert de repli.
 */
const props = defineProps({
    /** Média résolu par l'API : { src, width, height, alt }. */
    media: {
        type: Object,
        default: null,
    },
    /** Texte alternatif de repli quand le média n'en porte pas. */
    fallbackAlt: {
        type: String,
        default: '',
    },
    /** Image visible sans défilement : chargement immédiat et prioritaire. */
    priority: {
        type: Boolean,
        default: false,
    },
    /**
     * Réserver la place quand le média manque. Activé par défaut : c'est le
     * comportement du thème. À désactiver là où l'absence d'image doit
     * réellement ne rien produire.
     */
    placeholder: {
        type: Boolean,
        default: true,
    },
    /**
     * Indice de largeur d'affichage, pour que le navigateur choisisse la bonne
     * variante. Par défaut, l'image est supposée occuper la largeur du viewport.
     */
    sizes: {
        type: String,
        default: '100vw',
    },
})

const alt = computed(() => props.media?.alt || props.fallbackAlt || '')

/** Largeurs générées, alignées sur scripts/fetch-media.mjs. */
const WIDTHS = [640, 1280, 1920]

// SVG et autres formats vectoriels n'ont pas de variantes : les servir tels
// quels est déjà optimal.
const variants = computed(() => /\.(jpe?g|png)$/i.test(props.media?.src || ''))

/*
   La règle de `scripts/fetch-media.mjs` : une largeur supérieure à l'original
   n'est pas produite, sauf la plus petite, qui sert de vignette à tout le
   monde. Le filtre doit la répéter à l'identique — il tolérait auparavant un
   agrandissement de moitié, et proposait donc 22 variantes qui n'existaient
   pas. Une <source> en échec ne retombe pas sur le <img> : l'image ne
   s'affichait pas du tout.
*/
const srcset = (format) => {
    const base = cheminPublic(String(props.media.src)).replace(/\.(jpe?g|png)$/i, '')

    return WIDTHS.filter(
        (width) => !props.media.width || width <= props.media.width || width === WIDTHS[0]
    )
        .map((width) => `${base}@${width}.${format} ${width}w`)
        .join(', ')
}
</script>
