<template>
    <component :is="template" :content="content" v-bind="extraProps" />
</template>

<script setup>
import Realisation from '~/components/templates/Realisation.vue'
import Realisations from '~/components/templates/Realisations.vue'
import Produits from '~/components/templates/Produits.vue'
import QuiSommesNous from '~/components/templates/QuiSommesNous.vue'
import MentionsLegales from '~/components/templates/MentionsLegales.vue'
import Contact from '~/components/templates/Contact.vue'
import SurMesure from '~/components/templates/SurMesure.vue'
import CategorieArticles from '~/components/templates/CategorieArticles.vue'
import Editorial from '~/components/templates/Editorial.vue'

/**
 * Aiguillage des gabarits, équivalent de la hiérarchie de templates WordPress.
 *
 * Pages et articles partagent la racine sur ce site : l'API résout le type, on
 * choisit ici la mise en page. Un slug sans gabarit dédié retombe sur Editorial
 * plutôt que sur une page blanche.
 */
const route = useRoute()
const content = await useContent(computed(() => `/${route.params.slug}`))

/*
   WordPress choisit d'abord par gabarit assigné, ensuite seulement par slug.
   Se fier au seul slug envoyait /vente et /location sur un rendu éditorial
   alors qu'elles portent `page-produits.php` et doivent afficher la grille
   produits, comme le fait le thème.
*/
const BY_TEMPLATE = {
    'page-produits.php': Produits,
}

const BY_SLUG = {
    produits: Produits,
    realisations: Realisations,
    'qui-sommes-nous': QuiSommesNous,
    'mentions-legales': MentionsLegales,
    contact: Contact,
    'sur-mesure': SurMesure,
}

const template = computed(() => {
    if (content.value?.type === 'post') {
        return Realisation
    }

    // Archive d'une catégorie d'articles (« isolation », « fenêtres »…), servie
    // à la racine comme les pages.
    if (content.value?.type === 'term') {
        return CategorieArticles
    }

    return (
        BY_TEMPLATE[content.value?.template] ||
        BY_SLUG[content.value?.slug] ||
        Editorial
    )
})

/*
   Deux listes transverses que le thème codait en dur dans ses gabarits :
   — les prestations (catégories d'articles), sur sur-mesure et les pages
     éditoriales ;
   — la gamme de produits, en tête du gabarit Produits.

   Chacune n'est chargée que par les gabarits qui s'en servent.
*/
const veutPrestations = computed(
    () => content.value?.slug === 'sur-mesure' || template.value === Editorial
)

const veutListeProduits = computed(() => template.value === Produits)

const prestations = veutPrestations.value ? await useCollection('categories') : ref([])
const listeProduits = veutListeProduits.value ? await useCollection('produits') : ref([])

const extraProps = computed(() => {
    if (veutListeProduits.value) {
        return { produits: listeProduits.value || [] }
    }

    return veutPrestations.value ? { prestations: prestations.value || [] } : {}
})

useContentSeo(content)
</script>
