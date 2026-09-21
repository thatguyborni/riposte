/* ================================================================
   Scenes: menu helpers, title, arcade, initials
   ================================================================ */
let scene = null, T = 0;
function go(sc, arg) {
  const from = scene;
  scene = sc; sc.sel = 0; sc.items = [];
  if (from && from !== sc && sc !== BootScene) {
    FX.wipe = 0; fxGlitch(0.35);
    if (rand() < 0.4) fxRoll();
  }
  if (sc.enter) sc.enter(arg);
}
function pressFx(it) {
  FX.press = {x: it.x, y: it.y, w: it.w, h: it.h, t: 0.2};
  fxGlitch(0.22); sfxGlitch(false);
}
function inCombat() { return scene === ArcadeScene || scene === RunFight || scene === TrainingScene; }

function btn(sc, label, x, y, w, h, act, o) {
  o = o || {};
  const i = sc.items.length, sel = i === sc.sel, dis = !!o.disabled;
  sc.items.push({x, y, w, h, act, disabled: dis, oneTap: !!o.oneTap});
  const col = dis ? C.gy : (o.col || C.wh);
  if (sel && !dis) { R(x, y, w, h, col); } else { R(x, y, w, h, C.ink); RO(x, y, w, h, sel ? col : (o.dim || C.gy)); }
  if (label != null) {
    const tc = sel && !dis ? C.k : col;
    const ty = y + Math.floor((h - 5) / 2);
    if (o.align === "l") txt(label, x + 4, ty, tc); else txt(label, x + w / 2, ty, tc, 1, "c");
  }
  if (sel && !dis && Math.floor(T * 3) % 2) { txt(">", x - 6, y + Math.floor((h - 5) / 2), col); }
  return sel;
}
function menuKey(sc, k) {
  const n = sc.items.length; if (!n) return false;
  if (["arrowdown", "s", "arrowright", "d", "tab"].includes(k)) { sc.sel = (sc.sel + 1) % n; sfx.move(); return true; }
  if (["arrowup", "w", "arrowleft", "a"].includes(k)) { sc.sel = (sc.sel - 1 + n) % n; sfx.move(); return true; }
  if (k === "enter" || k === " ") {
    const it = sc.items[sc.sel];
    if (it && !it.disabled) { sfx.select(); pressFx(it); it.act(); } else { sfx.deny(); fxWobble(0.3); }
    return true;
  }
  return false;
}
function menuMove(sc, x, y) {
  sc.items.forEach((it, i) => { if (x >= it.x && x < it.x + it.w && y >= it.y && y < it.y + it.h && sc.sel !== i) { sc.sel = i; } });
}
let menuClickX = null;   // where a click landed, for rows that do different things left and right
function menuClick(sc, x, y) {
  let hit = sc.items.find(it => x >= it.x && x < it.x + it.w && y >= it.y && y < it.y + it.h);
  if (!hit && lastPointerTouch) {
    // fingers are bigger than cursors: take the nearest item within a few pixels
    let bd = 7;
    for (const it of sc.items) {
      const dx = Math.max(it.x - x, 0, x - (it.x + it.w)), dy = Math.max(it.y - y, 0, y - (it.y + it.h)), d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; hit = it; }
    }
  }
  if (!hit) return false;
  const i = sc.items.indexOf(hit);
  // screens that describe the selected thing: on touch the first tap shows it, the second one picks it
  if (sc.twoTap && lastPointerTouch && sc.sel !== i && !hit.disabled && !hit.oneTap) { sc.sel = i; sfx.move(); return true; }
  sc.sel = i;
  if (!hit.disabled) { sfx.select(); pressFx(hit); menuClickX = x; try { hit.act(); } finally { menuClickX = null; } }
  else { sfx.deny(); fxWobble(0.3); }
  return true;
}
function beginItems(sc) { sc.items = []; }
function endItems(sc) { if (sc.sel >= sc.items.length) sc.sel = Math.max(0, sc.items.length - 1); }

