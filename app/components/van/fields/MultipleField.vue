<template>
    <BaseField
        :title="title"
        :description="description"
    >
        <div class="options-grid options-exclusives">
            <OptionCard
                v-for="option in props.options"
                :key="option.key"
                :option="option"
                :selected="isSelected(option.key)"
                :incompatible-avec="incompatibiliteAffichee(option.key)"
                :masquee="Boolean(option.hidden) && !isOnlyDefaultOption(option.key)"
                case-a-cocher
                @select="handleOptionSelection(option.key)"
            >
                <ColorGroup
                    v-if="option.subOptions && isSelected(option.key)"
                    :titre="option.subOptionTitle || option.title || 'Choisissez une option'"
                >
                    <ColorSwatch
                        v-for="subOption in option.subOptions"
                        :key="subOption.key"
                        :option="subOption"
                        :selected="isSubOptionSelected(option.key, subOption.key)"
                        @select="handleSubOptionSelection(option.key, subOption)"
                    />
                </ColorGroup>
            </OptionCard>
        </div>
    </BaseField>
</template>

<script setup>
import BaseField from './BaseField.vue';
import ColorGroup from './ColorGroup.vue';
import ColorSwatch from './ColorSwatch.vue';
import OptionCard from './OptionCard.vue';
import { configuratorLogic } from '~~/app/composables/useConfigurator';
import { avecOption, basculer, lireSelection, optionsEcartees } from '~~/app/composables/useSelectionChamp';

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
    hasDefaultOption: {
        type: Boolean,
        default: false
    },
    selectedOptions: {
        type: Object,
        default: () => ({})
    }
});

/*
   Le prix ne remonte plus d'ici.

   Le champ le recalculait à chaque clic et l'émettait ; le configurateur jetait
   la valeur reçue et refaisait le calcul lui-même, par `calculateFieldPrice`.
   Deux règles de prix pour un même champ, dont une seule comptait — et elles
   divergeaient déjà : celle-ci facturait l'option par défaut, comprise dans le
   prix du véhicule.
*/
const emit = defineEmits(['update-options']);

// Validation des props
configuratorLogic.validateProps(props, ['fieldKey', 'options']);

// Détecter si les options ont des sous-options
const hasAnySubOptions = computed(() => {
    return props.options.some(option => option.subOptions && option.subOptions.length > 0);
});

/* Voir UniqueField : cocher une option peut révéler un groupe de coloris. */
const { annoncer } = useAnnonce();

const groupesDeColorisOuverts = computed(() =>
    props.options.filter((option) => option.subOptions?.length && isSelected(option.key))
);

watch(groupesDeColorisOuverts, (maintenant, avant = []) => {
    const nouveau = maintenant.find((o) => !avant.some((a) => a.key === o.key));
    if (!nouveau) return;

    const intitule = nouveau.subOptionTitle || nouveau.title || 'Choisissez une option';
    annoncer(`${intitule} : ${nouveau.subOptions.length} choix proposés.`);
});

/*
   Les options retenues pour ce champ.

   Deux formes cohabitent : une liste de clés quand aucune option n'ouvre de
   coloris, `{ options, subOptions }` sinon. Une liste laissée par la forme
   simple est relue comme la forme complexe plutôt que jetée.
*/
const getSelectedOptions = () => {
    const brut = props.selectedOptions[props.fieldKey];

    if (!hasAnySubOptions.value) {
        return Array.isArray(brut) ? brut : [];
    }

    if (Array.isArray(brut)) {
        return { options: brut, subOptions: {} };
    }

    return lireSelection(props.selectedOptions, props.fieldKey, { options: [], subOptions: {} });
};

// Vérifier si une option principale est sélectionnée
const isSelected = (optionKey) => {
    const selected = getSelectedOptions();
    
    if (hasAnySubOptions.value) {
        return selected.options.includes(optionKey);
    } else {
        return selected.includes(optionKey);
    }
};

// Vérifier si une sous-option est sélectionnée (adaptation pour sélection unique)
const isSubOptionSelected = (mainOptionKey, subOptionKey) => {
    if (!hasAnySubOptions.value) return false;
    
    const selected = getSelectedOptions();
    // Pour une sélection unique, on compare directement la valeur stockée
    return selected.subOptions[mainOptionKey] === subOptionKey;
};

/*
   Cocher une option, quand certaines ouvrent des coloris.

   Décocher emporte le coloris de l'option. En cocher une nouvelle chasse celles
   qu'elle exclut, et leurs coloris avec elles — sans quoi un coloris resterait
   dans l'état sous une option retirée, invisible mais compté.
*/
const choisirParmiOptionsAColoris = (optionKey) => {
    const retenues = getSelectedOptions();
    const dejaRetenue = retenues.options.includes(optionKey);

    const options = dejaRetenue
        ? retenues.options.filter(key => key !== optionKey)
        : avecOption(props.options, retenues.options, optionKey);

    const abandonnees = dejaRetenue
        ? [optionKey]
        : optionsEcartees(props.options, retenues.options, optionKey);

    const subOptions = { ...retenues.subOptions };
    abandonnees.forEach(key => delete subOptions[key]);

    emit('update-options', { key: props.fieldKey, value: { options, subOptions } });
};

