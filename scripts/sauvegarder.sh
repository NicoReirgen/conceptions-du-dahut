#!/usr/bin/env bash
#
# Sauvegarde de ce qui n'est pas régénérable.
#
# Le dépôt porte le code, et depuis peu le contenu publié (wordpress-instantane).
# Trois choses lui échappent, et n'existent que sur cette machine :
#
#   — les originaux du configurateur, 243 Mo : l'entreprise n'existe plus, ils
#     ne peuvent pas être reproduits ;
#   — les médias de WordPress, 743 Mo : la source de tout ce que le site sert ;
#   — la base WordPress : la seule copie modifiable du contenu, le site en ligne
#     ayant disparu avec l'entreprise.
#
# Le script écrit une archive datée et son empreinte, puis vérifie l'archive
# qu'il vient d'écrire. Il n'efface jamais rien.
#
#   bash scripts/sauvegarder.sh /Volumes/DisqueExterne/dahut
#
set -euo pipefail

cd "$(dirname "$0")/.."

DESTINATION="${1:-}"

if [ -z "$DESTINATION" ]; then
    echo "Où écrire la sauvegarde ?"
    echo "  bash scripts/sauvegarder.sh /Volumes/DisqueExterne/dahut"
    echo
    echo "Un disque externe ou un dossier synchronisé vaut mieux que ce Mac :"
    echo "une sauvegarde sur le même disque ne protège que de l'effacement."
    exit 1
fi

SITE="$HOME/Local Sites/les-conceptions-du-dahut/app/public"
LOCAL="$HOME/Library/Application Support/Local"

# L'identifiant du site dans Local, lu dans sa configuration plutôt que deviné :
# plusieurs sites tournent, et prendre la première socket venue sauvegarderait
# la base d'un autre projet sous le nom de celui-ci.
IDENTIFIANT=$(python3 -c "
import json, sys
sites = json.load(open('$LOCAL/sites.json', encoding='utf-8'))
for identifiant, site in sites.items():
    if site.get('path', '').endswith('les-conceptions-du-dahut'):
        print(identifiant)
        sys.exit()
sys.exit('Site introuvable dans la configuration de Local.')
")

SOCKET="$LOCAL/run/$IDENTIFIANT/mysql/mysqld.sock"
MYSQLDUMP="$LOCAL/lightning-services/mysql-8.0.35+4/bin/darwin-arm64/bin/mysqldump"
JOUR=$(date +%Y-%m-%d)
ARCHIVE="$DESTINATION/dahut-$JOUR.tar.gz"

mkdir -p "$DESTINATION"

if [ -e "$ARCHIVE" ]; then
    echo "Il existe déjà une sauvegarde du jour : $ARCHIVE"
    echo "La renommer ou la déplacer avant de recommencer."
    exit 1
fi

echo "→ Vérification des originaux avant de les archiver"
# Archiver des fichiers déjà corrompus donnerait une sauvegarde propre du
# désastre : on relit d'abord le manifeste.
npm run --silent verify:assets >/dev/null
echo "  $(find assets-source -type f | wc -l | tr -d ' ') fichiers conformes à leur manifeste"

TEMPORAIRE=$(mktemp -d)
trap 'rm -rf "$TEMPORAIRE"' EXIT

echo "→ Export de la base WordPress ($IDENTIFIANT)"

if [ ! -S "$SOCKET" ]; then
    echo "  Ce site est éteint dans Local : le démarrer, puis relancer."
    exit 1
fi

"$MYSQLDUMP" --socket="$SOCKET" --user=root --password=root \
    --single-transaction --default-character-set=utf8mb4 local \
    > "$TEMPORAIRE/base.sql" 2>/dev/null

echo "  $(du -h "$TEMPORAIRE/base.sql" | cut -f1)"

echo "→ Archivage — comptez quelques minutes pour un gigaoctet"
tar -czf "$ARCHIVE" \
    -C "$TEMPORAIRE" base.sql \
    -C "$(pwd)" assets-source assets-source.sha256 wordpress-instantane \
    -C "$SITE/wp-content" uploads

echo "→ Empreinte"
shasum -a 256 "$ARCHIVE" > "$ARCHIVE.sha256"

echo "→ Relecture de l'archive écrite"
# Une archive qu'on n'a pas relue n'est pas une sauvegarde : c'est un espoir.
tar -tzf "$ARCHIVE" >/dev/null
(cd "$DESTINATION" && shasum -a 256 -c "$(basename "$ARCHIVE").sha256" >/dev/null)

echo
echo "$ARCHIVE"
echo "$(du -h "$ARCHIVE" | cut -f1) — archive relue, empreinte vérifiée"
echo
echo "Pour restaurer : tar -xzf $(basename "$ARCHIVE")"
