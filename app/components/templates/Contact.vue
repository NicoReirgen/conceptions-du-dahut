<template>
    <main class="contact pt-45 *:px-5">
        <header class="animate grid grid-cols-12">
            <h1 class="col-span-full md:col-span-10">{{ acf.introduction || content.title }}</h1>
        </header>

        <section class="animate text-[1.3681rem]">
            <div class="contact-items grid grid-cols-12">
                <div class="contact-section-title">
                    <h2>Nous contacter directement</h2>
                </div>

                <div class="col-span-full md:col-span-7 flex flex-col">
                    <a v-if="options.adresse_email" :href="`mailto:${options.adresse_email}`">
                        {{ options.adresse_email }}
                    </a>

                    <a v-if="options.numero_de_telephone" :href="`tel:${options.numero_de_telephone}`">
                        {{ options.numero_de_telephone }}
                    </a>
                </div>
            </div>

            <div class="contact-items grid grid-cols-12">
                <div class="contact-section-title">
                    <h2>Nous trouver</h2>
                </div>

                <div class="col-span-full md:col-span-7 flex flex-col">
                    <p class="mb-5" v-html="options.adresse_postale"></p>

                    <p>{{ options.information_dadresse }}</p>
                </div>
            </div>

            <div class="contact-items grid grid-cols-12">
                <div class="contact-section-title">
                    <h2>Nos réseaux</h2>
                </div>

                <div class="col-span-full md:col-span-7 flex flex-col">
                    <a
                        v-for="(link, index) in options.reseaux_sociaux || []"
                        :key="`reseau-${index}`"
                        :href="link.lien"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {{ link.label }} - {{ link.nom_de_la_page }}
                    </a>
                </div>
            </div>
        </section>

        <section class="animate">
            <div class="grid grid-cols-12">
                <div class="col-span-full lg:col-span-4">
                    <div class="mb85 sticky top-40">
                        <h2 class="mb85">Utilisez le formulaire de contact.</h2>

                        <p class="pr-11.5">
                            Nous nous engageons à vous répondre dans les plus brefs délais si votre
                            formulaire est complet.
                        </p>
                    </div>
                </div>

                <div class="hidden lg:block lg:col-span-1"></div>

                <div class="col-span-full lg:col-span-6">
                    <form class="w-full" novalidate @submit.prevent="submit">
                        <h3 class="mb-8.75">Vos coordonnées</h3>

                        <div class="w-full grid grid-cols-2 gap-x-5 gap-y-5.5 mb-12.5">
                            <label class="col-span-1" for="contact-nom">
                                <span class="sr-only">Nom</span>
                                <input id="contact-nom" v-model="form.nom" class="w-full" type="text" name="nom" placeholder="Nom" required>
                            </label>

                            <label class="col-span-1" for="contact-prenom">
                                <span class="sr-only">Prénom</span>
                                <input id="contact-prenom" v-model="form.prenom" class="w-full" type="text" name="prenom" placeholder="Prénom" required>
                            </label>

                            <label class="col-span-1" for="contact-email">
                                <span class="sr-only">Email</span>
                                <input id="contact-email" v-model="form.email" class="w-full" type="email" name="email" placeholder="Email" required>
                            </label>

                            <label class="col-span-1" for="contact-telephone">
                                <span class="sr-only">Téléphone</span>
                                <input id="contact-telephone" v-model="form.telephone" class="w-full" type="tel" name="telephone" placeholder="Téléphone" required>
                            </label>
                        </div>

                        <h3 class="mb-5">Votre projet&nbsp;?</h3>

                        <label for="contact-message">
                            <span class="sr-only">Votre message</span>
                            <textarea id="contact-message" v-model="form.message" class="w-full mb-8.75" name="message" required></textarea>
                        </label>

                        <div class="flex items-start gap-3">
                            <input id="contact-consent" v-model="form.consent" type="checkbox" required>

                            <label for="contact-consent" class="flex-1 text-base">
                                J'accepte que mes informations soient utilisées pour être recontacté.
                            </label>

                            <button
                                type="submit"
                                class="underline disabled:opacity-50"
                                :disabled="pending"
                            >
                                {{ pending ? 'Envoi…' : 'Envoyer' }}
                            </button>
                        </div>

                        <p v-if="errors.length" class="mt-5 text-base" role="alert">
                            {{ errors.join(' ') }}
                        </p>

                        <p v-if="sent" class="mt-5 text-base" role="status">
                            Votre message a été envoyé. Nous vous répondrons dans les plus brefs délais.

                            <span v-if="MENTION_VITRINE" class="block mt-2 text-[0.6875rem] opacity-60">
                                {{ TEXTE_VITRINE }}
                            </span>
                        </p>
                    </form>
                </div>
            </div>
        </section>

        <section class="animate">
            <div class="grid grid-cols-3">
                <div class="col-span-full lg:col-span-1">
                    <h2 class="sticky top-40">FAQ</h2>
                </div>

                <div class="col-span-full lg:col-span-2">
                    <details
                        v-for="(item, index) in acf.questions_de_la_faq || []"
                        :key="`faq-${index}`"
                        class="relative group transition"
                    >
                        <summary class="flex justify-between items-center min-h-15 py-3.75 mb-5 gap-5 cursor-pointer">
                            <h3 class="w-[calc((100%-(20px*7))/8*6+(20px*6))] pl-5 font-normal">
                                {{ item.question }}
                            </h3>

                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="8"
                                viewBox="0 0 12 8"
                                fill="none"
                                aria-hidden="true"
                                class="transition-transform duration-300 group-open:rotate-90 shrink-0"
                            >
                                <path
                                    d="M11.4147 4.41016C11.6071 4.21492 11.6025 3.89837 11.4045 3.70312L8.1763 0.521479C7.97821 0.326237 7.66162 0.326237 7.4692 0.521479C7.27677 0.716721 7.28136 1.03327 7.47946 1.22851L10.3489 4.05664L7.56153 6.88477C7.36911 7.08001 7.3737 7.39656 7.57179 7.5918C7.76989 7.78704 8.08647 7.78704 8.2789 7.5918L11.4147 4.41016ZM0.950614 4.55659H11.0633L11.0488 3.55669H0.936105L0.950614 4.55659Z"
                                    fill="currentColor"
                                />
                            </svg>
                        </summary>

                        <p class="pl-5 mb-12.5">{{ item.reponse }}</p>
                    </details>
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

const { options } = await useBootstrap()

const { form, errors, pending, sent, submit } = useContactForm()
</script>
