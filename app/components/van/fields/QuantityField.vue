<template>
    <BaseField
        :title="title"
        :description="description"
    >
        <div class="options-grid">
            <!--
                La carte ne se clique pas : c'est le sélecteur qu'elle porte qui
                règle la quantité.
            -->
            <OptionCard
                v-for="option in options"
                :key="option.key"
                class="quantity-card"
                :option="option"
                :interactive="false"
            >
                <template #controle>
                    <QuantitySelector
                        :model-value="getQuantity(option.key)"
                        :min="option.quantity.min"
                        :max="option.quantity.max"
                        @update="$emit('update-quantity', option.key, $event)"
                        @increment="$emit('increment-quantity', option.key)"
                        @decrement="$emit('decrement-quantity', option.key)"
                    />
                </template>
            </OptionCard>
        </div>
    </BaseField>
</template>

<script setup>
import BaseField from './BaseField.vue';
import OptionCard from './OptionCard.vue';
import QuantitySelector from '../QuantitySelector.vue';

const props = defineProps({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    options: {
        type: Array,
        required: true
    },
    quantities: {
        type: Object,
        default: () => ({})
    }
});

defineEmits([
    'update-quantity',
    'increment-quantity',
    'decrement-quantity'
]);

const getQuantity = (optionKey) => {
    const quantity = props.quantities[optionKey] || 0;
    // Ensure the quantity is within valid bounds
    const option = props.options.find(opt => opt.key === optionKey);
    if (option) {
        const min = option.quantity?.min || 0;
        const max = option.quantity?.max || Infinity;
        return Math.max(min, Math.min(max, quantity));
    }
    return quantity;
};
</script>
