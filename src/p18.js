/* ================================================================
   The Basement: a hidden depth below everything else.
   Darkness, things that move when you look away, coins that bite,
   and the last player.
   ================================================================ */
PALS.basement = {name: "THE BASEMENT", bg: "#060305", grid: "#1A0B10", wall: "#7E2553", accent: C.rd};
DEPTH_PAL[5] = "basement";
BOSS_FOR[5] = "milo";
Object.assign(FOE, {
  hollow: {hp: 2, r: 4.5, cd: 99, spd: 50, score: 300, coins: 2, spr: "hollow"},
  mimic:  {hp: 1, r: 4,   cd: 2.2, spd: 0, score: 250, coins: 4, spr: "mimic"},
  milo:   {hp: 30, r: 6,  cd: 1.35, spd: 38, score: 9000, coins: 0, boss: true, name: "MILO"}
});
Object.assign(FOE_INFO, {
  hollow: ["HOLLOW", "IT ONLY MOVES WHEN YOUR SHIELD ISN'T POINTING AT IT. KEEP IT IN FRONT OF YOU."],
  mimic:  ["MIMIC", "NOT EVERY COIN WANTS TO BE PICKED UP. REAL COINS COME TO YOU. THESE WAIT."],
  milo:   ["MILO", "THE LAST PLAYER. HE CATCHES LIKE YOU DO. HE LOWERS HIS GUARD WHEN HE SHOOTS."]
});
FOE_ORDER.splice(11, 0, "hollow", "mimic");
FOE_ORDER.push("milo");

MUSIC.basement = {bpm: 56, lt: "triangle", dt: 1.013,
  bass: [45,0,0,0,0,0,0,0, 44,0,0,0,0,0,0,0, 41,0,0,0,0,0,0,0, 40,0,0,0,0,0,0,0],
  lead: [81,0,84,0,88,0,87,0, 81,0,84,0,83,0,0,0, 80,0,84,0,87,0,86,0, 80,0,83,0,81,0,0,0]};
MUSIC.milo = {bpm: 128, dt: 1.01,
  bass: MUSIC.boss.bass.map(n => n ? n - 1 : 0), lead: MUSIC.boss.lead.map(n => n ? n - 1 : 0)};
MUSIC.titleNight = {bpm: 90, dt: 1.012,
  bass: MUSIC.title.bass.map(n => n ? n - 1 : 0), lead: MUSIC.title.lead.map(n => n ? n - 1 : 0)};

function buildHorrorSprites() {
  SPR.hollow = mkSprite(["...ggg...", "..ggggg..", "..gkgkg..", "..ggggg..", "...gkg...", "....g....", "..ggggg..",
    ".g.ggg.g.", "g..ggg..g", "...ggg...", "...g.g...", "...g.g...", "..g...g.."], {g: "#8A8794", k: C.k});
  SPR.mimic = mkSprite(["..yyyyy..", ".yYYYYYy.", "yYkkkkkYy", "yYwkwkwYy", "yYkkkkkYy", "yYkwkwkYy", "yYkkkkkYy", ".yYYYYYy.", "..yyyyy.."],
    {y: C.or, Y: C.ye, k: "#2A0A0A", w: C.wh});
  const P9 = ["....o....", "...oyo...", "..oyyyo..", ".oyywyyo.", "oyywwwyyo", ".oyywyyo.", "..oyyyo..", "...oyo...", "....o...."];
  SPR.milo = mkSprite(P9, {o: C.gy, y: C.lg, w: C.rd});
  SPR.ghostPlayer = mkSprite(P9, {o: C.gy, y: C.lg, w: C.wh});
  SPR.face = mkSprite([
    "....wwwwwwww....", "..wwwwwwwwwwww..", ".wwwwwwwwwwwwww.", "wwwwwwwwwwwwwwww", "wwwwwwwwwwwwwwww",
    "wwwkkkwwwwkkkwww", "wwkkkkkwwkkkkkww", "wwkkkkkwwkkkkkww", "wwwkkkwwwwkkkwww", "wwwwwwwwwwwwwwww",
    "wwwwwwwkkwwwwwww", "wwwwwwwwwwwwwwww", ".wwwwwkkkkwwwww.", ".wwwwkkkkkkwwww.", "..wwwkkkkkkwww..",
    "..wwwwkkkkwwww..", "...wwwwwwwwww...", "....wwwwwwww....", ".....wwwwww.....", "......wwww......"], {w: "#D8D2D4", k: C.k});
  SPR.figure = mkSprite(["..kkk..", ".kkkkk.", ".kwkwk.", ".kkkkk.", "..kkk..", ".kkkkk.", "kkkkkkk", "kkkkkkk",
    "k.kkk.k", "k.kkk.k", "..kkk..", "..k.k..", "..k.k..", ".kk.kk."], {k: "#040206", w: "#E8E0E0"});
  SPR.npc_milo = mkSprite(["..hhh..", ".hsssh.", ".sksks.", "..sss..", ".ccccc.", "cc.c.cc", "..ccc..", "..c.c..", ".cc.cc."],
    {h: C.ru, s: C.pe, k: C.k, c: C.bl});
  SPR.tape = mkSprite(["lllllll", "lkwlwkl", "lllllll", "l.lll.l"], {l: C.la, k: C.k, w: C.wh});
}

