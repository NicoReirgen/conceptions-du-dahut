<template>
    <div class="breadcrumb">
        <div class="breadcrumb-items" ref="breadcrumbContainer">
            <div 
                v-for="(step, index) in visibleSteps" 
                :key="step.key"
                class="breadcrumb-item"
            >
                <span>{{ step.name }}</span>
                <span v-if="index < visibleSteps.length - 1">›</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, nextTick, watch } from 'vue';

const props = defineProps({
    steps: {
        type: Array,
        default: () => [] // Ensure steps is always an array
    },
    currentStep: {
        type: Number,
        required: true
    }
});

const breadcrumbContainer = ref(null);

const visibleSteps = computed(() => {
    // À l'étape 1, n'afficher que l'étape actuelle
    if (props.currentStep === 1) {
        return [props.steps[0]];
    }

    // Trouver l'étape principale actuelle
    let currentMainStep = 1;
    let stepCount = 1;
    
    for (let i = 0; i < props.steps.length; i += 1) {
        // Ignorer les sous-étapes dans le comptage
        stepCount += 1;
        
        if (props.currentStep <= stepCount) {
            break;
        }
        currentMainStep++;
    }

    // Retourner toutes les étapes principales jusqu'à l'étape actuelle
    return props.steps.slice(0, currentMainStep);
});

// Scroll automatiquement vers la droite quand le contenu change
watch(visibleSteps, async () => {
    await nextTick();
    if (breadcrumbContainer.value) {
        breadcrumbContainer.value.scrollLeft = breadcrumbContainer.value.scrollWidth;
    }
}, { immediate: true });

</script>

<style scoped>
    .breadcrumb {
        /* overflow: hidden; */

        margin-bottom: 2.5rem;

        &::-webkit-scrollbar {
            display: none;
        }
    }
    .breadcrumb-items {
        display: flex;
        gap: .25rem;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        
        &::-webkit-scrollbar {
            display: none;
        }
    }

    .breadcrumb-item {
        display: flex;
        gap: .25rem;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .breadcrumb-item span {
        /*
           #B1B1B1 sur blanc ne donnait que 2,14:1, pour un texte de 7,5 px.
           #595959 conserve le retrait visuel du fil d'Ariane en atteignant
           7:1 — c'est déjà le gris employé ailleurs sur le site.
        */
        color: #595959;
        font-size: 0.625rem; 
        font-weight: 400;
    }
</style>