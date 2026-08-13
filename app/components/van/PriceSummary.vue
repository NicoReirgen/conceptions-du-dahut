<template>
	<div class="summary-step">
		<h2 tabindex="-1">Résumé</h2>

		<div class="summary-content">
			<!-- Prix de base -->
			<div class="summary-group">
				<h3>Véhicule sélectionné</h3>
				<div class="summary-value">
					<span class="option-name">{{ vehicleName }}</span>
					<span class="option-price">{{ formatPrice(basePrice) }}</span>
				</div>
			</div>

			<!-- Options organisées par étapes -->
			<div v-for="section in organizedSummary" :key="section.stepKey" class="summary-group">
				<h3>{{ section.stepName }}</h3>
				<div v-for="(item, itemIndex) in section.options" :key="itemIndex" class="summary-value">
					<span class="option-name">{{ item.name }}</span>
					<span v-if="item.price > 0" class="option-price">{{ item.pricePrefix || '' }}{{ item.pricePrefix ? '' : '+' }}{{ item.price }}€</span>
					<span v-else-if="item.price < 0" class="option-price">{{ item.price }}€</span>
					<span v-else-if="item.price === 0" class="option-price">Inclus</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { configuratorLogic } from '~~/app/composables/useConfigurator';
import { resumeConfiguration } from '~~/app/composables/useResumeConfiguration';

const props = defineProps({
	basePrice: {
		type: Number,
		required: true
	},
	vehicleName: {
		type: String,
		required: true
	},
	steps: {
		type: Array,
		required: true
	},
	selectedOptions: {
		type: Object,
		required: true
	},
	totalPrice: {
		type: Number,
		required: true
	}
});

const formatPrice = (price) => configuratorLogic.formatPrice(price);

/*
   Le récapitulatif est calculé par `useResumeConfiguration`, hors du composant.
   Il ne reste ici que l'affichage — et la même liste sert désormais à composer
   la charge utile du devis.
*/
const organizedSummary = computed(() =>
	resumeConfiguration(props.steps, props.selectedOptions)
);
</script>

<style scoped>
.summary-step {
	display: flex;
	flex-direction: column;

	height: 100%;

	h2 {
		margin-bottom: 1rem;
	}
}

.summary-content {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	flex: 1;
	max-height: 60vh;
	overflow-y: auto;
	padding-right: .5rem;
	
	/* Barre de défilement personnalisée */
	&::-webkit-scrollbar {
		width: .375rem;
	}
	
	&::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: .1875rem;
	}
	
	&::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: .1875rem;
		transition: background-color 0.2s ease;
	}
	
	&::-webkit-scrollbar-thumb:hover {
		background: #a1a1a1;
	}
	
	/* Fallback pour Firefox */
	scrollbar-width: thin;
	scrollbar-color: #c1c1c1 #f1f1f1;
}

.summary-group {
	display: flex;
	flex-direction: column;
	gap: .25rem;
	
	h3 {
		color: #898989;
		font-size: 0.625rem; 
		font-weight: 400;
		line-height: normal;
	}
}

.summary-value {
	display: flex;
	align-items: flex-end;
	gap: .625rem;

	.option-name {
		line-height: 1;
	}
}

.option-price {
	color: #898989;
	font-size: 0.625rem; 
	font-weight: 400;
	line-height: normal;
}
</style>