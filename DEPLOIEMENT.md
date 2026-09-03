# Déploiement

Le site est en ligne : **https://nicoreirgen.github.io/conceptions-du-dahut/**

Il est **entièrement statique** et ne contacte WordPress à aucun moment pendant
la navigation : vérifié, zéro requête sortante vers l'origine WordPress au
chargement d'une page. Depuis la fermeture de l'entreprise, les formulaires sont
en mode vitrine (`app/composables/useEnvoiVitrine.js`) — ils valident, attendent
et confirment, sans rien envoyer. WordPress ne sert donc plus qu'**au build**,
comme source de contenu.

Conséquence directe : aucune plateforme ne peut construire le site elle-même,
puisque WordPress n'existe que sur la machine de développement. On construit en
local, et on téléverse le dossier produit.

## Publier

```bash
npm run assets && npm run publier
```

`assets` prépare les fichiers lourds (images du configurateur, médias
WordPress, vidéos, polices) — inutile de le relancer si rien n'a changé de ce
côté. `publier` construit le site sous son sous-chemin, remplit la branche
`gh-pages` et la pousse ; GitHub Pages sert cette branche une à deux minutes
plus tard.

Le script refuse de publier tant que des modifications ne sont pas commitées :
une mise en ligne qui ne correspond à aucun commit rend l'historique inutile.

### Le sous-chemin

GitHub Pages sert un dépôt projet sous `/conceptions-du-dahut/`. Nuxt réécrit
ses propres URL à partir de `NUXT_APP_BASE_URL`, mais pas les chemins écrits à
la main : les médias, qui arrivent de WordPress en absolu, et les logos des
gabarits. `app/utils/cheminPublic.js` leur applique la même règle, et rend le
chemin inchangé quand le site est servi à la racine — le jour où un domaine
propre arrive, il n'y aura rien à défaire.

Pour vérifier le résultat en local dans les conditions du sous-chemin :

```bash
node scripts/serve-static.mjs 3010 /conceptions-du-dahut
```

Ce serveur retire le préfixe comme le fait l'hébergeur, sert les fichiers
pré-compressés et pose les en-têtes de cache.

### L'origine WordPress

```bash
NUXT_PUBLIC_WP_BASE_URL=https://admin.exemple.fr npm run generate
```

Par défaut, le site Local by Flywheel : `http://les-conceptions-du-dahut.withni.local`.

## Ce que le build garantit

`scripts/verify-build.mjs` s'exécute après la génération. Il **échoue** dans
deux cas, et signale sans bloquer dans un troisième.

**Échec — une route déclarée par WordPress n'a pas produit de page.** Un build
silencieusement amputé serait pire qu'un build qui s'arrête.

**Échec — un fichier référencé par une page n'existe pas dans la sortie.** Une
variante d'image absente ne se voit pas à la lecture du code : le navigateur
retient la `<source>` qui lui convient, et une `<source>` en échec ne retombe
pas sur le `<img>` — l'image disparaît sans un mot. Ce contrôle a révélé
22 variantes proposées mais jamais produites, le filtre de largeurs d'`AppImage`
ne répétant pas la règle de `fetch-media.mjs`. Il échoue aussi, volontairement,
quand les assets n'ont pas été préparés.

**Signalement — les liens internes qui ne mènent nulle part.** Un lien mal saisi
est un problème éditorial : il ne doit pas empêcher une mise en ligne.

Au dernier build : 28 routes déclarées, 28 générées, aucun lien mort, et
2 216 références de fichiers toutes résolues.

### Les deux liens morts de qui-sommes-nous

La section « On parle du Dahut » en portait deux jusqu'au 3 septembre 2026. Ses
champs lien ACF — une vidéo et trois articles de presse — sont rendus par
`app/components/templates/QuiSommesNous.vue` avec `target="_blank"` : ils
attendent des URL externes, et contenaient des produits du site choisis dans le
sélecteur interne de WordPress. La vidéo pointe désormais vers quatre vidéos
YouTube réelles, miniatures officielles à l'appui. Des trois articles, seul
celui de Sud Ouest a pu être retrouvé et rebranché ; les deux autres, parus dans
la presse du Nord, ont été retirés faute d'URL — le WordPress en ligne qui les
gardait a disparu avec l'entreprise. Leurs textes sont sauvegardés hors dépôt,
prêts à être remis si les articles refont surface.

À retenir si le cas se représente : WordPress renvoie ses permaliens de produits
sous `/produit/…`, le rewrite slug du type de contenu, alors que le site publié
sert `/produits/…`. Tout lien interne vers un produit choisi dans ce sélecteur
sortira donc mort.

## Ce qui ne s'applique plus

Deux mécanismes construits du temps où le site était vivant restent en place
côté WordPress, et n'ont plus d'objet. Ils sont consignés ici pour le jour où
ils resserviraient.

**La reconstruction automatique.** Le mu-plugin appelle un crochet de
déploiement à chaque publication, différé de deux minutes et réarmé à chaque
modification — vérifié : cinq enregistrements consécutifs ne laissent qu'un seul
événement en attente. Sans la constante `DAHUT_DEPLOY_HOOK_URL` dans
`wp-config.php`, le mécanisme reste inerte : aucun appel, aucune erreur. Il ne
peut de toute façon rien déclencher d'utile, GitHub Pages ne sachant pas
construire ce site.

**Les envois de formulaires.** Contact et devis postaient sur l'API WordPress
depuis le navigateur du visiteur, ce qui demandait de déclarer le domaine
publié dans `DAHUT_HEADLESS_ORIGINS` sous peine de blocage CORS. Les endpoints
existent toujours, protégés par un pot de miel, une limite de cinq envois par IP
sur quinze minutes et une validation stricte. Les rebrancher tient en une ligne :
`MODE_VITRINE = false` dans `app/composables/useEnvoiVitrine.js`.

## Hébergement

GitHub Pages, branche `gh-pages` du dépôt `NicoReirgen/conceptions-du-dahut`,
servie à la racine de cette branche. Le dossier publié pèse 69 Mo pour
1 845 fichiers.

Deux détails propres à Pages :

- **`.nojekyll` est indispensable.** Sans lui, Jekyll écarte tout dossier
  commençant par un tiret bas — `_nuxt/` et `_payload.json`, soit l'intégralité
  du JavaScript du site.
- **Les variantes pré-compressées sont écartées** de la branche publiée. Le
  build produit bien du gzip et du brotli, mais Pages compresse lui-même et ne
  les servirait jamais : ce sont 148 fichiers de poids mort.

Le score Website Carbon dépend de l'hébergeur, qui doit figurer dans la base de
la Green Web Foundation — je n'ai pas vérifié si GitHub Pages y est recensé.
Ce score et EcoIndex, restés en suspens faute d'URL publique, sont désormais
mesurables.
