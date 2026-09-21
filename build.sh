#!/usr/bin/env bash
# Builds dist/riposte.html (the whole game in one file) and dist/Riposte.exe (the Windows program).
set -e
cd "$(dirname "$0")"
mkdir -p dist
S=src
# GameJolt settings (private key) live in src/gjcfg.js, which is not in the repository
CFG=$S/gjcfg.js; [ -f "$CFG" ] || CFG=$S/gjcfg.example.js
cat $CFG $S/p2.js $S/p3.js $S/p4.js $S/p5.js $S/p6.js $S/p7.js $S/p8.js $S/p1[0-9].js $S/p2[0-9].js $S/p9.js > dist/all.js
node --check dist/all.js
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="theme-color" content="#05060C"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Riposte">'
  sed -n '1,/<\/style>/p' $S/p1.html
  echo '</head><body>'
  sed -n '/<\/style>/,$p' $S/p1.html | tail -n +2
  echo '<script>'; cat dist/all.js; echo '</script></body></html>'; } > dist/riposte.html
rm dist/all.js
VER=$(grep -o 'const VERSION = "[0-9.]*"' $S/p2.js | grep -o '[0-9][0-9.]*')
echo "built riposte.html v$VER"

# the phone site in docs/ (served by GitHub Pages): the same page plus an app manifest and offline support
sed 's#<meta charset="utf-8">#<meta charset="utf-8"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="apple-touch-icon.png">#' dist/riposte.html > docs/index.html
sed "s/__VERSION__/$VER/" web/sw.template.js > docs/sw.js
echo "updated docs/ (phone site)"

if command -v go >/dev/null; then
  cp dist/riposte.html launcher/riposte.html
  cd launcher
  if command -v go-winres >/dev/null; then go-winres make --in winres/winres.json --arch amd64 >/dev/null; fi
  GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H windowsgui -X main.appVersion=$VER" -o ../dist/Riposte.exe .
  echo "built Riposte.exe"
fi
