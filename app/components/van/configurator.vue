<template>
	<a class="logoLink" href="/" target="_blank">
		<img src="/assets/svg/logo_full.svg" alt="Les Conceptions du Dahut" />
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
			:is-option-selected="isOptionSelected"
			:is-sub-option-selected="isSubOptionSelected"
			:get-quantity="getQuantity"
			:current-step="currentStep"
			:total-price="totalPrice"
			:vehicle-steps="vehicleSteps"
			@select-vehicle="handleSelectVehicle"
			@update-options="handleUpdateOptions"
			@select-option="handleUpdateOptions"
			@initialize-selected-options="handleInitializeSelectedOptions"
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
import { resumeConfiguration } from '~~/app/composables/useResumeConfiguration';
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
const { getVehicleImageSync, getVehicleImage, getLastFallbacks } = useVehicleImages();

// Référence réactive pour l'image de prévisualisation
const finalImageUrl = ref('');

// Fonction pour basculer la visibilité du formulaire sur mobile
const toggleFormVisibility = () => {
    isFormVisible.value = !isFormVisible.value;
};

// Étapes « plates » (inclut les sous-étapes)
const flatVehicleSteps = computed(() => {
    return vehicleSteps.value.flatMap(step => step.subSteps || step);
});

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

const handlePreviewImageError = () => {
    const fallbackCandidates = getLastFallbacks().filter((url) => url !== finalImageUrl.value);
    if (fallbackCandidates.length > 0) {
        finalImageUrl.value = fallbackCandidates[0];
        return;
    }

    finalImageUrl.value = '/assets/images/orion/orion-base.jpg';
};

// Fonctions utilitaires
const getStepData = (stepIndex) => {
	if (!selectedVehicle.value) {
		return { key: 'model_selection', name: 'choix', type: 'vehicle' };
	}
	
	if (stepIndex === 1) {
		return { key: 'model_selection', name: 'Modèle', type: 'vehicle' };
	}

	let currentIndex = 1;
	for (const step of vehicleSteps.value) {
		if (step.subSteps) {
			const subStepCount = step.subSteps.length;
			if (stepIndex <= currentIndex + subStepCount) {
				const subStepIndex = stepIndex - currentIndex - 1;
				return {
					...step.subSteps[subStepIndex],
					subStepIndex,
					totalSubSteps: subStepCount
				};
			}
			currentIndex += subStepCount;
		} else {
			if (stepIndex === currentIndex + 1) {
				return step;
			}
			currentIndex++;
		}
	}
	
	return null;
};

// Computed properties
const isLastStep = computed(() => {
	return currentStep.value === totalSteps.value;
});

const allSteps = computed(() => {
	if (!selectedVehicle.value) {
		return [{ key: 'model_selection', name: '1. Modèle', type: 'vehicle' }];
	}
	
	return [
		{ key: 'model_selection', name: '1. Modèle', type: 'vehicle' },
		...vehicleSteps.value.map((step, index) => ({
			...step,
			name: `${index + 2}. ${step.name}`
		}))
	];
});

const totalSteps = computed(() => {
	let count = 1;
	vehicleSteps.value.forEach(step => {
		if (step.subSteps) {
			count += step.subSteps.length;
		} else {
			count += 1;
		}
	});
	return count;
});

const currentStepData = computed(() => {
	return getStepData(currentStep.value);
});

