<template>
    <div
        v-if="open"
        class="devis-modal grid grid-cols-12 py-5 fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="devis-title"
        @keydown.esc="close"
    >
        <div class="absolute inset-0 bg-black/50" @click="close"></div>

        <div class="col-span-full sm:col-span-9 sm:col-start-4 md:col-span-6 md:col-start-7 xl:col-span-4 xl:col-start-9 bg-white rounded-[10px] z-10 relative overflow-y-auto">
            <div class="flex justify-between items-center mb-5 absolute top-5 right-5">
                <button ref="closeButton" type="button" aria-label="Fermer" @click="close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M18 6L6 18M6 6L18 18" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>

            <form
                class="flex flex-col h-full space-y-9.25 px-5 py-7.5 **:data-title:text-[1rem] **:data-title:font-light"
                novalidate
                @submit.prevent="submit"
            >
                <ol class="progress-bar flex gap-3.5 *:text-[0.625rem] *:font-light *:uppercase *:h-3.5 *:border-b-[.5px] *:border-l-[.5px] *:border-b-black *:border-l-black *:rounded-bl-[2px] *:px-[6px]">
                    <li v-for="(label, index) in STEPS" :key="label" :class="index === step ? 'active font-medium' : ''">
                        {{ label }}
                    </li>
                </ol>

                <div>
                    <h2 id="devis-title" class="text-xl font-medium">Demande de devis</h2>
                </div>

                <!-- Étape 1 : le projet -->
                <div v-show="step === 0" class="flex-1 space-y-9.25">
                    <div class="flex gap-2.5">
                        <label data-title class="flex-2/5" for="vehicule">Votre véhicule*</label>

                        <select id="vehicule" v-model="form.vehicule" class="flex-3/5" required>
                            <option value="">Sélectionnez un véhicule</option>
                            <option v-for="v in VEHICULES" :key="v" :value="v">{{ v }}</option>
                        </select>
                    </div>

                    <DevisRadioGroup
                        v-model="form.usage_professionnel"
                        name="usage_professionnel"
                        legend="Est-ce pour un usage professionnel ?*"
                        :options="['Oui', 'Non']"
                    />

                    <DevisRadioGroup
                        v-model="form.type_voyage"
                        name="type_voyage"
                        legend="Type de voyage*"
                        :options="TYPES_VOYAGE"
                    />

                    <DevisRadioGroup
                        v-model="form.nombre_personnes"
                        name="nombre_personnes"
                        legend="Nombre de personnes*"
                        :options="NOMBRE_PERSONNES"
                    />

                    <div class="flex flex-col gap-5">
                        <label data-title class="w-1/2" for="description">
                            Décrivez votre projet en quelques mots*
                        </label>

                        <textarea
                            id="description"
                            v-model="form.description"
                            placeholder="Décrivez votre projet en quelques mots"
                            required
                        ></textarea>
                    </div>

                    <div class="flex gap-2.5">
                        <label data-title class="flex-2/5" for="photos">
                            Envoyez des photos d'inspiration
                        </label>

                        <div class="flex-3/5">
                            <label for="photos" class="file-input-label">
                                <span class="text-[0.625rem]">Choisir des fichiers</span>
                            </label>

                            <input
                                id="photos"
                                type="file"
                                accept="image/*"
                                multiple
                                class="hidden"
                                @change="onPhotos"
                            >

                            <div class="file-name">{{ form.photos }}</div>
                        </div>
                    </div>
                </div>

                <!-- Étape 2 : les spécificités -->
                <div v-show="step === 1" class="flex-1 space-y-9.25">
                    <DevisRadioGroup
                        v-model="form.isolation"
                        name="isolation"
                        legend="Isolation*"
                        :options="ISOLATIONS"
                    />

                    <DevisRadioGroup
                        v-model="form.parements_plafond_sol"
                        name="parements_plafond_sol"
                        legend="Parements / Plafond / Sol*"
                        :options="PAREMENTS"
                    />
                </div>

                <!-- Étape 3 : les coordonnées -->
                <div v-show="step === 2" class="flex-1 space-y-9.25">
                    <div v-for="champ in COORDONNEES" :key="champ.name" class="flex gap-2.5">
                        <label data-title class="flex-2/5" :for="champ.name">{{ champ.label }}*</label>

                        <input
                            :id="champ.name"
                            v-model="form[champ.name]"
                            class="flex-3/5"
                            :type="champ.type"
                            :placeholder="champ.label"
                            required
                        >
                    </div>
                </div>

                <p v-if="errors.length" class="text-black text-base" role="alert">
                    {{ errors.join(' ') }}
                </p>

                <div class="flex justify-between flex-row-reverse">
                    <button
                        v-if="step < STEPS.length - 1"
                        type="button"
                        class="flex items-center gap-2.5 underline"
                        @click="next"
                    >
                        Étape suivante
                        <DevisArrow />
                    </button>

                    <button
                        v-else
                        type="submit"
                        class="flex items-center gap-2.5 underline disabled:opacity-50"
                        :disabled="pending"
                    >
                        {{ pending ? 'Envoi…' : 'Envoyer' }}
                        <DevisArrow />
                    </button>

                    <button
                        v-if="step > 0"
                        type="button"
                        class="flex items-center gap-2.5 underline"
                        @click="step -= 1"
                    >
                        Étape précédente
                        <DevisArrow class="rotate-180" />
                    </button>
                </div>
            </form>
        </div>
    </div>

    <div v-if="sent" class="fixed inset-0 z-[60]" role="status">
        <div class="absolute inset-0 bg-black/50" @click="sent = false"></div>

        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[10px] p-5 min-w-[300px]">
            <div class="mb-5">
                <h3 class="text-xl font-medium text-black">Demande envoyée</h3>
            </div>
            <p class="text-base font-light text-black">
                Merci, nous revenons vers vous dans les plus brefs délais.
            </p>

            <p v-if="MENTION_VITRINE" class="mt-2 text-[0.6875rem] font-light text-black/55">
                {{ TEXTE_VITRINE }}
            </p>
        </div>
    </div>
