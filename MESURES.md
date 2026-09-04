# Mesures

## En ligne — état figé au 3 septembre 2026, après reprise

Lighthouse 13.4.1, émulation mobile (Moto G Power, 4G bridée, processeur ×4),
sur **https://nicoreirgen.github.io/conceptions-du-dahut/**.

| page | Perf | Accessibilité | Bonnes pratiques | SEO | LCP | CLS | poids |
|---|---|---|---|---|---|---|---|
| accueil | 94 | 100 | 100 | 100 | 2,6 s | 0 | 472 Ko |
| produits | 96 | 100 | 100 | 100 | 2,5 s | 0 | 342 Ko |
| qui-sommes-nous | 90 | 100 | 100 | 100 | 3,4 s | 0 | 805 Ko |
| contact | 98 | 100 | 100 | 100 | 2,0 s | 0 | 259 Ko |
| produits/orion | 99 | 100 | 100 | 100 | 1,9 s | 0 | 274 Ko |
| sur-mesure | 93 | 100 | 100 | 100 | 3,0 s | 0 | 484 Ko |
| realisations | 99 | 100 | 100 | 100 | 1,8 s | 0 | 298 Ko |
| configurateur | 98 | 100 | 100 | 100 | 2,0 s | 0 | 208 Ko |
| mentions-legales | 98 | 100 | 100 | 100 | 2,0 s | 0 | 202 Ko |

**Moyennes : performance 96, accessibilité 100, bonnes pratiques 100, SEO 100.**
Décalage cumulé nul, temps de blocage quasi nul, **aucune erreur console**.

### Ce que valent ces chiffres

La performance se mesure sur un hébergeur distant : elle bouge. La page la plus
lourde, qui-sommes-nous, a donné 90 dans cette campagne et **97, 92 puis 99**
en trois passages isolés une minute plus tôt. Deux causes identifiées :

- **le cache froid** après une mise en ligne — les premières mesures qui ont
  suivi un déploiement donnaient systématiquement trois à huit points de moins ;
- **l'enchaînement** des neuf pages sans pause, qui pénalise les plus lourdes.

Les quatre autres notes, elles, ne bougent pas : accessibilité, bonnes
pratiques et SEO sont à 100 sur les neuf pages, campagne après campagne, et le
décalage cumulé est nul partout.

### Trois défauts trouvés par ces campagnes

**Le favicon était celui de Nuxt.** Le logo vert de l'échafaudage, jamais
remplacé. Il répondait 200, ce qui suffisait à tromper une vérification par
code de réponse : c'est en regardant l'image qu'on le voit. Il est désormais
fabriqué à partir du picto du Dahut (`npm run favicon`), et déclaré — sans quoi
le navigateur le cherchait à la racine du domaine, hors du sous-chemin, pour un
404 sur chaque page.

**Trois pages portaient une exception `AbortError: Transition was skipped`.**
Quand le navigateur renonce à une transition de vue, il rejette `ready` et
`updateCallbackDone`, que le plugin de Nuxt n'attrape pas — lui n'attrape que
`finished`. `app/plugins/transition-de-vue.client.js` n'intercepte que ces deux
promesses : une vraie erreur reste visible.

**Le pied de page divergeait à l'hydratation.**
`route.path === '/mentions-legales'` était vrai au rendu serveur et faux une
fois la page servie : GitHub Pages redirige vers `/mentions-legales/`, barre
finale comprise. Le HTML livré masquait les partenaires et les avis, que
l'hydratation rétablissait ensuite. Quatre tests de bout en bout gardent
désormais ce point, sur des adresses demandées **avec** leur barre finale.

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

**Website Carbon : A sur les quatre pages mesurées.**

| page | note | CO2 par visite | plus propre que |
|---|---|---|---|
| accueil | A | 0,06 g | 90 % des pages du web |
| qui-sommes-nous | A | 0,08 g | 87 % |
| produits | A | 0,04 g | 93 % |
| contact | A | 0,03 g | 96 % |

**EcoIndex : B sur les quatre pages.** Mesuré le 4 septembre 2026, en
1920×1080, page entièrement déroulée.

| page | note | score | poids | requêtes | nœuds DOM |
|---|---|---|---|---|---|
| accueil | B | 75 | 586 Ko | 45 | 296 |
| qui-sommes-nous | B | 77 | 893 Ko | 39 | 236 |
| contact | B | 80 | 279 Ko | 31 | 265 |
| produits | B | 80 | 395 Ko | 40 | 221 |

**Un point de moins que la veille sur chaque page**, et contact repasse de A à
B. La cause a été cherchée avant d'être supposée : ce ne sont ni les trois
déclarations de favicon — aucun navigateur sans onglet ne les demande, vérifié —
ni le lien d'évitement, qui ne coûte que deux nœuds. C'est **la mise à jour de
la chaîne de construction** : Vite 8 découpe le JavaScript autrement, et la
page d'accueil charge seize fichiers là où elle en chargeait douze.

Quatre requêtes contre dix-huit vulnérabilités dont quatre critiques : le
change reste bon. Et le levier qui les récupérerait — précharger les pages liées
au survol plutôt qu'à la vue — en épargnerait dix-sept, soit quatre fois plus.

### Le chemin depuis la première mesure

Les trois pages étaient à 66, 68 et 72 — trois C. Deux corrections du même
bandeau les ont menées là.

**La bande des partenaires triplait ses treize logos**, dans le pied de page,
donc sur chaque page du site. L'animation ne translate que de 200vh : la
troisième série ne défilait jamais. Trois points par page.

**Les treize logos sont ensuite devenus une seule image.**
`scripts/sprite-partenaires.mjs` les compose au build, écarts compris : le
sprite est la bande telle qu'elle s'affiche, que le pied de page pose deux fois
pour boucler le défilement. Treize requêtes deviennent une, et cent quatre nœuds
de DOM deviennent six. Huit points sur
l'accueil, sept sur qui-sommes-nous, six sur contact — qui passe en A.

EcoIndex pèse trois choses, et le DOM le plus lourdement : soixante nœuds
valaient trois points quand cent kilo-octets n'en valent qu'un. Leur simulateur
permet de chiffrer un projet avant de l'entreprendre :

```bash
curl "https://api.ecoindex.fr/ecoindex/ecoindex?dom=287&size=582&requests=41"
```

**L'hébergement n'est pas vert.** L'API de la Green Web Foundation ne recense
pas `nicoreirgen.github.io` ; Website Carbon estime qu'un hébergeur vert
retirerait 9 % de l'empreinte. C'est le levier le plus court, et le seul qui ne
demande aucune ligne de code.

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

# Chiffrer une amélioration avant de l'entreprendre
curl "https://api.ecoindex.fr/ecoindex/ecoindex?dom=287&size=582&requests=41"

# Hébergeur vert ou non
curl https://api.thegreenwebfoundation.org/greencheck/nicoreirgen.github.io
```

EcoIndex n'accepte que **dix mesures par jour et par domaine** : de quoi
mesurer, pas de quoi itérer. Pour une série d'essais, mesurer soi-même le DOM,
le poids et les requêtes, et les passer au simulateur ci-dessus.

Website Carbon demande désormais une clé pour son API : la mesure passe par son
formulaire, sur websitecarbon.com.
