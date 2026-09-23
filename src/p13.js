/* ================================================================
   Combat extras: new enemies' helpers, boss phase 2, fight grades,
   codex sightings, achievements
   ================================================================ */
const FOE_INFO = {
  sentry:  ["SENTRY",   "FIRES ONE SLOW SHOT AT A TIME. THE FIRST THING YOU LEARN TO CATCH."],
  spreader:["SPREADER", "THREE SHOTS IN A FAN. CATCH THE MIDDLE ONE, STEP AWAY FROM THE REST."],
  sniper:  ["SNIPER",   "A PURPLE LINE, THEN ONE VERY FAST SHOT DOWN IT. PERFECT FODDER."],
  rusher:  ["RUSHER",   "DOESN'T SHOOT. RUNS AT YOU. BURSTS IF IT TOUCHES YOU."],
  armor:   ["ARMOR",    "A ROTATING PLATE THROWS SHOTS BACK. HIT THE GAP OR ITS BACK."],
  splitter:["SPLITTER", "BREAKS INTO TWO SHARDS WHEN IT DIES."],
  shard:   ["SHARD",    "SMALL, FAST AND FRAGILE."],
  shielder:["SHIELDER", "TETHERS A BUBBLE TO A NEIGHBOUR. NOTHING GETS THROUGH UNTIL THE SHIELDER DIES."],
  mirror:  ["MIRROR",   "ITS FACE SENDS YOUR SHOTS STRAIGHT BACK. BOUNCE ONE OFF A WALL INTO ITS BACK."],
  miner:   ["MINER",    "LAYS MINES. MINES BLOW UP INTO A RING OF SHOTS. GET CLOSE AND THEY GO OFF FASTER."],
  mine:    ["MINE",     "SHOOT IT TO DEFUSE IT. OR CATCH WHAT COMES OUT."],
  warden:  ["WARDEN",   "GUARDIAN OF THE GRID. THREE PLATES. AT HALF HEALTH IT GROWS SIX SMALLER ONES."],
  furnace: ["FURNACE",  "GUARDIAN OF THE FOUNDRY. SPIRALS OF FIRE. AT HALF HEALTH THE SPIRAL TWISTS BACK."],
  hydra:   ["HYDRA",    "GUARDIAN OF THE STACK. IT SPLITS WHEN HURT, AND FIRES WIDER WHEN DESPERATE."],
  echo:    ["ECHO",     "IT MOVES THE WAY YOU DO. IT CATCHES THE WAY YOU DO."]
};
const FOE_ORDER = ["sentry", "spreader", "sniper", "rusher", "armor", "splitter", "shard", "shielder", "mirror", "miner", "mine", "warden", "furnace", "hydra", "echo"];

function markSeen(type) {
  if (!meta.seen) meta.seen = {};
  if (meta.seen[type]) return;
  meta.seen[type] = 1;
  if (G.mode !== "training" && !FOE[type].boss && meta.stats.runs + meta.arcade.length > 0) {
    const inf = FOE_INFO[type];
    if (inf) toast("NEW: " + inf[0] + " ~ " + inf[1], C.bl);
  }
}

function isShielded(f) {
  if (G.S.phase) return false;
  for (const s of G.foes) if (s.type === "shielder" && s.link === f && s.born > 0.4) return true;
  return false;
}

function mineBlast(f) {
  const off = rand() * TAU;
  for (let k = 0; k < 8; k++) fire(f, off + k / 8 * TAU, 70 * G.diff, 1.5);
  burst(f.x, f.y, 14, C.or, 90, 0.4); ring(f.x, f.y, 14, C.rd, 0.25);
  noise(0.2, 0.16, 500, 120);
  G.shake = Math.min(5, G.shake + 1.5);
}

function stormZap(b) {
  let best = null, bd = 80;
  for (const o of G.foes) { const d = Math.hypot(o.x - b.x, o.y - b.y); if (d < bd) { bd = d; best = o; } }
  if (!best) return;
  G.zaps.push({x1: b.x, y1: b.y, x2: best.x, y2: best.y, t: 0.15});
  damageFoe(best, 1, 1, true);
}

function enterPhase2(f) {
  f.p2 = true;
  banner(f.type === "echo" ? "IT LEARNS" : f.type === "milo" || f.type === "unit0417" ? "PLAYER 2" : "PHASE 2", C.rd, 1.5);
  if (f.type === "milo") { loreSetFlag("miloP2"); hauntFace(0.5, true); G.lightsOut = 1.5; whisper("MY TURN", {big: true, x: W / 2, y: 150, life: 2}); }
  if (f.type === "unit0417") { hauntFace(0.5, true); whisper("PLAYER 2 READY", {big: true, x: W / 2, y: 150, life: 2.2}); music("unit"); }
  fxGlitch(0.85); fxRoll(); fxWobble(0.5); sfxGlitch(true); padRumble(0.8, 0.8, 300);
  G.shake = 6; G.hitstop = Math.max(G.hitstop, 0.14); G.flash = Math.max(G.flash, 0.4);
  // a breath: nearby hostile shots are wiped by the shockwave
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    if (!b.friend) { burst(b.x, b.y, 2, C.gy, 30, 0.3); G.bullets.splice(i, 1); }
  }
  ring(f.x, f.y, 60, C.rd, 0.5); burst(f.x, f.y, 30, C.rd, 150, 0.6);
  seq([147, 139, 131, 123], 90, "sawtooth", 0.16, 0.2);
  f.cd = 1.2;
}