let bgScroll = 0;
function menuBg(pal) {
  pal = pal || PALS.grid;
  bgScroll = (bgScroll + 0.25) % 16;
  R(0, 0, W, H, pal.bg);
  L.fillStyle = pal.grid;
  for (let x = 8; x < W; x += 16) for (let y = -16 + bgScroll; y < H; y += 16) L.fillRect(x, Math.round(y), 1, 1);
}
function title(s, y, col) { txtS(s, W / 2, y, col || C.ye, 2, "c", C.pl); }
function cycleSound() {
  meta.settings.sound = (meta.settings.sound + 2) % 3;
  saveMeta();
  toast("SOUND: " + ["OFF", "EFFECTS ONLY", "MUSIC + EFFECTS"][meta.settings.sound], C.bl);
}

/* ---------------- title ---------------- */
function seedAttract() {
  newCombat({mode: "attract", pal: "grid", lives: 99});
  G.wave = 3; G.spawnQ = ["sentry", "spreader", "sniper", "armor"]; G.waveT = 0.1;
}
let lastInput = 0;
const TitleScene = {
  enter() { seedAttract(); music("title"); this.saved = loadRun(); lastInput = T; this.demo = false; hubReturn = false; checkTapes(); },
  update(dt) {
    combatTick(dt);
    const idle = T - lastInput > 25;
    if (idle !== this.demo) { this.demo = idle; fxGlitch(0.5); fxRoll(); sfxGlitch(true); if (idle) { this.demoT = 0; this.demoCounted = false; } }
    if (this.demo) {
      this.demoT += dt;
      if (this.demoT > 8 && !(meta.flags && meta.flags.demoSeen)) { if (!meta.flags) meta.flags = {}; meta.flags.demoSeen = 1; saveMeta(); }
      if (this.demoT > 30 && !this.demoCounted) { this.demoCounted = true; meta.flags.demoRuns = (meta.flags.demoRuns || 0) + 1; saveMeta(); checkLore(); }
      // the demo player stops playing and turns to face the glass
      const pos = haunted(3) && scaresOn() && this.demoT % 30 > 12 && this.demoT % 30 < 19;
      if (pos && !G.possess) { fxGlitch(0.3); tone(45, 1.5, "sine", 0.12); }
      G.possess = pos;
    } else if (G) G.possess = false;
  },
  key(k) { if (this.demo) { lastInput = T; return true; } return false; },
  click() { if (this.demo) { lastInput = T; return true; } return false; },
  drawDemo() {
    // the cabinet's attract loop: the game plays itself, scores cycle, it begs for coins
    L.globalAlpha = 0.35; R(0, 0, W, 34, C.k); R(0, 196, W, 44, C.k); L.globalAlpha = 1;
    txt("RIPOSTE", W / 2 + 2, 10, C.pl, 3, "c"); txt("RIPOSTE", W / 2, 8, C.ye, 3, "c");
    const page = Math.floor(this.demoT / 5) % 2;
    const board = boardWithPhantom();
    if (page === 1 && board.length) {
      panel(W / 2 - 70, 60, 140, 12 + Math.min(5, board.length) * 11, C.bl);
      txt("HIGH SCORES", W / 2, 64, C.bl, 1, "c");
      board.slice(0, 5).forEach((e, i) => {
        const col = e.ghost ? C.pl : i === 0 ? C.ye : C.wh;
        txt((i + 1) + ". " + ghostInitials(e), W / 2 - 60, 76 + i * 11, col);
        txt(String(e.s), W / 2 + 60, 76 + i * 11, col, 1, "r");
      });
    }
    if (G.possess) { if (Math.floor(T * 2) % 2) txt("PLAY WITH ME", W / 2, 206, C.rd, 2, "c"); }
    else if (Math.floor(T * 2) % 2) txt("INSERT COIN", W / 2, 206, C.ye, 2, "c");
    txt(ctl("PRESS ANY KEY", "PRESS ANY BUTTON", "TAP TO PLAY"), W / 2, 224, C.lg, 1, "c");
  },
  draw() {
    drawCombat({noHud: true});
    if (this.demo) { this.items = []; return this.drawDemo(); }
    L.globalAlpha = 0.62; R(0, 0, W, H, C.k); L.globalAlpha = 1;
    // logo with a travelling shine
    const lx = W / 2, ly = 34;
    // now and then, for a frame, the logo only says the first three letters
    const rip = haunted(3) && scaresOn() && T % 13 < 0.09;
    const word = rip ? "RIP" : "RIPOSTE", wx = rip ? lx - tw("RIPOSTE", 5) / 2 : lx, wa = rip ? undefined : "c";
    txt(word, wx + 3, ly + 3, C.pl, 5, wa);
    txt(word, wx, ly, rip ? C.rd : C.or, 5, wa);
    if (!rip) {
      L.save(); L.beginPath(); L.rect(0, ly, W, 12); L.clip(); txt("RIPOSTE", lx, ly, C.ye, 5, "c"); L.restore();
      const sh = ((T * 90) % 360) - 80;
      L.save(); L.beginPath(); L.rect(lx - 70 + sh, ly, 5, 25); L.clip(); txt("RIPOSTE", lx, ly, C.wh, 5, "c"); L.restore();
    }
    let sub = "CATCH IT. GIVE IT BACK.", subCol = C.lg;
    if (meta.milo === "stay" && T % 16 > 12) { sub = "YOU'RE STILL HERE."; subCol = C.pl; }
    else if (haunted(1) && isNight() && T % 14 > 9) { sub = "YOU SHOULD BE ASLEEP."; subCol = C.pl; }
    txt(sub, W / 2, 66, subCol, 1, "c");

    beginItems(this);
    const bx = W / 2 - 55, bw = 110;
    const gap = 16;
    let y = 86;
    btn(this, "ARCADE", bx, y, bw, 12, () => go(ArcadeScene)); y += gap;
    // descent, daily and training live in GAME MODES
    const sv = this.saved && !this.saved.daily ? this.saved : null;
    const tutY = y;
    btn(this, "GAME MODES" + (sv ? "  ~  RUN SAVED" : ""), bx, y, bw, 12, () => go(ModesScene), {col: C.li}); y += gap;
    const due = dueTapes().length;
    btn(this, "THE BACK ROOM", bx, y, bw, 12, () => go(HubScene), {col: C.or});
    if (due && Math.floor(T * 2) % 2) txt("!", bx + bw - 10, y + 4, this.items.length - 1 === this.sel ? C.k : C.pk);
    y += gap;
    btn(this, "SETTINGS", bx, y, bw, 12, () => go(SettingsScene), {col: C.lg, dim: C.nv}); y += gap;
    if (window.rpQuit) btn(this, "QUIT", bx, y, bw, 12, powerOff, {col: C.gy, dim: C.nv});
    endItems(this);
    if (!meta.tutorialDone && !meta.stats.runs && !meta.arcade.length && Math.floor(T * 2) % 2) txt("< NEW? TRAINING IS IN HERE", bx + bw + 6, tutY + 4, C.bl);

    // side info
    txt("TOKENS", 12, 90, C.gy); txt("@" + meta.tokens, 12, 97, C.or);
    txt("ARCADE BEST", 12, 112, C.gy); txt(String(meta.arcade[0] ? meta.arcade[0].s : 0), 12, 119, C.wh);
    txt("FRAGMENTS", 12, 134, C.gy);
    meta.fragments.forEach((f, i) => txt(f ? "@" : "~", 12 + i * 6, 141, f ? C.pk : C.gy));
    txt("DEEPEST", 12, 156, C.gy); txt(meta.stats.bestDepth ? "DEPTH " + meta.stats.bestDepth : "-", 12, 163, C.wh);
    if (allFragments() && !meta.secrets.echo && Math.floor(T * 2) % 2) txt("THE SIGNAL IS COMPLETE", W / 2, 206, C.pk, 1, "c");
    txt("TROPHIES", 12, 178, C.gy); txt(achCount() + "/" + ACH.length, 12, 185, C.ye);
    const DD = DIFFS[diffLevel()];
    txt("DIFFICULTY", 12, 200, C.gy); txt(DD.n, 12, 207, DD.col);
    txt(ctl("WASD MOVE  ~  MOUSE AIM  ~  SPACE PULSE  ~  SHIFT DASH", "L-STICK MOVE  ~  R-STICK AIM  ~  RT PULSE  ~  LT DASH", "LEFT THUMB MOVES  ~  RIGHT THUMB AIMS  ~  PULSE / DASH BUTTONS"), W / 2, 224, C.gy, 1, "c");
    txt("V" + VERSION, W - 6, 224, C.nv, 1, "r");
  }
};
function beginDescent() {
  const owned = Object.keys(SHIELDS).filter(k => meta.shields[k]);
  if (owned.length > 1 || meta.asc > 0) go(ShieldSelect);
  else { startRun("standard"); go(RunMap); }
}

