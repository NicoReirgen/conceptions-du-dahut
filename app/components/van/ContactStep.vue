<template>
	<div class="contact-step">
		<h2 tabindex="-1">{{ name }}</h2>

		<form class="contact-form">
			<!--
				Pas d'attribut `placeholder` : il reprenait mot pour mot le libellé
				juste au-dessus, en blanc sur blanc — invisible, et lu deux fois par
				certains lecteurs d'écran. La donnée `field.placeholder` sert encore
				à composer ce libellé et les messages d'erreur.
			-->
			<div v-for="field in content.fields" :key="field.key" class="form-group">
				<label :for="field.key" class="field-label">
					{{ field.placeholder.replace(' *', '') }}
					<span v-if="field.required" class="required-indicator">*</span>
				</label>
				
				<textarea
					v-if="field.type === 'textarea'"
					:id="field.key"
					v-model="formData[field.key]"
					:required="field.required"
					:class="{ 'error': fieldErrors[field.key] }"
					:disabled="isSubmitting"
				></textarea>
				<input
					v-else
					:type="field.type"
					:id="field.key"
					v-model="formData[field.key]"
					:required="field.required"
					:class="{ 'error': fieldErrors[field.key] }"
					:disabled="isSubmitting"
				/>
				
				<!-- Affichage des erreurs de champ -->
				<span v-if="fieldErrors[field.key]" class="field-error">
					{{ fieldErrors[field.key] }}
				</span>
			</div>

			<!--
				Ces deux blocs apparaissaient en silence : aucun rôle, donc aucune
				annonce, et ils tombent sous la ligne de flottaison de l'étape, qui
				défile. On les signale, et on les amène à l'écran (voir `montrer`).
			-->
			<div v-if="submitError" ref="blocErreur" class="submit-error" role="alert">
				{{ submitError }}
			</div>

			<div v-if="submitSuccess" ref="blocSucces" class="submit-success" role="status">
				{{ submitSuccess }}

				<span v-if="MENTION_VITRINE" class="mention-vitrine">{{ TEXTE_VITRINE }}</span>
			</div>

			<!-- Message d'information pour l'utilisateur -->
			<div v-if="isSubmitting" class="submit-info">
				<span class="loading-spinner"></span>
				Envoi en cours...
			</div>
		</form>
	</div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { resumeConfiguration } from '~~/app/composables/useResumeConfiguration';

const props = defineProps({
	content: {
		type: Object,
		required: true
	},
	name: {
		type: String,
		required: true
	},
	selectedVehicle: {
		type: Object,
		default: null
	},
	selectedOptions: {
		type: Object,
		default: () => ({})
	},
	totalPrice: {
		type: Number,
		default: 0
	},
	vehicleSteps: {
		type: Array,
		default: () => []
	}
});

// État du formulaire
const formData = ref({});
const fieldErrors = reactive({});
const isSubmitting = ref(false);
const submitError = ref('');
const submitSuccess = ref('');

/*
   L'étape défile : un message ajouté en bas du formulaire naît hors de vue.
   On l'amène à l'écran dès qu'il paraît.
*/
const blocSucces = ref(null);
const blocErreur = ref(null);

const montrer = async (bloc) => {
	await nextTick();
	bloc.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};

watch(submitSuccess, (v) => v && montrer(blocSucces));
watch(submitError, (v) => v && montrer(blocErreur));


// Validation en temps réel
const isFormValid = computed(() => {
	if (!props.content.fields) return false;
	
	return props.content.fields
		.filter(field => field.required)
		.every(field => {
			const value = formData.value[field.key];
			return value && value.toString().trim().length > 0;
		});
});

// Surveiller les changements de champs pour la validation
watch(formData, (newData) => {
	validateFields(newData);
}, { deep: true });

// Valider les champs individuellement
const validateFields = (data) => {
	// Réinitialiser les erreurs
	Object.keys(fieldErrors).forEach(key => {
		delete fieldErrors[key];
	});

	props.content.fields.forEach(field => {
		const value = data[field.key];
		
		if (field.required && (!value || value.toString().trim().length === 0)) {
			fieldErrors[field.key] = `${field.placeholder.replace(' *', '')} est requis`;
		} else if (field.type === 'email' && value && !validationContact.emailValide(value)) {
			fieldErrors[field.key] = 'Format d\'email invalide';
		} else if (field.type === 'tel' && value && !isValidPhone(value)) {
			fieldErrors[field.key] = 'Format de téléphone invalide';
		}
	});
};

// Valider un numéro de téléphone
const isValidPhone = (phone) => {
	const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
	return phoneRegex.test(phone.replace(/\s/g, ''));
};

/*
   Le configurateur nomme ses champs d'après leur étape — `contact.nom`. Les
   autres formulaires du site postent des noms nus vers ce même point d'entrée
   `devis` : le serveur recevait deux formes pour une seule demande.
*/
const coordonnees = () => Object.fromEntries(
	Object.entries(formData.value).map(([cle, valeur]) => [cle.replace(/^contact\./, ''), valeur])
);

