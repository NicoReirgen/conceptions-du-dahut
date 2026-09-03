<template>
	<a class="logoLink" href="/" target="_blank">
		<img :src="cheminPublic('/assets/svg/logo_full.svg')" alt="Les Conceptions du Dahut" />
	</a>
    <VanImage
		:src="finalImageUrl"
		alt="Aperçu de la configuration"
		class="choice-preview"
		priority
		@error="handlePreviewImageError"
	/>

	<div class="van-configurator" :class="{ 'form-hidden': !isFormVisible }">
		<Header 
			:show-toggle-button="true" 
			:is-form-visible="isFormVisible"
			@toggle-form="toggleFormVisibility" 
		/>
		<ProgressBar :steps="allSteps" :current-step="currentStep" />
		<Breadcrumb :steps="allSubSteps" :current-step="currentStep" />
		<!--
			`select-option` et `update-options` portent la même forme
			{ key, value } et sont donc traités par le même gestionnaire.
			Le premier n'était écouté par personne : les champs `select` et
			`unique` écrivaient directement dans le prop pour compenser.
		-->
		<StepContent
			ref="stepContentRef"
			:step-data="currentStepData"
			:vehicles="vehicles"
			:selected-vehicle="selectedVehicle"
			:selected-options="selectedOptions"
			:total-price="totalPrice"
			:vehicle-steps="vehicleSteps"
			@select-vehicle="handleSelectVehicle"
			@update-options="handleUpdateOptions"
			@select-option="handleUpdateOptions"
			@update-openings-quantity="handleUpdateOpeningsQuantity"
			@increment-openings-quantity="handleIncrementOpeningsQuantity"
			@decrement-openings-quantity="handleDecrementOpeningsQuantity"
		/>
		<Navigation
			:current-step="currentStep"
			:total-steps="allSteps.length"
			:can-proceed="canProceed"
			:is-last-step="isLastStep"
			@next="currentStep++"
			@previous="handlePrevious"
			@finish="finishConfiguration"
		/>
		<Footer :total-price="totalPrice" />

		<!--
			Région d'annonces. Hors de l'écran mais lue par les lecteurs d'écran :
			elle porte les changements de prix et l'apparition d'un choix
			obligatoire, deux informations qui n'existaient qu'à l'œil.
		-->
		<p class="annonces" role="status" aria-live="polite">{{ annonce }}</p>
	</div>
	
	<!-- Bouton pour revenir au configurateur -->
	<button 
		v-if="!isFormVisible"
		class="mobile-show-tab" 
		@click="toggleFormVisibility"
		title="Revenir au configurateur"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<!-- Flèche vers le haut pour mobile, vers la gauche pour desktop -->
			<path d="M18 15l-6-6-6 6" class="mobile-arrow"/>
			<path d="M15 18l-6-6 6-6" class="desktop-arrow"/>
		</svg>
		<span class="show-text">Configurateur</span>
	</button>
	
	<!--
		Débogueur Orion. La condition ne portait que sur le véhicule : le
		panneau s'affichait donc aussi aux visiteurs, et son code partait dans
		le bundle publié. `import.meta.dev` est remplacé par `false` à la
		compilation, ce qui l'en retire entièrement.
	-->
	<OrionImageDebugger
		v-if="estEnDeveloppement && selectedVehicle?.id === 'orion'"
		:selected-options="selectedOptions"
		:selected-vehicle="selectedVehicle"
		:vehicle-steps="selectedVehicle?.steps || []"
	/>
</template>

<script setup>
import { configuratorLogic, configuratorService } from '~~/app/composables/useConfigurator';
import { useVehicleImages } from '~~/app/composables/useVehicleImages';
import { champsDuVehicule, useEtapesVehicule } from '~~/app/composables/useEtapesVehicule';
import Header from './Header.vue';
import ProgressBar from './ProgressBar.vue';
import Navigation from './Navigation.vue';
import StepContent from './StepContent.vue';
import Footer from './Footer.vue';
import Breadcrumb from './Breadcrumb.vue';
/*
   L'import est lui aussi conditionné : `import.meta.dev` vaut littéralement
   `false` après compilation, le bundler supprime alors la branche et le
   composant ne rejoint jamais les fichiers publiés.
*/
const estEnDeveloppement = import.meta.dev;
const OrionImageDebugger = estEnDeveloppement
	? defineAsyncComponent(() => import('./OrionImageDebugger.vue'))
	: null;
