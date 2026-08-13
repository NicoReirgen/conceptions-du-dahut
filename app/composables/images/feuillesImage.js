/*
   Les feuilles d'un champ à choix multiple profond.

   Seule la sélection la plus profonde nomme une image : une option principale
   cochée mais dont rien n'est encore retenu en dessous ne désigne aucun
   fichier. On descend donc jusqu'aux feuilles, et on ne rend qu'elles.

   Trois règles indépendantes cohabitaient dans une pile de `if` de 72 lignes
   sur six niveaux — coloris, case à cocher, choix unique. Chacune est nommée
   ici, et l'aiguillage tient en une boucle.
*/

const parCle = (options, cle) => options?.find((opt) => opt.key === cle)

/** Un coloris est toujours terminal : il ferme le chemin. */
export const feuilleColoris = (optionProfonde, retenu, mainKey) => {
    if (!retenu) return null

    const coloris = parCle(optionProfonde.options, retenu)
    if (coloris?.disableImageHandling === true) return null

    return `${mainKey}-${retenu}`
}

/*
   Une case cochée se reconnaît à ce qu'elle porte sa propre clé pour valeur —
   ou un booléen, selon le composant qui l'a écrite.
*/
export const feuilleCase = (optionProfonde, retenu, mainKey) => {
    const cochee = retenu === optionProfonde.key || retenu === true

    return cochee ? `${mainKey}-${optionProfonde.key}` : null
}

/*
   Un choix unique peut être terminal, ou ouvrir un niveau de plus. S'il en
   ouvre un et qu'aucune feuille n'y est retenue, rien n'est produit : un
   chemin partiel ne désignerait aucune image.
*/
export const feuillesChoixUnique = (optionProfonde, retenu, mainKey, cheminProfond, selectedValues) => {
    if (!retenu) return []

    const choisie = parCle(optionProfonde.options, retenu)
    if (choisie?.disableImageHandling === true) return []

    if (!choisie?.deepOptions) return [`${mainKey}-${retenu}`]

    return findDeepestInSubBranch(
        choisie.deepOptions,
        selectedValues.subDeepOptions || {},
        `${cheminProfond}.${retenu}`
    ).map((feuille) => `${mainKey}-${retenu}-${feuille}`)
}

/*
   Dernier niveau de profondeur. Il ne traite que les coloris — les seuls qui
   descendent aussi bas dans le catalogue — et rend la valeur brute : c'est
   l'appelant qui compose le chemin complet.
*/
export const findDeepestInSubBranch = (deepOptions, subDeepOptions, cheminCourant) => {
    const feuilles = []

    for (const optionProfonde of deepOptions) {
        if (optionProfonde.disableImageHandling === true) continue
        if (optionProfonde.type !== 'color_selection') continue

        const retenu = subDeepOptions[`${cheminCourant}.${optionProfonde.key}`]
        if (!retenu) continue

        const coloris = parCle(optionProfonde.options, retenu)
        if (coloris?.disableImageHandling === true) continue

        feuilles.push(retenu)
    }

    return feuilles
}

/** Les feuilles retenues sous une option principale, selon leur type. */
export const findDeepestInBranch = (deepOptions, selectedValues, mainKey) => {
    const feuilles = []

    for (const optionProfonde of deepOptions) {
        if (optionProfonde.disableImageHandling === true) continue

        const cheminProfond = `${mainKey}.${optionProfonde.key}`
        const retenu = selectedValues.deepOptions?.[cheminProfond]

        if (optionProfonde.type === 'color_selection') {
            const chemin = feuilleColoris(optionProfonde, retenu, mainKey)
            if (chemin) feuilles.push(chemin)

        } else if (optionProfonde.type === 'checkbox') {
            const chemin = feuilleCase(optionProfonde, retenu, mainKey)
            if (chemin) feuilles.push(chemin)

        } else if (optionProfonde.type === 'unique') {
            feuilles.push(...feuillesChoixUnique(optionProfonde, retenu, mainKey, cheminProfond, selectedValues))
        }
    }

    return feuilles
}

/**
 * Toutes les feuilles d'un champ profond, options principales confondues.
 *
 * Une principale sans sous-options, ou dont aucune feuille n'est retenue, ne
 * contribue rien : elle n'est pas une vraie feuille.
 */
export const extractDeepestOptions = (value, fieldInfo) => {
    if (fieldInfo.type !== 'deep_multiple' || !value.mainOptions) return null

    const feuilles = value.mainOptions.flatMap((cle) => {
        const principale = fieldInfo.field.options?.find((opt) => opt.key === cle)

        if (!principale || principale.disableImageHandling === true) return []
        if (!principale.deepOptions) return []

        return findDeepestInBranch(principale.deepOptions, value, cle)
    })

    return feuilles.length > 0 ? feuilles : null
}