/*
   Cocher une option d'un champ sans coloris.

   L'option par défaut — « Base », par exemple — reprend sa place dès que plus
   rien de visible n'est retenu : le champ ne peut pas rester vide.
*/
const choisirParmiOptionsSimples = (optionKey) => {
    const retenues = getSelectedOptions();
    const isAdding = !retenues.includes(optionKey);

    let updatedOptions = isAdding
        ? avecOption(props.options, retenues, optionKey)
        : retenues.filter(key => key !== optionKey);

    const field = {
        options: props.options,
        hasDefaultOption: props.hasDefaultOption,
        type: 'multiple'
    };

    if (configuratorLogic.hasDefaultOption(field) && configuratorLogic.hasNoVisibleSelection(field, updatedOptions)) {
        const defaultOption = configuratorLogic.getDefaultOption(field);

        if (defaultOption && !updatedOptions.includes(defaultOption.key)) {
            updatedOptions = [defaultOption.key];
        }
    }

    emit('update-options', {
        key: props.fieldKey,
        value: updatedOptions,
        optionKey: optionKey,
        isAdding: isAdding
    });
};

const handleOptionSelection = (optionKey) => (
    hasAnySubOptions.value
        ? choisirParmiOptionsAColoris(optionKey)
        : choisirParmiOptionsSimples(optionKey)
);

// Choix du coloris d'une option cochée — un seul à la fois, comme UniqueField.
const handleSubOptionSelection = (mainOptionKey, subOption) => {
    if (!hasAnySubOptions.value) return;

    const retenues = getSelectedOptions();

    // Un coloris ne se choisit que sous une option cochée.
    if (!retenues.options.includes(mainOptionKey)) return;

    emit('update-options', {
        key: props.fieldKey,
        value: {
            options: retenues.options,
            subOptions: basculer(retenues.subOptions, mainOptionKey, subOption.key)
        }
    });
};

// Vérifier si une option hidden doit être affichée (cas spécial pour l'option par défaut)
const isOnlyDefaultOption = (optionKey) => {
    // Si ce n'est pas une option par défaut, ne pas l'afficher si elle est hidden
    const option = props.options.find(opt => opt.key === optionKey);
    if (!option?.isDefault) {
        return false;
    }
    
    // Pour une option par défaut hidden, l'afficher seulement si :
    // 1. Elle est la seule option sélectionnée
    // 2. Ou si aucune autre option non-par-défaut n'est sélectionnée
    const currentSelected = getSelectedOptions();
    const selectedKeys = hasAnySubOptions.value ? currentSelected.options : currentSelected;
    
    // Vérifier si seule l'option par défaut est sélectionnée
    if (selectedKeys.length === 1 && selectedKeys[0] === optionKey) {
        return true;
    }
    
    // Vérifier si aucune option non-par-défaut n'est sélectionnée
    const hasNonDefaultSelected = selectedKeys.some(key => {
        const opt = props.options.find(o => o.key === key);
        return opt && !opt.isDefault;
    });
    
    return !hasNonDefaultSelected;
};

// Vérifier si une option est incompatible avec les options actuellement sélectionnées
const isIncompatible = (optionKey) => {
    const currentSelected = getSelectedOptions();
    const selectedKeys = hasAnySubOptions.value ? currentSelected.options : currentSelected;
    
    // Créer un objet field temporaire pour les fonctions d'incompatibilité
    const field = { options: props.options };
    
    return selectedKeys.some(selectedKey => 
        configuratorLogic.areOptionsIncompatible(field, optionKey, selectedKey)
    );
};

// Obtenir les options incompatibles pour une option donnée
const getIncompatibleOptionNames = (optionKey) => {
    const field = { options: props.options };
    const incompatibleKeys = configuratorLogic.getIncompatibleOptions(field, optionKey);
    
    return incompatibleKeys.map(key => {
        const option = props.options.find(opt => opt.key === key);
        return option?.name || key;
    }).join(', ');
};

/*
   Ce qu'annonce une carte devenue incompatible : la liste de ce qui la chasse,
   ou rien du tout si elle est elle-même retenue.
*/
const incompatibiliteAffichee = (optionKey) => (
    isIncompatible(optionKey) && !isSelected(optionKey)
        ? getIncompatibleOptionNames(optionKey)
        : ''
);
</script>

