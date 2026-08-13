#!/usr/bin/env bash
#
# Réencodage des vidéos rapatriées depuis WordPress.
#
# La vidéo de présentation est livrée en 3840x2160 à 13 Mbps, soit 82 Mo pour
# 51 secondes. Elle s'affiche en plein écran mais n'est lue que sur clic : la
# 4K n'apporte rien et le poids est le premier facteur d'empreinte du site.
#
# Produit deux versions en 1080p : AV1 (le plus compact) et H.264 (repli
# universel). Le <video> choisit la première que le navigateur sait lire.
#
# Prérequis : brew install ffmpeg
#
#   npm run video

set -euo pipefail

cd "$(dirname "$0")/.."

MEDIA="public/media"

# macOS livre bash 3.2, sans globstar : on parcourt avec find.
found=0

while IFS= read -r source; do
    [ -n "$source" ] || continue

    found=1
    base="${source%.mp4}"

    echo "→ $source"

    if [ ! -f "$base.av1.mp4" ]; then
        ffmpeg -nostdin -loglevel error -y -i "$source" \
            -vf "scale=-2:1080" \
            -c:v libsvtav1 -crf 38 -preset 6 -g 240 \
            -c:a libopus -b:a 96k \
            -movflags +faststart \
            "$base.av1.mp4"
    fi

    if [ ! -f "$base.h264.mp4" ]; then
        ffmpeg -nostdin -loglevel error -y -i "$source" \
            -vf "scale=-2:1080" \
            -c:v libx264 -crf 27 -preset slow -profile:v high -g 240 \
            -c:a aac -b:a 128k \
            -movflags +faststart \
            "$base.h264.mp4"
    fi

    # L'original 4K n'est jamais servi : il est retiré du dossier publié.
    rm -f "$source"

    printf '   AV1  %5s Mo\n' "$(($(stat -f%z "$base.av1.mp4") / 1024 / 1024))"
    printf '   H264 %5s Mo\n' "$(($(stat -f%z "$base.h264.mp4") / 1024 / 1024))"
done < <(find "$MEDIA" -type f -name '*.mp4' ! -name '*.av1.mp4' ! -name '*.h264.mp4')

if [ "$found" -eq 0 ]; then
    echo "Aucune vidéo à traiter dans $MEDIA (lancer d'abord : npm run media)"
fi
