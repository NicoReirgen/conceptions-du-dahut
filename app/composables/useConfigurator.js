import catalogue from '~~/app/data/orion.json'

/*
   Le catalogue des véhicules vivait ici, en dur : 740 lignes de données au
   milieu de la logique, soit 55 % du fichier. Il est désormais dans
   `app/data/orion.json`, vérifié au build par `scripts/verify-catalogue.mjs`.

   Les chemins d'images y sont relatifs. Le préfixe de déploiement est réappliqué
   ici, au chargement : le stocker dans les données les rendrait dépendantes de
   l'endroit où le site est publié.
*/
/*
   Le préfixe se lit sur la baseURL de l'application, et non sur
   `import.meta.env.BASE_URL` — celle de Vite, qui vaut `/_nuxt/` en
   développement : le dossier des assets compilés, où rien de `public/` ne se
   trouve. Les deux visuels de présentation pointaient donc vers des fichiers
   absents et paraissaient cassés, et une `<source>` en échec ne retombe pas sur
   le `<img>`. `useVehicleImages` avait déjà buté là-dessus et s'appuie sur la
   même source depuis : c'est elle qui fait foi.

   La résolution est différée : `useRuntimeConfig` n'existe pas encore à
   l'évaluation du module.
*/
const basePublique = () => {
	const configuration = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null

	return (configuration?.app?.baseURL || '/').replace(/\/?$/, '/')
}

const prefixer = (valeur, base) => {
	if (typeof valeur === 'string') {
		return valeur.startsWith('assets/') ? base + valeur : valeur
	}
	if (Array.isArray(valeur)) {
		return valeur.map((v) => prefixer(v, base))
	}
	if (valeur && typeof valeur === 'object') {
		return Object.fromEntries(Object.entries(valeur).map(([cle, v]) => [cle, prefixer(v, base)]))
	}
	return valeur
}

let catalogueResolu = null

/** Le catalogue, chemins d'images préfixés — calculé une fois, à la demande. */
const vehicules = () => (catalogueResolu ??= prefixer(catalogue, basePublique()))


// Configurator service
export const configuratorService = {
	// Récupérer tous les véhicules
	getAllVehicles() {
		return Promise.resolve(vehicules());
	},

	// Récupérer les étapes d'un véhicule
	getVehicleSteps(vehicleId) {
		const vehicle = vehicules().find(v => v.id === vehicleId);
		return Promise.resolve(vehicle ? vehicle.steps : []);
	}
};

/* ------------------------------------------------------- calcul des prix */

/*
   Une règle de calcul par type de champ.

   Elles vivaient dans un `switch` de 151 lignes. Séparées, chacune tient sous
   les yeux, se nomme, et se teste seule — ce que la version empilée
   interdisait.

   Toutes suivent le même contrat : (champ, sélection) → nombre. Une sélection
   absurde ou incomplète vaut zéro plutôt que d'échouer : le prix s'affiche en
   permanence pendant que le visiteur compose, il ne peut pas se permettre de
   lever.
*/

/** Retrouve une option par sa clé dans une liste éventuellement absente. */
const parCle = (options, cle) => (options || []).find((option) => option.key === cle)

const prixDe = (option) => option?.price || 0

/** L'option préchoisie d'un champ à choix multiple, si le champ en déclare une. */
const optionParDefaut = (champ) =>
	champ?.hasDefaultOption === true
		? (champ.options || []).find((option) => option.isDefault === true) || null
		: null

/** Liste déroulante : la sélection est une clé, ou déjà l'option elle-même. */
const prixSelect = (champ, selection) =>
	typeof selection === 'string'
		? prixDe(parCle(champ.options, selection))
		: selection?.price || 0

/** Choix unique, avec une sous-option facultative — un coloris, en général. */
const prixUnique = (champ, selection) => {
	if (typeof selection !== 'object' || !selection?.main) return 0

	const principale = parCle(champ.options, selection.main)
	const sous = selection.sub ? parCle(principale?.subOptions, selection.sub) : null

	return prixDe(principale) + prixDe(sous)
}

/*
   Choix multiple. L'option par défaut — « Base », par exemple — est comprise
   dans le prix du véhicule : la compter ici la facturerait deux fois.
*/
const prixMultiple = (champ, selection) => {
	if (!Array.isArray(selection)) return 0

	const defaut = optionParDefaut(champ)

	return selection.reduce(
		(total, cle) => (cle === defaut?.key ? total : total + prixDe(parCle(champ.options, cle))),
		0
	)
}

