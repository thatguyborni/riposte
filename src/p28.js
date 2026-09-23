/* ================================================================
   The scare director.
   Nothing here fires on a fixed timer. It watches what you are doing,
   waits for a quiet moment, takes the music away for a few seconds so
   you notice the silence, and only then does something. Every beat has
   its own cooldown, so the same trick never lands twice in a row.
   HAUNTING in the settings still rules everything: OFF means none of
   this runs at all, and TOO MUCH makes it frequent and loud.
   Flashes are single and brief on purpose: no strobing.
   ================================================================ */
const SCARE = {next: 40, dread: 0, dreadMax: 0, armed: null, since: {}, count: 0, hud: 0, name: 0, load: 0, freeze: 0,
  blackout: 0, lag: 0, lagAim: 0, tab: 0, menuExtra: 0, watcher: 0, last: 0, hush: 0, hushTrack: null};
const scareLevel = () => hauntMode();                       // 0 off, 1 subtle, 2 full, 3 too much
const scareHard = () => scareLevel() >= 3;
// how often, in seconds, before the next attempt
function scareGap() {
  const h = hauntLevel(), lv = scareLevel();
  const base = lv >= 3 ? 26 : lv === 2 ? 70 : 150;
  return (base + rand() * base) * (1.35 - 0.07 * h);
}
const scareCtx = () => {
  if (!scene) return "none";
  if (inCombat() && G && G.mode !== "attract") return G.paused ? "pause" : "fight";
  if (scene === HubScene) return "hub";
  if (scene === TitleScene) return "title";
  if (scene === TapeScene || (typeof LoreScene !== "undefined" && scene === LoreScene)) return "read";
  return "menu";
};

/* ---------------- the beats ----------------
   need: where it can happen. lv: the lowest HAUNTING setting that allows it.
   h: how much of the story must be known. cool: seconds before it can repeat. */
