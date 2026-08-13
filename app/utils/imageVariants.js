/**
 * Dérivation des variantes d'une image à partir de son chemin.
 *
 * Les images du configurateur sont désignées par des chemins `.jpg` construits
 * par sa logique de résolution d'options, qu'on ne modifie pas. Les variantes
 * AVIF et WebP produites par `scripts/optimize-images.mjs` portent le même nom,
 * suffixé par leur largeur.
 */

/** Largeurs générées pour les images du configurateur. */
export const CONFIGURATOR_WIDTHS = [960, 1920]

/**
 * srcset d'une image du configurateur, dans le format demandé.
 *
 * La plus grande largeur ne porte pas de suffixe, comme à la génération.
 *
 * @param {string} src    Chemin `.jpg` ou `.png`.
 * @param {string} format « avif » ou « webp ».
 * @returns {string} Valeur de srcset, ou chaîne vide si le chemin n'est pas matriciel.
 */
export const configuratorSrcset = (src, format) => {
    if (!src || !/\.(jpe?g|png)$/i.test(src)) {
        return ''
    }

    const base = src.replace(/\.(jpe?g|png)$/i, '')
    const largest = CONFIGURATOR_WIDTHS.at(-1)

    return CONFIGURATOR_WIDTHS.map(
        (width) => `${base}${width === largest ? '' : `@${width}`}.${format} ${width}w`
    ).join(', ')
}
