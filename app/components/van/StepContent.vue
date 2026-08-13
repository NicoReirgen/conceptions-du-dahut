<template>
    <main ref="section" class="content-section" :class="stepData.type + '-step'" tabindex="-1">
        <div v-if="stepData.type === 'vehicle'" class="options-grid vehicule-step">
            <!--
                C'est le titre de l'étape, pas un paragraphe : les autres
                étapes en ont un (`stepData.title`), celle-ci le formulait en
                question. Sans lui, le plan passait de `h1` à `h3`.
            -->
            <h2 tabindex="-1">De quel service avez-vous besoin pour l'aménagement de votre véhicule&nbsp;?</h2>

            <div
                v-for="vehicle in vehicles"
                :key="vehicle.id"
                :class="[
                    'option-card',
                    selectedVehicle?.id === vehicle.id ? 'selected' : '',
                    vehicle.soonAvailable ? 'disabled' : ''
                ]"
                @click.stop.prevent="$emit('select-vehicle', vehicle)"
                @keydown="handleKeyDown($event, () => emit('select-vehicle', vehicle))"
                :tabindex="vehicle.soonAvailable ? -1 : 0"
                role="button"
                :aria-pressed="selectedVehicle?.id === vehicle.id"
                :aria-disabled="vehicle.soonAvailable ? 'true' : null"
            >
                <h3>{{ vehicle.name }}</h3>

                <span v-if="vehicle.soonAvailable" class="soon-available">
                    Bientôt disponible
                </span>
            </div>
        </div>

        <div v-else-if="stepData.type === 'presentation'" class="presentation-step">
            <div class="presentation-details">
                <h2 tabindex="-1">{{ stepData.content?.title || stepData.name }}</h2>
                <div class="presentations-texts">
                    <p v-if="stepData.content?.description" class="description">{{ stepData.content.description }}</p>
                    <a v-if="stepData.content?.lien" :href="stepData.content.lien" target="_blank">
                        En savoir plus

                        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M8.7058 1.00067C8.70579 0.726542 8.4803 0.504322 8.20217 0.504332L3.66964 0.504488C3.3915 0.504498 3.16603 0.726733 3.16604 1.00086C3.16605 1.275 3.39153 1.49722 3.66967 1.49721L7.69859 1.49707L7.69872 5.46794C7.69873 5.74207 7.92422 5.96429 8.20235 5.96428C8.48049 5.96428 8.70596 5.74204 8.70595 5.46791L8.7058 1.00067ZM1.35612 8.45058L8.5583 1.35166L7.84606 0.649725L0.643879 7.74864L1.35612 8.45058Z" fill="black"/>
                        </svg>
                    </a>
                </div>
                <div v-if="stepData.content?.imgs" class="imgs">
                    <VanImage
                        v-for="(img, index) in stepData.content.imgs"
                        :key="index"
                        :src="img"
                        :alt="`${stepData.content?.title || stepData.name}, vue ${index + 1}`"
                        sizes="(width > 768px) 25vw, 50vw"
                    />
                </div>
            </div>
        </div>

        <div v-else-if="stepData.type === 'group'" class="group-step">
            <h2 v-if="stepData.title" tabindex="-1">
                {{ stepData.title }}
                <span v-if="stepData.subStepIndex !== undefined && stepData.totalSubSteps !== undefined && stepData.totalSubSteps > 1" class="step-fraction">
                    {{ stepData.subStepIndex + 1 }}/{{ stepData.totalSubSteps }}
                </span>
            </h2>
            
            <p v-if="stepData.description" class="group-description">{{ stepData.description }}</p>
            
            <div class="step-content">
                <div v-for="field in stepData.fields" :key="field.key" class="fields-container">
                    <!--
                        `v-model` écrivait directement dans le prop
                        `selectedOptions`, que le parent possède — Vue le
                        déconseille, et l'émission `select-option` posée à côté
                        n'était écoutée par personne. La liaison est désormais à
                        sens unique, et c'est l'émission qui remonte le choix.
                    -->
                    <SelectField
                        v-if="field.type === 'select'"
                        :model-value="selectedOptions[field.key]"
                        :title="field.title"
                        :description="field.description"
                        :placeholder="field.placeholder"
                        :options="field.options"
                        @select="$emit('select-option', { key: field.key, value: $event.value })"
                    />

                    <UniqueField
                        v-else-if="field.type === 'unique'"
                        :title="field.title"
                        :description="field.description"
                        :options="field.options"
                        :model-value="getModelValue(field.key, field.type)"
                        @update:model-value="$emit('select-option', { key: field.key, value: $event })"
                    />

                    <MultipleField
                        v-else-if="field.type === 'multiple'"
                        :field-key="field.key"
                        :title="field.title"
                        :description="field.description"
                        :options="field.options"
                        :has-default-option="field.hasDefaultOption"
                        :selected-options="selectedOptions"
                        @update-options="$emit('update-options', $event)"
                    />

                    <DeepMultipleField
                        v-else-if="field.type === 'deep_multiple'"
                        :field-key="field.key"
                        :title="field.title"
                        :description="field.description"
                        :options="field.options"
                        :selected-options="selectedOptions"
                        @update-options="$emit('update-options', $event)"
                    />

                    <QuantityField
                        v-else-if="field.type === 'openings'"
                        :title="field.title"
                        :description="field.description"
                        :options="field.options.main.options"
                        :quantities="selectedOptions[field.key]?.quantities || {}"
                        @update-quantity="$emit('update-openings-quantity', $event)"
                        @increment-quantity="$emit('increment-openings-quantity', $event)"
                        @decrement-quantity="$emit('decrement-openings-quantity', $event)"
                    />
                </div>
            </div>
        </div>

        <!-- Étape résumé -->
        <PriceSummary
            v-else-if="stepData.type === 'summary'"
            :key="stepData.key"
            :base-price="selectedVehicle.price"
            :vehicle-name="selectedVehicle.name"
            :steps="vehicleSteps"
            :selected-options="selectedOptions"
            :total-price="totalPrice"
        />
        
        <ContactStep
        v-else-if="stepData.type === 'contact'" 
            ref="contactStepRef"
            :name="stepData.name"
            :content="stepData.content"
            :selected-vehicle="selectedVehicle"
            :selected-options="selectedOptions"
            :total-price="totalPrice"
            :vehicle-steps="vehicleSteps"
        />
    </main>