/*
   Quatrième niveau de profondeur : le coloris d'une option profonde unique.
   Seuls les `color_selection` sont facturés ici.
*/
const prixSousProfondes = (optionUnique, chemin, sousRetenues) =>
	(optionUnique.deepOptions || []).reduce((total, sousProfonde) => {
		const retenu = sousRetenues?.[`${chemin}.${sousProfonde.key}`]
		if (!retenu || sousProfonde.type !== 'color_selection') return total

		return total + prixDe(parCle(sousProfonde.options, retenu))
	}, 0)

/** Une option profonde, selon ce qu'elle est : coloris, case à cocher, choix. */
const prixProfonde = (profonde, chemin, retenu, selection) => {
	if (!retenu) return 0

	if (profonde.type === 'color_selection') {
		return prixDe(parCle(profonde.options, retenu))
	}

	// Une case cochée porte sa propre clé pour valeur.
	if (profonde.type === 'checkbox') {
		return retenu === profonde.key ? prixDe(profonde) : 0
	}

	if (profonde.type === 'unique') {
		const choisie = parCle(profonde.options, retenu)
		if (!choisie) return 0

		return prixDe(choisie) + prixSousProfondes(choisie, `${chemin}.${choisie.key}`, selection.subDeepOptions)
	}

	return 0
}

/** Choix multiple à options profondes — la branche la plus profonde du tunnel. */
const prixDeepMultiple = (champ, selection) => {
	if (typeof selection !== 'object' || selection === null) return 0
	if (!Array.isArray(selection.mainOptions)) return 0

	return selection.mainOptions.reduce((total, cleePrincipale) => {
		const principale = parCle(champ.options, cleePrincipale)
		if (!principale) return total

		const profondes = (principale.deepOptions || []).reduce((somme, profonde) => {
			const chemin = `${cleePrincipale}.${profonde.key}`
			return somme + prixProfonde(profonde, chemin, selection.deepOptions?.[chemin], selection)
		}, 0)

		return total + prixDe(principale) + profondes
	}, 0)
}

/*
   Ouvrants : des quantités, plus une option facultative qui peut elle-même
   porter une peinture.
*/
const prixOuvrants = (champ, selection) => {
	const quantites = Object.entries(selection?.quantities || {}).reduce(
		(total, [cle, nombre]) =>
			nombre > 0 ? total + prixDe(parCle(champ.options?.main?.options, cle)) * nombre : total,
		0
	)

	const facultative = champ.options?.optional
	if (!selection?.optional || !facultative) return quantites

	const peinture = selection.painting ? prixDe(facultative.subOptions?.[0]) : 0

	return quantites + prixDe(facultative) + peinture
}

const PRIX_PAR_TYPE = {
	select: prixSelect,
	unique: prixUnique,
	multiple: prixMultiple,
	deep_multiple: prixDeepMultiple,
	openings: prixOuvrants,
}

/* --------------------------------------------- passage à l'étape suivante */

/*
   Une règle par type de champ : le champ laisse-t-il continuer ?

   Toutes suivent le contrat (champ, valeur, ecrire) → booléen. Le doute
   profite au visiteur : un cas non prévu laisse passer plutôt que de bloquer
   quelqu'un devant un bouton mort sans explication.
*/

/** Une sous-option n'est facultative que si elle le déclare explicitement. */
const sousOptionsObligatoires = (option) =>
	(option?.subOptions || []).filter((sous) => sous.required !== false)

const passeSelect = (champ, valeur) => !!valeur

const passeUnique = (champ, valeur) => {
	if (!valeur?.main) return false

	const principale = parCle(champ.options, valeur.main)
	if (!principale?.subOptions?.length) return true

	if (sousOptionsObligatoires(principale).length === 0) return true

	// Un coloris est exigé : encore faut-il qu'il existe.
	return Boolean(valeur.sub && parCle(principale.subOptions, valeur.sub))
}

/** Chaque option cochée qui réclame un coloris doit en avoir un. */
const colorisRenseignes = (champ, clesCochees, sousChoix) =>
	clesCochees.every((cle) => {
		const option = parCle(champ.options, cle)
		if (!option?.subOptions?.length) return true
		if (sousOptionsObligatoires(option).length === 0) return true

		return Boolean(sousChoix?.[cle])
	})