import VanImage from './VanImage.vue';

// Déclaration des refs
const vehicles = ref([]);
const selectedVehicle = ref(null);
const currentStep = ref(1);
const selectedOptions = ref({});
const vehicleSteps = ref([]);
const totalPrice = ref(0);

const { message: annonce, annoncer } = useAnnonce();

/*
   Le prix vit dans un pied de page, loin de l'option qu'on vient de cocher.
   On le redit à chaque variation — c'est le retour principal du configurateur.
*/
watch(totalPrice, (nouveau, ancien) => {
	if (nouveau === ancien) return;
	annoncer(`Prix total : ${configuratorLogic.formatPrice(nouveau)}`);
});

// Référence au composant StepContent pour accéder au formulaire de contact
const stepContentRef = ref(null);

// Gestion responsive du formulaire
const isFormVisible = ref(true);

// Force refresh pour l'image d'aperçu (utile pour les images détectées après le fallback)
const forceImageRefresh = ref(0);

// Utiliser le nouveau système d'images universel
const { getVehicleImageSync, repliSuivant } = useVehicleImages();

// Référence réactive pour l'image de prévisualisation
const finalImageUrl = ref('');

/** Dernier recours, quand même les replis manquent. */
const IMAGE_DE_BASE = cheminPublic('/assets/images/orion/orion-base.jpg');

// Fonction pour basculer la visibilité du formulaire sur mobile
const toggleFormVisibility = () => {
    isFormVisible.value = !isFormVisible.value;
};

/*
   La traduction des étapes du catalogue en écrans du tunnel vit désormais dans
   `useEtapesVehicule`, avec ses tests. Les noms sont conservés tels que le
   gabarit les emploie.
*/
const {
    etapesAPlat: flatVehicleSteps,
    etapeCourante: currentStepData,
    estDerniereEtape: isLastStep,
    nombreDEtapes: totalSteps,
    toutesLesEtapes: allSteps,
    toutesLesSousEtapes: allSubSteps,
} = useEtapesVehicule(vehicleSteps, selectedVehicle, currentStep);

// Réinitialiser les sélections quand on retourne à l'étape 1
watch(currentStep, (newStep) => {
	if (newStep === 1) {
		selectedVehicle.value = null;
		selectedOptions.value = {};
		vehicleSteps.value = [];
	}
});

/*
   Charger les véhicules au montage.

   Le catalogue passait par `$fetch('/api/configurator/vehicles')`. Or cette
   route n'est qu'un relais vers `configuratorService`, dont les données sont
   un tableau constant déjà présent dans le bundle client. Sur un site
   entièrement prégénéré il n'y a aucun serveur pour y répondre : la requête
   retournait 404 et l'étape 1 restait vide.

   Appeler le service directement supprime la requête et rend le configurateur
   indépendant de l'hébergeur.
*/
onMounted(async () => {
	try {
		vehicles.value = await configuratorService.getAllVehicles();

		// Initialiser l'image de base
		finalImageUrl.value = getVehicleImageSync({}, 'orion', []);
	} catch (error) {
		console.error('Chargement des véhicules impossible :', error);
	}
	
	// Écouter les événements de mise à jour d'image
	window.addEventListener('vehicle-image-updated', handleVehicleImageUpdate);
});