// Méthode publique pour soumettre le formulaire (appelée par le parent)
const submitForm = async () => {
	// Réinitialiser les messages
	submitError.value = '';
	submitSuccess.value = '';

	// Validation finale
	const validation = validationContact.verifier(formData.value);
	if (!validation.valide) {
		submitError.value = validation.erreurs.join(', ');
		return { success: false, error: submitError.value };
	}

	// Vérifier qu'un véhicule est sélectionné
	if (!props.selectedVehicle) {
		submitError.value = 'Aucun véhicule sélectionné';
		return { success: false, error: submitError.value };
	}

	isSubmitting.value = true;

	try {
		/*
		   Une seule expédition.

		   Le formulaire envoyait la demande, puis prévenait le configurateur,
		   qui la renvoyait de son côté — deux `devis` par clic, dont le second
		   enveloppait la charge du premier dans un objet informe.
		*/
		await envoyerFormulaire('devis', {
			...coordonnees(),
			configuration: {
				vehicle: props.selectedVehicle,
				selectedOptions: props.selectedOptions,
				completedSteps: resumeConfiguration(props.vehicleSteps, props.selectedOptions),
				totalPrice: props.totalPrice
			}
		});

		/*
		   `envoyerFormulaire` lève en cas d'échec ; tout ce qui en revient est
		   un succès. Le module guettait un `result.success` que seul le mode
		   vitrine produit : le jour où les messages repartent pour de bon, une
		   demande arrivée à bon port se serait affichée en erreur.
		*/
		submitSuccess.value = 'Votre demande a été envoyée avec succès ! Nous vous recontacterons rapidement.';

		return { success: true, message: submitSuccess.value };
	} catch (error) {
		submitError.value = error?.data?.message || "L'envoi a échoué. Merci de réessayer dans un instant.";

		return { success: false, error: submitError.value };
	} finally {
		isSubmitting.value = false;
	}
};

// Exposer les méthodes et propriétés au parent
defineExpose({
	submitForm,
	isFormValid,
	isSubmitting
});
</script>

<style scoped>
.contact-step {
	display: flex;
	flex-direction: column;
	height: 100%;

	h2 {
		margin-bottom: 2.5rem;
	}
}

.contact-form {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	flex: 1;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: .5rem;

	&:last-of-type {
		flex: 1;
	}
}

.field-label {
	font-size: 0.75rem; 
	font-weight: 500;
	color: #333;
	
	.required-indicator {
		color: #e74c3c;
		margin-left: .125rem;
	}
}

input,
textarea {
	/*
	   Le socle du site impose `height: 34px` à tout champ, pour ses propres
	   formulaires. Combiné aux 12 px de padding ci-dessous, il ne restait que
	   9 px pour un texte de 14 px : la saisie était comprimée. Le module
	   déclare donc sa propre hauteur, et cesse d'hériter d'un choix éditorial
	   qui ne le concerne pas.
	*/
	height: auto;

	padding: .75rem;
	border: .5px solid #ddd;
	border-radius: .25rem;
	font-size: 0.875rem; 
	font-family: inherit;
	transition: border-color 0.2s ease;

	/*
	   Le contour était retiré, ne laissant qu'un passage de bordure de #ddd à
	   #000 sur 0,5 px pour signaler le focus — trop ténu, et invisible pour qui
	   ne distingue pas ces deux gris. On garde le changement de bordure et on
	   rétablit un contour franc.
	*/
	&:focus-visible {
		outline: 2px solid #000;
		outline-offset: 2px;
		border-color: #000;
	}

	&.error {
		border-color: #e74c3c;
		background-color: #fdf2f2;
	}

	&:disabled {
		background-color: #f5f5f5;
		cursor: not-allowed;
		opacity: 0.7;
	}
}

textarea {
	flex: 1;
	min-height: 7.5rem;
	resize: vertical;
}

.field-error {
	font-size: 0.75rem; 
	color: #e74c3c;
	margin-top: -0.25rem;
}

.submit-error {
	padding: .75rem;
	background-color: #fdf2f2;
	border: .5px solid #e74c3c;
	border-radius: .25rem;
	color: #e74c3c;
	font-size: .875rem; 
}

.submit-success {
	padding: .75rem;
	background-color: #f0f9f0;
	border: .5px solid #27ae60;
	border-radius: .25rem;
	color: #27ae60;
	font-size: .875rem; 
}

/* Mention de démonstration, en retrait sous la confirmation. */
.mention-vitrine {
    display: block;
    margin-top: .375rem;
    font-size: .6875rem;
    opacity: .7;
}

.submit-info {
	display: flex;
	align-items: center;
	gap: .5rem;
	padding: .75rem;
	background-color: #f0f4f8;
	border: .5px solid #3498db;
	border-radius: .25rem;
	color: #3498db;
	font-size: .875rem;
}

.loading-spinner {
	width: .875rem;
	height: .875rem;
	border: 2px solid transparent;
	border-top: 2px solid currentColor;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>