const SCARES = [
  {id: "freeze", need: ["fight"], lv: 2, h: 2, cool: 420, run() {
    // everything stops and turns to look at you
    SCARE.freeze = 0.75;
    for (const f of G.foes) { f.stun = Math.max(f.stun || 0, 0.75); f.watch = 0.75; }
    musHush(2.2); noise(0.5, 0.3, 300, 80); tone(44, 1.2, "sine", 0.16);
  }},
  {id: "blackout", need: ["fight"], lv: 2, h: 3, cool: 520, dread: 2.2, run() {
    G.lightsOut = Math.max(G.lightsOut || 0, scareHard() ? 2.2 : 1.4);
    SCARE.blackout = 1.6;
    setTimeout(() => { hauntFace(0.4, true); stinger(); }, (scareHard() ? 1500 : 900));
  }},
  {id: "face", need: ["fight", "hub", "menu", "title"], lv: 2, h: 2, cool: 260, run() { hauntFace(0.32, scareHard()); if (scareHard()) stinger(0.7); }},
  {id: "lag", need: ["fight"], lv: 2, h: 3, cool: 500, run() {
    SCARE.lag = 0.4; whisper("MY TURN", {x: G.p.x, y: G.p.y - 20, life: 1.6}); tone(38, 0.9, "sawtooth", 0.14, 28);
  }},
  {id: "hud", need: ["fight"], lv: 1, h: 2, cool: 300, run() { SCARE.hud = 1.6; sfxGlitch(false); }},
  {id: "name", need: ["fight", "hub"], lv: 1, h: 3, cool: 380, run() {
    SCARE.name = 2.2; whisper(playerName(), {life: 2.4}); tone(52, 1.4, "sine", 0.1);
  }},
  {id: "ghost", need: ["fight"], lv: 2, h: 3, cool: 300, run() {
    // it stands where your reflection would be, and this time it takes a shot at you
    G.p2Show = 3.4; noise(0.6, 0.05, 1800, 700);
    setTimeout(() => {
      if (!G || !inCombat() || G.over || !(G.p2Show > 0)) return;
      const gx = clamp(2 * ACX - G.p.x, AX0 + 10, AX1 - 10), gy = clamp(2 * ACY - G.p.y, AY0 + 10, AY1 - 10);
      const a = Math.atan2(G.p.y - gy, G.p.x - gx);
      G.bullets.push({x: gx, y: gy, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, r: 2, friend: false, life: 3, seek: 0, bounce: 0,
        chain: 0, fast: false, perfect: false, pierce: 0, rally: 0, phantom: true});
      sfx.snipe();
    }, 900);
  }},
  {id: "watcher", need: ["hub"], lv: 2, h: 2, cool: 300, dread: 1.8, run() {
    // the lights die, and when they come back it is standing next to you
    HubScene.dark = 1.9;
    SCARE.watcher = 1.6;
    noise(0.4, 0.25, 260, 70);
    setTimeout(() => { if (scene === HubScene) { stinger(); hauntFace(0.25, true); } }, 1400);
  }},
  {id: "tv", need: ["hub"], lv: 2, h: 3, cool: 420, run() { HubScene.tvOn = 4; tone(90, 0.3, "square", 0.08); noise(0.5, 0.4, 3000, 1800); }},
  {id: "cabinet", need: ["hub"], lv: 2, h: 4, cool: 600, dread: 1.6, run() {
    HubScene.cabOn = 6; whisper("PLAYER 2 READY", {x: 314, y: 96, life: 2.6}); tone(120, 0.2, "square", 0.1);
  }},
  {id: "menuExtra", need: ["title"], lv: 2, h: 4, cool: 700, run() { SCARE.menuExtra = 9; sfxGlitch(false); }},
  {id: "tab", need: ["title", "menu", "hub"], lv: 1, h: 3, cool: 900, run() { setTabTitle("player 2"); SCARE.tab = 30; }},
  {id: "load", need: ["title", "menu"], lv: 2, h: 4, cool: 900, dread: 1.2, run() { SCARE.load = 2.6; noise(0.3, 0.2, 900, 300); }},
  {id: "pause", need: ["pause"], lv: 2, h: 3, cool: 400, run() { SCARE.watcher = 2.2; hauntFace(0.2, false); }}
];
const SCARE_BY = {};
for (const s of SCARES) SCARE_BY[s.id] = s;

function musHush(t) {
  // the music stops. that is the loudest thing this game does.
  SCARE.hushTrack = musTrack; musTrack = null;
  SCARE.hush = t;
}
function stinger(v) {
  if (!scaresOn()) return;
  noise(0.9, 0.5, 2600, 90);
  tone(41, 1.6, "sawtooth", (v || 1) * 0.2, 26);
  fxGlitch(0.8); fxRoll(); padRumble(1, 1, 320);
  if (G) { G.shake = Math.min(6, (G.shake || 0) + 5); G.flash = Math.max(G.flash || 0, 0.35); }
}
let TAB_TITLE = null;
function setTabTitle(t) {
  try { if (TAB_TITLE == null) TAB_TITLE = document.title; document.title = t; } catch (e) {}
}
function restoreTab() { try { if (TAB_TITLE != null) { document.title = TAB_TITLE; TAB_TITLE = null; } } catch (e) {} }

