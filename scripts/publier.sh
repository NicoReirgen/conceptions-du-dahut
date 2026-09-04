#!/usr/bin/env bash
#
# Publication du site sur GitHub Pages.
#
# Le site est construit ici, jamais chez l'hébergeur : la génération interroge
# WordPress, qui n'existe que sur cette machine. Aucune plateforme ne peut donc
# reconstruire le site elle-même — on téléverse le dossier produit.
#
# La branche `gh-pages` ne contient que ce dossier, sans le code. Elle est
# reconstruite à chaque publication depuis un worktree, pour que la copie de
# travail principale ne soit jamais touchée.
#
#   npm run publier
#
# Avec `--instantane`, la génération repart de la copie de l'API enregistrée
# dans `wordpress-instantane/` au lieu d'interroger WordPress : de quoi publier
# une correction qui ne touche que le code sans démarrer Local.
#
#   npm run publier -- --instantane
#
set -euo pipefail

cd "$(dirname "$0")/.."

DEPOT="conceptions-du-dahut"
BASE="/$DEPOT/"
BRANCHE="gh-pages"
COPIE=".output/$BRANCHE"

if [ -n "$(git status --porcelain)" ]; then
    echo "Des modifications ne sont pas commitées. Publier une sortie qui ne"
    echo "correspond à aucun commit rend l'historique inutilisable — commiter d'abord."
    exit 1
fi

# Le 4 septembre 2026, une sortie construite sur un cache tiède a été publiée :
# son 404.html désignait trois scripts que la même sortie ne contenait pas. Le
# site répondait, mais toute adresse inconnue restait blanche — la coquille de
# repli ne pouvait pas démarrer.
#
# Une publication est assez rare pour qu'on reparte d'une table nette.
echo "→ Nettoyage des sorties et du cache de build"
rm -rf .output .nuxt node_modules/.cache/nuxt

if [ "${1:-}" = "--instantane" ]; then
    echo "→ Construction sous $BASE, depuis l'instantané de WordPress"
    NUXT_APP_BASE_URL="$BASE" npm run generate:instantane
else
    echo "→ Construction sous $BASE"
    NUXT_APP_BASE_URL="$BASE" npm run generate
fi

echo "→ Préparation de la branche $BRANCHE"
git worktree remove --force "$COPIE" 2>/dev/null || true

if git show-ref --quiet "refs/heads/$BRANCHE"; then
    git worktree add --force "$COPIE" "$BRANCHE" >/dev/null
else
    git worktree add --orphan -b "$BRANCHE" "$COPIE" >/dev/null
fi

# --delete : un fichier retiré du site doit disparaître de la branche.
# Les variantes pré-compressées sont écartées, GitHub Pages compressant lui-même.
#
# --ignore-times : rsync juge d'ordinaire un fichier inchangé quand sa taille et
#   sa date coïncident. Deux constructions successives produisent des pages de
#   même taille — Nuxt n'y change qu'un identifiant de build — et une page a
#   ainsi survécu à la copie : le 404.html publié désignait les scripts de la
#   construction précédente, effacés par celle-ci. Copier les cent cinquante
#   mégaoctets sans se poser de question prend deux secondes ; s'en poser une
#   mauvaise a coûté deux publications blanches.
rsync -a --ignore-times --delete --exclude='.git' --exclude='*.br' --exclude='*.gz' \
    .output/public/ "$COPIE"/

# Quoi qu'il arrive en amont, ce qui part en ligne doit se tenir : chaque fichier
# désigné par une page doit exister dans le même envoi. La vérification porte sur
# la copie, pas sur la sortie — c'est la copie qui est publiée, et les deux ont
# divergé.
echo "→ Vérification de la copie à publier"
NUXT_APP_BASE_URL="$BASE" node scripts/references-manquantes.mjs "$COPIE"

# Sans ce fichier, Jekyll écarte tout dossier commençant par un tiret bas :
# _nuxt/ et _payload.json, soit l'intégralité du JavaScript du site.
touch "$COPIE/.nojekyll"

cd "$COPIE"

if [ -z "$(git status --porcelain)" ]; then
    echo "→ Rien à publier : la sortie est identique à la branche."
else
    git add -A
    git commit -q -m "Publie le site construit ($(date '+%d/%m/%Y %H:%M'))"
    git push -q origin "$BRANCHE"
    echo "→ Publié"
fi

cd - >/dev/null
git worktree remove --force "$COPIE"

echo
echo "https://nicoreirgen.github.io/$DEPOT/"
echo "La mise en ligne prend une à deux minutes après la poussée."