/*
   Repli d'aperçu.

   Le système d'images vérifiait auparavant l'existence du fichier avant de
   l'afficher, en le téléchargeant entièrement — 41 Ko de JPEG par changement
   d'option, jamais montrés, avant les 26 Ko d'AVIF réellement affichés. C'est
   désormais l'échec de chargement qui déclenche le repli : gratuit quand le
   fichier est là, et `<VanImage>` portait déjà le `@error` qu'il fallait.

   La mémoire des tentatives est indispensable : l'ancienne version écartait
   simplement l'image courante de la liste, si bien que deux replis en échec se
   renvoyaient la balle indéfiniment.
*/
const repliesEssayes = new Set();

const handlePreviewImageError = () => {
    repliesEssayes.add(finalImageUrl.value);

    const suivant = repliSuivant([...repliesEssayes]);

    if (suivant) {
        finalImageUrl.value = suivant;
        return;
    }

    if (!repliesEssayes.has(IMAGE_DE_BASE)) {
        finalImageUrl.value = IMAGE_DE_BASE;
    }
};

const canProceed = computed(() => {
    if (currentStepData.value.type === 'vehicle') {
        return !!selectedVehicle.value;
    }

    if (currentStepData.value.type === 'contact') {
        // Pour l'étape de contact, vérifier la validité du formulaire
        if (stepContentRef.value) {
            const isValid = stepContentRef.value.getContactFormValidity();
            const isSubmitting = stepContentRef.value.getContactFormSubmitting();
            return isValid && !isSubmitting;
        }
        return false;
    }

    if (currentStepData.value.type === 'group' && currentStepData.value.fields) {
        return currentStepData.value.fields.every((field) =>
            configuratorLogic.champLaissePasser(
                field,
                selectedOptions.value[field.key],
                (v) => { selectedOptions.value[field.key] = v; }
            )
        );
    }

    return true;
});

// Prix de base
const basePrice = computed(() => selectedVehicle.value?.price || 0);

// Calcul du prix total
const calculateTotalPrice = () => {
    const total = basePrice.value + flatVehicleSteps.value.reduce((total, step) => {
        if (step.type !== 'group') return total;
        return total + (step.fields || []).reduce((fieldTotal, field) => {
            const value = selectedOptions.value[field.key];
            return fieldTotal + configuratorLogic.calculateFieldPrice(field, value);
        }, 0);
    }, 0);
    return total;
};

// Watcher pour recalculer le prix
watch(selectedOptions, () => {
    totalPrice.value = calculateTotalPrice();
}, { deep: true });


/*
   Image d'aperçu.

   C'était un `computed` qui écrivait dans `finalImageUrl` et lançait une
   promesse — deux effets de bord dans un calcul censé être pur. Personne ne
   lisait sa valeur : son unique consommateur était un `watch` posé sur lui,
   qui réécrivait ce que le calcul venait déjà d'écrire. Un observateur déguisé
   en calcul, doublé d'un vrai observateur.

   Vue n'offre aucune garantie sur le moment où un `computed` est évalué, ni sur
   le nombre de fois : c'est le genre de montage qui tient jusqu'au jour où il
   ne tient plus.

   Réécrit en observateur, ce qu'il a toujours été. Il n'a plus rien
   d'asynchrone depuis que la vérification d'existence a disparu : le jeton de
   course qui départageait deux résolutions concurrentes n'a plus d'objet.
*/
const rafraichirApercu = () => {
    repliesEssayes.clear();

    finalImageUrl.value = selectedVehicle.value
        ? getVehicleImageSync(selectedOptions.value, selectedVehicle.value.id, vehicleSteps.value)
        : getVehicleImageSync({}, 'orion', []);
};

/*
   `deep` — sans quoi l'aperçu ne changeait jamais.

   `selectedOptions` est une référence vers un objet modifié en place :
   `selectedOptions.value[cle] = valeur`. Vue compare les sources par identité,
   et l'objet reste le même — l'observateur ne partait donc qu'au changement de
   véhicule. Le système d'images calculait le bon chemin à chaque choix, le
   panneau de débogage l'affichait, et l'image restait celle de l'étape 1.

   L'observateur des prix, dix lignes plus haut, était `deep` depuis toujours :
   c'est pourquoi le prix suivait et pas l'image.
*/
watch(
    [selectedVehicle, selectedOptions, vehicleSteps, forceImageRefresh],
    rafraichirApercu,
    { immediate: true, deep: true }
);

