import { configuratorLogic } from '~~/app/composables/useConfigurator'

/*
   Ce que les six composants de champ du configurateur faisaient chacun de leur
   côté.

   Les gros gestionnaires de sélection ne sont pas ici : ils diffèrent
   réellement d'un type de champ à l'autre, parce que les formes de données
   diffèrent. Les rassembler serait une réécriture, pas une factorisation.

   Ce fichier ne prend que ce qui était rigoureusement identique — ou recopié à
   la virgule près avec des variantes involontaires.
*/

/**
 * Étiquette de prix d'une option, telle qu'affichée sur sa carte.
 *
 * Huit gabarits construisaient cette chaîne à la main, chacun oubliant une
 * variante : l'un ignorait le préfixe (« à partir de »), les autres le
 * complément (« /par fenêtre »). Une seule option porte un préfixe et deux
 * portent un complément — les oublis ne se voyaient donc que par endroits.
 *
 * @param {object} option
 * @return {string} Vide si l'option est incluse, sinon « à partir de +8485€ ».
 */
export const prixLisible = (option) => {
    if (!option || option.price === 0 || option.price === undefined) {
        return ''
    }

    const prefixe = option.pricePrefix || ''
    const signe = option.price > 0 ? '+' : ''
    const complement = option.price_comment || ''

    return `${prefixe}${signe}${option.price}€${complement}`
}

/**
 * Libellé d'accessibilité d'une carte d'option.
 *
 * Les gabarits écrivaient « Option: X, Price: 1454€ » — de l'anglais au milieu
 * d'un site français, lu tel quel par les lecteurs d'écran.
 *
 * @param {object} option
 * @param {{ incompatibleAvec?: string }} [contexte]
 */
export const libelleOption = (option, contexte = {}) => {
    const prix = prixLisible(option)
    const morceaux = [option?.name || '']

    if (prix) {
        morceaux.push(prix)
    }
    if (contexte.incompatibleAvec) {
        morceaux.push(`incompatible avec ${contexte.incompatibleAvec}`)
    }

    return morceaux.join(', ')
}

/**
 * Une couleur de pastille est-elle assez foncée pour porter une coche blanche ?
 *
 * Trois composants déclaraient une fonction du même nom qui ne faisait que
 * réexpédier vers `configuratorLogic` — trois passe-plats identiques, dont la
 * seule raison d'être était de rendre l'appel disponible dans le gabarit.
 */
export const contrasteSuffisant = (hex) => configuratorLogic.hasEnoughContrast(hex)

/**
 * Une option profonde est-elle celle retenue ?
 *
 * Écrit au caractère près dans les deux champs profonds, dont il ne reste que
 * `DeepMultipleField` — l'autre servait un véhicule jamais ouvert.
 */
export const optionProfondeChoisie = (donnees, cleParente, cleProfonde, cleOption) =>
    donnees?.deepOptions?.[`${cleParente}.${cleProfonde}`] === cleOption
