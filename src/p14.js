/* ================================================================
   Descent depth: curses, synergies, ascension, strays, daily run
   ================================================================ */
const CURSES = {
  haste:  {n: "HASTE",   d: "ENEMY SHOTS FLY 15% FASTER."},
  fury:   {n: "FURY",    d: "ENEMIES FIRE 20% MORE OFTEN."},
  fragile:{n: "FRAGILE", d: "-1 MAX SHIELD.", g: r => { r.maxLives = Math.max(1, r.maxLives - 1); r.lives = Math.min(r.lives, r.maxLives); }},
  brittle:{n: "BRITTLE", d: "PULSE RECHARGES 40% SLOWER.", a: S => S.pulseCd *= 1.4},
  narrow: {n: "NARROW",  d: "YOUR SHIELD ARC IS 15% SMALLER.", a: S => S.arc *= 0.85},
  hunted: {n: "HUNTED",  d: "ONE MORE ENEMY IN EVERY WAVE."}
};
function addCurse() {
  const free = Object.keys(CURSES).filter(k => !run.curses.includes(k));
  if (!free.length) return null;
  const c = rpick(free);
  run.curses.push(c);
  if (CURSES[c].g) CURSES[c].g(run);
  fxGlitch(0.6); fxWobble(0.5); sfxGlitch(true);
  return c;
}
function combatCurseMuls() {
  const cs = (run && run.curses) || [];
  let bullet = cs.includes("haste") ? 1.15 : 1, fireM = cs.includes("fury") ? 1.2 : 1;
  if (run && run.asc >= 1) fireM *= 1.1;
  return {bullet, fire: fireM};
}

const SYNERGIES = [
  {id: "swarm",   n: "SWARM",        m: ["split", "seeker"],     d: "ONE MORE SPLIT, AND EVERY SPLIT SHOT HUNTS.",       a: S => { S.split++; S.seek += 0.2; }},
  {id: "storm",   n: "STORM",        m: ["ricochet", "zap"],     d: "EVERY WALL BOUNCE THROWS A BOLT AT THE NEAREST FOE.", a: S => S.storm = true},
  {id: "bastion", n: "BASTION",      m: ["plating", "wide"],     d: "AN EVEN WIDER SHIELD AND A DEEPER CATCH ZONE.",     a: S => { S.arc *= 1.15; S.bandOut += 2; }},
  {id: "overload",n: "OVERLOAD",     m: ["capacitor", "perfect"],d: "EVERYTHING YOUR PULSE CATCHES COUNTS AS PERFECT.",  a: S => S.overload = true},
  {id: "glasscan",n: "GLASS CANNON", m: ["glass", "quick"],      d: "PERFECT SHOTS HIT TWICE AS HARD.",                  a: S => S.glassCannon = true},
  {id: "magnetar",n: "MAGNETAR",     m: ["magnet", "pierce"],    d: "SHOTS PIERCE ONE MORE FOE AND CURVE HARDER.",       a: S => { S.pierce++; S.seekTurn *= 1.3; }}
];
function activeSynergies() { return run ? SYNERGIES.filter(sy => sy.m.every(id => run.mods[id])) : []; }

const ASC = [
  "THE STANDARD DESCENT.",
  "A1: ENEMIES FIRE 10% MORE OFTEN.",
  "A2: + START WITH ONE LESS SHIELD.",
  "A3: + RESTING REPAIRS ONLY ONE SHIELD.",
  "A4: + GUARDIANS HAVE 25% MORE HEALTH.",
  "A5: + ONE MORE ENEMY IN EVERY WAVE."
];

