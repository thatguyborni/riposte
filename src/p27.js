/* ================================================================
   Where the save lives, and learning the perfect catch.
   The game is played in a lot of places now: a page inside another
   page (itch), a phone browser, the Windows program. In an embedded
   page the browser can throw the save away without warning, so the
   game says so, keeps nudging toward a backup or a GameJolt login,
   and notices when a browser refuses to save at all.
   ================================================================ */
const EMBEDDED = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
const ON_ITCH = /itch\.(zone|io)/i.test(location.hostname) || /itch\.io/i.test(document.referrer || "");
const IN_APP = !!window.RIPOSTE_APP || location.protocol === "file:";
function storageWorks() {
  try { localStorage.setItem("riposte.probe", "1"); const v = localStorage.getItem("riposte.probe"); localStorage.removeItem("riposte.probe"); return v === "1"; }
  catch (e) { return false; }
}
let SAVE_BLOCKED = !storageWorks();
const loggedIn = () => { try { return typeof gjUser === "function" && !!gjUser(); } catch (e) { return false; } };
function saveHome() {
  if (SAVE_BLOCKED) return ["NOT SAVING", C.rd];
  if (loggedIn()) return ["GAMEJOLT", C.li];
  if (IN_APP) return ["THIS PC", C.lg];
  return [EMBEDDED || ON_ITCH ? "THIS BROWSER" : "THIS BROWSER", C.ye];
}
// said once, when there is something worth losing
function saveNudge() {
  if (!meta.flags) meta.flags = {};
  const f = meta.flags, now = Date.now();
  if (SAVE_BLOCKED) {
    if (f.blockedSaid !== 1) { f.blockedSaid = 1; }
    setTimeout(() => toast("THIS BROWSER WON'T LET THE GAME SAVE. PROGRESS WILL GO WHEN YOU CLOSE THE TAB.", C.rd), 900);
    return;
  }
  if (loggedIn() || IN_APP) return;
  const worth = (meta.tokens || 0) >= 60 || tapesRead() > 0 || (meta.stats.runs || 0) >= 3 || (meta.stats.arcadeGames || 0) >= 3;
  if (!worth || (meta.playTime || 0) < 8 * 60) return;
  const gap = f.saveNudge ? 4 * 24 * 3600 * 1000 : 0;
  if (now - (f.saveNudge || 0) < gap) return;
  f.saveNudge = now; saveMeta();
  setTimeout(() => toast(EMBEDDED
    ? "YOUR SAVE LIVES IN THIS BROWSER, AND BROWSERS CLEAR EMBEDDED PAGES. RECORDS > BACK UP SAVE, OR LOG IN TO KEEP IT."
    : "TIP: RECORDS > ONLINE PUTS YOUR SAVE ON GAMEJOLT, SO IT SURVIVES THIS BROWSER.", C.bl), 1200);
}
function saveNote() {
  if (SAVE_BLOCKED) return "THIS BROWSER IS BLOCKING SAVES. NOTHING WILL BE KEPT.";
  if (loggedIn()) return "LOGGED IN: YOUR SAVE IS KEPT ON GAMEJOLT AND FOLLOWS YOU BETWEEN DEVICES.";
  if (IN_APP) return "SAVED ON THIS PC. RECORDS > BACK UP SAVE MAKES A CODE YOU CAN CARRY.";
  return EMBEDDED
    ? "SAVED IN THIS BROWSER ONLY, AND EMBEDDED PAGES GET CLEARED. BACK IT UP, OR LOG IN WITH GAMEJOLT."
    : "SAVED IN THIS BROWSER ONLY. BACK IT UP, OR LOG IN WITH GAMEJOLT.";
}

/* ---------------- learning the perfect catch ----------------
   A catch counts as perfect when the shot is already deep in the
   zone. New players sweep the shield early and never see one, so
   the inner line lights up and marks where the shot will land,
   until they have landed enough to feel it.                      */
const helperMode = () => (meta.settings.helper == null ? 1 : meta.settings.helper);
const helperOn = () => helperMode() === 2 || (helperMode() === 1 && (meta.stats.perfects || 0) < 120);
function drawCatchHelper() {
  if (!G || G.mode === "attract" || G.over || !helperOn()) return;
  const S = G.S, p = G.p;
  let best = null, bd = 40;
  for (const b of G.bullets) {
    if (b.friend) continue;
    const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
    if (d < bd && (dx * b.vx + dy * b.vy) < 0) { bd = d; best = b; }
  }
  if (!best) return;
  const a = Math.atan2(best.y - p.y, best.x - p.x), r = S.perfectD - 1;
  const now = bd <= S.perfectD + 2 && bd > S.bandIn;      // catch it right now
  const col = now ? C.wh : C.bl;
  for (let k = -2; k <= 2; k++) P(p.x + Math.cos(a + k * 0.1) * r, p.y + Math.sin(a + k * 0.1) * r, col);
  if (now) {
    ringDots(p.x, p.y, r, Math.floor(G.t * 20) % 2 ? C.wh : C.lg, 2);
    if (angDiff(a, p.aim) > curArc()) P(p.x + Math.cos(a) * (r + 3), p.y + Math.sin(a) * (r + 3), C.wh);
  }
}
const perfRate = (p, c) => c > 0 ? Math.round(p / c * 100) : 0;
