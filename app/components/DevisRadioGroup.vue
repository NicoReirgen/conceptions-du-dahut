<template>
    <fieldset class="flex items-start gap-2.5">
        <legend data-title class="flex-2/5 float-left">{{ legend }}</legend>

        <div class="flex-3/5 checkbox_wrap">
            <label
                v-for="option in options"
                :key="option"
                data-input-label
                :for="`${name}-${slug(option)}`"
            >
                <span>{{ option }}</span>
                <input
                    :id="`${name}-${slug(option)}`"
                    type="radio"
                    :name="name"
                    :value="option"
                    :checked="modelValue === option"
                    @change="emit('update:modelValue', option)"
                >
            </label>
        </div>
    </fieldset>
</template>

<script setup>
/**
 * Groupe de boutons radio du formulaire de devis.
 *
 * Le gabarit d'origine répétait ce bloc huit fois à la main, chaque fois avec
 * ses identifiants écrits en dur. Une seule définition évite les `for`/`id`
 * désynchronisés, qui cassent silencieusement l'accessibilité.
 */
defineProps({
    modelValue: { type: String, default: '' },
    name: { type: String, required: true },
    legend: { type: String, required: true },
    options: { type: Array, required: true },
})

const emit = defineEmits(['update:modelValue'])

const slug = (value) =>
    String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
</script>
