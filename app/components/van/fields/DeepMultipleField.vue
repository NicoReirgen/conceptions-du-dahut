<template>
    <BaseField
        :title="title"
        :description="description"
    >
        <div class="options-grid">
            <div
                v-for="option in options"
                :key="option.key"
                class="deep-option-section"
            >
                <OptionCard
                    :option="option"
                    :selected="isMainOptionSelected(option.key)"
                    case-a-cocher
                    @select="handleMainOptionSelection(option.key)"
                />

                <!-- Ce que l'option ouvre, posé directement sous elle. -->
                <div v-if="option.deepOptions && isMainOptionSelected(option.key)" class="deep-options-container">
                    <div
                        v-for="deepOption in option.deepOptions"
                        :key="deepOption.key"
                        class="deep-option-wrapper"
                    >
                        <ColorGroup
                            v-if="deepOption.type === 'color_selection'"
                            :titre="deepOption.title"
                        >
                            <ColorSwatch
                                v-for="colorOption in deepOption.options"
                                :key="colorOption.key"
                                :option="colorOption"
                                :selected="isDeepOptionSelected(option.key, deepOption.key, colorOption.key)"
                                @select="handleDeepOptionSelection(option.key, deepOption.key, colorOption)"
                            />
                        </ColorGroup>

                        <!-- Une case cochée porte sa propre clé pour valeur. -->
                        <div v-else-if="deepOption.type === 'checkbox'" class="checkbox-section">
                            <OptionCard
                                :option="deepOption"
                                :selected="isDeepOptionSelected(option.key, deepOption.key, deepOption.key)"
                                variante="case"
                                case-a-cocher
                                @select="handleDeepOptionSelection(option.key, deepOption.key, deepOption)"
                            />
                        </div>

                        <div v-else-if="deepOption.type === 'unique'" class="unique-selection-section">
                            <h4 v-if="deepOption.title" class="deep-option-title">{{ deepOption.title }}</h4>

                            <div class="unique-options">
                                <div
                                    v-for="uniqueOption in deepOption.options"
                                    :key="uniqueOption.key"
                                    class="unique-option-section"
                                >
                                    <OptionCard
                                        :option="uniqueOption"
                                        :selected="isDeepOptionSelected(option.key, deepOption.key, uniqueOption.key)"
                                        variante="unique"
                                        @select="handleDeepUniqueSelection(option.key, deepOption.key, uniqueOption)"
                                    />

                                    <!-- Quatrième niveau : le coloris d'une option profonde. -->
                                    <div
                                        v-if="uniqueOption.deepOptions && isDeepOptionSelected(option.key, deepOption.key, uniqueOption.key)"
                                        class="sub-deep-options"
                                    >
                                        <div
                                            v-for="subDeepOption in uniqueOption.deepOptions"
                                            :key="subDeepOption.key"
                                            class="sub-deep-option"
                                        >
                                            <ColorGroup
                                                v-if="subDeepOption.type === 'color_selection'"
                                                :titre="subDeepOption.title"
                                            >
                                                <ColorSwatch
                                                    v-for="subColorOption in subDeepOption.options"
                                                    :key="subColorOption.key"
                                                    :option="subColorOption"
                                                    :selected="isSubDeepOptionSelected(option.key, deepOption.key, uniqueOption.key, subDeepOption.key, subColorOption.key)"
                                                    @select="handleSubDeepOptionSelection(option.key, deepOption.key, uniqueOption.key, subDeepOption.key, subColorOption)"
                                                />
                                            </ColorGroup>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </BaseField>
</template>

<script setup>
import BaseField from './BaseField.vue';
import ColorGroup from './ColorGroup.vue';
import ColorSwatch from './ColorSwatch.vue';
import OptionCard from './OptionCard.vue';
import { basculer, lireSelection, sansBranche } from '~~/app/composables/useSelectionChamp';

const props = defineProps({
    fieldKey: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    options: {
        type: Array,
        required: true
    },
    selectedOptions: {
        type: Object,
        default: () => ({})
    }
});

/*
   Le prix ne remonte plus d'ici.

   Ce champ recalculait à chaque clic le prix de ses quatre niveaux — cinquante
   lignes qui reproduisaient `calculateFieldPrice`, à qui le configurateur
   redemandait le même total juste après, sans lire celui reçu.
*/
const emit = defineEmits(['update-options']);

/* Trois tables : les options cochées, ce qu'elles ouvrent, et ce que cela ouvre. */
const FORME = { mainOptions: [], deepOptions: {}, subDeepOptions: {} };

const getSelectedData = () => lireSelection(props.selectedOptions, props.fieldKey, FORME);

const emettre = (valeur) => emit('update-options', { key: props.fieldKey, value: valeur });

// Vérifier si une option principale est sélectionnée
const isMainOptionSelected = (optionKey) => getSelectedData().mainOptions.includes(optionKey);

// Vérifier si une option profonde est sélectionnée
const isDeepOptionSelected = (mainKey, deepKey, optionKey) =>
    optionProfondeChoisie(getSelectedData(), mainKey, deepKey, optionKey);

// Vérifier si une sous-option profonde est sélectionnée
const isSubDeepOptionSelected = (mainKey, deepKey, uniqueKey, subDeepKey, optionKey) =>
    getSelectedData().subDeepOptions[`${mainKey}.${deepKey}.${uniqueKey}.${subDeepKey}`] === optionKey;

// Cocher une option principale ; la décocher emporte tout ce qu'elle avait ouvert.
const handleMainOptionSelection = (optionKey) => {
    const retenues = getSelectedData();

    if (!retenues.mainOptions.includes(optionKey)) {
        emettre({ ...retenues, mainOptions: [...retenues.mainOptions, optionKey] });
        return;
    }

    emettre({
        mainOptions: retenues.mainOptions.filter(key => key !== optionKey),
        deepOptions: sansBranche(retenues.deepOptions, `${optionKey}.`),
        subDeepOptions: sansBranche(retenues.subDeepOptions, `${optionKey}.`)
    });
};

// Choisir une option profonde : un coloris, ou une case à cocher.
const handleDeepOptionSelection = (mainKey, deepKey, option) => {
    const retenues = getSelectedData();

    emettre({
        ...retenues,
        deepOptions: basculer(retenues.deepOptions, `${mainKey}.${deepKey}`, option.key)
    });
};

/*
   Choisir une option profonde unique.

   Elle peut elle-même ouvrir des coloris : en changer, ou la retirer, doit
   emporter ceux du choix précédent.
*/
const handleDeepUniqueSelection = (mainKey, deepKey, option) => {
    const retenues = getSelectedData();
    const chemin = `${mainKey}.${deepKey}`;
    const remplacee = retenues.deepOptions[chemin];

    emettre({
        ...retenues,
        deepOptions: basculer(retenues.deepOptions, chemin, option.key),
        subDeepOptions: remplacee
            ? sansBranche(retenues.subDeepOptions, `${chemin}.${remplacee}.`)
            : retenues.subDeepOptions
    });
};

// Le dernier niveau : le coloris d'une option profonde unique.
const handleSubDeepOptionSelection = (mainKey, deepKey, uniqueKey, subDeepKey, option) => {
    const retenues = getSelectedData();
    const chemin = `${mainKey}.${deepKey}.${uniqueKey}.${subDeepKey}`;

    emettre({
        ...retenues,
        subDeepOptions: basculer(retenues.subDeepOptions, chemin, option.key)
    });
};
</script>