// Computed property pour toutes les sous-étapes
// Sélectionner un véhicule
const handleSelectVehicle = async (vehicle, skipStepReset = false) => {
    selectedVehicle.value = vehicle;
    vehicleSteps.value = vehicle.steps;
    selectedOptions.value = {};
    if (!skipStepReset) {
        currentStep.value = 1;
    }
    
    // Les champs qui déclarent une option par défaut partent avec elle.
    for (const champ of champsDuVehicule(vehicle.steps)) {
        if (!configuratorLogic.hasDefaultOption(champ)) continue;

        const defaut = configuratorLogic.initializeDefaultSelection(champ);
        if (defaut.length > 0) {
            selectedOptions.value[champ.key] = defaut;
        }
    }
};

// Gérer la mise à jour des options
const handleUpdateOptions = (event) => {
    if (!currentStepData.value?.fields) {
        return;
    }

    const field = currentStepData.value.fields.find(f => f.key === event.key);
    if (!field) {
        return;
    }
    
    // Les composants de champs gèrent déjà leur logique interne (options par défaut, etc.)
    // Il suffit de mettre à jour la valeur
    selectedOptions.value[event.key] = event.value;
};

// Gestion de la navigation précédente
const handlePrevious = () => {
    if (currentStep.value <= 1) return;
    
    if (currentStepData.value?.fields) {
        currentStepData.value.fields.forEach(field => {
            delete selectedOptions.value[field.key];
        });
    }
    
    currentStep.value--;
};

/*
   Gestion des quantités d'ouvrants.

   Les trois gestionnaires partageaient huit lignes de préambule — retrouver le
   champ, lui créer une valeur, lui créer une table de quantités — pour ne
   différer que sur leur dernière ligne.

   La clé du champ est écrite en dur, comme dans la version d'origine : c'est le
   seul champ de type `openings` du catalogue.
*/
const tableDesQuantites = () => {
    const champ = currentStepData.value?.fields?.find(f => f.key === 'ouvertures.fenetres');
    if (!champ) return null;

    if (!selectedOptions.value[champ.key]) {
        selectedOptions.value[champ.key] = { quantities: {}, optional: false, painting: false };
    }
    if (!selectedOptions.value[champ.key].quantities) {
        selectedOptions.value[champ.key].quantities = {};
    }

    return { champ, quantites: selectedOptions.value[champ.key].quantities };
};

/** Les bornes déclarées par une option d'ouvrant. */
const bornesDeLOuvrant = (champ, optionKey) => {
    const option = champ.options.main.options.find(opt => opt.key === optionKey);

    return { min: option?.quantity?.min || 0, max: option?.quantity?.max || Infinity };
};

const handleUpdateOpeningsQuantity = ([optionKey, quantity]) => {
    const ouvrants = tableDesQuantites();
    if (!ouvrants) return;

    ouvrants.quantites[optionKey] = quantity;
};

const handleIncrementOpeningsQuantity = (optionKey) => {
    const ouvrants = tableDesQuantites();
    if (!ouvrants) return;

    const courante = ouvrants.quantites[optionKey] || 0;

    if (courante < bornesDeLOuvrant(ouvrants.champ, optionKey).max) {
        ouvrants.quantites[optionKey] = courante + 1;
    }
};

const handleDecrementOpeningsQuantity = (optionKey) => {
    const ouvrants = tableDesQuantites();
    if (!ouvrants) return;

    const courante = ouvrants.quantites[optionKey] || 0;

    if (courante > bornesDeLOuvrant(ouvrants.champ, optionKey).min) {
        ouvrants.quantites[optionKey] = courante - 1;
    }
};