/* ---------------- strays you can rescue ---------------- */
const NPCS = [
  {id: "wren", n: "WREN", role: "THE TRADER",   col: C.ye, perk: "SHOPS COST 15% LESS.",
   lines: ["THEY HAD ME PRICING SCRAP FOR THE GUARDS. YOU'LL GET A BETTER RATE.", "BUY LOW, CATCH HIGH. THAT'S MY WHOLE PHILOSOPHY.", "THE FOUNDRY SELLS ITS PLATES BY WEIGHT. DON'T ASK WHAT THEY WEIGH."]},
  {id: "moth", n: "MOTH", role: "THE SEER",     col: C.pk, perk: "SHOWS THE FIRST VAULT OF EVERY RUN. KNOWS SECRETS.",
   lines: null},
  {id: "pip",  n: "PIP",  role: "THE TINKERER", col: C.li, perk: "STARTS EVERY RUN WITH A FREE COMMON MOD.",
   lines: ["I KEEP FINDING PARTS IN MY POCKETS. TAKE ONE, I HAVE TOO MANY.", "IF IT SPARKS, IT WORKS. IF IT DOESN'T SPARK, HIT IT.", "ONE DAY I'LL BUILD A SHIELD THAT CATCHES TWO THINGS AT ONCE. OH WAIT."]}
];
const NPC_BY = {};
for (const n of NPCS) NPC_BY[n.id] = n;
function mothLine() {
  const miss = SECRETS.filter(s => !meta.secrets[s.k]);
  if (!miss.length) return "YOU FOUND EVERYTHING I KNEW ABOUT. NOW I'M THE ONE ASKING YOU.";
  return "I SEE... " + rpickLocal(miss).h;
}
function rpickLocal(a) { return a[Math.floor(T * 7) % a.length]; }
function npcSpr(id) {
  const k = "npc_" + id;
  if (SPR[k]) return SPR[k];
  const n = NPC_BY[id];
  SPR[k] = mkSprite(["..hhh..", ".hsssh.", ".sksks.", "..sss..", ".ccccc.", "cc.c.cc", "..ccc..", "..c.c..", ".cc.cc."],
    {h: id === "moth" ? C.la : id === "wren" ? C.ru : C.or, s: C.pe, k: C.k, c: n.col});
  return SPR[k];
}
function rescueNpc(id) {
  if (!meta.npcs) meta.npcs = {};
  if (meta.npcs[id]) return;
  meta.npcs[id] = Date.now();
  saveMeta();
  sfx.secret();
  toast(NPC_BY[id].n + " IS FREE. FIND THEM IN THE BACK ROOM.", NPC_BY[id].col);
  unlockAch("rescue");
  if (NPCS.every(n => meta.npcs[n.id])) unlockAch("all_rescued");
}
function makeCaged() {
  const free = NPCS.filter(n => !npcHere(n.id));
  const who = free.length ? rpick(free) : NPCS[0];
  return {id: "caged", t: "THE CAGE", b: "SOMEONE IS LOCKED IN A CAGE HANGING FROM THE CEILING. A NAME IS SCRATCHED ON THE BARS: " + who.n + ". THE GUARDS HAVEN'T NOTICED YOU YET.", c: [
    {l: "FIGHT THE GUARDS (ELITE)", fight: () => ({type: "elite", rescue: who.id})},
    {l: "LEAVE THEM", go: () => "YOU HEAR " + who.n + " CALLING AFTER YOU FOR A LONG TIME."}]};
}
EVENTS.push(
  {id: "caged", t: "THE CAGE", b: "", c: []},
  {id: "bargain", t: "THE BARGAIN", b: "A MAN IN A GREY SUIT IS SITTING AT A CARD TABLE. HE OFFERS TO FIX YOU UP. ALL IT COSTS IS A LITTLE LUCK.", c: [
    {l: "FULL REPAIR, TAKE A CURSE", req: () => run.curses.length < 6, go: () => { const c = addCurse(); run.lives = run.maxLives; return "HE SHAKES YOUR HAND. SHIELDS FULL. CURSE: " + CURSES[c].n + " ~ " + CURSES[c].d; }},
    {l: "80 COINS, TAKE A CURSE", req: () => run.curses.length < 6, go: () => { const c = addCurse(); run.coins += 80; return "HE SLIDES A STACK ACROSS THE TABLE. +80 COINS. CURSE: " + CURSES[c].n + " ~ " + CURSES[c].d; }},
    {l: "DECLINE", go: () => "HE SHRUGS AND SHUFFLES THE DECK."}]}
);

