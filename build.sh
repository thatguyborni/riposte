set -e
cd /home/claude/v3
cat gjcfg.js p2.js p3.js p4.js p5.js p6.js p7.js p8.js p1[0-9].js p2[0-9].js p3[0-9].js p9.js > all.js
node --check all.js
{ cat p1.html; echo '<script>'; cat all.js; echo '</script>'; } > /home/claude/riposte.html
APPHTML=/home/claude/exe/riposte.html
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="theme-color" content="#05060C"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Riposte">'; sed -n '1,/<\/style>/p' p1.html; echo '</head><body>'; sed -n '/<\/style>/,$p' p1.html | tail -n +2; echo '<script>'; cat all.js; echo '</script></body></html>'; } > $APPHTML
cd /home/claude/exe
~/go/bin/go-winres make --in winres/winres.json --arch amd64 >/dev/null
VER=$(grep -o 'const VERSION = "[0-9.]*"' /home/claude/v3/p2.js | grep -o '[0-9][0-9.]*')
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H windowsgui -X main.appVersion=$VER" -o dist/Riposte.exe .
cp $APPHTML dist/riposte.html
# the phone site: same page plus an app manifest and offline support
rm -rf dist/site; mkdir -p dist/site; cp /home/claude/site/*.png /home/claude/site/manifest.webmanifest /home/claude/site/README.md /home/claude/site/.nojekyll dist/site/
sed 's#<meta charset="utf-8">#<meta charset="utf-8"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="apple-touch-icon.png">#' dist/riposte.html > dist/site/index.html
sed "s/__VERSION__/$VER/" /home/claude/site/sw.template.js > dist/site/sw.js
echo BUILT; ls -la dist
