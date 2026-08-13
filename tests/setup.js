/*
   Reconstitue les auto-imports de Nuxt.

   Les composants du configurateur appellent `ref`, `computed`, `watch` et les
   composables du projet sans jamais les importer : Nuxt les injecte à la
   compilation. Hors de Nuxt, il faut les poser soi-même.

   On installe les vraies implémentations, pas des doublures : le but est de
   tester le comportement réel, et une doublure de `prixLisible` ne dirait rien
   des huit variantes qu'il a remplacées.

   L'ordre compte. Les composables du projet appellent `ref()` dès leur
   évaluation — `useAnnonce` déclare son message au niveau du module. Comme les
   imports ESM sont hissés en tête de fichier, les charger normalement les
   ferait s'exécuter avant que les globales existent. D'où l'import dynamique,
   posé après.
*/
import * as vue from 'vue'

for (const nom of [
    'ref', 'computed', 'reactive', 'readonly', 'toRef', 'toRefs', 'unref', 'isRef',
    'watch', 'watchEffect', 'nextTick', 'provide', 'inject', 'useId',
    'onMounted', 'onUnmounted', 'onBeforeUnmount', 'onBeforeMount', 'onUpdated',
    'defineAsyncComponent', 'shallowRef', 'markRaw',
]) {
    globalThis[nom] = vue[nom]
}

const [annonce, champOption, validation, variantes] = await Promise.all([
    import('~~/app/composables/useAnnonce'),
    import('~~/app/composables/useChampOption'),
    import('~~/app/composables/useValidationContact'),
    import('~~/app/utils/imageVariants'),
])

const utilitaires = {
    useAnnonce: annonce.useAnnonce,
    prixLisible: champOption.prixLisible,
    libelleOption: champOption.libelleOption,
    contrasteSuffisant: champOption.contrasteSuffisant,
    optionProfondeChoisie: champOption.optionProfondeChoisie,
    validationContact: validation.validationContact,
    configuratorSrcset: variantes.configuratorSrcset,
    CONFIGURATOR_WIDTHS: variantes.CONFIGURATOR_WIDTHS,
}

Object.assign(globalThis, utilitaires)

/*
   Les expressions d'un gabarit ne sont pas évaluées dans la portée globale : Vue
   les résout par le contexte de rendu du composant. Il faut donc les déclarer
   une seconde fois, du côté du monteur.
*/
const { config } = await import('@vue/test-utils')
config.global.config = config.global.config || {}
config.global.config.globalProperties = {
    ...(config.global.config.globalProperties || {}),
    ...utilitaires,
}
