import { champsRetenus } from '~~/app/composables/images/champsImage'
import { getFolderName } from '~~/app/composables/images/optionsImage'
import { getSelectedValues } from '~~/app/composables/images/valeursImage'

/*
   La composition des chemins d'aperçu.

   Structure hiérarchique inversée : la dernière sélection donne le dossier
   principal, les précédentes forment les sous-dossiers imbriqués.

   /assets/images/orion/orion-base.jpg
   /assets/images/orion/mobilier/tiroirs.jpg
   /assets/images/orion/finitions/stratifie-bleu_velvet/mobilier/tiroirs.jpg
*/

/**
 * Le dossier d'un véhicule.
 *
 * La base se lit sur la baseURL de l'application, et non sur celle de Vite :
 * les fichiers vivent dans `public/`, pas dans le dossier des assets compilés.
 */
export const getBasePath = (vehicleId = 'orion') => {
    const configuration = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null
    const base = configuration?.app?.baseURL || '/'

    return `${base.endsWith('/') ? base : `${base}/`}assets/images/${vehicleId}/`
}

/** L'image du véhicule nu, dernier recours de tous les replis. */
export const getBaseImage = (vehicleId) => `${getBasePath(vehicleId)}${vehicleId}-base.jpg`

/*
   Cette boucle était écrite cinq fois — une par branche de l'URL indépendante,
   de l'URL contextuelle et des replis. Quatre d'entre elles distinguaient « un
   seul champ » de « plusieurs », distinction sans objet : renverser une liste
   d'un élément la laisse telle quelle.
*/
export const cheminDepuis = (champs, vehicleId) => {
    const segments = [getBasePath(vehicleId).slice(0, -1)]

    for (const champ of [...champs].reverse()) {
        const dossier = getFolderName(champ.key)
        const valeurs = getSelectedValues(champ.value, champ.type, champ)

        if (dossier && valeurs) segments.push(dossier, valeurs)
    }

    return `${segments.join('/')}.jpg`
}

/*
   Un champ déclaré indépendant ne s'imbrique pas : son image existe seule,
   quelles que soient les autres sélections. Il l'emporte donc sur le reste.
*/
export const cheminPour = (champs, vehicleId) => {
    const independant = champs.find((champ) => champ.field?.independant === true)

    if (independant) return cheminDepuis([independant], vehicleId)

    const contextuels = champs.filter((champ) => champ.field?.independant !== true)

    return contextuels.length > 0 ? cheminDepuis(contextuels, vehicleId) : getBaseImage(vehicleId)
}

export const buildImageUrl = (selectedOptions, vehicleId, vehicleSteps) =>
    cheminPour(champsRetenus(selectedOptions, vehicleSteps), vehicleId)

/*
   Les replis, du plus proche de la configuration au plus général : on retire
   les sélections une à une, de la plus récente à la première, et l'image du
   véhicule ferme la liste.

   Les doublons sont écartés — elle se terminait par deux fois l'image de base,
   que le navigateur redemandait alors deux fois.
*/
export const generateFallbackUrls = (validatedFields, vehicleId) => {
    const replis = []

    for (let i = validatedFields.length - 1; i >= 0; i--) {
        const restants = validatedFields.slice(0, i)

        replis.push(restants.length > 0 ? cheminDepuis(restants, vehicleId) : getBaseImage(vehicleId))
    }

    replis.push(getBaseImage(vehicleId))

    return [...new Set(replis)]
}
