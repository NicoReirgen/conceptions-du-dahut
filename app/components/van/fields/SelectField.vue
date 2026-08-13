<template>
    <BaseField
        :title="title"
        :description="description"
    >
        <!--
            Un <select> natif, et non plus un <div> qui s'ouvre au clic.

            L'ancienne version n'était accessible qu'à la souris : ni `tabindex`,
            ni `role`, ni gestionnaire clavier sur l'en-tête comme sur les
            options. Or c'est le champ de l'étape « Choix du véhicule », et
            « Suivant » reste désactivé tant que rien n'est choisi — une
            personne naviguant au clavier était bloquée là, sans recours.

            Le natif apporte gratuitement ce qu'il aurait fallu réécrire :
            ouverture au clavier, parcours des options aux flèches, saisie du
            premier caractère, fermeture par Échap, restitution correcte par les
            lecteurs d'écran, et le sélecteur natif du système sur mobile.

            L'apparence est conservée : `appearance: none` retire le chevron du
            système, et celui de la maquette reste un élément à part — sa
            rotation de 230° est un `transform` CSS, qu'une image de fond ne
            saurait porter sans être rognée par son cadre.
        -->
        <div class="enveloppe-select">
            <select
                :id="idChamp"
                class="champ-select"
                :value="modelValue"
                @change="handleSelect($event.target.value)"
            >
                <option value="">{{ placeholder || 'Sélectionnez une option' }}</option>
                <option
                    v-for="option in options"
                    :key="option.key"
                    :value="option.key"
                >
                    {{ option.name }}
                </option>
            </select>

            <span class="select-arrow" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="11" viewBox="0 0 9 11" fill="none">
                    <path d="M4.26853 10.0429C4.46462 10.2374 4.7812 10.236 4.97563 10.04L8.14416 6.84459C8.3386 6.64851 8.33726 6.33193 8.14118 6.13749C7.9451 5.94305 7.62852 5.94439 7.43408 6.14047L4.61761 8.9808L1.77728 6.16433C1.58119 5.96989 1.26461 5.97123 1.07018 6.16731C0.875739 6.3634 0.877074 6.67998 1.07316 6.87441L4.26853 10.0429ZM4.08106 0.316562L4.1206 9.69001L5.12059 9.68579L5.08105 0.312344L4.08106 0.316562Z" fill="black"/>
                </svg>
            </span>
        </div>
    </BaseField>
</template>

<script setup>
import BaseField from './BaseField.vue';

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    placeholder: {
        type: String,
        default: ''
    },
    options: {
        type: Array,
        required: true
    }
});

const emit = defineEmits(['update:modelValue', 'select']);

/* `BaseField` rend le titre dans un <p> : il ne peut pas servir de <label>.
   L'identifiant sert au moins à relier le champ depuis l'extérieur. */
const idChamp = `select-${Math.random().toString(36).slice(2, 8)}`;

const handleSelect = (value) => {
    emit('update:modelValue', value);
    emit('select', { key: value, value });
};
</script>

<style scoped>
.enveloppe-select {
    position: relative;
}

/* Reprend l'habillage de l'ancien en-tête : même bordure, même rayon, même fond. */
.champ-select {
    display: block;
    width: 100%;

    padding: .625rem 2.5rem .625rem 1rem;

    border: .5px solid #000;
    border-radius: .25rem;
    background-color: white;
    color: #000;

    font-family: inherit;
    font-size: inherit;
    line-height: inherit;

    cursor: pointer;
    transition: border-color 0.3s ease;

    appearance: none;

    &:hover {
        border-color: #000;
    }
}

/*
   Le chevron, avec la rotation de 230° du balisage d'origine. Il est posé
   par-dessus le champ et ne reçoit pas la souris : le clic traverse et ouvre
   bien le <select>.
*/
.select-arrow {
    position: absolute;
    top: 50%;
    right: 1rem;

    display: flex;
    transform: translateY(-50%) rotate(230deg);
    transform-origin: center;

    pointer-events: none;
}
</style>
