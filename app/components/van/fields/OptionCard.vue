<template>
    <div
        :class="[
            CLASSE_PAR_VARIANTE[variante],
            selected ? 'selected' : '',
            incompatibleAvec ? 'incompatible' : '',
            masquee ? 'hidden-option' : ''
        ]"
        :style="masquee ? { display: 'none' } : {}"
        :tabindex="interactive ? 0 : null"
        :role="interactive ? 'button' : null"
        :aria-pressed="interactive ? selected : null"
        :aria-label="interactive ? libelleOption(option, { incompatibleAvec }) : null"
        @click="choisir"
        @keydown="auClavier"
    >
        <div class="option-card-content">
            <div class="option-info">
                <div class="option-texts">
                    <h3>{{ option.name }}</h3>
                    <p v-if="option.description" class="description">{{ option.description }}</p>
                    <p v-if="incompatibleAvec" class="incompatible-warning">
                        Incompatible avec: {{ incompatibleAvec }}
                    </p>
                </div>

                <p class="price">{{ prixLisible(option) }}</p>
            </div>

            <div v-if="caseACocher" class="checkbox" :class="{ 'checked': selected }">
                <span v-if="selected" class="checkmark">
                    <svg xmlns="http://www.w3.org/2000/svg" width="7" height="6" viewBox="0 0 7 6" fill="none">
                        <path d="M1.01636 3.01762L2.58706 4.93652L5.55296 1.09829" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </span>
            </div>

            <!-- Un sélecteur de quantité, pour les ouvrants. -->
            <slot name="controle" />
        </div>

        <!-- Ce que cocher la carte ouvre : un groupe de coloris, en général. -->
        <slot />
    </div>
</template>

<script setup>
import { configuratorLogic } from '~~/app/composables/useConfigurator';

/*
   La carte d'une option.

   Elle était recopiée dans six gabarits, et les copies avaient divergé — ce
   qu'on ne voit pas en lisant un composant à la fois. `MultipleField`
   annonçait le prix de l'option et son incompatibilité, `UniqueField` disait
   « Choisir l'option X » sans le prix, les cartes des champs profonds
   n'annonçaient rien du tout : ni libellé, ni état pressé, alors qu'elles se
   déclarent `role="button"`.

   Le quatuor `tabindex` / `role` / clic / clavier est le contrat
   d'accessibilité d'une carte. Il n'a de sens qu'écrit une fois.
*/

const props = defineProps({
    option: {
        type: Object,
        required: true
    },
    selected: {
        type: Boolean,
        default: false
    },
    /* La carte porte trois habillages selon sa place dans la hiérarchie. */
    variante: {
        type: String,
        default: 'option',
        validator: (valeur) => ['option', 'unique', 'case'].includes(valeur)
    },
    caseACocher: {
        type: Boolean,
        default: false
    },
    /* Les options que celle-ci chasserait, déjà nommées ; vide si compatible. */
    incompatibleAvec: {
        type: String,
        default: ''
    },
    masquee: {
        type: Boolean,
        default: false
    },
    /* Les cartes d'ouvrants ne se cliquent pas : leur sélecteur s'en charge. */
    interactive: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['select']);

const CLASSE_PAR_VARIANTE = {
    option: 'option-card',
    unique: 'unique-option-card',
    case: 'checkbox-option-card'
};

const choisir = (evenement) => {
    if (!props.interactive) return;

    // Une carte imbriquée ne doit pas cocher celle qui la porte.
    evenement.stopPropagation();
    emit('select');
};

const auClavier = (evenement) => {
    if (!props.interactive) return;

    configuratorLogic.handleKeyDown(evenement, () => emit('select'));
};
</script>
