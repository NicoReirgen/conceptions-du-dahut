#!/usr/bin/env bash
#
# Sous-ensemble et conversion des polices variables en woff2.
#
# Les originaux (app/assets/fonts/*.ttf) ne sont jamais servis : ils font 220 Ko
# et couvrent des alphabets que le site n'utilise pas. On n'expédie que le latin
# et le latin étendu, soit ce dont le français a besoin, en woff2.
#
# Prérequis : pip install fonttools brotli
#
#   npm run fonts

set -euo pipefail

cd "$(dirname "$0")/.."

SOURCE="app/assets/fonts"
OUTPUT="public/assets/fonts"

# Latin + latin étendu : accents, ligature œ, guillemets français, €.
RANGE="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"

mkdir -p "$OUTPUT"

for name in Switzer-Variable Switzer-VariableItalic; do
    pyftsubset "$SOURCE/$name.ttf" \
        --output-file="$OUTPUT/$name.woff2" \
        --flavor=woff2 \
        --layout-features='*' \
        --no-hinting \
        --unicodes="$RANGE"

    before=$(stat -f%z "$SOURCE/$name.ttf")
    after=$(stat -f%z "$OUTPUT/$name.woff2")
    printf '%-26s %4s Ko -> %3s Ko\n' "$name" "$((before / 1024))" "$((after / 1024))"
done
