/*
   Les manipulations de sélection que les champs profonds refaisaient chacun de
   leur côté.

   `useChampOption` s'était arrêté à l'affichage, en notant que les gestionnaires
   de sélection différaient trop pour être rassemblés. C'est vrai des
   gestionnaires entiers — un choix unique et un choix multiple ne se ramènent
   pas l'un à l'autre. Ça ne l'est pas des trois gestes qu'ils enchaînent tous :
   lire la sélection du champ, basculer une valeur, oublier une branche.

   Ces trois gestes étaient recopiés onze fois. Aucune fonction ici ne connaît la
   forme des données d'un type de champ : elles travaillent sur des tables plates
   dont les clés sont des chemins (`fenetres.coloris`), ce que les six composants
   avaient déjà en commun sans le nommer.
*/

/** Recopie un défaut, pour qu'aucun appelant ne partage la table du voisin. */
const copie = (valeur) => {
    if (Array.isArray(valeur)) return [...valeur]
    if (valeur && typeof valeur === 'object') return { ...valeur }
    return valeur
}

/**
 * Lit la sélection d'un champ, ramenée à la forme attendue.
 *
 * Trois composants déclaraient un `getSelectedData` qui ne variait que par la
 * liste des propriétés attendues et leurs valeurs vides. Tous protégeaient le
 * même cas : le champ n'a encore rien reçu, ou porte une valeur d'une autre
 * forme — un tableau laissé par une version précédente de l'état.
 *
 * @param {object} selections État complet du configurateur.
 * @param {string} cleChamp
 * @param {object} forme Propriétés attendues, avec leur valeur vide.
 */
export const lireSelection = (selections, cleChamp, forme) => {
    const valeur = selections?.[cleChamp]
    const absente = typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)

    return Object.fromEntries(
        Object.entries(forme).map(([cle, defaut]) => [
            cle,
            absente || valeur[cle] === undefined || valeur[cle] === null ? copie(defaut) : valeur[cle],
        ])
    )
}

/**
 * Retient une valeur pour un chemin, ou l'oublie si c'était déjà elle.
 *
 * Le même « cliquer sur ce qui est retenu le retire » était écrit cinq fois,
 * chaque fois en trois branches autour d'un `delete`. La table d'origine n'est
 * pas modifiée : ces sélections viennent d'un prop.
 */
export const basculer = (table, chemin, valeur) => {
    const suite = { ...table }

    if (suite[chemin] === valeur) {
        delete suite[chemin]
    } else {
        suite[chemin] = valeur
    }

    return suite
}

/**
 * Oublie tout ce qui pend sous un chemin.
 *
 * Décocher une option doit emporter ce qu'elle avait ouvert : sans cela, un
 * coloris choisi sous une option retirée reste dans l'état, invisible mais
 * facturé. Quatre boucles `Object.keys().forEach()` faisaient ce ménage.
 */
export const sansBranche = (table, prefixe) =>
    Object.fromEntries(Object.entries(table || {}).filter(([chemin]) => !chemin.startsWith(prefixe)))

/** Les options retenues qu'une nouvelle option chasse. */
export const optionsEcartees = (options, retenues, cleAjoutee) => {
    const exclues = (options || []).find((option) => option.key === cleAjoutee)?.incompatibleWith || []

    return retenues.filter((cle) => cle !== cleAjoutee && exclues.includes(cle))
}

/**
 * Ajoute une option à celles retenues, en écartant ce qu'elle exclut.
 *
 * `configuratorLogic.handleIncompatibleOptions` fait presque cela, mais rend la
 * liste inchangée — sans l'ajout — quand l'option n'exclut rien : le cas le plus
 * courant. Les deux branches de `MultipleField` l'avaient donc réécrit.
 */
export const avecOption = (options, retenues, cleAjoutee) => {
    const ecartees = optionsEcartees(options, retenues, cleAjoutee)
    const conservees = retenues.filter((cle) => cle !== cleAjoutee && !ecartees.includes(cle))

    return [...conservees, cleAjoutee]
}