/* ---------------- the cursed altar (map node) ---------------- */
const AltarScene = {
  enter() { music("signal"); this.done = false; },
  draw() {
    menuBg(PALS[DEPTH_PAL[run.depth]]);
    if (rand() < 0.05) { L.globalAlpha = 0.2; R(0, rint(H), W, 2 + rint(4), C.pl); L.globalAlpha = 1; }
    runHeader();
    title("THE CURSED ALTAR", 26, C.pl);
    // altar
    const ax = W / 2, ay = 70;
    R(ax - 18, ay + 6, 36, 12, C.nv); R(ax - 14, ay + 2, 28, 4, C.la);
    for (let i = 0; i < 14; i++) { const a = (T * 2 + i * 0.37) % 1; P(ax + Math.sin(i * 9.1 + T * 3) * 9, ay - a * 18, a < 0.4 ? C.pk : C.pl); }
    wrap("TAKE A CURSE AND THE ALTAR PAYS YOU. EVERY CURSE ALSO ADDS 15% TO THE TOKENS YOU BRING HOME.", 300).forEach((l, i) => txt(l, W / 2, 96 + i * 8, C.lg, 1, "c"));
    const cs = run.curses;
    txt(cs.length ? "YOUR CURSES: " + cs.map(c => CURSES[c].n).join(", ") : "YOU CARRY NO CURSES.", W / 2, 118, cs.length ? C.pk : C.gy, 1, "c");
    beginItems(this);
    const full = cs.length >= 6;
    btn(this, "CURSE ME. GIVE ME A RARE MOD", W / 2 - 90, 134, 180, 14, () => { const c = addCurse(); toast("CURSE: " + CURSES[c].n + " ~ " + CURSES[c].d, C.pk); go(RewardScene, {kind: "altar"}); }, {col: C.pk, disabled: full});
    btn(this, "CURSE ME. GIVE ME 60 COINS", W / 2 - 90, 152, 180, 14, () => { const c = addCurse(); run.coins += 60; toast("CURSE: " + CURSES[c].n + " ~ " + CURSES[c].d, C.pk); finishNode(); }, {col: C.or, disabled: full});
    btn(this, "WALK AWAY", W / 2 - 90, 170, 180, 14, finishNode, {col: C.gy});
    endItems(this);
  }
};

