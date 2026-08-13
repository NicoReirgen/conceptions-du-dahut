<template>
    <div class="subOptions_wrap" role="group" :aria-labelledby="idTitre">
        <h3 :id="idTitre">{{ titre }}</h3>

        <div class="sub-options">
            <slot />
        </div>
    </div>
</template>

<script setup>
/*
   Le groupe qui rassemble les pastilles d'un même choix.

   Sans `role="group"` relié à son intitulé, les pastilles sont annoncées une à
   une, sans qu'on sache à quoi elles se rapportent ni qu'elles forment un
   ensemble. `UniqueField` avait reçu ce traitement, avec un identifiant tiré
   au sort ; les deux champs profonds en étaient restés à un titre isolé.
*/

defineProps({
    titre: {
        type: String,
        default: 'Choisissez une option'
    }
});

/* Identifiant stable entre le rendu serveur et le navigateur. */
const idTitre = useId();
</script>