const passeMultiple = (champ, valeur, ecrire) => {
	if (optionParDefaut(champ)) {
		/*
		   Aucune sélection : on active l'option par défaut. C'est le seul effet
		   de bord de l'ensemble, et il remonte par `ecrire` — un calcul ne doit
		   pas modifier ce qu'il évalue.
		*/
		if (!Array.isArray(valeur) || valeur.length === 0) {
			ecrire(configuratorLogic.initializeDefaultSelection(champ))
			return true
		}

		return colorisRenseignes(champ, valeur, valeur.subOptions)
	}

	// Forme complexe : { options: [...], subOptions: {...} }
	if (typeof valeur === 'object' && !Array.isArray(valeur) && valeur !== null) {
		if (!valeur.options?.length) return !champ.required

		return colorisRenseignes(champ, valeur.options, valeur.subOptions)
	}

	if (Array.isArray(valeur)) return valeur.length > 0 || !champ.required

	return !champ.required
}

/** Le dernier niveau : un coloris ouvert par une option unique doit être choisi. */
const passeSousProfondes = (optionUnique, chemin, sousChoix) =>
	(optionUnique.deepOptions || []).every((sousProfonde) =>
		sousProfonde.type !== 'color_selection'
			? true
			: Boolean(sousChoix?.[`${chemin}.${sousProfonde.key}`])
	)

/** Une option profonde : seuls les coloris et les choix uniques sont exigés. */
const passeProfonde = (profonde, chemin, retenu, valeur) => {
	if (profonde.type !== 'color_selection' && profonde.type !== 'unique') return true
	if (!retenu) return false
	if (profonde.type !== 'unique') return true

	const choisie = parCle(profonde.options, retenu)
	if (!choisie?.deepOptions?.length) return true

	return passeSousProfondes(choisie, `${chemin}.${choisie.key}`, valeur.subDeepOptions)
}

const passeDeepMultiple = (champ, valeur) => {
	if (typeof valeur !== 'object' || valeur === null) return false
	if (!Array.isArray(valeur.mainOptions) || valeur.mainOptions.length === 0) return false

	return valeur.mainOptions.every((clePrincipale) => {
		const principale = parCle(champ.options, clePrincipale)
		if (!principale?.deepOptions) return true

		return principale.deepOptions.every((profonde) => {
			const chemin = `${clePrincipale}.${profonde.key}`
			return passeProfonde(profonde, chemin, valeur.deepOptions?.[chemin], valeur)
		})
	})
}

/* Les ouvrants restent facultatifs ; seules les bornes de quantité s'imposent. */
const passeOuvrants = (champ, valeur) => {
	if (!valeur?.quantities || Object.keys(valeur.quantities).length === 0) {
		return !champ.required
	}

	return champ.options.main.options.every((option) => {
		const nombre = valeur.quantities[option.key] || 0
		return nombre >= (option.quantity.min || 0) && nombre <= (option.quantity.max || Infinity)
	})
}

const PASSAGE_PAR_TYPE = {
	select: passeSelect,
	unique: passeUnique,
	multiple: passeMultiple,
	deep_multiple: passeDeepMultiple,
	openings: passeOuvrants,
}