function scareTick(dt) {
  if (isNaN(dt)) return;
  // timers that run whatever the setting says, so nothing can get stuck on
  for (const k of ["hud", "name", "load", "freeze", "blackout", "lag", "menuExtra", "watcher"]) if (SCARE[k] > 0) SCARE[k] -= dt;
  if (SCARE.tab > 0 && (SCARE.tab -= dt) <= 0) restoreTab();
  if (SCARE.hush > 0 && (SCARE.hush -= dt) <= 0 && SCARE.hushTrack) { const t = SCARE.hushTrack; SCARE.hushTrack = null; musTrack = null; music(t); }
  if (SCARE.freeze > 0 && G && G.foes) for (const f of G.foes) f.stun = Math.max(f.stun || 0, 0.12);
  if (scareLevel() === 0 || !hauntLevel()) return;
  const ctx = scareCtx();
  if (ctx === "none" || ctx === "read") return;
  // the shot that is about to land
  if (SCARE.armed) {
    SCARE.dread -= dt;
    if (SCARE.dread <= 0) { const s = SCARE.armed; SCARE.armed = null; scareFire(s, ctx); }
    return;
  }
  SCARE.next -= dt;
  if (SCARE.next > 0) return;
  SCARE.next = scareGap();
  // never in the first moments of anything, and never while the player is busy dying
  if (G && (G.over || (G.mode !== "attract" && G.t < 8))) return;
  const h = hauntLevel(), lv = scareLevel(), now = T;
  const pool = SCARES.filter(s => s.need.includes(ctx) && lv >= s.lv && h >= s.h && now - (SCARE.since[s.id] || -1e9) > s.cool * (lv >= 3 ? 0.45 : 1));
  if (!pool.length) return;
  const s = pick(pool);
  if (s.dread && scaresOn()) {
    // take the sound away first
    SCARE.armed = s; SCARE.dread = SCARE.dreadMax = s.dread;
    musHush(s.dread + 2.5);
    return;
  }
  scareFire(s, ctx);
}
function scareFire(s, ctx) {
  if (scareCtx() !== ctx) return;              // they moved on; let it go
  SCARE.since[s.id] = T; SCARE.count++; SCARE.last = T;
  try { s.run(); } catch (e) {}
}

/* ---------------- what the beats look like ---------------- */
function drawScareFx() {
  if (scareLevel() === 0) return;
  const fs = fxScale();
  // the dread: the edges close in while the sound is gone
  if (SCARE.armed && SCARE.dreadMax > 0 && fs > 0) {
    const k = 1 - SCARE.dread / SCARE.dreadMax;
    L.globalAlpha = Math.min(0.5, k * 0.5);
    R(0, 0, W, 10 + k * 22, C.k); R(0, H - 10 - k * 22, W, 10 + k * 22, C.k);
    R(0, 0, 8 + k * 26, H, C.k); R(W - 8 - k * 26, 0, 8 + k * 26, H, C.k);
    L.globalAlpha = 1;
    if (rand() < 0.04 * k) fxGlitch(0.12);
  }
  if (SCARE.blackout > 0 && fs > 0) { L.globalAlpha = Math.min(0.85, SCARE.blackout * 0.6); R(0, 15, W, H - 15, "#010004"); L.globalAlpha = 1; }
  if (SCARE.name > 0 && G && G.p && inCombat()) txtS(playerName(), G.p.x, G.p.y - 26, C.rd, 1, "c", C.k);
  if (SCARE.watcher > 0 && scene === HubScene && SPR.figure && scaresOn()) {
    const k = Math.min(1, SCARE.watcher);
    L.globalAlpha = 0.85 * k;
    drawSpr(SPR.figure, clamp(HubScene.px + (HubScene.face > 0 ? -16 : 16), 16, 368), HubScene.py - 3);
    L.globalAlpha = 1;
  }
  if (SCARE.load > 0) {
    const k = 1 - SCARE.load / 2.6;
    R(0, 0, W, H, "#050308");
    txt("RIPOSTE ARCADE SYSTEM", W / 2, 96, C.lg, 1, "c");
    txt("LOADING SAVE ~ 11 OCT 1989 ~ MLO", W / 2, 110, C.wh, 1, "c");
    R(W / 2 - 60, 124, 120, 6, C.ink); RO(W / 2 - 60, 124, 120, 6, C.nv);
    R(W / 2 - 59, 125, Math.round(118 * clamp(k * 1.2, 0, 1)), 4, C.rd);
    if (k > 0.8) txt("NO", W / 2, 140, C.rd, 1, "c");
  }
}
// the HUD forgets whose game this is
function scareHud(s) { return SCARE.hud > 0 && scaresOn() && Math.floor(T * 6) % 3 ? pick0(["MLO", "0417", "MLO"], Math.floor(T * 3)) : s; }
