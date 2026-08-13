<template>
    <div class="quantity-selector">
        <button 
            @click.stop.prevent="$emit('decrement')"
            :disabled="modelValue <= min"
            class="quantity-btn"
        >
            -
        </button>
        <input
            type="number"
            :value="modelValue"
            :min="min"
            :max="max"
            readonly
            tabindex="-1"
            class="quantity-input"
        >
        <button 
            @click.stop.prevent="$emit('increment')"
            :disabled="modelValue >= max"
            class="quantity-btn"
        >
            +
        </button>
    </div>
</template>

<script setup>
defineProps({
    modelValue: {
        type: Number,
        required: true
    },
    min: {
        type: Number,
        required: true
    },
    max: {
        type: Number,
        required: true
    }
});

defineEmits(['update', 'increment', 'decrement']);
</script>

<style scoped>
.quantity-selector {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.quantity-btn {
    width: 1rem;
    height: 1.25rem;
    background: white;
    border: none;
    border-radius: .25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-size: 0.625rem; 
    font-weight: 400;
    line-height: normal;
    padding: 0;

    &:disabled {
        opacity: .5;
        cursor: not-allowed;
    }

    &:hover {
        background-color: #efefef;
    }
}

.quantity-input {
    width: 1.5rem;
    height: 1.25rem;
    border: .5px solid #ddd;
    border-radius: .25rem;
    text-align: center;
    font-size: 1rem;

    /*
       La règle globale `input, textarea` habille les formulaires du site :
       elle imposait ici 10 px de padding vertical dans une boîte haute de
       21 px, en `border-box`. La zone de contenu tombait à zéro et le chiffre
       était entièrement rogné — d'où un champ qui paraissait vide.

       Ce champ n'est pas un champ de saisie mais un afficheur compact : il ne
       veut ni le rembourrage ni l'interlignage des autres.
    */
    padding: 0;
    line-height: 1;
    cursor: default;
    pointer-events: none;
    user-select: none;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    &:focus {
        outline: none;
    }
}
</style>