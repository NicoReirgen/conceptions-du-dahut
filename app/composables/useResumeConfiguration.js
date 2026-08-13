/*
   Récapitulatif d'une configuration : ce que le visiteur a retenu, étape par
   étape, avec les prix.

   Vivait dans `PriceSummary.vue`, où seul l'affichage pouvait s'en servir. Or
   `configurator.vue` en avait besoin pour composer la charge utile du devis —
   et s'en était écrit une seconde version, `completedSteps`, dont 90 lignes
   sur 94 étaient inatteignables : elle testait des types de champ sur des
   étapes, et indexait l'état par clé d'étape quand il l'est par clé de champ.
   Elle ne rendait jamais que la ligne du véhicule.

   Une seule implémentation désormais, pour les deux usages.

   Le module ne dépend ni de Vue ni du composant : il prend les étapes et la
   sélection, il rend un tableau.
*/

// Créer un résumé organisé par étapes
export const resumeConfiguration = (steps, selectedOptions) => {
	const summary = [];
	
	// Parcourir toutes les étapes du véhicule sélectionné
	steps.forEach(step => {
		if (step.subSteps) {
			// Si l'étape a des sous-étapes, les traiter séparément
			step.subSteps.forEach(subStep => {
				const stepSummary = getStepSummary(subStep, selectedOptions);
				if (stepSummary && stepSummary.options.length > 0) {
					summary.push(stepSummary);
				}
			});
		} else {
			// Traiter l'étape directement
			const stepSummary = getStepSummary(step, selectedOptions);
			if (stepSummary && stepSummary.options.length > 0) {
				summary.push(stepSummary);
			}
		}
	});
	
	return summary;
};

// Obtenir le résumé pour une étape spécifique
const getStepSummary = (step, selectedOptions) => {
	if (!step.fields || step.fields.length === 0) {
		return null;
	}
	
	const stepOptions = [];
	
	step.fields.forEach(field => {
		const selectedValue = selectedOptions[field.key];
		if (!selectedValue) return;
		
		const fieldOptions = getFieldOptions(field, selectedValue);
		stepOptions.push(...fieldOptions);
	});
	
	if (stepOptions.length === 0) return null;
	
	return {
		stepKey: step.key,
		stepName: step.name || step.title || 'Options',
		options: stepOptions
	};
};

// Obtenir les options sélectionnées pour un champ spécifique
const getFieldOptions = (field, selectedValue) => {
	switch (field.type) {
		case 'select':
		case 'unique':
			return getSimpleFieldOptions(field, selectedValue);
		case 'multiple':
			return getMultipleFieldOptions(field, selectedValue);
		case 'deep_multiple':
			return getDeepMultipleFieldOptions(field, selectedValue);
		case 'openings':
			return getOpeningsFieldOptions(field, selectedValue);
		default:
			return [];
	}
};

// Gérer les options simples (select/unique)
const getSimpleFieldOptions = (field, selectedValue) => {
	const options = [];
	
	if (typeof selectedValue === 'string') {
		const option = findOption(field.options, selectedValue);
		if (option) {
			options.push(createOptionItem(option.name, option.price, option.pricePrefix));
		}
	} else if (selectedValue?.main) {
		const mainOption = findOption(field.options, selectedValue.main);
		if (mainOption) {
			let { name, price, pricePrefix } = mainOption;
			
			if (selectedValue.sub && mainOption.subOptions) {
				const subOption = findOption(mainOption.subOptions, selectedValue.sub);
				if (subOption) {
					name += ` - ${subOption.name}`;
					price += subOption.price || 0;
					// Si la sous-option a un préfixe, l'utiliser, sinon garder celui de l'option principale
					pricePrefix = subOption.pricePrefix || pricePrefix;
				}
			}
			
			options.push(createOptionItem(name, price, pricePrefix));
		}
	}
	
	return options;
};

// Gérer les options multiples
const getMultipleFieldOptions = (field, selectedValue) => {
	const options = [];
	
	if (Array.isArray(selectedValue)) {
		// Structure simple
		selectedValue.forEach(optionKey => {
			const option = findOption(field.options, optionKey);
			if (option) {
				options.push(createOptionItem(option.name, option.price, option.pricePrefix));
			}
		});
	} else if (selectedValue && typeof selectedValue === 'object') {
		// Options principales
		if (selectedValue.options) {
			selectedValue.options.forEach(optionKey => {
				const option = findOption(field.options, optionKey);
				if (option) {
					options.push(createOptionItem(option.name, option.price, option.pricePrefix));
				}
			});
		}
		
		// Sous-options
		if (selectedValue.subOptions) {
			Object.entries(selectedValue.subOptions).forEach(([mainKey, subKeys]) => {
				const mainOption = findOption(field.options, mainKey);
				if (mainOption?.subOptions && Array.isArray(subKeys)) {
					subKeys.forEach(subKey => {
						const subOption = findOption(mainOption.subOptions, subKey);
						if (subOption) {
							options.push(createOptionItem(
								`${mainOption.name} - ${subOption.name}`,
								subOption.price,
								subOption.pricePrefix
							));
						}
					});
				}
			});
		}
		
		// Quantités
		if (selectedValue.quantities) {
			Object.entries(selectedValue.quantities).forEach(([mainKey, quantities]) => {
				const mainOption = findOption(field.options, mainKey);
				if (mainOption?.subOptions) {
					Object.entries(quantities).forEach(([subKey, quantity]) => {
						if (quantity > 0) {
							const subOption = findOption(mainOption.subOptions, subKey);
							if (subOption) {
								options.push(createOptionItem(
									`${mainOption.name} - ${subOption.name} (x${quantity})`,
									(subOption.price || 0) * quantity,
									subOption.pricePrefix
								));
							}
						}
					});
				}
			});
		}
	}
	
	return options;
};

