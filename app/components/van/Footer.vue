<template>
    <footer>
        <span class="label">Prix TTC</span>
        <span class="price" :aria-label="ariaLabel">{{ formattedPrice }}</span>
    </footer>
</template>

<script setup>
import { configuratorLogic } from '~~/app/composables/useConfigurator';

const props = defineProps({
    totalPrice: {
        type: Number,
        required: true,
        validator: (value) => !isNaN(value) && value >= 0
    }
});

const formattedPrice = computed(() => {
    return configuratorLogic.formatPrice(props.totalPrice);
});

// Add ARIA attributes for accessibility
const ariaLabel = computed(() => {
    return `Prix total TTC: ${formattedPrice.value} euros`;
});
</script>

<style scoped>
    footer {
        display: flex;
        align-items: center;
        justify-content: space-between;

        width: 100%;
        height: 4.625rem;

        border-top: .5px solid #000;

        .label, .price {
            font-size: 1.3125rem;
            font-weight: 500;
            text-transform: uppercase;
        }
    }
</style>