#!/usr/bin/env bash
# Converts public/tarot/raw/*.png (1024x1536 from Codex) into web-sized WebP cards: public/tarot/<id>.webp (480x720, q76).
# The raw PNGs are ~3.5 MB each; the WebP output is ~40-70 KB, so the whole deck stays under ~5 MB.
set -euo pipefail
cd "$(dirname "$0")/../public/tarot"
n=0
for f in raw/*.png; do
  id="$(basename "$f" .png)"
  out="$id.webp"
  if [ ! -s "$out" ] || [ "$f" -nt "$out" ]; then
    cwebp -quiet -q 76 -resize 480 720 -metadata none "$f" -o "$out"
    n=$((n + 1))
  fi
done
echo "converted $n; $(ls *.webp 2>/dev/null | wc -l | tr -d ' ') webp cards, total $(du -sh . | cut -f1) (raw/ $(du -sh raw | cut -f1))"