/* ---------------- pause overlay (shared by combat scenes) ---------------- */
function drawPause(sc, quitLabel, quitAct, extra) {
  if (sc.pauseSettings) return drawPauseSettings(sc);
  L.globalAlpha = 0.7; R(0, 0, W, H, C.k); L.globalAlpha = 1;
  title("PAUSED", 64);
  beginItems(sc);
  let y = 92;
  btn(sc, "RESUME", W / 2 - 50, y, 100, 12, () => { G.paused = false; }); y += 16;
  if (extra) { btn(sc, extra.label, W / 2 - 50, y, 100, 12, extra.act, {col: C.ye}); y += 16; }
  btn(sc, "SOUND: " + ["OFF", "FX", "ALL"][meta.settings.sound], W / 2 - 50, y, 100, 12, cycleSound); y += 16;
  btn(sc, "SETTINGS", W / 2 - 50, y, 100, 12, () => { sc.pauseSettings = true; sc.sel = 0; }, {col: C.bl}); y += 16;
  // destructive: ask twice
  const armed = sc.quitArmed && T - sc.quitArmed < 3;
  btn(sc, armed ? "SURE? PRESS AGAIN" : quitLabel, W / 2 - 50, y, 100, 12, () => {
    if (armed) { sc.quitArmed = 0; quitAct(); } else { sc.quitArmed = T; sfx.deny(); fxWobble(0.4); }
  }, {col: C.rd});
  endItems(sc);
  if (G.mode === "run") {
    const ids = ownedMods();
    txt("YOUR MODS " + ids.length + "/" + MOD_SLOTS, W / 2, 162, C.gy, 1, "c");
    if (!ids.length) txt("NONE YET", W / 2, 170, C.gy, 1, "c");
    ids.slice(0, MOD_SLOTS).forEach((id, i) => txt(modName(id), W / 2, 170 + i * 7, RAR_COL[MODS[id].r], 1, "c"));
  }
}
function combatKey(sc, k, quitAct) {
  if (G.paused) {
    if (sc.pauseSettings) {
      const r = visibleSettings()[sc.sel];
      if (k === "escape" || k === "p") { sc.pauseSettings = false; sc.sel = 2; sfx.move(); return true; }
      if (r && (k === "arrowleft" || k === "a")) { changeSetting(r, -1); return true; }
      if (r && (k === "arrowright" || k === "d")) { changeSetting(r, 1); return true; }
    } else if (k === "escape" || k === "p") { G.paused = false; sfx.move(); return true; }
    return menuKey(sc, k);
  }
  if (k === "p" || k === "escape") { G.paused = true; sc.sel = 0; sfx.move(); fxGlitch(0.2); return true; }
  if (k === " ") { doPulse(); return true; }
  if (k === "shift") { doDash(); return true; }
  return true;
}