// Utility functions
export const configuratorLogic = {
    /*
       Prix d'un champ, aiguillé vers le calcul de son type.

       C'était un `switch` de 151 lignes, complexité 29 : sept règles de calcul
       indépendantes empilées dans une seule fonction, dont aucune ne pouvait
       être lue ni éprouvée séparément. Chaque branche est désormais une
       fonction nommée, déclarée plus haut, et le `switch` n'est plus qu'une
       table de correspondance.

       Le comportement est inchangé — 21 cas de test l'attestent, écrits avant
       le découpage précisément pour cela.
    */
    calculateFieldPrice(field, selectedOptions) {
        if (!field || !selectedOptions) return 0;

        const calcul = PRIX_PAR_TYPE[field.type];

        // Un type inconnu ne coûte rien plutôt que de faire échouer le tunnel.
        return calcul ? calcul(field, selectedOptions) : 0;
    },

    // Validation utilities
    validateProps(props, requiredFields = []) {
        requiredFields.forEach(field => {
            if (!props[field]) {
                console.error(`Missing required prop: ${field}`);
            }
        });
    },

    // Common accessibility handler
    handleKeyDown(event, action) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            action();
        }
    },

    // Format price for display with enhanced options
    formatPrice(price, options = {}) {
        const {
            currency = 'EUR',
            locale = 'fr-FR',
            minimumFractionDigits = 2,
            maximumFractionDigits = 2
        } = options;
        
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits,
            maximumFractionDigits
        }).format(price);
    },

    // Utility for color contrast calculation
    calculateLuminance(hex) {
        if (!hex || !hex.startsWith('#')) {
            console.warn('Invalid hex color:', hex);
            return 0;
        }

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    },

    hasEnoughContrast(hex) {
        const luminance = this.calculateLuminance(hex);
        const contrastRatio = (1 + 0.05) / (luminance + 0.05);
        return contrastRatio >= 3;
    },

    // Gérer les options incompatibles pour les champs multiple
    handleIncompatibleOptions(field, selectedOptions, newOptionKey) {
        if (!field || !field.options || !Array.isArray(selectedOptions)) {
            return selectedOptions;
        }

        // Trouver l'option qui vient d'être sélectionnée
        const newOption = field.options.find(opt => opt.key === newOptionKey);
        if (!newOption || !newOption.incompatibleWith) {
            return selectedOptions;
        }

        // Filtrer les options incompatibles
        const filteredOptions = selectedOptions.filter(optionKey => 
            !newOption.incompatibleWith.includes(optionKey)
        );

        // Ajouter la nouvelle option si elle n'est pas déjà présente
        if (!filteredOptions.includes(newOptionKey)) {
            filteredOptions.push(newOptionKey);
        }

        return filteredOptions;
    },

    // Vérifier si deux options sont incompatibles
    areOptionsIncompatible(field, option1Key, option2Key) {
        if (!field || !field.options) return false;

        const option1 = field.options.find(opt => opt.key === option1Key);
        const option2 = field.options.find(opt => opt.key === option2Key);

        if (!option1 || !option2) return false;

        return (option1.incompatibleWith && option1.incompatibleWith.includes(option2Key)) ||
               (option2.incompatibleWith && option2.incompatibleWith.includes(option1Key));
    },

    // Obtenir la liste des options incompatibles pour une option donnée
    getIncompatibleOptions(field, optionKey) {
        if (!field || !field.options) return [];

        const option = field.options.find(opt => opt.key === optionKey);
        return option?.incompatibleWith || [];
    },

    // Gestion des options par défaut pour les champs multiple
    
    /**
     * Vérifier si un champ a une option par défaut
     */
    // Délèguent à `optionParDefaut`, pour que la règle n'existe qu'à un endroit.
    hasDefaultOption(field) {
        return optionParDefaut(field) !== null;
    },

    /**
     * Obtenir l'option par défaut d'un champ
     */
    getDefaultOption(field) {
        return optionParDefaut(field);
    },

    /**
     * Vérifier si aucune option non-par-défaut n'est sélectionnée
     */
    hasNoVisibleSelection(field, selectedOptions) {
        if (!field || !field.options || !Array.isArray(selectedOptions)) return true;
        
        const defaultOption = this.getDefaultOption(field);
        const nonDefaultOptions = field.options.filter(opt => !opt.hidden && opt.key !== defaultOption?.key);
        
        return !selectedOptions.some(key => nonDefaultOptions.find(opt => opt.key === key));
    },

    /**
     * Initialiser la sélection par défaut pour un champ
     * À appeler lors de l'initialisation du configurateur
     */
    initializeDefaultSelection(field) {
        if (!this.hasDefaultOption(field)) return [];
        
        const defaultOption = this.getDefaultOption(field);
        return defaultOption ? [defaultOption.key] : [];
    },
    /*
       Un champ laisse-t-il passer à l'étape suivante ?

       Vivait dans le `computed` `canProceed` du composant, où elle pesait
       153 des 176 lignes. Déplacée ici sans changement, pour être couverte
       puis découpée.

       `ecrire` permet à l'appelant de recevoir l'initialisation d'une
       option par défaut : le calcul d'origine écrivait directement dans
       l'état, ce qu'un `computed` ne devrait jamais faire.

    /*
       Un champ laisse-t-il passer à l'étape suivante ?

       C'était 153 lignes dans un `computed` du composant, complexité 28 : cinq
       règles indépendantes empilées dans un `switch`. Chacune est désormais
       nommée, et celle-ci n'est plus qu'un aiguillage.

       19 cas de test décrivent le comportement, écrits avant le découpage.

       `ecrire` remonte le seul effet de bord de l'ensemble — l'activation d'une
       option par défaut. Le calcul d'origine modifiait l'état qu'il évaluait.
    */
    champLaissePasser(field, valeur, ecrire = () => {}) {
        const regle = PASSAGE_PAR_TYPE[field.type];

        // Un type sans règle ne bloque personne.
        return regle ? regle(field, valeur, ecrire) : true;
    },


};
