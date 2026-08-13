import { champsRetenus } from '~~/app/composables/images/champsImage'
import { cheminPour, generateFallbackUrls } from '~~/app/composables/images/cheminsImage'

/*
   L'aperçu du véhicule configuré.

   Ce module était un objet de 938 lignes qui mêlait cinq métiers : détecter les
   champs concernés, traduire une sélection en segments, descendre aux feuilles
   d'un champ profond, composer les chemins, et un journal de débogage. Chacun
   vit désormais dans `composables/images/`, en fonctions libres :

     optionsImage    le vocabulaire, et la règle `disableImageHandling`
     feuillesImage   les feuilles d'un champ à choix multiple profond
     valeursImage    une sélection → un segment de chemin
     champsImage     quels champs comptent, et lesquels sont renseignés
     cheminsImage    la composition des chemins et de leurs replis

   Il ne reste ici que ce qui a une durée de vie : la dernière liste de replis,
   dont le composant se sert quand une image ne charge pas.
*/

let derniersReplis = []

/**
 * L'URL d'aperçu d'une configuration, ses replis préparés au passage.
 *
 * Il n'y a pas de version asynchrone. Elle chargeait l'image entière pour
 * savoir si elle existait — 41 Ko de JPEG par changement d'option, jamais
 * affichés, avant les 26 Ko d'AVIF réellement montrés. C'est l'échec de
 * chargement qui déclenche le repli, et il ne coûte rien quand le fichier est
 * là.
 */
export const getVehicleImageSync = (selectedOptions, vehicleId, vehicleSteps) => {
    // Une seule détection des champs, d'où sortent l'URL et ses replis.
    const retenus = champsRetenus(selectedOptions, vehicleSteps)

    derniersReplis = generateFallbackUrls(retenus, vehicleId)

    return cheminPour(retenus, vehicleId)
}

/** Les replis de la dernière résolution, du plus proche au plus général. */
export const getLastFallbacks = () => derniersReplis

/*
   Le repli suivant, parmi ceux qui n'ont pas encore échoué.

   L'appelant se souvient de ce qu'il a essayé : sans cette mémoire, il
   repartait sur le premier de la liste dès qu'il n'était plus l'image
   courante, et deux replis en échec se renvoyaient la balle sans fin.
*/
export const repliSuivant = (deja = []) => getLastFallbacks().find((url) => !deja.includes(url)) || null

export const useVehicleImages = () => ({ getVehicleImageSync, getLastFallbacks, repliSuivant })