/* ---------------- daily run ---------------- */
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
const dailyToday = () => meta.daily && meta.daily.date === todayStr() ? meta.daily : null;
function dailyCode() {
  const d = dailyToday();
  if (!d || !d.done) return "";
  const body = d.date.replace(/-/g, "") + "-" + (meta.initials || "AAA") + "-" + d.score;
  return "RIPD-" + body + "-" + hash(body + "|daily").slice(-4);
}
function parseDailyCode(v) {
  const m = /^RIPD-(\d{8})-([A-Z0-9]{1,3})-(\d{1,9})-([A-Z0-9]{1,4})$/i.exec(v.replace(/\s+/g, ""));
  if (!m) return null;
  const body = m[1] + "-" + m[2].toUpperCase() + "-" + m[3];
  if (hash(body + "|daily").slice(-4) !== m[4].toUpperCase()) return {bad: true};
  return {date: m[1].slice(0, 4) + "-" + m[1].slice(4, 6) + "-" + m[1].slice(6), i: m[2].toUpperCase(), s: parseInt(m[3], 10)};
}
function startDaily() {
  const date = todayStr();
  meta.daily = {date, done: false, score: 0, depth: 0};
  saveMeta();
  startRun("standard", {daily: date});
  go(RunMap);
}
const DailyScene = {
  back() { go(this.from || TitleScene); },
  enter(from) { this.from = from && from.draw ? from : null; music("map"); this.saved = loadRun(); if (typeof gjFetchDaily === "function") gjFetchDaily(); },
  draw() {
    menuBg(PALS.signal);
    title("DAILY RUN", 12, C.pk);
    const date = todayStr(), d = dailyToday();
    txt(date, W / 2, 32, C.wh, 1, "c");
    wrap("ONE SEED A DAY. SAME MAPS, SAME MODS, SAME EVENTS FOR EVERYONE. STANDARD SHIELD, NO WORKSHOP UPGRADES. ONE TRY.", 300)
      .forEach((l, i) => txt(l, W / 2, 44 + i * 8, C.lg, 1, "c"));
    beginItems(this);
    const saved = this.saved;
    let y = 78;
    if (saved && saved.daily === date) {
      btn(this, "CONTINUE TODAY'S RUN", W / 2 - 70, y, 140, 13, () => { run = saved; go(RunMap); }, {col: C.li});
    } else if (d && d.done) {
      txt("TODAY'S SCORE", W / 2, y, C.gy, 1, "c");
      txt(String(d.score), W / 2, y + 9, C.ye, 2, "c");
      txt("DEPTH " + d.depth + (d.win ? " ~ ASCENDED" : ""), W / 2, y + 26, C.lg, 1, "c");
      y += 20;
    } else if (saved && !saved.daily) {
      wrap("YOU HAVE A DESCENT IN PROGRESS. FINISH OR ABANDON IT FIRST.", 280).forEach((l, i) => txt(l, W / 2, y + i * 8, C.or, 1, "c"));
    } else if (d && !d.done) {
      txt("TODAY'S RUN WAS ABANDONED.", W / 2, y, C.gy, 1, "c");
    } else {
      btn(this, "START TODAY'S RUN", W / 2 - 70, y, 140, 13, startDaily, {col: C.pk});
    }
    y = 124;
    btn(this, "SHARE MY SCORE", W / 2 - 146, y, 94, 12, () => openModal("SHARE TODAY'S SCORE", "SEND THIS TO A FRIEND WHO PLAYED TODAY'S RUN.", dailyCode(), null, null), {col: C.ye, disabled: !(d && d.done)});
    btn(this, "ADD FRIEND SCORE", W / 2 - 47, y, 94, 12, () => openAddDaily(), {col: C.pk});
    btn(this, "BACK", W / 2 + 52, y, 94, 12, () => this.back(), {col: C.gy});
    endItems(this);
    // today's board: you + friends (+ online if set up)
    panel(40, 142, 304, 82, C.pk);
    txt("TODAY'S BOARD", W / 2, 147, C.pk, 1, "c");
    const rows = (meta.dailyFriends || []).filter(f => f.date === date).map(f => ({i: f.i + "*", s: f.s}));
    if (d && d.done) rows.push({i: (meta.initials || "YOU"), s: d.score, me: true});
    const online = typeof gjDailyRows === "function" ? gjDailyRows() : null;
    if (online) for (const o of online) rows.push({i: o.i, s: o.s, net: true});
    rows.sort((a, b) => b.s - a.s);
    if (!rows.length) txt("NOBODY YET. BE FIRST.", W / 2, 178, C.gy, 1, "c");
    rows.slice(0, 7).forEach((r, i) => {
      const col = r.me ? C.ye : r.net ? C.bl : C.wh;
      txt((i + 1) + ".", 60, 158 + i * 9, C.gy); txt(r.i, 76, 158 + i * 9, col); txt(String(r.s), 324, 158 + i * 9, col, 1, "r");
    });
    txt("BEST EVER: " + (meta.dailyBest || 0), W / 2, 229, C.gy, 1, "c");
  }
};
function openAddDaily() {
  openModal("ADD A FRIEND'S DAILY SCORE", "PASTE THE RIPD- CODE A FRIEND SENT YOU.", "", "ADD", v => {
    const r = parseDailyCode(v);
    if (!r) return modalMsg("THAT DOESN'T LOOK LIKE A DAILY CODE.", true);
    if (r.bad) return modalMsg("THE CODE DOESN'T CHECK OUT. WAS IT COPIED IN FULL?", true);
    if (!Array.isArray(meta.dailyFriends)) meta.dailyFriends = [];
    if (meta.dailyFriends.some(f => f.date === r.date && f.i === r.i && f.s === r.s)) return modalMsg("ALREADY ADDED.", true);
    meta.dailyFriends.push(r);
    meta.dailyFriends = meta.dailyFriends.slice(-40);
    saveMeta();
    modalMsg(r.date === todayStr() ? "ADDED TO TODAY'S BOARD." : "ADDED. (THAT CODE IS FROM " + r.date + ".)");
  });
}
