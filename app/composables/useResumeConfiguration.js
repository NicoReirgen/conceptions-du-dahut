import { etapesAPlat } from '~~/app/composables/useEtapesVehicule'

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
   sélection, il rend un tableau de groupes, chacun portant `stepKey`,
   `stepName` et une liste de lignes `{ name, price, pricePrefix }`.
*/

const findOption = (options, key) => options?.find((opt) => opt.key === key)

/** Une ligne du récapitulatif. */
const ligne = (nom, prix = 0, prefixe = '') => ({
    name: nom,
    price: prix || 0,
    pricePrefix: prefixe || '',
})

/*
   La ligne d'une option, sous son propre nom ou sous un autre.

   `createOptionItem(option.name, option.price, option.pricePrefix)` était
   recopié dix fois ; seul le nom variait vraiment.
*/
const ligneDeLOption = (option, nom = option.name) => ligne(nom, option.price, option.pricePrefix)

export const resumeConfiguration = (steps, selectedOptions) => etapesAPlat(steps)
    .map((etape) => resumeDeLEtape(etape, selectedOptions))
    .filter((groupe) => groupe !== null)

const resumeDeLEtape = (etape, selections) => {
    if (!etape.fields?.length) return null

    const options = etape.fields.flatMap((champ) => {
        const valeur = selections[champ.key]

        return valeur ? lignesDuChamp(champ, valeur) : []
    })

    if (options.length === 0) return null

    return {
        stepKey: etape.key,
        stepName: etape.name || etape.title || 'Options',
        options,
    }
}

/* -------------------------------------------------------- par type de champ */

/** Choix unique ou liste déroulante, avec sa sous-option éventuelle. */
const lignesSimples = (champ, valeur) => {
    if (typeof valeur === 'string') {
        const option = findOption(champ.options, valeur)

        return option ? [ligneDeLOption(option)] : []
    }

    const principale = valeur?.main ? findOption(champ.options, valeur.main) : null
    if (!principale) return []

    const sous = valeur.sub ? findOption(principale.subOptions, valeur.sub) : null
    if (!sous) return [ligneDeLOption(principale)]

    // Une seule ligne pour l'ensemble, au prix cumulé.
    return [ligne(
        `${principale.name} - ${sous.name}`,
        (principale.price || 0) + (sous.price || 0),
        sous.pricePrefix || principale.pricePrefix
    )]
}

const lignesDesClesRetenues = (options, cles) => cles.flatMap((cle) => {
    const option = findOption(options, cle)

    return option ? [ligneDeLOption(option)] : []
})

/*
   Le coloris retenu sous une option cochée.

   `MultipleField` en retient un seul par option et l'écrit sous forme de clé ;
   le récapitulatif n'acceptait qu'un tableau et laissait donc tomber la ligne,
   dans l'affichage comme dans la demande de devis. Les deux formes sont
   désormais lues. Aucun champ du catalogue n'ouvre de coloris à ce niveau
   aujourd'hui — le jour où l'un le fera, il paraîtra.
*/
const lignesDesColoris = (champ, coloris) => Object.entries(coloris || {}).flatMap(([cleOption, retenu]) => {
    const option = findOption(champ.options, cleOption)
    if (!option) return []

    return (Array.isArray(retenu) ? retenu : [retenu]).flatMap((cle) => {
        const sous = findOption(option.subOptions, cle)

        return sous ? [ligneDeLOption(sous, `${option.name} - ${sous.name}`)] : []
    })
})

/*
   Choix multiple. La forme simple est une liste de clés ; dès qu'une option
   ouvre des coloris, c'est `{ options, subOptions }`.

   Une troisième forme était traitée ici — des quantités imbriquées par
   sous-option — qu'aucun champ ne produit : seuls les ouvrants portent des
   quantités, et ils ont leur propre traitement.
*/
const lignesMultiples = (champ, valeur) => {
    if (Array.isArray(valeur)) return lignesDesClesRetenues(champ.options, valeur)
    if (typeof valeur !== 'object' || valeur === null) return []

    return [
        ...lignesDesClesRetenues(champ.options, valeur.options || []),
        ...lignesDesColoris(champ, valeur.subOptions),
    ]
}