/* ---------------- arcade ---------------- */
const ArcadeScene = {
  enter() {
    newCombat({mode: "arcade", pal: "grid", lives: 3, maxLives: 3, onEnd: () => go(ArcadeOver)});
    if (new Date().getHours() === 3) unlockAch("witching");
    G.waveT = 0.6; music("fight");
  },
  update(dt) { combatTick(dt); if (G.foes.some(f => FOE[f.type].boss)) music("boss"); else if (!G.over) music("fight"); },
  draw() {
    drawCombat();
    this.items = [];
    if (G.paused) drawPause(this, "QUIT TO TITLE", () => go(TitleScene));
  },
  key(k) { return combatKey(this, k); }
};
function arcadeQualifies(s) { return s > 0 && (meta.arcade.length < 10 || s > meta.arcade[meta.arcade.length - 1].s); }
const ArcadeOver = {
  back() { go(TitleScene); },
  enter() {
    const D = DIFFS[G.dl != null ? G.dl : DIFF_NORMAL];
    this.res = {score: Math.round(G.score * D.score), raw: G.score, dl: G.dl != null ? G.dl : DIFF_NORMAL, wave: G.wave, chain: G.bestChain, perf: G.perfects}; music("map");
    const ph = phantomEntry();
    if (ph && !ph.ghost2 && this.res.score > ph.s && meta.milo !== "stay" && haunted(2)) setTimeout(() => whisper("HE DIDN'T LIKE THAT"), 1200);
    const r = this.res;
    meta.stats.bestWave = Math.max(meta.stats.bestWave || 0, r.wave);
    meta.stats.arcadeGames = (meta.stats.arcadeGames || 0) + 1;
    this.newBest = r.score > 0 && r.score > (meta.stats.bestScore || 0);
    if (this.newBest) {
      meta.stats.bestScore = r.score; meta.stats.bestScoreWave = r.wave;
      // the stats behind it travel with the score, so the online boards can check it adds up
      meta.stats.bestRun = {s: r.score, w: r.wave, k: G.kills | 0, c: G.bestChain | 0, p: G.perfects | 0, r: G.parries | 0, t: Math.round(G.t || 0), d: r.dl};
    }
    // the cabinet's top 10 fills itself in with the player's initials: no typing after every game
    this.entry = null;
    if (arcadeQualifies(r.score)) {
      this.entry = {i: meta.initials || "AAA", s: r.score, w: r.wave, me: true};
      meta.arcade.push(this.entry);
      meta.arcade.sort((a, b) => b.s - a.s);
      meta.arcade = meta.arcade.slice(0, 10);
    }
    saveMeta();
    checkTapes();
    if (typeof gjSyncBest === "function") { gjSyncBest(true); playerPush(); }
  },
  draw() {
    menuBg();
    title("GAME OVER", 40, C.rd);
    const r = this.res;
    const D = DIFFS[r.dl];
    const rows = r.dl === DIFF_NORMAL ? [["SCORE", r.score], ["WAVE", r.wave], ["BEST CHAIN", "X" + r.chain], ["PERFECTS", r.perf]]
      : [["POINTS", r.raw], [D.n, scoreMulText(D)], ["SCORE", r.score], ["WAVE", r.wave], ["BEST CHAIN", "X" + r.chain]];
    rows.forEach((row, i) => { txt(row[0], W / 2 - 60, 74 + i * 12, C.gy); txt(String(row[1]), W / 2 + 60, 74 + i * 12, C.wh, 1, "r"); });
    txt("PLAYER: " + (typeof myName === "function" ? myName() : meta.initials), W / 2, 60, C.gy, 1, "c");
    if ((this.newBest || this.entry) && Math.floor(T * 2) % 2) txt(this.newBest ? "NEW PERSONAL BEST!" : "YOU MADE THE TOP 10", W / 2, 130, this.newBest ? C.ye : C.bl, 1, "c");
    beginItems(this);
    let y = 144;
    if (this.entry) { const e = this.entry; btn(this, "SEE RECORDS", W / 2 - 50, y, 100, 12, () => go(RecordsScene, {hl: e}), {col: C.ye}); y += 15; }
    btn(this, "PLAY AGAIN", W / 2 - 50, y, 100, 12, () => go(ArcadeScene)); y += 15;
    btn(this, "TITLE", W / 2 - 50, y, 100, 12, () => go(TitleScene), {col: C.gy});
    endItems(this);
    txt(pick0(TIPS_ARCADE, Math.floor(r.score / 7)), W / 2, 206, C.la, 1, "c");
  }
};
const TIPS_ARCADE = ["CATCH LATE, ON THE INNER LINE, FOR A PERFECT.", "A KILLING SHOT KEEPS GOING. LINE THEM UP.",
  "THE CORNERS ARE LIVE. DON'T HIDE IN THEM.", "CROWD A GUARDIAN AND IT SHOVES BACK. DASH OUT WHEN THE RING CLOSES.",
  "AMBER PLATES THROW YOUR SHOTS BACK. WAIT FOR THE GAP.", "RETURNED SHOTS BOUNCE OFF A WALL ONCE.",
  "PULSE CATCHES EVERYTHING CLOSE AT ONCE.", "PURPLE LINES MEAN A SHOT IS COMING. GOOD."];