</template>

<script setup>
const open = defineModel({ type: Boolean, default: false })

const STEPS = ['Votre projet', 'Spécificités', 'Vos coordonnées']
const VEHICULES = ['Voiture', 'Moto', 'Camion', 'Autre']
const TYPES_VOYAGE = ['Week end', 'Occasionnel', 'Saisonnier', "A l'année"]
const NOMBRE_PERSONNES = ['1', '2', '3', '4 et plus']
const ISOLATIONS = [
    'Finition feutrine',
    'Liège projeté',
    'Isolation complète standard',
    'Isolation complète haut de gamme',
]
const PAREMENTS = ['Contreplaqué peuplier', 'Contreplaqué bouleau', 'Autre sol']
const COORDONNEES = [
    { name: 'nom', label: 'Votre nom', type: 'text' },
    { name: 'prenom', label: 'Votre prénom', type: 'text' },
    { name: 'email', label: 'Votre email', type: 'email' },
    { name: 'telephone', label: 'Votre téléphone', type: 'tel' },
]

// Champs requis par étape : la validation se fait au passage à l'étape suivante,
// comme dans le formulaire d'origine.
const REQUIRED = [
    ['vehicule', 'usage_professionnel', 'type_voyage', 'nombre_personnes', 'description'],
    ['isolation', 'parements_plafond_sol'],
    ['nom', 'prenom', 'email', 'telephone'],
]

const step = ref(0)
const errors = ref([])
const pending = ref(false)
const sent = ref(false)
const closeButton = ref(null)

const form = reactive({
    vehicule: '',
    usage_professionnel: '',
    type_voyage: '',
    nombre_personnes: '',
    description: '',
    photos: '',
    isolation: '',
    parements_plafond_sol: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
})

// Le formulaire d'origine n'envoyait que les noms de fichiers, jamais leur
// contenu : le champ était traité en texte côté WordPress. On reste fidèle.
const onPhotos = (event) => {
    form.photos = Array.from(event.target.files || [])
        .map((file) => file.name)
        .join(', ')
}

const validateStep = () => {
    const missing = REQUIRED[step.value].filter((name) => !String(form[name]).trim())

    if (missing.length) {
        return ['Merci de renseigner tous les champs obligatoires.']
    }

    if (step.value === 2 && !validationContact.emailValide(form.email)) {
        return ["L'adresse email n'est pas valide."]
    }

    return []
}

const next = () => {
    errors.value = validateStep()
    if (!errors.value.length) {
        step.value += 1
    }
}

const close = () => {
    open.value = false
}

const submit = async () => {
    errors.value = validateStep()
    if (errors.value.length) {
        return
    }

    pending.value = true

    try {
        await envoyerFormulaire('devis', { ...form })

        sent.value = true
        open.value = false
        step.value = 0
        Object.keys(form).forEach((key) => {
            form[key] = ''
        })
    } catch (error) {
        errors.value = [
            error?.data?.message || "L'envoi a échoué. Merci de réessayer dans un instant.",
        ]
    } finally {
        pending.value = false
    }
}

// Le focus doit entrer dans la modale à l'ouverture, et le fond ne doit pas
// défiler derrière.
watch(open, async (isOpen) => {
    if (import.meta.server) return

    document.body.style.overflow = isOpen ? 'hidden' : ''

    if (isOpen) {
        await nextTick()
        closeButton.value?.focus()
    }
})

onUnmounted(() => {
    if (import.meta.client) {
        document.body.style.overflow = ''
    }
})
</script>
