#!/usr/bin/env bash
# Builds dist/riposte.html (the whole game in one file) and dist/Riposte.exe (the Windows program).
set -e
cd "$(dirname "$0")"
mkdir -p dist
S=src
cat $S/p2.js $S/p3.js $S/p4.js $S/p5.js $S/p6.js $S/p7.js $S/p8.js $S/p1[0-9].js $S/p9.js > dist/all.js
node --check dist/all.js
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  sed -n '1,/<\/style>/p' $S/p1.html
  echo '</head><body>'
  sed -n '/<\/style>/,$p' $S/p1.html | tail -n +2
  echo '<script>'; cat dist/all.js; echo '</script></body></html>'; } > dist/riposte.html
rm dist/all.js
VER=$(grep -o 'const VERSION = "[0-9.]*"' $S/p2.js | grep -o '[0-9][0-9.]*')
echo "built riposte.html v$VER"

if command -v go >/dev/null; then
  cp dist/riposte.html launcher/riposte.html
  cd launcher
  if command -v go-winres >/dev/null; then go-winres make --in winres/winres.json --arch amd64 >/dev/null; fi
  GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H windowsgui -X main.appVersion=$VER" -o ../dist/Riposte.exe .
  echo "built Riposte.exe"
fi
