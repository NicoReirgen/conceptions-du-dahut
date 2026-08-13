/*
   La navigation entre les étapes d'un véhicule.

   Le catalogue décrit des étapes dont certaines portent des sous-étapes ; le
   tunnel, lui, les parcourt à plat — un écran à la fois. Traduire l'une en
   l'autre occupait six calculs du composant, chacun redescendant
   l'arborescence à sa façon, et l'étape courante était recalculée par six
   appelants au lieu d'être lue.

   Les deux fonctions du haut sont pures : elles ne connaissent ni Vue ni le
   composant, et se testent avec un tableau d'étapes.
*/

/** Les étapes telles que le tunnel les parcourt : sous-étapes dépliées. */
export const etapesAPlat = (etapes) => (etapes || []).flatMap((etape) => etape.subSteps || etape)

/** L'écran d'un rang donné, sous-étapes comprises. Le rang 1 est le véhicule. */
export const etapeAuRang = (etapes, rang) => {
    if (rang === 1) {
        return { key: 'model_selection', name: 'Modèle', type: 'vehicle' }
    }

    let rangCourant = 1

    for (const etape of etapes) {
        if (!etape.subSteps) {
            if (rang === rangCourant + 1) return etape

            rangCourant += 1
            continue
        }

        if (rang <= rangCourant + etape.subSteps.length) {
            const rangInterne = rang - rangCourant - 1

            return {
                ...etape.subSteps[rangInterne],
                subStepIndex: rangInterne,
                totalSubSteps: etape.subSteps.length,
            }
        }

        rangCourant += etape.subSteps.length
    }

    return null
}

/**
 * Tous les champs d'un véhicule, étapes et sous-étapes confondues.
 *
 * Trois endroits redescendaient cette arborescence de leur côté — l'entrée
 * dans un véhicule, la recherche d'un champ par sa clé, l'initialisation des
 * valeurs — le premier sur quatre niveaux d'imbrication.
 */
export const champsDuVehicule = (etapes) => (etapes || []).flatMap(
    (etape) => etape.subSteps
        ? etape.subSteps.flatMap((sousEtape) => sousEtape.fields || [])
        : (etape.fields || [])
)

/**
 * @param {import('vue').Ref} etapes           Étapes du véhicule retenu.
 * @param {import('vue').Ref} vehiculeRetenu   Null tant qu'aucun n'est choisi.
 * @param {import('vue').Ref} rangCourant      Écran affiché, à partir de 1.
 */
export const useEtapesVehicule = (etapes, vehiculeRetenu, rangCourant) => {
    const etapesDeployees = computed(() => etapesAPlat(etapes.value))

    const nombreDEtapes = computed(
        () => 1 + etapes.value.reduce((total, etape) => total + (etape.subSteps?.length || 1), 0)
    )

    const etapeCourante = computed(() => {
        if (!vehiculeRetenu.value) {
            return { key: 'model_selection', name: 'choix', type: 'vehicle' }
        }

        return etapeAuRang(etapes.value, rangCourant.value)
    })

    const estDerniereEtape = computed(() => rangCourant.value === nombreDEtapes.value)

    /* Le fil d'Ariane : une entrée par écran. */
    const toutesLesSousEtapes = computed(() => {
        const depart = [{ key: 'model_selection', name: 'Choix produit', type: 'vehicle' }]

        return vehiculeRetenu.value ? [...depart, ...etapesDeployees.value] : depart
    })

    /* La barre de progression : une entrée par étape principale, numérotée. */
    const toutesLesEtapes = computed(() => {
        const depart = [{ key: 'model_selection', name: '1. Modèle', type: 'vehicle' }]
        if (!vehiculeRetenu.value) return depart

        return [
            ...depart,
            ...etapes.value.map((etape, rang) => ({ ...etape, name: `${rang + 2}. ${etape.name}` })),
        ]
    })

    return {
        etapesAPlat: etapesDeployees,
        etapeCourante,
        estDerniereEtape,
        nombreDEtapes,
        toutesLesEtapes,
        toutesLesSousEtapes,
    }
}