/*
   Choix multiple à options profondes.

   C'était une pyramide de 71 lignes sur six niveaux, où les trois types
   d'option profonde — coloris, case à cocher, choix unique — se partageaient
   une pile de `if`. Le calcul des prix et celui des images avaient déjà été
   dépliés de la même façon : une fonction par type, et un aiguillage.
*/
const lignesProfondes = (champ, valeur) => {
    if (!Array.isArray(valeur?.mainOptions)) return []

    return valeur.mainOptions.flatMap((cle) => {
        const principale = findOption(champ.options, cle)
        if (!principale) return []

        return [
            ligneDeLOption(principale),
            ...(principale.deepOptions || []).flatMap(
                (profonde) => lignesDeLOptionProfonde(profonde, `${cle}.${profonde.key}`, valeur)
            ),
        ]
    })
}

const lignesDeLOptionProfonde = (profonde, chemin, valeur) => {
    const retenu = valeur.deepOptions?.[chemin]
    if (!retenu) return []

    if (profonde.type === 'color_selection') {
        const coloris = findOption(profonde.options, retenu)

        return coloris ? [ligneDeLOption(coloris, `- ${profonde.title}: ${coloris.name}`)] : []
    }

    // Une case cochée porte sa propre clé pour valeur.
    if (profonde.type === 'checkbox') {
        return [ligneDeLOption(profonde, `- ${profonde.name}`)]
    }

    if (profonde.type !== 'unique') return []

    const choisie = findOption(profonde.options, retenu)
    if (!choisie) return []

    return [
        ligneDeLOption(choisie, `- ${choisie.name}`),
        ...(choisie.deepOptions || []).flatMap(
            (sousProfonde) => lignesDuColorisProfond(
                sousProfonde,
                `${chemin}.${choisie.key}.${sousProfonde.key}`,
                valeur
            )
        ),
    ]
}

/* Quatrième niveau : seuls les coloris y descendent. */
const lignesDuColorisProfond = (sousProfonde, chemin, valeur) => {
    if (sousProfonde.type !== 'color_selection') return []

    const retenu = valeur.subDeepOptions?.[chemin]
    const coloris = retenu ? findOption(sousProfonde.options, retenu) : null

    return coloris ? [ligneDeLOption(coloris, `  - ${sousProfonde.title}: ${coloris.name}`)] : []
}

/** Ouvrants : des quantités, plus une option facultative qui peut être peinte. */
const lignesDesOuvrants = (champ, valeur) => {
    const quantites = Object.entries(valeur.quantities || {}).flatMap(([cle, nombre]) => {
        if (!(nombre > 0)) return []

        const option = findOption(champ.options?.main?.options, cle)

        return option
            ? [ligne(`${option.name} (x${nombre})`, (option.price || 0) * nombre, option.pricePrefix)]
            : []
    })

    const facultative = champ.options?.optional
    if (!valeur.optional || !facultative) return quantites

    const peinture = valeur.painting ? facultative.subOptions?.[0] : null

    return [
        ...quantites,
        ligneDeLOption(facultative),
        ...(peinture ? [ligneDeLOption(peinture, `- ${peinture.name}`)] : []),
    ]
}

const LIGNES_PAR_TYPE = {
    select: lignesSimples,
    unique: lignesSimples,
    multiple: lignesMultiples,
    deep_multiple: lignesProfondes,
    openings: lignesDesOuvrants,
}

const lignesDuChamp = (champ, valeur) => {
    const composer = LIGNES_PAR_TYPE[champ.type]

    // Un type sans traitement ne produit rien plutôt que d'échouer.
    return composer ? composer(champ, valeur) : []
}
