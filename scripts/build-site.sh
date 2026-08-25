#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -rf "$ROOT/public"
mkdir -p "$ROOT/public/src" "$ROOT/public/fixtures"
for file in index.html site.css site.js app.html app.css app.js docs.html privacy.html terms.html icon.svg manifest.webmanifest sw.js robots.txt sitemap.xml; do
  cp "$ROOT/$file" "$ROOT/public/$file"
done
cp "$ROOT/src/engine.js" "$ROOT/public/src/engine.js"
cp "$ROOT"/fixtures/*.csv "$ROOT/public/fixtures/"
printf 'CatalogPatch Product CSV Workbench v1\n' > "$ROOT/public/release-v1.txt"
touch "$ROOT/public/.nojekyll"
printf 'Built CatalogPatch v1 in %s/public\n' "$ROOT"
