<template>
	<div class="progress-bar">
		<template v-for="(step, index) in steps" :key="step.key">
			<div
				:class="[
					'step',
					isStepActive(index + 1) ? 'active' : ''
				]"
			>
				Étape {{ index + 1 }}
			</div>
		</template>
	</div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	steps: {
		type: Array,
		required: true
	},
	currentStep: {
		type: Number,
		required: true
	}
});

// Déterminer si une étape principale est active
const isStepActive = (stepNumber) => {
	// L'étape 1 est toujours la sélection du modèle
	if (stepNumber === 1) {
		return props.currentStep === 1;
	}

	// Pour les autres étapes, on vérifie si on est dans cette étape ou ses sous-étapes
	const mainStepIndex = stepNumber - 1;
	const mainStep = props.steps[mainStepIndex];
	
	if (!mainStep) return false;

	// Calculer l'index de début de l'étape principale
	let startIndex = 1; // Commencer après l'étape 1
	for (let i = 0; i < mainStepIndex; i++) {
		const step = props.steps[i];
		if (step.subSteps) {
			startIndex += step.subSteps.length;
		} else {
			startIndex += 1;
		}
	}

	// Calculer l'index de fin de l'étape principale
	let endIndex = startIndex;
	if (mainStep.subSteps) {
		endIndex += mainStep.subSteps.length - 1;
	}

	return props.currentStep >= startIndex && props.currentStep <= endIndex;
};
</script>

<style scoped>
	.progress-bar {
		display: flex;
		gap: 1rem;

		margin-bottom: 1rem;

		.step {
			height: .875rem;
			width: 4.5rem;

			padding-inline: .25rem;

			border-bottom-left-radius: 2px;
			border-left: .5px solid #000;
			border-bottom: .5px solid #000;

			color: #898989;
			font-size: 0.625rem; 
			font-weight: 300;
			text-transform: uppercase;

			&.active {
				color: #000;
			}
		}
	}
</style> 