function pick0(a, i) { return a[Math.abs(i) % a.length]; }

/* ---------------- boot sequence ---------------- */
let BOOT_LINES = [];
const BootScene = {
  enter() {
    BOOT_LINES = bootLines();
    this.t = 0; this.shown = 0; this.logoAt = 2.1 + (BOOT_LINES.length - 9) * 0.15; this.letters = 0; this.done = false;
    FX.power = 0; musTrack = null; audioInit();
  },
  update(dt) {
    this.t += dt;
    const t = this.t;
    // power on: line, then the picture opens up
    if (t < 0.12) FX.power = 0.004;
    else FX.power = Math.min(1, Math.pow((t - 0.12) / 0.4, 2));
    if (t > 0.12 && !this.thump) { this.thump = true; tone(55, 0.35, "sine", 0.3, 30); noise(0.5, 0.14, 5000, 800); }
    // BIOS lines
    const want = Math.min(BOOT_LINES.length, Math.max(0, Math.floor((t - 0.7) / 0.15)));
    while (this.shown < want) {
      this.shown++;
      tone(this.shown === BOOT_LINES.length ? 220 : 1320, 0.035, "square", 0.06);
      if (this.shown === BOOT_LINES.length) { fxGlitch(0.5); }
    }
    if (t >= this.logoAt && !this.logoHit) { this.logoHit = true; fxGlitch(0.9); fxRoll(); sfxGlitch(true); }
    const L2 = Math.min(7, Math.max(0, Math.floor((t - this.logoAt - 0.25) / 0.09)));
    while (this.letters < L2) { this.letters++; tone(260 + this.letters * 60, 0.07, "square", 0.1); }
    if (this.letters === 7 && !this.chord) { this.chord = true; seq([523, 659, 784, 1047], 60, "square", 0.12, 0.3); fxGlitch(0.3); }
    if (t > this.logoAt + 3.2) this.finish();
  },
  finish() { if (this.done) return; this.done = true; FX.power = 1; go(typeof afterBoot === "function" ? afterBoot() : TitleScene); },
  draw() {
    R(0, 0, W, H, "#020308");
    const t = this.t;
    if (t < this.logoAt) {
      BOOT_LINES.slice(0, this.shown).forEach((l, i) => {
        const y = 18 + i * 11;
        txt(l[0], 18, y, i === 0 ? C.wh : C.lg);
        if (i > 0) {
          const dots = ".".repeat(Math.max(2, 30 - l[0].length));
          txt(dots, 18 + tw(l[0]) + 4, y, C.gy);
          txt(l[1], 18 + tw(l[0]) + 8 + tw(dots), y, l[1] === "OK" ? C.li : C.pk);
        } else txt(l[1], W - 18, y, C.gy, 1, "r");
      });
      if (Math.floor(t * 4) % 2) R(18, 18 + this.shown * 11, 5, 7, C.lg);
      return;
    }
    // logo: letters drop in one by one
    const word = "RIPOSTE", sc = 5, total = tw(word, sc), x0 = W / 2 - total / 2;
    for (let i = 0; i < this.letters; i++) {
      const age = t - this.logoAt - 0.25 - i * 0.09;
      const drop = Math.max(0, 1 - age / 0.18);
      const y = 70 - drop * drop * 60 + (age > 0.18 && age < 0.3 ? 2 : 0);
      txt(word[i], x0 + i * 4 * sc + 3, y + 3, C.pl, sc);
      txt(word[i], x0 + i * 4 * sc, y, C.or, sc);
      L.save(); L.beginPath(); L.rect(0, y, W, 12); L.clip(); txt(word[i], x0 + i * 4 * sc, y, C.ye, sc); L.restore();
    }
    if (this.letters === 7) {
      txt("CATCH IT. GIVE IT BACK.", W / 2, 104, C.lg, 1, "c");
      if (Math.floor(t * 2.5) % 2) txt(ctl("PRESS ANY KEY", "PRESS ANY BUTTON", "TAP TO START"), W / 2, 150, C.wh, 1, "c");
      txt("V" + VERSION, W / 2, 222, C.nv, 1, "c");
    }
  },
  key() { this.finish(); return true; },
  click() { this.finish(); return true; }
};
function powerOff() {
  const t0 = performance.now();
  tone(70, 0.4, "sine", 0.25, 30);
  const step = () => {
    const k = (performance.now() - t0) / 450;
    FX.power = Math.max(0.004, 1 - k * 1.3);
    if (k < 1) requestAnimationFrame(step); else setTimeout(() => { try { window.rpQuit(); } catch (e) {} }, 120);
  };
  step();
}
