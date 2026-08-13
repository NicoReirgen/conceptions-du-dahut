# Déploiement

Le site publié est **entièrement statique**. Il ne contacte WordPress à aucun
moment pendant la navigation : vérifié, zéro requête sortante vers l'origine
WordPress au chargement d'une page.

WordPress ne sert qu'à deux choses :

- **au build**, comme source de contenu ;
- **au runtime**, uniquement quand un visiteur envoie le formulaire de contact
  ou une demande de devis.

## Construire le site

```bash
npm run assets && npm run generate
```

`assets` prépare les fichiers lourds (images du configurateur, médias
WordPress, vidéos, polices) ; `generate` produit les pages et vérifie le
résultat. La sortie est dans `.output/public/`, déployable sur n'importe quel
hébergement statique.

L'origine WordPress se règle par variable d'environnement :

```bash
NUXT_PUBLIC_WP_BASE_URL=https://admin.exemple.fr npm run generate
```

### Ce que le build garantit

`scripts/verify-build.mjs` s'exécute après la génération et **échoue** si une
route déclarée par WordPress n'a pas produit de page. Les liens morts saisis
dans le contenu sont eux signalés sans bloquer : un lien mal saisi est un
problème éditorial, il ne doit pas empêcher une mise en ligne.

Au dernier build : 30 routes déclarées, 30 générées, 2 liens internes morts
signalés (`/produit/hard-top` et `/produit/tente-de-toi-nait-up`, tous deux
depuis la page qui-sommes-nous — le slug correct est `/produits/`).

## Reconstruction automatique

À chaque publication, WordPress appelle le crochet de déploiement de
l'hébergeur. À configurer dans `wp-config.php` :

```php
define( 'DAHUT_DEPLOY_HOOK_URL', 'https://api.cloudflare.com/…/deploy_hooks/…' );
```

Sans cette constante, le mécanisme reste inerte — aucun appel, aucune erreur.

Une page **Outils → Déploiement du site** affiche l'état du dernier
déclenchement et permet de reconstruire à la demande.

### Regroupement des modifications

Les enregistrements arrivent par rafales : on corrige un titre, puis une image,
puis une méta. Un build par enregistrement serait autant de calcul inutile.
Le déclenchement est donc différé de 2 minutes et réarmé à chaque modification.

Vérifié : cinq modifications consécutives ne laissent **qu'un seul** événement
en attente.

Sont surveillés : pages, articles, produits, médias, taxonomies, menus et pages
d'options ACF. Les brouillons, révisions et sauvegardes automatiques sont
ignorés.

## Formulaires

Contact et devis postent directement sur l'API WordPress depuis le navigateur
du visiteur. Le domaine du site publié doit donc être déclaré côté WordPress :

```php
define( 'DAHUT_HEADLESS_ORIGINS', 'https://lesconceptionsdudahut.fr' );
```

Sans cette déclaration, le navigateur bloquera l'envoi (CORS). Les endpoints
sont protégés par un pot de miel, une limite de 5 envois par IP sur 15 minutes,
et une validation stricte côté serveur.

## Hébergement

La sortie est un dossier de fichiers statiques, sans exigence particulière.
Le choix de l'hébergeur influe directement sur le score Website Carbon, qui
vérifie la présence de l'hébergeur dans la base de la Green Web Foundation.

Les assets sont pré-compressés en gzip et brotli au build : l'hébergeur les
sert tels quels, sans recompresser à chaque requête.
