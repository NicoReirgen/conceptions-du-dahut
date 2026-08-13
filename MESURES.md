# Mesures

Lighthouse 12, émulation mobile (Moto G Power, 4G bridée, processeur ×4), sur le
site statique servi avec compression brotli et en-têtes de cache — soit les
conditions d'un hébergeur réel.

## Scores

| page | Perf | Accessibilité | Bonnes pratiques | SEO | LCP | CLS | TBT | poids |
|---|---|---|---|---|---|---|---|---|
| accueil | 93 | 100 | 100 | 100 | 3,1 s | 0 | 0 ms | 481 Ko |
| produits | 93 | 100 | 100 | 100 | 2,6 s | 0 | 0 ms | 391 Ko |
| qui-sommes-nous | 97 | 100 | 100 | 100 | 2,3 s | 0 | 0 ms | 536 Ko |
| contact | 97 | 100 | 100 | 100 | 2,3 s | 0 | 0 ms | 309 Ko |
| ford-ranger | 96 | 100 | 100 | 100 | 2,6 s | 0 | 0 ms | 724 Ko |
| sur-mesure | 94 | 100 | 100 | 100 | 2,9 s | 0 | 0 ms | 488 Ko |
| réalisations | 94 | 100 | 100 | 100 | — | 0 | 0 ms | — |
| configurateur | 97 | 100 | 100 | 100 | — | 0 | 0 ms | — |
| mentions-legales | 97 | 100 | 100 | 100 | — | 0 | 0 ms | — |

**Moyennes : performance 95, accessibilité 100, bonnes pratiques 100, SEO 100.**
Décalage cumulé nul et temps de blocage nul sur toutes les pages.

Le SEO plafonnait à 92 sur cinq pages, faute de meta description. Elles ont été
rédigées depuis, page par page, ainsi que les textes alternatifs des images et
les six fiches produits restées vides. Plus aucun audit Lighthouse n'échoue sur
l'ensemble du site : ce qui reste est du contenu éditorial, pas de la technique
— voir la section suivante.

## Poids des assets

| poste | avant | après | facteur |
|---|---|---|---|
| une image du configurateur | 1351 Ko | 27 Ko | ×51 |
| images du configurateur (total) | 238 Mo | 22,8 Mo | ×10 |
| vidéo de présentation | 82 Mo | 4,3 Mo (AV1) | ×19 |
| polices | 220 Ko | 52 Ko | ×4 |
| médias WordPress publiés | 742 Mo | 24 Mo | ×31 |
| **dossier publié** | **371 Mo** | **70 Mo** | **×5** |

Côté code : JavaScript livré ramené à 135 Ko compressés, `gsap` et `swiper`
retirés des dépendances, HTML de l'accueil passé de 109 à 83 Ko.

## Ce que la mesure a révélé

Quatre défauts que seule la mesure a permis de trouver, chacun invisible à la
lecture du code.

**Les polices renvoyaient 404.** Déclarées en `/assets/fonts/*.ttf`, elles
n'avaient jamais été copiées dans le dossier servi : le site s'affichait avec la
police système.

**Le site ne défilait pas.** Le CSS pose `body { overflow: hidden }` et ne le
libère que sur `body.loaded` — une classe que rien, pas même le thème d'origine,
n'ajoutait jamais. Tout le contenu marqué `.animate` restait par ailleurs
invisible, faute du script qui le révélait.

**Des images échappaient au pipeline.** Huit points d'appel utilisaient encore
une balise `<img>` brute : 412 Ko de JPEG servis là où l'AVIF existait.

**Le CSS du configurateur fuyait sur tout le site.** C'est le plus coûteux à
diagnostiquer : `app/pages/configurateur.vue` portait un bloc `<style>` non
scopé stylant `html`, `p`, `h2`, `h3`, `a`, `img` — 51 sélecteurs globaux. Nuxt
préfetchant ce chunk depuis n'importe quelle page, et ces règles n'étant dans
aucune couche CSS, elles l'emportaient sur le `@layer base` de Tailwind.
Résultat : environ deux secondes après le chargement, `p { font-size: 1rem }`
faisait passer les paragraphes d'introduction de 31 px à 12 px.

Le décalage mesuré atteignait 0,27 sur les pages riches en texte — au-delà du
seuil « mauvais » de 0,25. Quatre hypothèses ont été testées et écartées avant
d'isoler la vraie cause : imbrication de `<picture>`, animations au défilement,
préloader, inlining du CSS. Aucune n'était en jeu.

Après confinement des règles sous `.configurateur-layout` :
qui-sommes-nous 82 → 97, sur-mesure 79 → 94, décalage 0,27 → 0.

**Le configurateur ne s'affichait pas.** Son catalogue de véhicules passait par
`$fetch('/api/configurator/vehicles')`, une route serveur. Le site étant
entièrement prégénéré, aucun serveur n'y répond : la requête retournait 404 et
l'étape 1 restait vide. Or cette route n'était qu'un relais vers un tableau
constant déjà présent dans le bundle client — l'appeler directement supprime la
requête et rend le configurateur indépendant de l'hébergeur.

Une fois l'étape rendue, deux défauts sont apparus derrière le premier :
« Orion », seul véhicule sélectionnable, s'affichait en blanc sur blanc — le
panneau clair héritait la couleur de texte du site, qui est sombre. Et le fil
d'Ariane écrivait en #B1B1B1 sur blanc, soit 2,14:1 pour un texte de 7,5 px.
Après correction : accessibilité 94 → 100.

## Reproduire

```bash
npm run assets && npm run generate
node scripts/serve-static.mjs 3010
```

Puis Lighthouse sur `http://localhost:3010`. Le serveur de mesure sert les
fichiers pré-compressés et pose les en-têtes de cache : mesurer avec un serveur
statique nu donnerait un poids transféré deux fois supérieur à la réalité.

## Reste à mesurer

Le score Website Carbon dépend de l'hébergeur — il vérifie sa présence dans la
base de la Green Web Foundation. Il ne pourra être établi qu'une fois le site
déployé. EcoIndex, qui pèse le nombre d'éléments du DOM, le nombre de requêtes
et le poids, se mesure lui aussi sur une URL publique.