/* ---------------- enemy behaviour (called from the combat loop) ---------------- */
function hollowStep(f, p, dt, dx, dy, dist) {
  const ang = Math.atan2(f.y - p.y, f.x - p.x);
  f.seen = f.born > 0.5 && angDiff(ang, p.aim) < curArc() + 0.35;
  if (f.seen) { f.vx *= 0.15; f.vy *= 0.15; return; }
  const s = FOE.hollow.spd * G.diff * (f.elite ? 1.15 : 1);
  f.vx = dx / dist * s; f.vy = dy / dist * s;
  if (G.mode !== "attract" && G.t - (G.creakT || 0) > 0.4) { G.creakT = G.t; noise(0.09, 0.035, 260 + rand() * 80, 140); }
}
function wakeMimic(f) {
  f.dormant = false; f.hit = 0.15; f.cd = 1.4;
  const off = rand() * TAU;
  for (let k = 0; k < 10; k++) fire(f, off + k / 10 * TAU, 62 * G.diff, 1.5);
  burst(f.x, f.y, 10, C.or, 80, 0.35);
  floatTxt(f.x, f.y - 10, "!", C.rd);
  tone(900, 0.06, "square", 0.1, 200); noise(0.15, 0.12, 1200, 400);
  G.shake = Math.min(5, G.shake + 2);
}
function mimicStep(f, p, dt, dist) {
  f.vx = f.vy = 0;
  if (G.foes.every(o => o.dormant)) f.idleT = (f.idleT || 0) + dt;
  if (f.born > 0.5 && (dist < 34 || f.hit > 0 || f.idleT > 4)) wakeMimic(f);
}
function miloStep(f, p, dt) {
  if (f.guardT > 0) f.guardT -= dt;
  if (f.born < 1.4 || G.over) return;
  f.lights = (f.lights == null ? 7 : f.lights) - dt;
  if (f.lights <= 0) {
    f.lights = f.p2 ? 7 + rand() * 2 : 9 + rand() * 3;
    G.lightsOut = 2.6;
    floatTxt(p.x, p.y - 18, "LIGHTS OUT", C.rd);
    tone(70, 0.4, "square", 0.1, 40); noise(0.3, 0.1, 600, 100);
    if (rand() < 0.4) whisper(pick(["BEHIND YOU", "OVER HERE", "I CAN SEE YOU", "AGAIN"]));
  }
}

