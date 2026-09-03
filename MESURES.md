# Mesures

## En ligne — 3 septembre 2026

Lighthouse 13.4.1, émulation mobile (Moto G Power, 4G bridée, processeur ×4),
sur **https://nicoreirgen.github.io/conceptions-du-dahut/** — le site publié,
servi par GitHub Pages, et non plus une simulation d'hébergeur en local.

| page | Perf | Accessibilité | Bonnes pratiques | SEO | LCP | CLS | TBT | poids |
|---|---|---|---|---|---|---|---|---|
| accueil | 94 | 100 | 100 | 100 | 2,5 s | 0 | 5 ms | 466 Ko |
| produits | 99 | 100 | 100 | 100 | 2,1 s | 0 | 0 ms | 366 Ko |
| qui-sommes-nous | 98 | 100 | 100 | 100 | 2,0 s | 0 | 0 ms | 788 Ko |
| contact | 99 | 100 | 100 | 100 | 1,8 s | 0 | 0 ms | 283 Ko |
| produits/orion | 97 | 100 | 96 | 100 | 1,8 s | 0 | 22 ms | 265 Ko |
| sur-mesure | 94 | 100 | 96 | 100 | 2,6 s | 0 | 17 ms | 467 Ko |
| realisations | 100 | 100 | 100 | 100 | 1,7 s | 0 | 0 ms | 312 Ko |
| configurateur | 97 | 100 | 96 | 100 | 2,0 s | 0 | 40 ms | 178 Ko |
| mentions-legales | 99 | 100 | 100 | 100 | 1,8 s | 0 | 6 ms | 184 Ko |

**Moyennes : performance 97, accessibilité 100, bonnes pratiques 99, SEO 100.**
Décalage cumulé nul partout, LCP moyen 2,0 s, poids moyen 368 Ko.

Deux choses ont été trouvées par cette campagne.

**Le favicon renvoyait 404 sur toutes les pages.** Sans `<link rel="icon">`, le
navigateur va le chercher à la racine du domaine — hors du sous-chemin de
publication. C'était la seule erreur console du site, et elle coûtait quatre
points de bonnes pratiques partout. Corrigé : la balise est déclarée avec la
baseURL.

**Trois pages gardent 96 en bonnes pratiques**, pour une exception
`AbortError: Transition was skipped`. Elle vient des transitions de vue
natives (`experimental.viewTransition`) : quand le navigateur abandonne une
transition, la promesse `finished` est rejetée, et personne ne l'attrape. Le
rejet survient surtout quand le document n'est pas au premier plan, ce qui est
le cas sous Lighthouse en mode headless — un visiteur réel le rencontrera
rarement. Se réglerait en interceptant ce rejet précis.

### Ce que l'hébergeur apporte, et ce qu'il coûte

GitHub Pages compresse lui-même en gzip : les variantes brotli produites au
build ne sont jamais servies, et sont écartées de la branche publiée.

Il pose en revanche `cache-control: max-age=600` sur **tout**, y compris les
fichiers versionnés par empreinte de `_nuxt/`, qui pourraient être gardés un an.
Lighthouse le signale : 408 Kio rechargés sans raison d'une visite à l'autre.
C'est le seul point que Pages ne permet pas de corriger — aucun contrôle sur les
en-têtes. Un hébergeur qui les laisse régler (Cloudflare Pages, Netlify) le
supprimerait.

## Empreinte environnementale — 3 septembre 2026

**Website Carbon : note A.**

| page | CO2 par visite | plus propre que | sur 10 000 visites/mois |
|---|---|---|---|
| accueil | 0,06 g | 90 % des pages du web | 6,95 kg CO2e/an |
| qui-sommes-nous | 0,08 g | 87 % des pages du web | 9,11 kg CO2e/an |

**EcoIndex : note C.** Mesuré en 1920×1080, page entièrement déroulée.

