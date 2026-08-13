<template>
    <component
        :is="isExternal ? 'a' : NuxtLink"
        v-bind="isExternal ? { href: url, target: target || '_self', rel: 'noopener noreferrer' } : { to: url }"
        class="flex flex-row items-center gap-1 underline"
    >
        {{ label }}

        <svg
            :width="size"
            :height="size"
            viewBox="0 0 9 9"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            class="rounded-none shrink-0"
        >
            <path
                d="M8.7058 1.44989C8.70579 1.17576 8.4803 0.953541 8.20217 0.953551L3.66964 0.953707C3.3915 0.953716 3.16603 1.17595 3.16604 1.45008C3.16605 1.72422 3.39153 1.94643 3.66967 1.94643L7.69859 1.94629L7.69872 5.91716C7.69873 6.19129 7.92422 6.41351 8.20235 6.4135C8.48049 6.41349 8.70596 6.19126 8.70595 5.91713L8.7058 1.44989ZM1.35612 8.89979L8.5583 1.80088L7.84606 1.09894L0.643879 8.19786L1.35612 8.89979Z"
                fill="currentColor"
            />
        </svg>
    </component>
</template>

<script setup>
/**
 * Lien souligné suivi d'une flèche.
 *
 * L'icône était un <img> pointant sur un SVG de 9x9 px : une requête HTTP par
 * occurrence, une dizaine par page. Inlinée, elle ne coûte plus rien et hérite
 * de la couleur du texte.
 *
 * Les commentaires écrits dans un <template> Vue sont rendus dans le HTML
 * envoyé au visiteur : sur ce projet, l'explication reste donc dans le script.
 */
import { NuxtLink } from '#components'

const props = defineProps({
    /** Objet lien renvoyé par l'API : { url, title, target, external }. */
    link: {
        type: Object,
        default: null,
    },
    /** Destination explicite, si l'on n'utilise pas `link`. */
    to: {
        type: String,
        default: '',
    },
    /** Libellé explicite, prioritaire sur `link.title`. */
    label: {
        type: String,
        default: '',
    },
    size: {
        type: [String, Number],
        default: 10,
    },
})

const url = computed(() => props.to || props.link?.url || '/')
const label = computed(() => props.label || props.link?.title || '')
const target = computed(() => props.link?.target || '')

const isExternal = computed(() => {
    // Une ancre reste interne à la page : ni target, ni rel.
    if (String(url.value).startsWith('#')) {
        return false
    }

    if (props.link && typeof props.link.external === 'boolean') {
        return props.link.external
    }

    return !String(url.value).startsWith('/')
})
</script>
