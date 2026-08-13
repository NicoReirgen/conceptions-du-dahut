/*
   Le vocabulaire de base du système d'images, et la règle qui décide si une
   option compte.

   Une option peut porter `disableImageHandling: true` : elle est alors retenue
   par le visiteur mais ignorée pour composer le chemin de l'aperçu — le
   catalogue s'en sert pour les choix qui ne changent rien au rendu. Le doute
   profite toujours à l'option : une description manquante la garde.
*/

/**
 * Le nom de dossier d'un champ.
 *
 * C'est sa clé, telle quelle. La fonction ne fait rien, et c'est tout son
 * intérêt : elle nomme la convention la plus fragile du projet — 905 fichiers
 * dépendent de cette égalité, que `scripts/verify-catalogue.mjs` vérifie au
 * build.
 */
export const getFolderName = (key) => key

/** Un segment de chemin ne porte que des minuscules, chiffres, tirets et blancs soulignés. */
export const normalizeValue = (value) => {
    if (!value) return ''

    return value.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
}

const optionParCle = (fieldInfo, cle) => fieldInfo?.field?.options?.find((opt) => opt.key === cle)

/** Une option principale participe-t-elle aux images ? */
export const isOptionImageEnabled = (optionKey, fieldInfo) => {
    if (!fieldInfo?.field?.options) return true

    const option = optionParCle(fieldInfo, optionKey)

    // Option introuvable : on la garde par sécurité.
    return option ? option.disableImageHandling !== true : true
}

/** Et sa sous-option — un coloris, en général ? */
export const isSubOptionImageEnabled = (mainOptionKey, subOptionKey, fieldInfo) => {
    if (!fieldInfo?.field?.options) return true

    const principale = optionParCle(fieldInfo, mainOptionKey)
    if (!principale?.subOptions) return true

    const sous = principale.subOptions.find((opt) => opt.key === subOptionKey)

    return sous ? sous.disableImageHandling !== true : true
}

/**
 * Les options retenues qui comptent pour l'image.
 *
 * L'option par défaut — « Base » — est écartée dès qu'une autre est cochée :
 * elle décrit l'absence de choix, et n'a pas d'image à elle. Seule, elle est
 * conservée, sans quoi le champ ne désignerait plus rien.
 */
export const filterImageEnabledOptions = (selectedValues, fieldInfo) => {
    if (!fieldInfo?.field?.options) return selectedValues

    const actives = selectedValues.filter((cle) => {
        const option = optionParCle(fieldInfo, cle)

        return option ? option.disableImageHandling !== true : true
    })

    const horsDefaut = actives.filter((cle) => optionParCle(fieldInfo, cle)?.isDefault !== true)

    return horsDefaut.length > 0 ? horsDefaut : actives
}
