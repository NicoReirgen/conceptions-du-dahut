<template>
    <main :class="content.slug" class="*:px-5">
        <header class="h-screen mb85 px-0! relative">
            <figure class="w-full h-full">
                <AppImage
                    :media="content.thumbnail"
                    :fallback-alt="plainTitle"
                    priority
                    class="w-full h-full object-cover rounded-none"
                    :style="{ viewTransitionName: nomImage }"
                />

                <figcaption class="flex items-end absolute inset-0 px-5 pb-21.25">
                    <h1 :style="{ viewTransitionName: nomTitre }">{{ content.title }}</h1>
                </figcaption>
            </figure>
        </header>

        <!--
            Chaque ligne est conditionnée à sa valeur. Le gabarit affichait ses
            étiquettes sans rien derrière dès qu'un champ manquait : une fiche
            en cours de rédaction montrait « Réalisation: », « Type: »,
            « Prix: » suivis du vide.
        -->
        <section v-if="aDuContenu" class="grid grid-cols-12">
            <div class="col-span-full md:col-span-6">
                <h2 v-if="acf.section_de_textes?.titre" class="text-base">
                    {{ acf.section_de_textes.titre }}
                </h2>
            </div>

            <div class="col-span-full md:col-span-6 space-y-21.25 [&_a]:underline">
                <div v-if="acf.section_de_textes?.premier_texte" v-html="acf.section_de_textes.premier_texte"></div>

                <div class="flex flex-col gap-0 *:font-light *:text-base/normal">
                    <span v-if="carac.date_du_projet">Réalisation: {{ carac.date_du_projet }}</span>
                    <span v-if="carac.type_damenagement">Type: {{ carac.type_damenagement }}</span>
                    <span v-if="carac.prix_du_projet">Prix: {{ carac.prix_du_projet }}</span>

                    <span v-if="carac.credit_photos">
                        Credit photos:
                        <a
                            :href="carac.credit_photos.url"
                            :target="carac.credit_photos.target || '_self'"
                            rel="noopener noreferrer"
                        >
                            {{ carac.credit_photos.title }}
                        </a>
                    </span>

                    <span v-if="carac.module_installe?.title">Module installé: {{ carac.module_installe.title }}</span>
                    <span v-if="carac.vehicule">Véhicule: {{ carac.vehicule }}</span>
                </div>
            </div>
        </section>

        <section class="grid grid-cols-12 gap-x-5 gap-y-21.25 items-end">
            <template v-for="(item, index) in grille" :key="`grille-${index}`">
                <div v-if="item.layout === 'image_seule'" class="col-span-8">
                    <AppImage :media="item.image" class="w-full aspect-3/2 object-cover" />
                </div>

                <!--
                    Une paire sur deux est renversée quand elles se suivent :
                    le format vertical passe à gauche et l'horizontal à droite.
                    Deux paires identiques d'affilée feraient une colonne, la
                    grande image toujours du même côté ; le renversement rend
                    l'alternance que le rythme ne peut plus assurer seul.
                -->
                <template v-else-if="item.layout === 'deux_images' && item.miroir">
                    <div class="col-span-5">
                        <AppImage :media="item.deuxieme_image" class="w-full aspect-2/3 object-cover" />
                    </div>

                    <div class="col-span-6 col-end-13">
                        <AppImage :media="item.premiere_image" class="w-full aspect-3/2 object-cover" />
                    </div>
                </template>

                <template v-else-if="item.layout === 'deux_images'">
                    <div class="col-span-6">
                        <AppImage :media="item.premiere_image" class="w-full aspect-3/2 object-cover" />
                    </div>

                    <div class="col-span-5 col-end-13">
                        <AppImage :media="item.deuxieme_image" class="w-full aspect-2/3 object-cover" />
                    </div>
                </template>
            </template>
        </section>

        <section v-if="acf.image_pleine_largeur" class="px-0!">
            <AppImage
                    :media="acf.image_pleine_largeur"
                    class="w-full rounded-none aspect-3/2 object-cover"
                />
        </section>

        <section v-if="next">
            <div class="flex justify-between mb-21.25">
                <ArrowLink :to="next.path" label="Projet suivant" />
                <ArrowLink to="/realisations" label="Voir plus de projets" />
            </div>

            <div class="grid grid-cols-12">
                <div class="flex flex-col gap-10.5 md:gap-20.5 col-span-full md:col-span-3">
                    <h2>{{ next.title }}</h2>

                    <p class="flex-1">{{ next.excerpt }}</p>

                    <span class="h-3.5 w-27.5 pl-1.5 border-l border-b rounded-bl-[2px] text-[0.625rem] leading-3.5">
                        {{ next.caracteristiques?.date_du_projet }}
                    </span>
                </div>

                <div class="col-span-full md:col-span-8 md:col-end-13">
                    <AppImage
                            :media="next.thumbnail"
                            :fallback-alt="next.title"
                            class="w-full h-full object-cover aspect-2/1"
                        />
                </div>
            </div>
        </section>
    </main>
</template>

<script setup>
const props = defineProps({
    content: {
        type: Object,
        required: true,
    },
})

const acf = computed(() => props.content.acf || {})
const carac = computed(() => acf.value.caracteristiques_du_projet || {})
/*
   Les blocs de la grille, chacun sachant s'il doit être renversé.

   Le rang se compte à l'intérieur d'une série de paires consécutives : la
   première garde la grande image à gauche, la deuxième la passe à droite. Une
   image seule remet le compteur à zéro — une paire isolée n'a personne avec qui
   alterner, elle garde donc l'orientation de référence de la maquette.
*/
const grille = computed(() => {
    let rangDansLaSerie = 0

    return (acf.value.contenu_de_larticle || []).map((bloc) => {
        if (bloc.layout !== 'deux_images') {
            rangDansLaSerie = 0
            return bloc
        }

        const miroir = rangDansLaSerie % 2 === 1
        rangDansLaSerie += 1

        return { ...bloc, miroir }
    })
})
const next = computed(() => props.content.next || null)

const plainTitle = computed(() =>
    String(props.content.title || '').replace(/<[^>]*>/g, '').trim()
)

/*
   Appariement avec la carte de la liste : mêmes noms que dans `homeArticle`.
   Le navigateur relie les deux états et anime l'image de la vignette vers le
   plein écran, pendant que le titre rejoint sa position de fiche.

   Ici les noms sont posés sans condition — la fiche n'affiche qu'une seule
   réalisation, il n'y a personne à départager.
*/
const nomImage = computed(() => `realisation-${props.content.slug}`)
const nomTitre = computed(() => `titre-realisation-${props.content.slug}`)

/*
   Une fiche sans texte ni caractéristique n'affiche pas sa section : mieux vaut
   une page courte qu'une grille d'étiquettes vides.
*/
const aDuContenu = computed(() =>
    Boolean(acf.value.section_de_textes?.titre) ||
    Boolean(acf.value.section_de_textes?.premier_texte) ||
    Object.values(carac.value).some((valeur) => valeur)
)

/*
   On signale la réalisation consultée, pour que la liste sache quelle carte
   nommer au retour en arrière. Sans cela, une fiche ouverte par un lien direct
   reviendrait à la liste sans transition.
*/
const { slugActif } = useTransitionRealisation()
slugActif.value = props.content.slug
</script>