/* ---------------- darkness ---------------- */
let darkCv = null, darkX = null;
function drawDarkness() {
  if (!darkCv) { darkCv = document.createElement("canvas"); darkCv.width = W * RS; darkCv.height = H * RS; darkX = darkCv.getContext("2d"); }
  const d = darkX, p = G.p;
  d.globalCompositeOperation = "source-over";
  d.clearRect(0, 0, darkCv.width, darkCv.height);
  d.fillStyle = "rgba(3,1,4,0.965)";
  d.fillRect(0, 0, darkCv.width, darkCv.height);
  d.globalCompositeOperation = "destination-out";
  const light = (x, y, r, a) => {
    const g = d.createRadialGradient(x * RS, y * RS, 0, x * RS, y * RS, r * RS);
    g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(0.55, "rgba(0,0,0," + (a * 0.7) + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
    d.fillStyle = g; d.beginPath(); d.arc(x * RS, y * RS, r * RS, 0, TAU); d.fill();
  };
  const out = G.lightsOut > 0;
  const flick = rand() < 0.015 ? 0.6 : 1;
  if (!(G.over && !G.won)) light(p.x, p.y, (out ? 24 : 66 + Math.sin(G.t * 9) * 2) * flick, 1);
  for (const b of G.bullets) light(b.x, b.y, b.friend ? 13 : 10, 0.9);
  for (const c of G.coins) light(c.x, c.y, 7, 0.6);
  for (const f of G.foes) {
    if (f.dormant) light(f.x, f.y, 7, 0.6);
    else if (f.type === "milo") light(f.x, f.y, out ? 0 : 22, 0.55);
    else if (f.flashT > 0 || f.hit > 0) light(f.x, f.y, 16, 0.75);
  }
  for (const q of G.parts) if (!q.ring && rand() < 0.25) light(q.x, q.y, 4, 0.4);
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.drawImage(darkCv, 0, 0); L.restore();
  // eyes in the dark
  for (const f of G.foes) {
    if (f.type === "hollow" && f.born > 0.4) {
      const col = f.seen ? C.wh : C.rd;
      L.globalAlpha = 0.65 + rand() * 0.3;
      P(f.x - 1, f.y - 4, col); P(f.x + 1, f.y - 4, col);
      L.globalAlpha = 1;
    } else if (f.type === "milo" && out) { P(f.x - 1, f.y - 1, C.rd); P(f.x + 1, f.y - 1, C.rd); }
  }
}

/* ---------------- the basement run ---------------- */
function genBasementMap() {
  const N = (id, layer, x, y, type, next) => ({id, layer, x, y, type, next, secret: false, visited: false});
  const nodes = [
    N("b-0", 0, 60, 128, "fight", ["b-1", "b-2"]),
    N("b-1", 1, 122, 92, "event", ["b-3"]),
    N("b-2", 1, 122, 164, "fight", ["b-3"]),
    N("b-3", 2, 186, 128, "elite", ["b-4", "b-5"]),
    N("b-4", 3, 248, 92, "rest", ["b-6"]),
    N("b-5", 3, 248, 164, "treasure", ["b-6"]),
    N("b-6", 4, 318, 128, "boss", [])
  ];
  return {depth: 5, nodes, vaultId: null};
}
function startBasement() {
  const sh = meta.shields[meta.shield] ? meta.shield : "standard";
  startRun(sh, {});
  run.depth = 5; run.basement = true;
  meta.stats.basements = (meta.stats.basements || 0) + 1; meta.flags.basement = 1; saveMeta();
  run.map = genBasementMap(); run.curId = null; run.pendingId = null;
  for (let i = 0; i < 2; i++) gainMod(rollMod("u"));
  run.maxLives++; run.lives = run.maxLives;
  saveRun();
  go(RunMap);
  setTimeout(() => whisper("YOU CAME", {big: true, x: W / 2, y: 110, life: 2.6}), 900);
}

/* ---------------- after the last fight ---------------- */
const MiloEnding = {
  captureKeys: true,
  enter() {
    this.t = 0; this.choice = null; this.sel = 0; this.hum = 0;
    musTrack = null;
    this.lines = ["THE ROOM GOES QUIET.",
      "THE LITTLE FIGURE PUTS HIS SHIELD DOWN AND SITS ON THE FLOOR.",
      "'YOU'RE REALLY GOOD,' HE SAYS. 'NOBODY'S BEEN THIS GOOD SINCE ME.'",
      "'I'VE BEEN PLAYING FOR A REALLY LONG TIME. I THINK I WANT TO GO HOME NOW.'",
      "'BUT IF I GO, IT NEEDS SOMEBODY ELSE TO PLAY WITH.'",
      "HE LOOKS AT YOU. THEN HE LOOKS AT THE DOOR."].map(normText);
  },
  pick(c) {
    this.choice = c; this.t = 0; this.sel = 0;
    const ini = meta.initials || "YOU";
    this.lines = (c === "free" ? ["YOU STEP ASIDE.",
      "HE WALKS TO THE EDGE OF THE SCREEN AND DOESN'T STOP.",
      "SOMEWHERE FAR AWAY, A BIKE LOCK CLICKS OPEN.",
      "THE CABINET HUMS. FOR THE FIRST TIME IN A LONG TIME, IT SOUNDS EMPTY."]
      : ["YOU PICK UP HIS SHIELD. IT'S STILL WARM.",
      "HE SAYS THANK YOU. HE SAYS IT'S NOT SO BAD IN HERE, ONCE YOU'RE GOOD.",
      "THE HIGH SCORE TABLE UPDATES. IT SAYS " + ini + ".",
      "IT WILL ALWAYS SAY " + ini + "."]).map(normText);
    meta.milo = c; meta.flags.endDay = todayStr(); saveMeta();
    unlockAch(c === "free" ? "laid" : "stay");
    if (c === "free") seq([523, 659, 784, 1047, 1319], 160, "triangle", 0.1, 0.5);
    else { tone(55, 1.2, "sawtooth", 0.14, 40); fxGlitch(0.8); }
  },
  shown() { return Math.floor(this.t * 30); },
  total() { return this.lines.reduce((a, l) => a + wrap(l, 300).reduce((x, s) => x + s.length + 1, 0) + 10, 0); },
  update(dt) {
    this.t += dt; this.hum -= dt;
    if (this.hum <= 0) { this.hum = 3; tone(49, 2.4, "sine", 0.05); }
  },
  key(k) {
    if (this.shown() < this.total()) { this.t = 999; return true; }
    return menuKey(this, k);
  },
  click(x, y) { if (this.shown() < this.total()) { this.t = 999; return true; } return false; },
  draw() {
    R(0, 0, W, H, "#040205");
    const cx = W / 2, fy = 64;
    const gone = this.choice === "free" ? Math.min(1, this.t / 6) : 0;
    if (this.choice !== "stay") {
      L.globalAlpha = 1 - gone;
      drawSpr(SPR.milo, cx - 20 + gone * 150, fy + 2);
      L.globalAlpha = 1;
    }
    drawSpr(this.choice === "stay" ? SPR.milo : SPR.player, cx + 20, fy);
    R(cx + 150, fy - 16, 14, 26, this.choice === "free" ? "#2A2040" : "#120A10"); RO(cx + 150, fy - 16, 14, 26, C.gy);
    let left = this.shown();
    this.lines.forEach((line, i) => {
      wrap(line, 300).forEach((l, j) => {
        if (left > 0) txt(l.slice(0, left), W / 2, 96 + i * 18 + j * 8, i === 0 ? C.wh : C.lg, 1, "c");
        left -= l.length + 1;
      });
      left -= 10;
    });
    beginItems(this);
    if (this.shown() >= this.total()) {
      if (!this.choice) {
        btn(this, "LET HIM GO", W / 2 - 104, 214, 100, 13, () => this.pick("free"), {col: C.bl});
        btn(this, "TAKE HIS PLACE", W / 2 + 4, 214, 100, 13, () => this.pick("stay"), {col: C.rd});
      } else btn(this, "...", W / 2 - 30, 214, 60, 13, () => go(RunOver, endRun(this.choice)), {col: C.gy});
    }
    endItems(this);
  }
};
