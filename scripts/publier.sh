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

echo "→ Construction sous $BASE"
NUXT_APP_BASE_URL="$BASE" npm run generate

echo "→ Préparation de la branche $BRANCHE"
git worktree remove --force "$COPIE" 2>/dev/null || true

if git show-ref --quiet "refs/heads/$BRANCHE"; then
    git worktree add --force "$COPIE" "$BRANCHE" >/dev/null
else
    git worktree add --orphan -b "$BRANCHE" "$COPIE" >/dev/null
fi

# --delete : un fichier retiré du site doit disparaître de la branche.
# Les variantes pré-compressées sont écartées, GitHub Pages compressant lui-même.
rsync -a --delete --exclude='.git' --exclude='*.br' --exclude='*.gz' \
    .output/public/ "$COPIE"/

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
