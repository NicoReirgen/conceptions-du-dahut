<template>
    <div
        :class="['sub-option-card', selected ? 'selected' : '']"
        tabindex="0"
        role="button"
        :aria-pressed="selected"
        :aria-label="`Choisir le coloris ${option.name}`"
        @click.stop="emit('select')"
        @keydown="auClavier"
    >
        <span :style="{ backgroundColor: option.hexa }">
            <span v-if="selected">
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path
                        d="M0.826172 4.26952L3.11659 7.06769L7.44153 1.4707"
                        :stroke="contrasteSuffisant(option.hexa) ? 'white' : 'black'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </span>
        </span>

        <h4>{{ option.name }}</h4>
    </div>
</template>

<script setup>
import { configuratorLogic } from '~~/app/composables/useConfigurator';

/*
   Une pastille de coloris.

   Quatre copies, SVG compris, dont deux — celles des champs profonds —
   n'annonçaient ni leur nom ni leur état : un lecteur d'écran n'y trouvait
   qu'un bouton vide, la couleur n'étant portée que par un fond CSS.

   La coche se pose en blanc ou en noir selon la pastille, faute de quoi elle
   disparaît sur les coloris clairs.
*/

defineProps({
    option: {
        type: Object,
        required: true
    },
    selected: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['select']);

const auClavier = (evenement) => configuratorLogic.handleKeyDown(evenement, () => emit('select'));
</script>