</template>

<script setup>
import { configuratorLogic } from '~~/app/composables/useConfigurator';
import PriceSummary from './PriceSummary.vue';
import VanImage from './VanImage.vue';
import ContactStep from './ContactStep.vue';
import SelectField from './fields/SelectField.vue';
import UniqueField from './fields/UniqueField.vue';
import MultipleField from './fields/MultipleField.vue';
import DeepMultipleField from './fields/DeepMultipleField.vue';
import QuantityField from './fields/QuantityField.vue';

const props = defineProps({
    stepData: {
        type: Object,
        required: true
    },
    vehicles: {
        type: Array,
        required: true
    },
    selectedVehicle: {
        type: Object,
        default: null
    },
    selectedOptions: {
        type: [Object, Array],
        default: () => ({})
    },
    /*
       `isOptionSelected`, `isSubOptionSelected`, `getQuantity` et `currentStep`
       étaient déclarés ici et lus nulle part : les champs interrogent
       `selectedOptions` eux-mêmes. Les trois fonctions passées coûtaient 53
       lignes au configurateur, dont deux au-delà des seuils d'imbrication.
    */
    totalPrice: {
        type: Number,
        required: true
    },
    vehicleSteps: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits([
    'select-vehicle',
    'select-finition-option',
    'select-finition-sub-option',
    'select-option',
    'select-unique-option',
    'select-isolation-main',
    'select-isolation-finish',
    'select-isolation-sub-option',
    'update-openings-quantity',
    'increment-openings-quantity',
    'decrement-openings-quantity',
    'select-openings-optional',
    'select-openings-painting',
    'update-options'
]);

// Référence au composant ContactStep
const contactStepRef = ref(null);

// Validation des props avec les utilitaires centralisés (supprime totalPrice de la validation obligatoire)
configuratorLogic.validateProps(props, ['stepData', 'vehicles']);

// Utilisation du gestionnaire d'accessibilité centralisé
const handleKeyDown = configuratorLogic.handleKeyDown;

/*
   Déplacer le focus à chaque changement d'étape.

   Sans cela, « Suivant » garde le focus pendant que tout le contenu autour de
   lui est remplacé : une personne au clavier ne sait pas que l'étape a changé,
   et un lecteur d'écran n'annonce rien. On vise le titre de la nouvelle étape,
   qui la nomme, et à défaut la section elle-même.

   Le watcher ne se déclenche pas au montage : le focus n'est donc pas volé au
   chargement de la page.
*/
const section = ref(null);

watch(
    () => props.stepData,
    async () => {
        await nextTick();
        const titre = section.value?.querySelector('h2');
        (titre || section.value)?.focus({ preventScroll: true });
    },
    { flush: 'post' }
);

// Injection de getModelValue
const getModelValue = inject('getModelValue', (key, type) => {
    console.warn(`Fallback getModelValue used for key: ${key}, type: ${type}`);
    return type === 'multiple' ? [] : null;
});

// Méthodes exposées pour le parent
const getContactFormValidity = () => {
    if (props.stepData.type === 'contact' && contactStepRef.value) {
        return contactStepRef.value.isFormValid;
    }
    return true;
};

const getContactFormSubmitting = () => {
    if (props.stepData.type === 'contact' && contactStepRef.value) {
        return contactStepRef.value.isSubmitting;
    }
    return false;
};

const submitContactForm = async () => {
    if (props.stepData.type === 'contact' && contactStepRef.value) {
        return await contactStepRef.value.submitForm();
    }
    return { success: false, error: 'Formulaire de contact non disponible' };
};

// Exposer les méthodes au parent
defineExpose({
    getContactFormValidity,
    getContactFormSubmitting,
    submitContactForm
});
</script>

<style scoped>
main.content-section {
    flex: 1;

    height: 100%;

    margin-bottom: 1.5rem;

    &:not(&.presentation-step) {
        overflow: scroll;
    }
}

.group-step {
    display: flex;
    flex-direction: column;
    gap: 2rem;

    .step-fraction {
        font-size: 0.625rem; 
        font-weight: 500;
        line-height: normal;
    }

    .group-description {
        margin: 0;
        /* Voir Breadcrumb.vue : #B1B1B1 sur blanc est sous le seuil de lisibilité. */
        color: #595959;
    }

    .step-content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        /* overflow: scroll; */
    }
}

.vehicule-step {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    /* Mêmes valeurs que le `p` d'origine : le rendu ne bouge pas. */
    h2 {
        margin-bottom: 2.125rem;

        font-size: 1.3125rem;
        font-weight: 500;
        line-height: 1.5;
    }

    .option-card {
        display: flex;
        align-items: flex-end;
        gap: 1rem;

        padding: .5rem .625rem;
        border-radius: .25rem;
        border: .5px solid #000;
        cursor: pointer;

        &.disabled {
            display: flex;
            justify-content: space-between;

            /*
               L'estompage passait par `opacity: .5`, qui délavait aussi le
               texte : « Modular » ressortait à 4:1 sur son fond gris, sous le
               seuil de lisibilité. Le retrait est désormais porté par la
               couleur seule, le fond et la bordure suffisant à dire l'état.
            */
            color: #595959;
            border-style: dashed;
            background-color: rgb(229, 229, 229);

            pointer-events: none;

            .soon-available {
                padding: 2px 4px;

                border-radius: 4px;
                background-color: white;

                font-size: .625rem;
            }

            &:hover {
                cursor: not-allowed;
            }
        }

        .option-card-content {
            display: flex;
            flex-direction: column;
            gap: .25rem;
        }

        &.selected {
            background-color: #000;

            h3 {
                color: #FFF;
            }
        }
    }
}

/* --- Section Présentation --- */
.presentation-step {
    height: 100%;

    h2 {
        margin-bottom: 1.5625rem;
    }

    .presentation-details {
        display: flex;
        flex-direction: column;
        height: 100%;
    
        .presentations-texts {
            flex: 1;

            margin-bottom: 1rem;
        }

        a {
            display: flex;
            gap: .625rem;
            align-items: center;

            text-decoration: underline;
        }

        /*
           Les deux visuels vont côte à côte, comme sur la maquette. C'est
           l'image qui porte le partage : son `<picture>` est en
           `display: contents`, donc transparent au flux. Quand il était un
           bloc, les images s'empilaient et la colonne dépassait sous le pied
           de page du configurateur.
        */
        .imgs {
            display: flex;
            margin-inline: -1.25rem;

            /*
               `:deep()` parce que l'image vit désormais dans <VanImage> : un
               style scopé ne marque que la racine du composant enfant, ici le
               <picture>, pas ce qu'il contient.
            */
            :deep(img) {
                display: block;
                flex: 1;
                min-width: 0;

                aspect-ratio: 256/200;
                object-fit: cover;
            }
        }
    }
}
</style>