// Helper function pour obtenir la valeur du modèle
const getModelValue = (fieldKey, fieldType) => {
    if (!selectedOptions.value[fieldKey]) {
        switch (fieldType) {
            case 'unique':
                selectedOptions.value[fieldKey] = { main: null, sub: null };
                break;
            case 'multiple':
                // Vérifier s'il faut initialiser avec une option par défaut
                const field = findFieldByKey(fieldKey);
                if (field && configuratorLogic.hasDefaultOption(field)) {
                    selectedOptions.value[fieldKey] = configuratorLogic.initializeDefaultSelection(field);
                } else {
                    selectedOptions.value[fieldKey] = [];
                }
                break;
            case 'select':
                selectedOptions.value[fieldKey] = null;
                break;
            case 'openings':
                selectedOptions.value[fieldKey] = { quantities: {}, optional: false, painting: false };
                break;
            case 'deep_multiple':
                selectedOptions.value[fieldKey] = { mainOptions: [], deepOptions: {}, subDeepOptions: {} };
                break;
            default:
                selectedOptions.value[fieldKey] = null;
        }
    }
    return selectedOptions.value[fieldKey];
};

provide('getModelValue', getModelValue);

// Helper pour trouver un champ par sa clé
const findFieldByKey = (fieldKey) =>
    champsDuVehicule(vehicleSteps.value).find((champ) => champ.key === fieldKey) || null;

// Chaque champ reçoit la valeur vide de son type dès l'entrée dans le véhicule.
watch(vehicleSteps, (etapes) => {
    for (const champ of champsDuVehicule(etapes)) {
        if (!selectedOptions.value[champ.key]) {
            getModelValue(champ.key, champ.type);
        }
    }
}, { immediate: true });

// Finaliser la configuration
const finishConfiguration = async () => {
    
    // Si on est sur l'étape de contact, soumettre le formulaire
    if (currentStepData.value.type === 'contact') {
        if (stepContentRef.value) {
            try {
                // Le formulaire affiche lui-même sa confirmation et ses erreurs.
                await stepContentRef.value.submitContactForm();
            } catch (error) {
                console.error('❌ Erreur inattendue:', error);
            }
        }
    } else {
        // Pour les autres étapes, comportement normal
        currentStep.value = totalSteps.value;
    }
};

// Écouter les événements de mise à jour d'image
const handleVehicleImageUpdate = () => {
    // Le détail de l'événement n'est pas lu : seul le signal compte.
    forceImageRefresh.value++;
};

onUnmounted(() => {
    // Nettoyer l'écouteur d'événement
    window.removeEventListener('vehicle-image-updated', handleVehicleImageUpdate);
});
</script>

