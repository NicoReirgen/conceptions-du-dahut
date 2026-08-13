<template>
    <BaseField
        :title="title"
        :description="description"
    >
        <div class="options-grid">
            <OptionCard
                v-for="option in options"
                :key="option.key"
                :option="option"
                :selected="estRetenue(option)"
                @select="handleSelectUniqueOption(option)"
            />

            <ColorGroup v-if="hasSubOptions" :titre="getSubOptionsTitle()">
                <ColorSwatch
                    v-for="subOption in getSubOptions(modelValue.main)"
                    :key="subOption.key"
                    :option="subOption"
                    :selected="modelValue?.sub === subOption.key"
                    @select="handleSubOptionSelection(subOption)"
                />
            </ColorGroup>
        </div>
    </BaseField>
</template>

<script setup>
import BaseField from './BaseField.vue';
import ColorGroup from './ColorGroup.vue';
import ColorSwatch from './ColorSwatch.vue';
import OptionCard from './OptionCard.vue';
import { configuratorLogic } from '~~/app/composables/useConfigurator';

// Props definition
const props = defineProps({
    modelValue: {
        type: [String, Object], // Allow both String and Object
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
    }
});

// Props validation
configuratorLogic.validateProps(props, ['modelValue', 'options']);

/*
   Le champ ne porte plus que le choix.

   Il recevait aussi le champ entier, pour en calculer le prix et l'émettre. Le
   configurateur jetait cette valeur et refaisait le calcul à partir de l'état :
   le prop et l'émission ne servaient qu'à ce détour.
*/
const emit = defineEmits(['update:modelValue']);

/*
   La forme historique — une simple clé — cohabite avec `{ main, sub }`. La
   classe la reconnaissait, `aria-pressed` non : une carte retenue sous
   l'ancienne forme s'annonçait non pressée.
*/
const estRetenue = (option) => props.modelValue?.main === option.key || props.modelValue === option.key;

const getSubOptions = (mainOptionKey) => {
    const mainOption = props.options.find(opt => opt.key === mainOptionKey);
    return mainOption?.subOptions || [];
};

// Computed property to check if the selected main option has sub-options
const hasSubOptions = computed(() => {
    if (!props.modelValue?.main) return false;
    const mainOption = props.options.find(opt => opt.key === props.modelValue.main);
    return mainOption?.subOptions?.length > 0;
});

/*
   Sélectionner une finition révèle des coloris, et « Suivant » reste désactivé
   tant qu'aucun n'est retenu. À l'œil c'est évident, autrement le bouton cesse
   simplement de répondre. On annonce l'apparition.
*/
const { annoncer } = useAnnonce();

watch(hasSubOptions, (present) => {
    if (!present) return;
    const nombre = getSubOptions(props.modelValue?.main).length;
    annoncer(`${getSubOptionsTitle()} : ${nombre} choix proposés.`);
});

// Event handlers
const handleSelectUniqueOption = (option) => {
    if (props.modelValue?.main === option.key) return;

    // Changer de finition abandonne son coloris : il n'existe pas sous l'autre.
    emit('update:modelValue', { main: option.key, sub: null });
};

// Recliquer le coloris retenu le retire, comme partout ailleurs.
const handleSubOptionSelection = (subOption) => {
    const dejaRetenu = props.modelValue?.sub === subOption.key;

    emit('update:modelValue', { ...props.modelValue, sub: dejaRetenu ? null : subOption.key });
};

// Function to get the title of sub-options
const getSubOptionsTitle = () => {
    const mainOption = props.options.find(opt => opt.key === props.modelValue.main);
    return mainOption?.subOptionTitle || mainOption?.title || 'Choisissez une option';
};
</script>
