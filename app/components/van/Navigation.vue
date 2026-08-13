<template>
	<nav>
		<button 
			class="next" 
			:disabled="!props.canProceed"
			@click="handleNext"
			:aria-label="props.isLastStep ? 'Terminer la configuration' : 'Étape suivante'"
		>
			{{ props.isLastStep ? 'Terminer' : 'Suivant' }}
		</button>

		<button 
			v-if="props.currentStep > 1"
			class="previous" 
			@click="handlePrevious"
			aria-label="Étape précédente"
		>
			Précédent
		</button>
	</nav>
</template>

<script setup>
// Define props to receive navigation-related data
const props = defineProps({
    currentStep: {
        type: Number,
        required: true
    },
    totalSteps: {
        type: Number,
        required: true
    },
    canProceed: {
        type: Boolean,
        required: true
    },
    isLastStep: {
        type: Boolean,
        required: true
    }
});

// Define emits to notify the parent component of navigation actions
const emit = defineEmits(['previous', 'next', 'finish']);

// Navigation logic
const handleNext = () => {
    if (props.isLastStep) {
        emit('finish');
    } else {
        emit('next');
    }
};

const handlePrevious = () => {
    if (props.currentStep > 1) {
        emit('previous');
    }
};
</script>

<style scoped>
nav {
	display: flex;
	flex-direction: row-reverse;
	align-items: center;
	justify-content: space-between;

	width: 100%;

	margin-bottom: 1.875rem;

	button {
		display: flex;
		align-items: center;
		justify-content: center;

		height: 1.875rem;
		width: 5.875rem;

		border-radius: .25rem;
		border: none;
		background: #000;

		color: #FFF;
		
		font-size: .5625rem;
		font-weight: 500;
		text-transform: uppercase;

		cursor: pointer;

		&:disabled {
			opacity: .5;
			cursor: not-allowed;
		}
	}
}
</style>