# Riposte

A pixel arcade game where your only weapon is the enemy's bullets. Catch a shot with your shield and it flies back to hunt whoever fired it.

- **Arcade:** endless waves, high scores and share codes
- **Descent:** a roguelike run with mods, synergies, curses, guardians with second phases, secrets and a true ending
- **Daily Run:** one seed a day, the same for everyone
- **The Back Room:** a walkable hub with the workshop, codex, records and the strays you rescue

It runs in any modern browser. On Windows it comes as a small standalone program that updates itself from this repository's releases.

## Layout

```
src/        the game: p1.html (page + styles) and p2.js … p16.js, joined into one file
launcher/   the Windows program (Go + WebView2), which embeds the built page
build.sh    joins the parts, checks the script and builds riposte.html and Riposte.exe
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

## Online features

GameJolt scores and trophies are set up in `src/p16.js` (`GJ.gameId`, `GJ.key`, table and trophy ids). They stay switched off while those are empty.
