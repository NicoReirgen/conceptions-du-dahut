<template>
	<main class="index">
		<header class="animate h-screen mb-42.5 relative">
			<div class="grid grid-cols-12 absolute bottom-11 md:bottom-36.25 px-5 z-1">
				<div class="col-span-full md:col-span-8 md:col-start-5">
					<div class="inline-flex items-center gap-2 h-3.5 mb-3.75 border-l border-b rounded-b-xs text-[0.625rem] uppercase">
						<span class="pl-2">Localisation</span>

						<span class="bg-white rounded-xs px-1.5 text-black">
							{{ acf.localisation_de_la_photo_de_banniere }}
						</span>
					</div>

					<h1 class="mb-5">{{ page.title }}</h1>

					<div class="uppercase text-base/normal" v-html="acf.baseline"></div>
				</div>
			</div>

			<AppImage
				:media="banner"
				:fallback-alt="page.title"
				priority
				sizes="100vw"
				class="h-screen w-full object-cover brightness-50 rounded-none"
			/>
		</header>

		<FrontPageQuiSommesNous :acf="acf" />

		<FrontPageNosRealisations :acf="acf" />

		<FrontPageNosProduits :acf="acf" />

		<FrontPageVideoWrap :acf="acf" />

		<FrontPageLocationVente :acf="acf" />
	</main>
</template>

<script setup>
const page = await useContent('/')

const acf = computed(() => page.value?.acf || {})
const banner = computed(() => page.value?.thumbnail || acf.value.image_dattente || null)

useContentSeo(page)
</script>