// Gérer les options multiples imbriquées (deep_multiple)
const getDeepMultipleFieldOptions = (field, selectedValue) => {
	const options = [];
	
	if (selectedValue && typeof selectedValue === 'object') {
		// Options principales
		if (Array.isArray(selectedValue.mainOptions)) {
			selectedValue.mainOptions.forEach(mainKey => {
				const mainOption = findOption(field.options, mainKey);
				if (mainOption) {
					options.push(createOptionItem(mainOption.name, mainOption.price, mainOption.pricePrefix));
					
					// Options profondes
					if (mainOption.deepOptions && selectedValue.deepOptions) {
						mainOption.deepOptions.forEach(deepOption => {
							const deepKey = `${mainKey}.${deepOption.key}`;
							const selectedDeepValue = selectedValue.deepOptions[deepKey];
							
							if (selectedDeepValue) {
								if (deepOption.type === 'color_selection') {
									const colorOption = deepOption.options?.find(opt => opt.key === selectedDeepValue);
									if (colorOption) {
										options.push(createOptionItem(
											`- ${deepOption.title}: ${colorOption.name}`,
											colorOption.price,
											colorOption.pricePrefix
										));
									}
								} else if (deepOption.type === 'checkbox') {
									options.push(createOptionItem(
										`- ${deepOption.name}`,
										deepOption.price,
										deepOption.pricePrefix
									));
								} else if (deepOption.type === 'unique') {
									const uniqueOption = deepOption.options?.find(opt => opt.key === selectedDeepValue);
									if (uniqueOption) {
										options.push(createOptionItem(
											`- ${uniqueOption.name}`,
											uniqueOption.price,
											uniqueOption.pricePrefix
										));
										
										// Options sous-profondes (niveau 2)
										if (uniqueOption.deepOptions && selectedValue.subDeepOptions) {
											uniqueOption.deepOptions.forEach(subDeepOption => {
												const subDeepKey = `${mainKey}.${deepOption.key}.${uniqueOption.key}.${subDeepOption.key}`;
												const selectedSubDeepValue = selectedValue.subDeepOptions[subDeepKey];
												
												if (selectedSubDeepValue && subDeepOption.type === 'color_selection') {
													const subColorOption = subDeepOption.options?.find(opt => opt.key === selectedSubDeepValue);
													if (subColorOption) {
														options.push(createOptionItem(
															`  - ${subDeepOption.title}: ${subColorOption.name}`,
															subColorOption.price,
															subColorOption.pricePrefix
														));
													}
												}
											});
										}
									}
								}
							}
						});
					}
				}
			});
		}
	}
	
	return options;
};

// Gérer les ouvrants (fenêtres)
const getOpeningsFieldOptions = (field, selectedValue) => {
	const options = [];
	
	// Fenêtres avec quantités
	if (selectedValue.quantities) {
		Object.entries(selectedValue.quantities).forEach(([optionKey, quantity]) => {
			if (quantity > 0) {
				const option = field.options?.main?.options?.find(opt => opt.key === optionKey);
				if (option) {
					options.push(createOptionItem(
						`${option.name} (x${quantity})`,
						(option.price || 0) * quantity,
						option.pricePrefix
					));
				}
			}
		});
	}
	
	// Toit relevable
	if (selectedValue.optional && field.options?.optional) {
		options.push(createOptionItem(
			field.options.optional.name,
			field.options.optional.price,
			field.options.optional.pricePrefix
		));
		
		// Peinture du toit relevable
		if (selectedValue.painting && field.options.optional.subOptions?.[0]) {
			const paintOption = field.options.optional.subOptions[0];
			options.push(createOptionItem(
				`- ${paintOption.name}`,
				paintOption.price,
				paintOption.pricePrefix
			));
		}
	}
	
	return options;
};

// Fonctions utilitaires
const findOption = (options, key) => options?.find(opt => opt.key === key);

const createOptionItem = (name, price = 0, pricePrefix = '') => ({ 
    name, 
    price: price || 0, 
    pricePrefix: pricePrefix || '' 
});
