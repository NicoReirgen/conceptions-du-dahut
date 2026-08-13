<template>
    <div class="field-container">
        <p v-if="title" class="field-title">{{ title }}</p>
        <p v-if="description" class="field-description">{{ description }}</p>
        <slot></slot>
    </div>
</template>

<script setup>
defineProps({
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    }
});
</script>

<style scoped>
.field-container {
    display: flex;
    flex-direction: column;
    gap: .625rem;

    .field-title, .field-description {
        margin: 0;
        
        /* #B1B1B1 sur blanc ne donne que 2,14:1 — voir Breadcrumb.vue. */
        color: #595959;
        font-size: 0.625rem; 
    }
}
</style>