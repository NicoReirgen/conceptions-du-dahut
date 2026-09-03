# Les Conceptions du Dahut — site statique

Le site de l'atelier, publié à titre de référence :
**https://nicoreirgen.github.io/conceptions-du-dahut/**

Un front Nuxt 4 qui se construit à partir d'un WordPress headless, et qui n'en
dépend plus une fois publié : le site livré est **entièrement statique**, sans
serveur ni base de données. Il embarque un configurateur de véhicule dont
l'aperçu se recompose à chaque choix, à partir de 185 images d'atelier
déclinées en 927 fichiers servis.

L'entreprise a cessé son activité. Le site est donc figé : les formulaires
valident, attendent et confirment sans rien envoyer (mode vitrine), et le
WordPress en ligne a disparu — seule subsiste une instance de développement.

## Démarrer

```bash
npm install
cp .env.example .env     # y régler l'origine WordPress
npm run dev
```

Le développement demande un WordPress joignable. À défaut, le dépôt embarque un
instantané de son API — voir [Construire sans WordPress](#construire-sans-wordpress).

## Construire et publier

```bash
npm run assets      # images, polices, médias, vidéos, sprite des partenaires
npm run publier     # construit, vérifie, et pousse sur GitHub Pages
```

`assets` ne se relance qu'après un changement de médias : c'est l'étape longue.
`publier` refuse de partir si des modifications ne sont pas commitées.

Le détail — sous-chemin de publication, garanties du build, ce que GitHub Pages
apporte et ce qu'il coûte — est dans **[DEPLOIEMENT.md](DEPLOIEMENT.md)**.

### Construire sans WordPress

```bash
npm run instantane                 # une fois, WordPress démarré
npm run publier -- --instantane    # ensuite, sans lui
```

Un mandataire enregistre pendant un build ce que celui-ci demande réellement à
WordPress ; `wordpress-instantane/` en garde la copie, versionnée. Une requête
absente de l'instantané **fait échouer** la génération en la nommant : le mode
dégradé publie une correction de code, jamais un site amputé.

## Ce que le build garantit

Trois contrôles échouent plutôt que de laisser passer, et un quatrième signale
sans bloquer :

| contrôle | ce qu'il empêche |
|---|---|
| `verify-catalogue` | un catalogue du configurateur dont les clés, les images ou les types de champs ne correspondent plus |
| routes générées | un site amputé d'une page que WordPress déclare |
| ressources référencées | une image, une police ou une variante référencée mais absente — l'échec le plus silencieux, une `<source>` en défaut ne retombant pas sur le `<img>` |
| sprite des partenaires | un logo ajouté dans WordPress qui n'entrerait pas dans l'image composée |
| liens internes morts | *signalé seulement* : un lien mal saisi est un problème éditorial, il ne doit pas bloquer une mise en ligne |

## Vérifier

```bash
npm run verify      # lint, catalogue, 215 tests unitaires
npm run test:e2e    # 27 tests de bout en bout, sur le site construit
```

Les tests de bout en bout tournent sur le **build statique**, sous le
sous-chemin où il est publié — plusieurs pannes de ce projet n'existaient que
sur le serveur de développement. Ils couvrent le mode vitrine (aucune requête ne
part), le cloisonnement du configurateur, le mouvement réduit, l'accessibilité
au clavier et le tunnel de configuration de bout en bout.

## Mesures

Sur le site en ligne, en émulation mobile : **performance 96 de moyenne,
accessibilité 100, bonnes pratiques 100, SEO 100**, aucune erreur console et un
décalage cumulé nul sur les neuf pages. Website Carbon donne A, EcoIndex B à A
selon les pages.

Le détail, la méthode et ce que la mesure a révélé — quatre défauts invisibles à
la lecture du code — sont dans **[MESURES.md](MESURES.md)**.

## Repères

```
app/
  components/templates/   un composant par gabarit WordPress
  components/van/         le configurateur
  composables/images/     la résolution des images d'aperçu, en cinq modules
  data/orion.json         le catalogue du configurateur (voir app/data/README.md)
  utils/cheminPublic.js   le préfixe de sous-chemin, que Nuxt n'applique pas
scripts/                  assets, vérifications, publication, instantané
wordpress-instantane/     la copie de l'API qui permet de construire sans elle
tests/                    unitaires et intégration (vitest), bout en bout (playwright)
```

Node 20. Cinq dépendances de production : Nuxt, Vue, Vue Router, Tailwind et
Lenis — `gsap` et `swiper` ont été retirés au profit d'API natives.

## Sauvegarder

Le dépôt porte le code et, depuis l'instantané, le contenu publié. Trois choses
lui échappent et n'existent que sur la machine de développement : les 243 Mo
d'originaux du configurateur, les 743 Mo de médias WordPress, et la base — seule
copie modifiable du contenu depuis la disparition du site en ligne.

```bash
bash scripts/sauvegarder.sh /Volumes/DisqueExterne/dahut
```

Le script relit le manifeste des originaux avant de les archiver, exporte la
base du bon site — leurs identifiants sont lus dans la configuration de Local,
plusieurs sites pouvant tourner —, puis relit l'archive écrite et son empreinte.
Une archive qu'on n'a pas relue n'est pas une sauvegarde.

## Documents

- **[DEPLOIEMENT.md](DEPLOIEMENT.md)** — publier, le sous-chemin, l'hébergeur
- **[MESURES.md](MESURES.md)** — scores, poids, et ce que la mesure a révélé
- **[app/data/README.md](app/data/README.md)** — le catalogue du configurateur