<style scoped>
    .logoLink {
        position: absolute;
        top: 1.25rem;
        left: 1.25rem;
        z-index: 500;

        /*
           Le logo est blanc et se détache sur l'aperçu du véhicule. Sur les
           vues extérieures — équipements extérieurs, 7/7 — ce fond devient
           clair et le logo disparaît, à certaines largeurs seulement, selon
           l'endroit où l'image se recadre.

           Une ombre portée suit la forme du tracé et le détache quel que soit
           le fond, sans lui ajouter de cartouche qui alourdirait le coin.
        */
        filter: drop-shadow(0 0 1px rgba(0, 0, 0, .65))
                drop-shadow(0 1px 3px rgba(0, 0, 0, .5))
                drop-shadow(0 0 12px rgba(0, 0, 0, .3));
    }

    /*
       Masquage visuel sans retrait de l'arbre d'accessibilité : `display: none`
       ou `visibility: hidden` empêcheraient la lecture. On réduit la boîte à un
       pixel et on découpe son contenu.
    */
    .annonces {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
    }

    .van-configurator {
        display: flex;
        flex-direction: column;

        /*
           Le panneau est blanc, mais le texte héritait du blanc du site :
           « Orion », le seul véhicule sélectionnable, était invisible. La
           couleur est posée ici, sur la surface claire, et non sur la page —
           l'aperçu du véhicule à gauche garde la sienne.
        */
        color: #000;

        width: calc(100vw - 2.5rem);

        /* Fallback avec vh pour les navigateurs qui ne supportent pas dvh */
        height: calc(100vh - 2.5rem);

        /* Avec dvh */
        height: calc(100dvh - 2.5rem);

        padding: 1.25rem;
        padding-bottom: 0;

        background: #FFF;

        /*
           Le rayon du site — 10 px, celui de la navigation, de la modale de
           devis et des encadrés. Le panneau est une surface posée sur l'aperçu
           du véhicule, comme la modale l'est sur la page.

           `overflow: hidden` pour que le contenu qui défile, et le pied de page
           collé au bord bas, respectent les coins.
        */
        border-radius: 10px;
        overflow: hidden;

        box-shadow: 4px 8px 20px 0px rgba(0, 0, 0, 0.25);
        
        position: absolute;
        right: 1.25rem;
        top: 1.25rem;
        z-index: 1000;

        transition: transform 0.3s ease;

        transform: translateX(0);

        /* Mobile - Le formulaire descend vers le bas au lieu de glisser à droite */
        @media (max-width: 768px) {
            &.form-hidden {
                transform: translateY(50vh); /* Descend de 50vh au lieu de glisser à droite */
                opacity: 0.5; /* Semi-transparent quand masqué */
                pointer-events: none; /* Inactif - empêche les interactions */
            }
        }

        /* Desktop - Comportement original (glisse à droite) */
        @media (min-width: 769px) {
            width: 40vw;
            min-width: 33.75rem;
            
            &.form-hidden {
                transform: translateX(100%);
            }
        }
    }

    /*
       L'aperçu vit dans <VanImage>, qui l'enveloppe d'un <picture> pour servir
       de l'AVIF. Le style est scopé : il faut :deep() pour l'atteindre. Le
       <picture> est en `display: contents`, donc transparent à la mise en page,
       qui reste identique.
    */
    :deep(.choice-preview) {
        height: 50vh;
        width: 100vw;

        object-fit: cover;
        object-position: center left;

        @media (width > 768px) {
            height: 100vh;
            height: 100dvh;
            object-position: center;
        }
    }

    .mobile-show-tab {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: .5rem;

        padding: .5rem .75rem;

        background: #2ecc71;
        border: none;
        color: #fff;
        font-size: 0.75rem; 
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;

        position: fixed;
        z-index: 1002;

        cursor: pointer;
        transition: all 0.3s ease;

        /* Mobile - Bouton centré en bas pour l'accessibilité au pouce */
        @media (max-width: 768px) {
            bottom: 1.5rem; /* En bas de l'écran pour l'accessibilité au pouce */
            left: 50%;
            transform: translateX(-50%);
            
            border-radius: 2rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            
            /* Afficher seulement la flèche vers le haut */
            .desktop-arrow {
                display: none;
            }
            
            .mobile-arrow {
                display: block;
            }
        }

        /* Desktop - Bouton sur le côté droit comme avant */
        @media (min-width: 769px) {
            top: 2.5rem;
            right: 0;
            transform: translateX(20%);
            
            border-radius: .25rem 0 0 .25rem;
            box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.2);
            
            /* Afficher seulement la flèche vers la gauche */
            .mobile-arrow {
                display: none;
            }
            
            .desktop-arrow {
                display: block;
            }
            
            &:hover {
                min-width: auto;
                padding-right: 1.25rem;
                background: #27ae60;
                transform: translateX(0);

                .show-text {
                    width: auto;
                    opacity: 1;
                }
            }
            
            /* Masquer en desktop quand formulaire visible */
            display: none;
        }

        .show-text {
            /* Mobile - texte toujours visible */
            @media (max-width: 768px) {
                width: auto;
                opacity: 1;
            }

            /* Desktop - texte au hover */
            @media (min-width: 769px) {
                width: 0;
                opacity: 0;
                overflow: hidden;
                transition: opacity 0.3s ease 0.1s;
            }
        }
    }
</style>