const GRADE_BONUS = {S: 15, A: 8, B: 3, C: 0};
function gradeFight() {
  if (G.mode !== "run") return;
  const g = G.hits === 0 && G.perfects >= 3 ? "S" : G.hits === 0 ? "A" : G.hits === 1 ? "B" : "C";
  G.grade = g; G.gradeBonus = GRADE_BONUS[g];
  if (g === "S") { unlockAch("grade_s"); setTimeout(() => seq([1047, 1319, 1568], 70, "square", 0.12), 500); }
}

function onFoeKilled(f, chain) {
  if (G.mode === "training") { unlockAch("first_kill"); return; }
  unlockAch("first_kill");
  if (chain >= 3) unlockAch("trick");
  if (G.combo >= 10) unlockAch("chain10");
  if (G.combo >= 25) unlockAch("chain25");
  if (G.perfects >= 10) unlockAch("perfect10");
  if (f.type === "mine") { meta.stats.mines = (meta.stats.mines || 0) + 1; if (meta.stats.mines >= 10) unlockAch("defuse"); }
  if (f.type === "mirror") unlockAch("mirror");
  if (FOE[f.type].boss) {
    unlockAch(f.type);
    if (G.hits === 0) unlockAch("clean_boss");
  }
  if (G.mode === "arcade") {
    if (G.wave >= 10) unlockAch("wave10");
    if (G.wave >= 20) unlockAch("wave20");
    if (G.score >= 50000) unlockAch("score50k");
  }
}

/* ---------------- achievements ---------------- */
const ACH = [
  {id: "trained",   n: "TRAINED",          d: "FINISH THE TRAINING ROOM."},
  {id: "first_kill",n: "GIVE IT BACK",     d: "DEFEAT AN ENEMY WITH ITS OWN SHOT."},
  {id: "perfect10", n: "ON THE LINE",      d: "10 PERFECT CATCHES IN ONE FIGHT."},
  {id: "chain10",   n: "CHAIN REACTION",   d: "REACH A CHAIN OF X10."},
  {id: "chain25",   n: "UNBROKEN",         d: "REACH A CHAIN OF X25."},
  {id: "trick",     n: "TRICK SHOT",       d: "ONE SHOT, THREE KILLS IN A ROW."},
  {id: "wave10",    n: "REGULAR",          d: "REACH WAVE 10 IN ARCADE."},
  {id: "wave20",    n: "CABINET LEGEND",   d: "REACH WAVE 20 IN ARCADE."},
  {id: "score50k",  n: "HIGH ROLLER",      d: "SCORE 50,000 IN ONE ARCADE GAME."},
  {id: "warden",    n: "WARDEN DOWN",      d: "DEFEAT THE WARDEN."},
  {id: "furnace",   n: "FURNACE DOWN",     d: "DEFEAT THE FURNACE."},
  {id: "hydra",     n: "HYDRA DOWN",       d: "DEFEAT THE HYDRA."},
  {id: "echo",      n: "ANSWERED",         d: "DEFEAT ECHO.", secret: true},
  {id: "clean_boss",n: "CLEAN GUARDIAN",   d: "DEFEAT A GUARDIAN WITHOUT TAKING A HIT."},
  {id: "grade_s",   n: "S RANK",           d: "GET AN S GRADE IN A DESCENT FIGHT."},
  {id: "ascend",    n: "ASCENDED",         d: "WIN A DESCENT."},
  {id: "true_end",  n: "THE SIGNAL",       d: "SEE THE TRUE ENDING.", secret: true},
  {id: "vault",     n: "SAFECRACKER",      d: "FIND A HIDDEN VAULT."},
  {id: "synergy",   n: "BETTER TOGETHER",  d: "COMPLETE A MOD SYNERGY."},
  {id: "cursed",    n: "GLUTTON",          d: "WIN A DESCENT CARRYING 3 CURSES."},
  {id: "asc1",      n: "CLIMBER",          d: "WIN ON ASCENSION 1."},
  {id: "asc5",      n: "SUMMIT",           d: "WIN ON ASCENSION 5."},
  {id: "rescue",    n: "GOOD COMPANY",     d: "RESCUE SOMEONE FROM THE DEPTHS."},
  {id: "all_rescued",n:"FULL HOUSE",       d: "RESCUE ALL THREE STRAYS."},
  {id: "daily",     n: "DAILY GRIND",      d: "FINISH A DAILY RUN."},
  {id: "defuse",    n: "BOMB SQUAD",       d: "DEFUSE 10 MINES."},
  {id: "mirror",    n: "SMOKE AND MIRRORS",d: "DESTROY A MIRROR."},
  {id: "witching",  n: "WITCHING HOUR",    d: "START A FIGHT BETWEEN 3 AND 4 IN THE MORNING."},
  {id: "tapes",     n: "LISTENER",         d: "HEAR ALL TWELVE TAPES.", secret: true},
  {id: "laid",      n: "LAID TO REST",     d: "LET HIM GO HOME.", secret: true},
  {id: "stay",      n: "HIGH SCORE",       d: "TAKE HIS PLACE.", secret: true}
];
const ACH_BY = {};
for (const a of ACH) ACH_BY[a.id] = a;
function unlockAch(id) {
  const a = ACH_BY[id];
  if (!a || !meta || (G && G.mode === "attract" && inCombat())) return;
  if (!meta.ach) meta.ach = {};
  if (meta.ach[id]) return;
  meta.ach[id] = Date.now();
  saveMeta();
  toast("ACHIEVEMENT: " + a.n, C.ye);
  try { if (typeof gjTrophy === "function") gjTrophy(id); } catch (e) {}
}
const achCount = () => ACH.filter(a => meta.ach && meta.ach[a.id]).length;
