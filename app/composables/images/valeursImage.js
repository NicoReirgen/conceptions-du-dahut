import {
    filterImageEnabledOptions,
    isOptionImageEnabled,
    isSubOptionImageEnabled,
    normalizeValue,
} from '~~/app/composables/images/optionsImage'
import { extractDeepestOptions } from '~~/app/composables/images/feuillesImage'

/*
   Traduire une sélection en segment de chemin d'image.

   C'était un `switch` de 59 lignes, complexité 17. Une fonction par type
   désormais, et un aiguillage. `select` n'y figure pas : il tombe dans le
   traitement par défaut, qui est exactement le sien.
*/

/*
   La combinaison par défaut n'ajoute pas de segment : c'est elle que montrent
   les images de base.

   Stratifié + Gris Galet, par exemple, est le rendu de départ du configurateur.
   Faute de le dire, le système composait `finitions/stratifie-gris_galet/…`,
   récoltait un 404 et se rabattait sur l'image sans finition — la bonne, mais
   atteinte par l'échec, avec l'aller-retour visible que cela suppose.

   La règle exige les deux niveaux. Le seul coloris ne suffirait pas : le jour
   où l'on déclarerait « transparent » par défaut sous le Bouleau, le segment
   `bouleau` disparaîtrait du chemin, alors que le bouleau n'est pas le rendu de
   base.
*/
const estLaCombinaisonParDefaut = (value, fieldInfo) => {
    const principale = fieldInfo?.field?.options?.find((option) => option.key === value.main)
    if (principale?.isDefault !== true) return false

    return principale.subOptions?.find((sous) => sous.key === value.sub)?.isDefault === true
}

/*
   Choix unique : la principale, éventuellement suivie de sa sous-option.
   Chacune peut être écartée des images indépendamment.
*/
const valeursUnique = (value, fieldInfo) => {
    if (!value?.main) return null
    if (!isOptionImageEnabled(value.main, fieldInfo)) return null
    if (estLaCombinaisonParDefaut(value, fieldInfo)) return null

    const principale = normalizeValue(value.main)

    if (!value.sub) return principale

    // Sous-option écartée : on garde la principale seule plutôt que rien.
    if (!isSubOptionImageEnabled(value.main, value.sub, fieldInfo)) return principale

    return `${principale}-${normalizeValue(value.sub)}`
}

/*
   Choix multiple. Le tri est essentiel : il rend le nom de fichier
   indépendant de l'ordre dans lequel le visiteur a coché.
*/
const valeursMultiple = (value, fieldInfo) => {
    if (!Array.isArray(value)) return null

    const retenues = filterImageEnabledOptions(value, fieldInfo)
    if (retenues.length === 0) return null

    return retenues.map(normalizeValue).sort().join('-')
}

/*
   Choix multiple profond : seules les feuilles comptent. Sans description du
   champ, on préfère ne produire aucune URL plutôt qu'une fausse.
*/
const valeursDeepMultiple = (value, fieldInfo) => {
    if (!fieldInfo) return null

    const feuilles = extractDeepestOptions(value, fieldInfo)
    if (!feuilles || feuilles.length === 0) return null

    return feuilles.map(normalizeValue).sort().join('-')
}

const VALEURS_PAR_TYPE = {
    unique: valeursUnique,
    multiple: valeursMultiple,
    deep_multiple: valeursDeepMultiple,
}

export const getSelectedValues = (value, fieldType, fieldInfo = null) => {
    const traduire = VALEURS_PAR_TYPE[fieldType]

    // Un type sans traitement particulier se contente d'être normalisé.
    return traduire ? traduire(value, fieldInfo) : normalizeValue(value)
}
