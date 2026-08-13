<template>
    <section class="animate overflow-hidden relative">
        <div class="h-screen pt-21.25 px-5 z-2 relative pointer-events-none">
            <div class="grid grid-cols-12">
                <div class="col-span-full lg:col-span-4">
                    <h2 class="mb85 pointer-events-auto">{{ acf.realisations_titre }}</h2>

                    <div class="w-[calc((100%-60px)*0.75+40px)] mb-5 pointer-events-auto" v-html="acf.realisations_intro"></div>

                    <div class="flex space-x-20">
                        <ArrowLink
                            v-for="(lien, i) in liens"
                            :key="`lien-${i}`"
                            :link="lien"
                            class="pointer-events-auto"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div class="h-screen mt-[-100vh] relative">
            <div ref="container" class="carousel h-full">
                <div
                    v-for="article in realisations"
                    :key="article.id"
                    class="relative h-full"
                >
                    <div class="grid grid-cols-12 p-5 pt-87.5 absolute inset-0">
                        <div class="col-span-full lg:col-start-7 lg:col-end-10">
                            <div class="inline-flex items-center gap-2 h-3.5 mb-3.75 border-l border-b rounded-b-xs text-[0.625rem] uppercase">
                                <span class="pl-2">{{ article.caracteristiques?.module_installe?.title }}</span>

                                <span class="bg-white rounded-xs px-1.5 text-black">
                                    {{ article.caracteristiques?.vehicule }}
                                </span>
                            </div>

                            <h3 class="mb-2.5">{{ article.title }}</h3>

                            <div class="flex flex-row justify-between">
                                <span>{{ article.caracteristiques?.date_du_projet }}</span>

                                <ArrowLink :to="article.path" label="Le projet" />
                            </div>
                        </div>
                    </div>

                    <div class="w-full h-full col-start-1 col-end-7">
                        <AppImage
                            :media="article.thumbnail"
                            :fallback-alt="stripHtml(article.title)"
                            sizes="100vw"
                            class="w-full h-full object-cover rounded-none"
                        />
                    </div>
                </div>
            </div>

            <div class="carousel-pagination">
                <button
                    v-for="(article, i) in realisations"
                    :key="`bullet-${article.id}`"
                    type="button"
                    :aria-current="i === index ? 'true' : 'false'"
                    :aria-label="`Voir ${stripHtml(article.title)}`"
                    :style="i === index ? { '--progress': `${Math.round(progress * 100)}%` } : null"
                    @click="goTo(i)"
                >
                    {{ stripHtml(article.title) }}
                </button>
            </div>
        </div>

        <div class="banner-scroll w-fit flex flex-nowrap gap-15 items-center -mt-1 *:rounded-0 *:w-auto">
            <svg
                v-for="i in BANNER_REPEATS"
                :key="i"
                width="2039"
                height="103"
                viewBox="0 0 2039 103"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
            >
                <path d="M0 101.103V1.8966H16.3949V87.8272H64.5549V101.103H0Z" fill="white"/>
                <path d="M79.6244 101.103V1.8966H148.278V15.0269H96.0193V43.33H142.716V56.3144H96.0193V87.9731H148.278V101.103H79.6244Z" fill="white"/>
                <path d="M178.431 26.4065C178.431 52.5212 238.741 31.9504 238.741 72.5085C238.741 92.0581 222.785 103 200.974 103C178.87 103 163.646 92.9334 159.547 72.2167H176.674C179.455 83.4504 187.799 89.5779 201.12 89.5779C214.734 89.5779 221.906 83.5963 221.906 74.6969C221.906 46.6856 161.597 67.5482 161.597 27.7195C161.597 12.8385 174.186 0 196.875 0C216.49 0 232.592 9.33711 236.106 31.0751H218.686C215.905 18.8201 208.147 13.4221 196.436 13.4221C185.018 13.4221 178.431 18.5283 178.431 26.4065Z" fill="white"/>
                <path d="M367.355 31.3669H350.228C346.862 19.9872 337.347 13.7139 325.49 13.7139C307.338 13.7139 296.506 28.1572 296.506 51.6459C296.506 75.1346 307.192 89.2861 325.49 89.2861C336.908 89.2861 346.13 83.4504 349.936 72.2167H367.209C361.793 91.9122 345.105 103 325.49 103C297.091 103 279.818 83.5963 279.818 51.6459C279.818 19.8414 297.238 0 325.929 0C345.691 0 362.671 10.796 367.355 31.3669Z" fill="white"/>
                <path d="M428.038 103C398.322 103 380.171 83.4504 380.171 51.6459C380.171 19.8414 398.322 0 428.038 0C457.461 0 475.759 19.8414 475.759 51.6459C475.759 83.4504 457.461 103 428.038 103ZM428.038 89.2861C447.507 89.2861 459.071 74.9887 459.071 51.6459C459.071 28.1572 447.507 13.7139 428.038 13.7139C408.569 13.7139 396.858 28.1572 396.858 51.6459C396.858 74.9887 408.569 89.2861 428.038 89.2861Z" fill="white"/>
                <path d="M493.614 101.103V1.8966H510.741L552.46 66.6728L558.755 78.3442L558.315 1.8966H574.71V101.103H557.584L516.011 36.619L509.57 24.5099L510.009 101.103H493.614Z" fill="white"/>
                <path d="M680.135 31.3669H663.008C659.641 19.9872 650.126 13.7139 638.269 13.7139C620.118 13.7139 609.285 28.1572 609.285 51.6459C609.285 75.1346 619.971 89.2861 638.269 89.2861C649.687 89.2861 658.909 83.4504 662.715 72.2167H679.988C674.572 91.9122 657.885 103 638.269 103C609.871 103 592.598 83.5963 592.598 51.6459C592.598 19.8414 610.017 0 638.708 0C658.47 0 675.451 10.796 680.135 31.3669Z" fill="white"/>
                <path d="M696.463 101.103V1.8966H765.117V15.0269H712.858V43.33H759.555V56.3144H712.858V87.9731H765.117V101.103H696.463Z" fill="white"/>
                <path d="M781.949 101.103V1.8966H817.374C840.648 1.8966 854.994 14.0057 854.994 33.847C854.994 54.1261 840.356 65.9433 817.666 65.9433H798.344V101.103H781.949ZM817.227 15.0269H798.344V52.813H816.788C830.548 52.813 838.16 45.5184 838.16 33.9929C838.16 22.4674 830.402 15.0269 817.227 15.0269Z" fill="white"/>
                <path d="M898.082 101.103V15.6105H864.853V1.8966H947.56V15.6105H914.477V101.103H898.082Z" fill="white"/>
                <path d="M962.497 101.103V1.8966H978.892V101.103H962.497Z" fill="white"/>
                <path d="M1044.59 103C1014.88 103 996.724 83.4504 996.724 51.6459C996.724 19.8414 1014.88 0 1044.59 0C1074.01 0 1092.31 19.8414 1092.31 51.6459C1092.31 83.4504 1074.01 103 1044.59 103ZM1044.59 89.2861C1064.06 89.2861 1075.62 74.9887 1075.62 51.6459C1075.62 28.1572 1064.06 13.7139 1044.59 13.7139C1025.12 13.7139 1013.41 28.1572 1013.41 51.6459C1013.41 74.9887 1025.12 89.2861 1044.59 89.2861Z" fill="white"/>
                <path d="M1110.17 101.103V1.8966H1127.29L1169.01 66.6728L1175.31 78.3442L1174.87 1.8966H1191.26V101.103H1174.14L1132.56 36.619L1126.12 24.5099L1126.56 101.103H1110.17Z" fill="white"/>
                <path d="M1225.98 26.4065C1225.98 52.5212 1286.29 31.9504 1286.29 72.5085C1286.29 92.0581 1270.34 103 1248.53 103C1226.42 103 1211.2 92.9334 1207.1 72.2167H1224.23C1227.01 83.4504 1235.35 89.5779 1248.67 89.5779C1262.29 89.5779 1269.46 83.5963 1269.46 74.6969C1269.46 46.6856 1209.15 67.5482 1209.15 27.7195C1209.15 12.8385 1221.74 0 1244.43 0C1264.04 0 1280.15 9.33711 1283.66 31.0751H1266.24C1263.46 18.8201 1255.7 13.4221 1243.99 13.4221C1232.57 13.4221 1225.98 18.5283 1225.98 26.4065Z" fill="white"/>
                <path d="M1330.89 101.103V1.8966H1364.99C1396.17 1.8966 1415.49 20.5708 1415.49 51.6459C1415.49 82.721 1396.17 101.103 1364.99 101.103H1330.89ZM1364.99 87.8272C1386.22 87.8272 1398.81 74.4051 1398.81 51.6459C1398.81 28.5949 1386.22 15.1728 1364.99 15.1728H1347.28V87.8272H1364.99Z" fill="white"/>
                <path d="M1513.6 63.3173C1513.6 87.9731 1498.08 103 1473.05 103C1448.02 103 1432.5 87.9731 1432.5 63.3173V1.8966H1448.9V63.3173C1448.9 79.949 1457.97 89.8697 1473.05 89.8697C1488.27 89.8697 1497.2 79.8031 1497.2 63.3173V1.8966H1513.6V63.3173Z" fill="white"/>
                <path d="M1562.47 101.103V1.8966H1596.58C1627.76 1.8966 1647.08 20.5708 1647.08 51.6459C1647.08 82.721 1627.76 101.103 1596.58 101.103H1562.47ZM1596.58 87.8272C1617.8 87.8272 1630.39 74.4051 1630.39 51.6459C1630.39 28.5949 1617.8 15.1728 1596.58 15.1728H1578.86V87.8272H1596.58Z" fill="white"/>
                <path d="M1729.66 101.103L1721.17 78.7819H1675.79L1667.3 101.103H1650.9L1689.26 1.8966H1708.43L1746.78 101.103H1729.66ZM1695.55 27.2819L1680.77 65.9433H1716.19L1701.41 27.2819L1698.48 17.653L1695.55 27.2819Z" fill="white"/>
                <path d="M1760.03 101.103V1.8966H1776.42V43.4759H1824.73V1.8966H1841.12V101.103H1824.73V56.7521H1776.42V101.103H1760.03Z" fill="white"/>
                <path d="M1942.6 63.3173C1942.6 87.9731 1927.08 103 1902.05 103C1877.02 103 1861.5 87.9731 1861.5 63.3173V1.8966H1877.9V63.3173C1877.9 79.949 1886.97 89.8697 1902.05 89.8697C1917.27 89.8697 1926.2 79.8031 1926.2 63.3173V1.8966H1942.6V63.3173Z" fill="white"/>
                <path d="M1989.52 101.103V15.6105H1956.29V1.8966H2039V15.6105H2005.92V101.103H1989.52Z" fill="white"/>
            </svg>
        </div>
    </section>
</template>

<script setup>
const props = defineProps({
    acf: {
        type: Object,
        default: () => ({}),
    },
})

// Les articles arrivent déjà résolus dans le champ ACF (vignette, chemin,
// caractéristiques du projet) : plus de requête par réalisation.
const realisations = computed(() => props.acf?.realisations_selection || [])

const liens = computed(() =>
    [props.acf?.realisations_premier_lien, props.acf?.realisations_deuxieme_lien].filter(Boolean)
)

/*
   Le bandeau défile de -200vh au plus (voir .banner-scroll). Avec un logotype
   de 2039 px de large, trois copies couvrent ce déplacement sur tous les
   formats d'écran. Le gabarit d'origine en répétait huit, soit 168 tracés SVG
   dans le DOM pour un effet identique.
*/
const BANNER_REPEATS = 3

const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').trim()

// Swiper remplacé par du défilement natif : même comportement (lecture
// automatique de 5 s, pause au survol, pastilles titrées avec barre de
// progression), sans les ~40 Ko de la bibliothèque ni sa feuille de style.
const { container, index, progress, goTo } = useCarousel({
    count: () => realisations.value.length,
    autoplay: 5000,
})
</script>