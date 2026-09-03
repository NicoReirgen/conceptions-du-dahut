<template>
    <nav class="flex justify-between w-full px-5 fixed top-7.5 z-10">
        <NuxtLink class="hidden md:block" to="/" aria-label="Accueil">
            <img class="h-auto" width="190" height="66" :src="cheminPublic('/assets/svg/logo_full.svg')" alt="Les Conceptions du Dahut">
        </NuxtLink>

        <div
            class="flex flex-col justify-between w-full md:w-1/2 lg:w-[calc((100%-(11*20px))/12*4+(20px*3))] h-fit bg-black rounded-[10px] text-[0.5625rem]"
            id="menu"
        >
            <div class="flex justify-between items-center h-11.5 p-2 pr-5 *:uppercase">
                <!--
                    Sans `prefetch="false"`, Nuxt précharge la route du
                    configurateur depuis chaque page où ce bouton figure — soit
                    partout. Sa feuille de style, 19,7 Ko dont 3 compressés,
                    était alors téléchargée et appliquée sur des pages où aucune
                    de ses règles ne trouve de cible.

                    Le module est une destination qu'on choisit, pas un passage
                    obligé : le préchargement ne se justifie pas.
                -->
                <NuxtLink to="/configurateur" :prefetch="false" class="flex justify-between items-center h-full px-2.5 bg-white rounded-lg text-black">
                    Configurateur
                </NuxtLink>

                <NuxtLink class="block md:hidden" to="/" aria-label="Accueil">
                    <img class="w-5 h-auto rounded-none" width="20" height="20" :src="cheminPublic('/assets/svg/logo_picto.svg')" alt="">
                </NuxtLink>

                <button
                    class="flex items-center gap-3 cursor-pointer"
                    type="button"
                    :aria-expanded="menuOpen"
                    aria-controls="sousMenu"
                    @click="menuOpen = !menuOpen"
                >
                    Menu
                    <span class="flex flex-col gap-1.75 *:w-9.5 *:h-px *:bg-white" aria-hidden="true">
                        <span></span>
                        <span></span>
                    </span>
                </button>
            </div>

            <div
                class="flex flex-col justify-between justify-end h-[calc(100vh-60px-46px)] p-5 overflow-hidden"
                :class="menuOpen ? 'pointer-events-auto' : 'hidden pointer-events-none'"
                id="sousMenu"
            >
                <div class="*:text-[1.3681rem] *:space-y-3 [@media(max-height:840px)]:flex gap-5">
                    <ul class="flex-2/5 mb-15">
                        <li v-for="item in primary" :key="item.id">
                            <NuxtLink :to="item.url" @click="menuOpen = false">{{ item.title }}</NuxtLink>
                        </li>
                    </ul>

                    <ul class="flex-3/5 mb-33">
                        <li v-for="item in secondary" :key="item.id">
                            <NuxtLink :to="item.url" @click="menuOpen = false">{{ item.title }}</NuxtLink>
                        </li>
                    </ul>
                </div>

                <div class="grid grid-cols-5 *:text-base *:font-light">
                    <div class="flex flex-col col-span-2">
                        <a
                            v-for="(link, i) in reseauxSociaux"
                            :key="`rs-${i}`"
                            :href="link.lien"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {{ link.nom }}
                        </a>
                    </div>

                    <div class="col-span-3">
                        <p>adresse:</p>
                        <span v-html="options.adresse_postale"></span>
                    </div>

                    <div class="col-span-2">
                        <p>téléphone:</p>
                        <a v-if="options.numero_de_telephone" :href="`tel:${options.numero_de_telephone}`" class="underline">
                            {{ options.numero_de_telephone }}
                        </a>
                    </div>

                    <div class="col-span-3">
                        <p>mail:</p>
                        <a v-if="options.adresse_email" :href="`mailto:${options.adresse_email}`" class="underline">
                            {{ options.adresse_email }}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </nav>
</template>

<script setup>
const { menus, options } = await useBootstrap()

const primary = computed(() => menus.value.header_menu_primary || [])
const secondary = computed(() => menus.value.header_menu_secondary || [])
const reseauxSociaux = computed(() => options.value.reseaux_sociaux || [])

const menuOpen = ref(false)
const route = useRoute()

// Le menu reste ouvert au changement de page sans ça.
watch(() => route.fullPath, () => {
    menuOpen.value = false
})
</script>