| page | note | score | poids | requêtes | nœuds DOM | GES |
|---|---|---|---|---|---|---|
| accueil | C | 66 | 624 Ko | 54 | 438 | 1,68 gCO2e |
| qui-sommes-nous | C | 68 | 932 Ko | 49 | 378 | 1,64 gCO2e |
| contact | B | 72 | 319 Ko | 41 | 407 | 1,56 gCO2e |

Les deux outils divergent parce qu'ils ne mesurent pas la même chose : Website
Carbon ne regarde que le poids transféré, où le site est excellent ; EcoIndex
pèse aussi le nombre de requêtes et la taille du DOM. C'est le nombre de
requêtes qui coûte ici — EcoIndex charge la page entière, donc toutes les images
différées, et chaque image du site en compte une.

**L'hébergement n'est pas vert.** L'API de la Green Web Foundation ne recense
pas `nicoreirgen.github.io` ; Website Carbon estime qu'un hébergeur vert
retirerait 9 % de l'empreinte. C'est le levier le plus court, et il ne demande
aucune ligne de code.

## Avant la mise en ligne — août 2026

Lighthouse 12, mêmes conditions d'émulation, sur le site statique servi en local
avec compression brotli et en-têtes de cache — une simulation d'hébergeur réel.
Conservé pour comparaison : la mise en ligne a fait gagner deux points de
performance en moyenne, l'hébergeur réel se révélant meilleur que sa simulation.

| page | Perf | Accessibilité | Bonnes pratiques | SEO | LCP |
|---|---|---|---|---|---|
| accueil | 93 | 100 | 100 | 100 | 3,1 s |
| produits | 93 | 100 | 100 | 100 | 2,6 s |
| qui-sommes-nous | 97 | 100 | 100 | 100 | 2,3 s |
| contact | 97 | 100 | 100 | 100 | 2,3 s |
| ford-ranger | 96 | 100 | 100 | 100 | 2,6 s |
| sur-mesure | 94 | 100 | 100 | 100 | 2,9 s |
| réalisations | 94 | 100 | 100 | 100 | — |
| configurateur | 97 | 100 | 100 | 100 | — |
| mentions-legales | 97 | 100 | 100 | 100 | — |

**Moyennes : performance 95, accessibilité 100, bonnes pratiques 100, SEO 100.**

Le SEO plafonnait alors à 92 sur cinq pages, faute de meta description. Elles ont
été rédigées depuis, page par page, ainsi que les textes alternatifs des images
et les six fiches produits restées vides.

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

Sur le site en ligne, ce qui est désormais la mesure de référence :

```bash
npx lighthouse https://nicoreirgen.github.io/conceptions-du-dahut/ \
  --chrome-flags="--headless=new" --view
```

En local, avant publication — le serveur de mesure sert les fichiers
pré-compressés et pose des en-têtes de cache longs ; mesurer avec un serveur
statique nu donnerait un poids transféré deux fois supérieur à la réalité, et
un hébergeur réel ne se comporte pas comme lui (voir plus haut le cache de
GitHub Pages) :

```bash
npm run assets && npm run generate
node scripts/serve-static.mjs 3010 /conceptions-du-dahut
```

## Reproduire les mesures d'empreinte

```bash
# EcoIndex : dépôt d'une tâche, puis relecture par son identifiant
curl -X POST https://api.ecoindex.fr/v1/tasks/ecoindexes/ \
  -H 'Content-Type: application/json' \
  -d '{"web_page":{"url":"https://nicoreirgen.github.io/conceptions-du-dahut/","width":1920,"height":1080}}'
curl https://api.ecoindex.fr/v1/tasks/ecoindexes/<identifiant>

# Hébergeur vert ou non
curl https://api.thegreenwebfoundation.org/greencheck/nicoreirgen.github.io
```

Website Carbon demande désormais une clé pour son API : la mesure passe par son
formulaire, sur websitecarbon.com.
