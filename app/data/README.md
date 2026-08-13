# Modifier le catalogue du configurateur

`orion.json` décrit tout ce que le configurateur propose : les véhicules, les
étapes, les champs, les options, leurs prix, et le lien de chacune avec son
image d'aperçu. 922 lignes, profondeur 14.

Il est **importé à la compilation**. Une modification n'existe donc en ligne
qu'après avoir régénéré et redéployé le site.

Ce mode d'emploi existe parce que la moitié de ce fichier n'est pas éditoriale :
c'est de la mécanique, dont les règles ne se devinent pas en lisant le JSON. On
les redécouvre en cassant quelque chose — et le plus souvent, ça casse sans rien
dire.

---

## Avant de publier

```bash
npm run verify       # lint, contrôles du catalogue, tests
npm run generate     # contrôle le catalogue, génère le site, vérifie les routes
```

`npm run verify` refuse de passer sur une incohérence. C'est le filet : si une
modification du catalogue le fait échouer, ne pas contourner — le message dit ce
qui ne va pas, et la section « Quand un contrôle refuse » en donne la lecture.

---

## Changer un prix

Le plus simple, et le plus courant. Les prix vivent sur les options, jamais sur
les champs :

```json
{ "key": "tiroirs", "name": "Tiroirs", "price": 1454 }
```

- **`price: 0`** s'affiche « Inclus », pas « 0 € ».
- **`pricePrefix`** précède le montant : `"à partir de "` donne « à partir de
  +8485€ ». L'espace final compte.
- **`price_comment`** le suit : `"/par fenêtre"` donne « +366€/par fenêtre ».

Une sous-option (un coloris) porte son propre prix, ajouté à celui de son
option. Le total du tunnel est recalculé à chaque clic ; rien à mettre à jour
ailleurs.

---

## Ajouter une option

Trois choses vont ensemble, et **la deuxième est celle qu'on oublie**.

**1. L'entrée dans le catalogue.** À côté de ses voisines, dans le même champ :

```json
{ "key": "banquette", "name": "Banquette", "price": 890 }
```

S'en tenir aux minuscules, chiffres, tirets et blancs soulignés : la clé sert
telle quelle de nom de dossier, et sa version normalisée de nom de fichier. Une
majuscule survit dans l'un et disparaît dans l'autre. Elle doit aussi être
unique parmi ses voisines directes — le contrôle le vérifie.

**2. Les images, si le champ participe à l'aperçu** (voir `traitementImage`
plus bas). Les originaux vont dans `assets-source/`, jamais dans `public/` :

```bash
# un fichier par rendu, nommé d'après la clé de l'option
assets-source/images/orion/<champ>/<clé>.jpg

npm run images          # en dérive les variantes AVIF, WebP et le repli JPEG
```

Puis régénérer le manifeste des originaux, sans quoi il ignorera les nouveaux
fichiers — et la sauvegarde qu'on vérifiera plus tard les croira absents :

```bash
npm run manifeste:assets   # reconstruit assets-source.sha256
npm run verify:assets      # doit repasser au vert
```

**3. La vérification.** `npm run verify:catalogue` dit si une combinaison
attendue n'a pas son dossier.

---

## Ce qu'on ne renomme jamais

**Les clés.** La clé d'une option **est** le nom de son dossier ou de son
fichier image. Renommer `stratifie` en `stratifié` ne casse rien de visible :
l'aperçu se rabat en silence sur une image plus générale, et personne ne s'en
aperçoit avant de comparer deux captures.

905 fichiers dépendent de cette convention. Le contrôle au build compare les
clés du catalogue à l'arborescence d'images et refuse une clé orpheline — mais
il ne peut pas deviner qu'un renommage était volontaire. **Renommer une clé, si
c'est vraiment nécessaire, veut dire renommer les fichiers en même temps**, côté
`assets-source/`, puis relancer `npm run images`.

---

## Les drapeaux, et ce qu'ils font

**Sur un champ :**

| | effet |
|---|---|
| `traitementImage: true` | le champ participe au chemin de l'aperçu. Cinq champs l'ont ; les autres — chassis, isolation, ouvrants — ne changent pas l'image |
| `independant: true` | son image existe seule et ne s'imbrique pas avec les autres sélections (équipements extérieurs) |
| `hasDefaultOption: true` | le champ retient une option par défaut tant que rien d'autre n'est coché |
| `required` | bloque « Suivant » tant que rien n'est retenu |

**Sur une option :**

| | effet |
|---|---|
| `disableImageHandling: true` | l'option est retenue et facturée, mais ignorée pour l'image — elle ne change pas le rendu |
| `isDefault: true` | c'est l'option de repli du champ ; elle s'efface dès qu'une autre est cochée |
| `hidden: true` | l'option n'est pas montrée ; elle sert de valeur de départ (le « Base » du mobilier) |
| `incompatibleWith: []` | cocher cette option décoche celles qu'elle nomme, et les grise |
| `quantity: { min, max }` | bornes du sélecteur, pour les ouvrants |
| `hexa` | la pastille de coloris ; la coche s'y pose en blanc ou en noir selon le contraste |
| `redirect` | **inerte** : il envoyait vers un autre véhicule, mais le composant qui le lisait a été supprimé (voir le champ `deep_unique` du véhicule « Autres ») |

---

## Comment un chemin d'image se compose

**La dernière sélection donne le dossier principal, les précédentes forment les
sous-dossiers.** Le dossier porte la clé du champ, le fichier celle de l'option.

```
mobilier seul            /assets/images/orion/mobilier/tiroirs.jpg
+ une finition           /assets/images/orion/finitions/stratifie-bleu_velvet/mobilier/tiroirs.jpg
+ des parements          /assets/images/orion/parements/sol-bouleau_vernis/finitions/…/mobilier/tiroirs.jpg
```

Une option et son coloris se joignent par un tiret : `stratifie-bleu_velvet`.
Plusieurs options cochées se joignent de même, **triées par ordre alphabétique**
— c'est ce qui rend le nom de fichier indépendant de l'ordre dans lequel le
visiteur a coché.

Si le fichier attendu n'existe pas, l'aperçu se rabat sur une image plus
générale, en retirant les sélections une à une jusqu'à l'image du véhicule nu.
**C'est silencieux** : le visiteur voit une image plausible, mais pas la sienne.
D'où les contrôles.

---

## Quand un contrôle refuse

> **« Clé X déclarée deux fois au même niveau »**
> Deux voisines portent la même clé : le chemin d'image devient ambigu.

> **« X participe aux images mais n'apparaît nulle part dans public/assets/images/orion »**
> Une clé sans fichier correspondant. Soit la clé a été renommée, soit les
> rendus manquent.

> **« la combinaison finitions/x-y n'a pas de dossier d'images »**
> Une option et un coloris dont la paire n'a pas de rendus. Il en faut, ou il
> faut retirer le coloris.

> **« X est de type Y, qu'aucun composant n'affiche »**
> Le catalogue déclare un type de champ que l'interface ne sait pas rendre :
> l'étape s'afficherait vide et ne coûterait rien. Les types acceptés sont ceux
> que `app/components/van/StepContent.vue` aiguille.

> **« X se déclare incompatible avec Y, qui n'existe pas »**
> Une incompatibilité qui vise une clé disparue ou mal orthographiée : elle ne
> s'appliquerait jamais.

Un avertissement `⚠︎` ne bloque pas : il concerne un véhicule fermé
(`soonAvailable`), dont les données ont le droit d'être incomplètes. Il
deviendra bloquant le jour où ce véhicule ouvrira.
