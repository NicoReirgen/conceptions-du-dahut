import { filterImageEnabledOptions, isOptionImageEnabled } from '~~/app/composables/images/optionsImage'

/*
   Quels champs participent à l'image, et lesquels sont assez renseignés pour
   compter.

   Un champ ne participe que s'il porte `traitementImage: true` — la mention
   est explicite dans le catalogue, jamais déduite.
*/

/** Les champs marqués pour l'image, dans l'ordre où le formulaire les pose. */
export const detectImageFields = (vehicleSteps) => {
    const champs = []

    const parcourir = (field, stepIndex, subStepIndex) => {
        if (field.type === 'group' && field.fields) {
            field.fields.forEach((sous) => parcourir(sous, stepIndex, subStepIndex))
            return
        }

        if (field.traitementImage === true) {
            champs.push({ key: field.key, type: field.type, field, stepIndex, subStepIndex, order: champs.length })
        }
    }

    vehicleSteps.forEach((step, stepIndex) => {
        step.subSteps?.forEach((subStep, subStepIndex) => {
            subStep.fields?.forEach((field) => parcourir(field, stepIndex, subStepIndex))
        })
    })

    return champs
}

/**
 * Un champ porte-t-il une sélection exploitable ?
 *
 * Un choix unique n'est complet qu'avec sa sous-option : « Stratifié » sans
 * coloris ne désigne aucune image.
 */
export const isFieldValidated = (value, fieldType) => {
    if (!value) return false

    switch (fieldType) {
        case 'unique':
            return typeof value === 'object' && Boolean(value.main) && Boolean(value.sub)
        case 'multiple':
            return Array.isArray(value) && value.length > 0
        case 'deep_multiple':
            return typeof value === 'object' && Boolean(value.mainOptions) && value.mainOptions.length > 0
        case 'select':
            return typeof value === 'string' && value.length > 0
        default:
            return Boolean(value)
    }
}

/** Reste-t-il quelque chose une fois les options écartées des images retirées ? */
export const hasImageEnabledOptions = (value, fieldInfo) => {
    if (!fieldInfo?.field) return true

    switch (fieldInfo.type) {
        case 'unique':
            return typeof value === 'object' && value.main
                ? isOptionImageEnabled(value.main, fieldInfo)
                : true

        case 'multiple':
            return Array.isArray(value)
                ? filterImageEnabledOptions(value, fieldInfo).length > 0
                : true

        /*
           Ici, contrairement au reste, une option introuvable ne compte pas :
           un champ profond dont aucune principale n'existe dans le catalogue
           ne produira jamais de chemin.
        */
        case 'deep_multiple': {
            if (!Array.isArray(value?.mainOptions)) return true

            return value.mainOptions.some((cle) => {
                const principale = fieldInfo.field.options?.find((opt) => opt.key === cle)

                return Boolean(principale) && principale.disableImageHandling !== true
            })
        }

        default:
            return true
    }
}

/** Les champs renseignés qui comptent, triés comme le formulaire les présente. */
export const extractValidatedFields = (selectedOptions, imageFields) => imageFields
    .filter((champ) => isFieldValidated(selectedOptions[champ.key], champ.type)
        && hasImageEnabledOptions(selectedOptions[champ.key], champ))
    .map((champ) => ({
        key: champ.key,
        type: champ.type,
        value: selectedOptions[champ.key],
        order: champ.order,
        field: champ.field,
    }))
    .sort((a, b) => a.order - b.order)

/** Ce que le véhicule et la sélection retiennent, en une passe. */
export const champsRetenus = (selectedOptions, vehicleSteps) => {
    if (!selectedOptions || !vehicleSteps) return []

    return extractValidatedFields(selectedOptions, detectImageFields(vehicleSteps))
}
