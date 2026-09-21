# Riposte

A pixel arcade game where your only weapon is the enemy's bullets. Catch a shot with your shield and it flies back to hunt whoever fired it.

- **Arcade:** endless waves, high scores and share codes
- **Descent:** a roguelike run with mods, synergies, curses, guardians with second phases, secrets and a true ending
- **Daily Run:** one seed a day, the same for everyone
- **The Back Room:** a walkable hub with the workshop, codex, records and the strays you rescue

It runs in any modern browser. On Windows it comes as a small standalone program that updates itself from this repository's releases.

## Layout

```
src/        the game: p1.html (page + styles) and p2.js … p24.js, joined into one file
launcher/   the Windows program (Go + WebView2), which embeds the built page
docs/       the phone version, served by GitHub Pages (installable, works offline)
web/        the template for the phone version's offline worker
build.sh    joins the parts, checks the script and builds riposte.html, Riposte.exe and docs/
```

## Building

You need Node (for the syntax check), plus Go 1.22+ and `go-winres` for the Windows program:

```
./build.sh
```

This writes `dist/riposte.html` (runs anywhere; open it in a browser) and `dist/Riposte.exe`.

## Releasing an update

1. Bump `VERSION` at the top of `src/p2.js`.
2. Run `./build.sh`.
3. Create a GitHub release tagged `vX.Y.Z` and attach `dist/riposte.html` (and `dist/Riposte.exe` if the launcher changed).

Installed copies check `releases/latest` at start-up and every six hours. A newer `riposte.html` loads at the next safe moment in the game. A newer `Riposte.exe` is swapped in on the next launch.

## Score checks and cloud saves

Every score the game sends carries the stats behind it (wave, kills, best chain, catches, time) and a checksum. The boards inside the game only show entries that add up (`src/p22.js`). Players logged in with GameJolt also get their save kept in their own GameJolt data store, one slot per device. Small per-device counters decide whether another device's save is newer, and if two devices both moved on, the game asks which to keep (`src/p23.js`).

## Phones and tablets

The game plays in phone browsers with touch controls: the left thumb moves, the right thumb aims the shield, and PULSE, DASH and pause buttons sit beside the screen. GitHub Pages serves `docs/` as an installable app. On Android, open the page in Chrome and choose *Install app*. On an iPhone, open it in Safari and choose Share → *Add to Home Screen*. It then runs full screen and works offline.

## Online features

GameJolt scores, trophies and the player list use the settings in `src/gjcfg.js`: the game ID, private key, score table IDs and trophy IDs. That file isn't in the repository, because it holds the private key. Copy `src/gjcfg.example.js` to `src/gjcfg.js` and fill it in. Without it the build still works, with the online parts switched off.

Players pick a name the first time they start the game. Their best arcade score is sent automatically, and each player keeps one small record in the game's GameJolt data store (name, games, time played, best score, last seen). The PLAYERS page under Records → Online lists everyone.