const canProceed = computed(() => {
    const currentStepData = getStepData(currentStep.value);

    if (currentStepData.type === 'vehicle') {
        return !!selectedVehicle.value;
    }

    if (currentStepData.type === 'contact') {
        // Pour l'étape de contact, vérifier la validité du formulaire
        if (stepContentRef.value) {
            const isValid = stepContentRef.value.getContactFormValidity();
            const isSubmitting = stepContentRef.value.getContactFormSubmitting();
            return isValid && !isSubmitting;
        }
        return false;
    }

    if (currentStepData.type === 'group' && currentStepData.fields) {
        return currentStepData.fields.every((field) =>
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

   Réécrit en observateur, ce qu'il a toujours été. Le jeton de course règle au
   passage un défaut qui existait déjà : deux résolutions asynchrones pouvaient
   s'écraser dans le désordre, la plus lente ayant le dernier mot.
*/
let derniereDemande = 0;

const rafraichirApercu = async () => {
    const demande = ++derniereDemande;

    if (!selectedVehicle.value) {
        finalImageUrl.value = getVehicleImageSync({}, 'orion', []);
        return;
    }

    const vehicleId = selectedVehicle.value.id;

    // La version synchrone donne tout de suite une image plausible ; la version
    // asynchrone la corrige si le fichier attendu n'existe pas.
    const immediate = getVehicleImageSync(selectedOptions.value, vehicleId, vehicleSteps.value);
    finalImageUrl.value = immediate;

    try {
        const verifiee = await getVehicleImage(selectedOptions.value, vehicleId, vehicleSteps.value);

        // Une sélection plus récente a pris la main entre-temps : on se retire.
        if (demande !== derniereDemande) return;

        if (verifiee !== immediate) finalImageUrl.value = verifiee;
    } catch (error) {
        console.error("Vérification de l'image d'aperçu impossible :", error);
    }
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
const allSubSteps = computed(() => {
    const steps = [{ key: 'model_selection', name: 'Choix produit', type: 'vehicle' }];
    if (!selectedVehicle.value) return steps;

    vehicleSteps.value.forEach(step => {
        if (step.subSteps) {
            steps.push(...step.subSteps);
        } else {
            steps.push(step);
        }
    });

    return steps;
});

// Sélectionner un véhicule
const handleSelectVehicle = async (vehicle, skipStepReset = false) => {
    selectedVehicle.value = vehicle;
    vehicleSteps.value = vehicle.steps;
    selectedOptions.value = {};
    if (!skipStepReset) {
        currentStep.value = 1;
    }
    
    // Initialiser les options par défaut pour tous les champs qui en ont
    if (vehicle.steps) {
        for (const step of vehicle.steps) {
            if (step.subSteps) {
                for (const subStep of step.subSteps) {
                    if (subStep.fields) {
                        for (const field of subStep.fields) {
                            if (configuratorLogic.hasDefaultOption(field)) {
                                const defaultSelection = configuratorLogic.initializeDefaultSelection(field);
                                if (defaultSelection.length > 0) {
                                    selectedOptions.value[field.key] = defaultSelection;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Pré-charger les images pour le véhicule sélectionné
    if (vehicle.id === 'orion') {
        // Le nouveau système d'images universel gère automatiquement le pré-chargement
        // via les fallbacks et l'historique des images validées
    }
};

// Vérifier si une option est sélectionnée
const isOptionSelected = (optionKey) => {
	const stepData = getStepData(currentStep.value);
	if (!stepData) return false;
	
	if (stepData.fields) {
		for (const field of stepData.fields) {
			if (field.type === 'multiple') {
				const selectedFieldOptions = selectedOptions.value[field.key];
				
				if (Array.isArray(selectedFieldOptions)) {
					return selectedFieldOptions.includes(optionKey);
				} else if (typeof selectedFieldOptions === 'object' && selectedFieldOptions.options) {
					return selectedFieldOptions.options.includes(optionKey);
				}
			}
		}
	}
	
	const stepOptions = selectedOptions.value[stepData.key];
	
	if (Array.isArray(stepOptions)) {
		return stepOptions.includes(optionKey);
	} else if (typeof stepOptions === 'object') {
		return stepOptions.main === optionKey || stepOptions.sub === optionKey;
	}
	
	return stepOptions === optionKey;
};

// Vérifier si une sous-option est sélectionnée
const isSubOptionSelected = (mainOptionKey, subOptionKey) => {
	const stepData = getStepData(currentStep.value);
	if (!stepData?.fields) return false;
	
	for (const field of stepData.fields) {
		const fieldOptions = selectedOptions.value[field.key];
		
		if (field.type === 'unique' && typeof fieldOptions === 'object') {
			return fieldOptions.main === mainOptionKey && fieldOptions.sub === subOptionKey;
		} else if (field.type === 'multiple' && typeof fieldOptions === 'object' && fieldOptions.subOptions) {
			const subOptionsList = fieldOptions.subOptions[mainOptionKey];
			return Array.isArray(subOptionsList) && subOptionsList.includes(subOptionKey);
		}
	}
	
	return false;
};

// Gérer la mise à jour des options
const handleUpdateOptions = (event) => {
    const currentStepData = getStepData(currentStep.value);
    if (!currentStepData || !currentStepData.fields) {
        return;
    }

    const field = currentStepData.fields.find(f => f.key === event.key);
    if (!field) {
        return;
    }
    
    // Les composants de champs gèrent déjà leur logique interne (options par défaut, etc.)
    // Il suffit de mettre à jour la valeur
    selectedOptions.value[event.key] = event.value;
    
    totalPrice.value = calculateTotalPrice();
};

// Gestion de la navigation précédente
const handlePrevious = () => {
    if (currentStep.value <= 1) return;
    
    const currentStepData = getStepData(currentStep.value);
    if (currentStepData && currentStepData.fields) {
        currentStepData.fields.forEach(field => {
            delete selectedOptions.value[field.key];
        });
    }
    
    currentStep.value--;
    totalPrice.value = calculateTotalPrice();
};

// Gestion des quantités d'ouvertures
const handleDecrementOpeningsQuantity = (optionKey) => {
    const currentStepData = getStepData(currentStep.value);
    const field = currentStepData?.fields.find(f => f.key === 'ouvertures.fenetres');
    if (!field) return;

    if (!selectedOptions.value[field.key]) {
        selectedOptions.value[field.key] = { quantities: {}, optional: false, painting: false };
    }
    if (!selectedOptions.value[field.key].quantities) {
        selectedOptions.value[field.key].quantities = {};
    }

    const currentQuantity = selectedOptions.value[field.key].quantities[optionKey] || 0;
    const option = field.options.main.options.find(opt => opt.key === optionKey);
    const minQuantity = option?.quantity?.min || 0;

    if (currentQuantity > minQuantity) {
        selectedOptions.value[field.key].quantities[optionKey] = currentQuantity - 1;
    }
};

const handleIncrementOpeningsQuantity = (optionKey) => {
    const currentStepData = getStepData(currentStep.value);
    const field = currentStepData?.fields.find(f => f.key === 'ouvertures.fenetres');
    if (!field) return;

    if (!selectedOptions.value[field.key]) {
        selectedOptions.value[field.key] = { quantities: {}, optional: false, painting: false };
    }
    if (!selectedOptions.value[field.key].quantities) {
        selectedOptions.value[field.key].quantities = {};
    }

    const currentQuantity = selectedOptions.value[field.key].quantities[optionKey] || 0;
    const option = field.options.main.options.find(opt => opt.key === optionKey);
    const maxQuantity = option?.quantity?.max || Infinity;

    if (currentQuantity < maxQuantity) {
        selectedOptions.value[field.key].quantities[optionKey] = currentQuantity + 1;
    }
};

const handleUpdateOpeningsQuantity = ([optionKey, quantity]) => {
    const currentStepData = getStepData(currentStep.value);
    const field = currentStepData?.fields.find(f => f.key === 'ouvertures.fenetres');
    if (!field) return;

    if (!selectedOptions.value[field.key]) {
        selectedOptions.value[field.key] = { quantities: {}, optional: false, painting: false };
    }
    if (!selectedOptions.value[field.key].quantities) {
        selectedOptions.value[field.key].quantities = {};
    }

    selectedOptions.value[field.key].quantities[optionKey] = quantity;
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
const findFieldByKey = (fieldKey) => {
    for (const step of vehicleSteps.value) {
        if (step.subSteps) {
            for (const subStep of step.subSteps) {
                if (subStep.fields) {
                    const field = subStep.fields.find(f => f.key === fieldKey);
                    if (field) return field;
                }
            }
        } else if (step.fields) {
            const field = step.fields.find(f => f.key === fieldKey);
            if (field) return field;
        }
    }
    return null;
};

// Initialiser les options sélectionnées
watch(vehicleSteps, (newSteps) => {
    newSteps.forEach((step) => {
        if (step.subSteps) {
            step.subSteps.forEach((subStep) => {
                if (subStep.fields) {
                    subStep.fields.forEach((field) => {
                        if (!selectedOptions.value[field.key]) {
                            getModelValue(field.key, field.type);
                        }
                    });
                }
            });
        } else if (step.fields) {
            step.fields.forEach((field) => {
                if (!selectedOptions.value[field.key]) {
                    getModelValue(field.key, field.type);
                }
            });
        }
    });
}, { immediate: true });

// Obtenir la quantité pour les options
const getQuantity = (optionId, subOptionId) => {
    if (!currentStepData.value || !currentStepData.value.options) return 0;
    if (!selectedOptions.value[currentStepData.value.key]?.quantities?.[optionId]) return 0;
    if (subOptionId) {
        return selectedOptions.value[currentStepData.value.key].quantities[optionId][subOptionId] || 0;
    }
    return selectedOptions.value[currentStepData.value.key].quantities[optionId] || 0;
};

// Finaliser la configuration
const finishConfiguration = async () => {
    const currentStepData = getStepData(currentStep.value);
    
    // Si on est sur l'étape de contact, soumettre le formulaire
    if (currentStepData.type === 'contact') {
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

// Initialiser les options sélectionnées
const handleInitializeSelectedOptions = ({ key, value }) => {
    if (!Array.isArray(value)) {
        selectedOptions.value[key] = [];
    } else {
        selectedOptions.value[key] = value;
    }
    
    // Gérer l'initialisation des options par défaut
    // Trouver le champ dans les étapes du véhicule actuel
    const currentVehicleSteps = vehicleSteps.value || [];
    let field = null;
    
    for (const step of currentVehicleSteps) {
        if (step.subSteps) {
            for (const subStep of step.subSteps) {
                if (subStep.fields) {
                    field = subStep.fields.find(f => f.key === key);
                    if (field) break;
                }
            }
        }
        if (field) break;
    }
    
    if (field && configuratorLogic.hasDefaultOption(field)) {
        // Si aucune option n'est sélectionnée, initialiser avec l'option par défaut
        if (!selectedOptions.value[key] || selectedOptions.value[key].length === 0) {
            const defaultSelection = configuratorLogic.initializeDefaultSelection(field);
            selectedOptions.value[key] = defaultSelection;
        }
    }
};

// Écouter les événements de mise à jour d'image
const handleVehicleImageUpdate = (event) => {
    const { imageKey, imagePath } = event.detail;
    
    // Forcer le recalcul de l'image d'aperçu
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