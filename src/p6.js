/* ================================================================
   Descent — content, run state, map generation
   ================================================================ */
const MODS = {
  wide:     {n:"WIDE GUARD",   r:"c", d:"SHIELD ARC +30%.", a:S => S.arc *= 1.3},
  quick:    {n:"QUICK RETURN", r:"c", d:"RETURNED SHOTS FLY 25% FASTER.", a:S => { S.pMul *= 1.25; S.ppMul *= 1.25; }},
  ricochet: {n:"RICOCHET",     r:"c", d:"RETURNED SHOTS BOUNCE OFF ONE MORE WALL.", a:S => { S.bounce++; S.pBounce++; }},
  plating:  {n:"PLATING",      r:"c", d:"+1 MAX SHIELD, AND REPAIR 1.", g:r => { r.maxLives++; r.lives++; }},
  magnet:   {n:"MAGNET",       r:"c", d:"THE CATCH ZONE IS 40% DEEPER.", a:S => { S.bandOut += 4; S.bandIn = Math.max(5, S.bandIn - 2); }},
  capacitor:{n:"CAPACITOR",    r:"c", d:"PULSE RECHARGES 30% FASTER.", a:S => S.pulseCd *= 0.7},
  salvage:  {n:"SALVAGE",      r:"c", d:"+40% COINS FROM EVERY FIGHT.", a:S => S.coinMul *= 1.4},
  split:    {n:"SPLIT",        r:"u", d:"EVERY RETURNED SHOT SPLITS INTO ONE MORE.", a:S => S.split++},
  seeker:   {n:"SEEKER",       r:"u", d:"RETURNED SHOTS HUNT MUCH HARDER.", a:S => { S.seekTurn *= 1.8; S.seek += 0.4; }},
  pierce:   {n:"PIERCE",       r:"u", d:"SHOTS SURVIVE ONE HIT THAT DOESN'T KILL.", a:S => S.pierce++},
  overclock:{n:"OVERCLOCK",    r:"u", d:"YOU MOVE 20% FASTER.", a:S => S.moveMul *= 1.2},
  perfect:  {n:"PERFECTIONIST",r:"u", d:"THE PERFECT WINDOW IS WIDER.", a:S => S.perfectD += 2.5},
  twin:     {n:"TWIN GUARD",   r:"r", d:"A SECOND, SMALLER SHIELD GUARDS YOUR BACK.", a:S => S.twin = true},
  zap:      {n:"ARC LIGHTNING",r:"r", d:"EVERY KILL ZAPS THE NEAREST FOE.", a:S => S.zap++},
  reflex:   {n:"REFLEX",       r:"r", d:"BULLET-TIME KICKS IN SOONER AND SLOWER.", a:S => S.reflex++},
  glass:    {n:"GLASS HEART",  r:"r", d:"EVERY 5 PERFECTS REPAIRS A SHIELD. -1 MAX SHIELD.", a:S => S.glassHeal = true,
             g:r => { r.maxLives = Math.max(1, r.maxLives - 1); r.lives = Math.min(r.lives, r.maxLives); }}
};
const MOD_UNLOCK_COST = {pierce:60, overclock:60, perfect:80, reflex:100, glass:100, twin:120, zap:120};
const RAR_COL = {c:C.lg, u:C.bl, r:C.or};
const RAR_NAME = {c:"COMMON", u:"UNCOMMON", r:"RARE"};
const MOD_PRICE = {c:40, u:65, r:100};

const SHIELDS = {
  standard:{n:"STANDARD", d:"NO TRADE-OFFS. THE SHIELD YOU STARTED WITH.", cost:0},
  tower:   {n:"TOWER",    d:"A HUGE ARC, BUT YOU MOVE 25% SLOWER.", cost:150, a:S => { S.arc *= 1.6; S.moveMul *= 0.75; }},
  buckler: {n:"BUCKLER",  d:"A NARROW ARC. EVERY CATCH COUNTS AS PERFECT.", cost:180, a:S => { S.arc *= 0.62; S.perfectAll = true; }},
  glass:   {n:"GLASS",    d:"ONE SHIELD ONLY. START WITH A RARE MOD. TOKENS X2.", cost:260},
  mirror:  {n:"MIRROR",   d:"PERFECT CATCHES FIRE TWO EXTRA SHOTS.", secret:true, hint:"LAND 10 PERFECTS IN ONE FIGHT", a:S => S.mirror = true},
  signal:  {n:"SIGNAL",   d:"YOUR SHOTS PASS STRAIGHT THROUGH ARMOUR.", secret:true, hint:"FOLLOW THE SIGNAL TO ITS END", a:S => S.phase = true}
};
const UPG = {
  plate:  {n:"SPARE PLATE",   d:"START EVERY RUN WITH +1 SHIELD.", max:2, cost:[120, 240]},
  change: {n:"POCKET CHANGE", d:"START EVERY RUN WITH +30 COINS.", max:2, cost:[80, 160]},
  coolant:{n:"COOLANT",       d:"PULSE RECHARGES 15% FASTER.", max:2, cost:[100, 200]},
  lucky:  {n:"LUCKY DRAW",    d:"SEE 4 MODS TO CHOOSE FROM INSTEAD OF 3.", max:1, cost:[220]},
  carto:  {n:"CARTOGRAPHER",  d:"HIDDEN VAULTS ALWAYS SHOW ON THE MAP.", max:1, cost:[300]}
};
const SECRETS = [
  {k:"vault1", n:"VAULT OF THE GRID", h:"SOMETHING HIDES BETWEEN THE PATHS OF DEPTH 1."},
  {k:"vault2", n:"VAULT OF THE FOUNDRY", h:"DEPTH 2 HAS A ROOM THAT ISN'T ON THE MAP."},
  {k:"vault3", n:"VAULT OF THE STACK", h:"DEPTH 3 KEEPS A SEALED DOOR."},
  {k:"untouched", n:"UNTOUCHED", h:"SOME GUARDIANS RESPECT A CLEAN FIGHT."},
  {k:"static", n:"THE STATIC", h:"SOMEWHERE BELOW, A VOICE IS COUNTING."},
  {k:"mirror", n:"MIRROR", h:"BE FLAWLESS. TEN TIMES OVER."},
  {k:"signal", n:"THE SIGNAL", h:"FIVE PIECES. ONE DOOR."},
  {k:"echo", n:"ECHO", h:"WHAT WAITS AT THE END OF THE SIGNAL?"}
];
const FRAG_SECRET = ["vault1", "vault2", "vault3", "untouched", "static"];

let run = null;
/* seeded stream for daily runs (stored in the run so a resumed run stays on the same track) */
function rr() {
  if (!run || run.rs == null) return rand();
  let t = run.rs = (run.rs + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rrint = n => (rr() * n) | 0;
const rpick = a => a[(rr() * a.length) | 0];
function seedNum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }
const upgOn = k => run && run.daily ? 0 : meta.upg[k];

function runStats() {
  const S = baseStats();
  const sh = SHIELDS[run.shield];
  if (sh && sh.a) sh.a(S);
  for (const id in run.mods) for (let i = 0; i < run.mods[id]; i++) if (MODS[id] && MODS[id].a) MODS[id].a(S);
  for (const sy of activeSynergies()) sy.a(S);
  for (const c of run.curses || []) if (CURSES[c] && CURSES[c].a) CURSES[c].a(S);
  S.pulseCd *= Math.pow(0.85, upgOn("coolant"));
  S.arc = Math.min(S.arc, 1.9);
  S.perfectD = Math.min(S.perfectD, S.bandOut - 3);
  return S;
}
function ownedMods() { return Object.keys(run.mods).filter(k => run.mods[k] > 0); }
function gainMod(id) {
  const before = activeSynergies().map(s => s.id);
  run.mods[id] = (run.mods[id] || 0) + 1;
  if (MODS[id].g) MODS[id].g(run);
  if (!meta.modsSeen) meta.modsSeen = {};
  meta.modsSeen[id] = 1;
  for (const sy of activeSynergies()) if (!before.includes(sy.id)) {
    if (!meta.synSeen) meta.synSeen = {};
    meta.synSeen[sy.id] = 1;
    setTimeout(() => { toast("SYNERGY: " + sy.n + " ~ " + sy.d, C.pk); sfx.secret(); fxGlitch(0.4); }, 250);
    unlockAch("synergy");
  }
  saveMeta();
}
function loseMod(id) { if (run.mods[id]) { run.mods[id]--; if (!run.mods[id]) delete run.mods[id]; } }
function rollMod(minR, exclude) {
  exclude = exclude || [];
  let pool = (run && run.daily ? Object.keys(MODS) : meta.unlocked).filter(id => MODS[id] && !exclude.includes(id));
  if (minR === "u") pool = pool.filter(id => MODS[id].r !== "c");
  if (minR === "r") pool = Object.keys(MODS).filter(id => MODS[id].r === "r" && !exclude.includes(id));
  if (!pool.length) pool = meta.unlocked.filter(id => MODS[id] && !exclude.includes(id));
  if (!pool.length) pool = Object.keys(MODS);
  const wt = {c:60, u:30, r:10};
  if (minR === "u") { wt.u = 75; wt.r = 25; }
  let tot = 0; for (const id of pool) tot += wt[MODS[id].r];
  let x = rr() * tot;
  for (const id of pool) { x -= wt[MODS[id].r]; if (x <= 0) return id; }
  return pool[pool.length - 1];
}
function rollChoices(n, minR) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(rollMod(minR, out));
  return out;
}
function grantFragment(i) {
  if (meta.fragments[i]) return false;
  meta.fragments[i] = true;
  meta.secrets[FRAG_SECRET[i]] = true;
  saveMeta();
  sfx.secret();
  const n = meta.fragments.filter(Boolean).length;
  toast("SIGNAL FRAGMENT " + n + "/5 FOUND", C.pk);
  return true;
}
const allFragments = () => meta.fragments.every(Boolean);

/* ---------------- map ---------------- */
function genMap(depth) {
  if (run && run.seed) run.rs = seedNum(run.seed + ":map" + depth);
  const nodes = [], layers = [];
  const LX = l => 34 + l * 52;
  for (let l = 0; l < 6; l++) {
    const n = l === 0 ? 2 + rrint(2) : 2 + rrint(3);
    const layer = [];
    for (let j = 0; j < n; j++) {
      const y = 44 + (j + 0.5) * (168 / n) + (rr() - 0.5) * 10;
      const node = {id: l + "-" + j, layer: l, x: LX(l) + (rr() - 0.5) * 8, y: Math.round(y), type: "fight", next: [], secret: false, visited: false};
      layer.push(node); nodes.push(node);
    }
    layers.push(layer);
  }
  const boss = {id: "6-0", layer: 6, x: LX(6), y: 128, type: "boss", next: [], secret: false, visited: false};
  nodes.push(boss); layers.push([boss]);
  // edges
  for (let l = 0; l < 6; l++) {
    const a = layers[l], b = layers[l + 1];
    a.forEach((nd, j) => {
      const k = b.length === 1 ? 0 : Math.round(j / Math.max(1, a.length - 1) * (b.length - 1));
      nd.next.push(b[k].id);
      if (rr() < 0.45 && b.length > 1) {
        const k2 = clamp(k + (rr() < 0.5 ? -1 : 1), 0, b.length - 1);
        if (!nd.next.includes(b[k2].id)) nd.next.push(b[k2].id);
      }
    });
    b.forEach((nd, k) => {
      if (!a.some(x => x.next.includes(nd.id))) {
        const j = a.length === 1 ? 0 : Math.round(k / Math.max(1, b.length - 1) * (a.length - 1));
        a[j].next.push(nd.id);
      }
    });
  }
  // types
  const roll = tbl => { let t = 0; for (const k in tbl) t += tbl[k]; let x = rr() * t; for (const k in tbl) { x -= tbl[k]; if (x <= 0) return k; } return "fight"; };
  const T = [null,
    {fight:60, event:40},
    {fight:40, event:25, elite:20, shop:15, altar:8},
    {fight:35, event:20, elite:20, treasure:15, shop:10, altar:8},
    {fight:40, elite:30, event:30, altar:10},
    {rest:60, shop:40}];
  for (let l = 1; l < 6; l++) layers[l].forEach(nd => nd.type = roll(T[l]));
  if (!layers[1].some(n => n.type === "fight")) layers[1][0].type = "fight";
  if (!layers[5].some(n => n.type === "rest")) layers[5][0].type = "rest";
  if (![...layers[2], ...layers[3]].some(n => n.type === "shop")) rpick(layers[3]).type = "shop";
  // hidden vault
  const lv = 2 + rrint(3);
  const ys = layers[lv].map(n => n.y);
  const top = Math.min(...ys), bot = Math.max(...ys);
  const vy = (top - 30 > 30) ? top - 26 : (bot + 26 < 222 ? bot + 26 : (top > 240 - bot ? 32 : 220));
  const vault = {id: "v-" + lv, layer: lv, x: LX(lv), y: Math.round(clamp(vy, 30, 222)), type: "vault",
    next: layers[lv + 1].map(n => n.id), secret: true, visited: false};
  nodes.push(vault);
  return {depth, nodes, vaultId: vault.id};
}
function genSignalMap() {
  const a = {id: "s-0", layer: 0, x: 130, y: 128, type: "elite", next: ["s-1"], secret: false, visited: false};
  const b = {id: "s-1", layer: 1, x: 260, y: 128, type: "boss", next: [], secret: false, visited: false};
  return {depth: 4, nodes: [a, b], vaultId: null};
}
function nodeById(id) { return run.map.nodes.find(n => n.id === id); }
function vaultNode() { return run.map.vaultId ? nodeById(run.map.vaultId) : null; }
function vaultRevealed() { return run.lens || upgOn("carto") > 0 || !!run.revealed[run.depth] || (npcHere("moth") && run.depth === 1); }
function availNodes() {
  const cur = run.curId ? nodeById(run.curId) : null;
  let list = cur ? cur.next.map(nodeById).filter(Boolean) : run.map.nodes.filter(n => n.layer === 0 && !n.secret);
  const v = vaultNode();
  if (v && !v.visited && vaultRevealed() && (cur ? cur.layer : -1) === v.layer - 1 && !(cur && cur.secret)) list = list.concat([v]);
  return list;
}

/* ---------------- run lifecycle ---------------- */
function startRun(shield, opts) {
  opts = opts || {};
  run = {depth: 1, shield, lives: 3, maxLives: 3, coins: 0, mods: {}, lens: false,
    kills: 0, perfects: 0, bosses: 0, bank: 0, revealed: {}, usedEvents: [], map: null, curId: null,
    pendingId: null, runPerf: 0, fights: 0, curses: [], asc: opts.daily ? 0 : (opts.asc || 0),
    daily: opts.daily || null, seed: opts.daily ? "daily:" + opts.daily : null, rs: null, grades: {S: 0, A: 0, B: 0, C: 0}};
  if (run.seed) run.rs = seedNum(run.seed);
  const lives = 3 + upgOn("plate") - (run.asc >= 2 ? 1 : 0);
  run.lives = run.maxLives = lives;
  run.coins = 30 * upgOn("change");
  if (shield === "glass") { run.lives = run.maxLives = 1; gainMod(rollMod("r")); }
  if (npcHere("pip") && !run.daily) {
    const m = rollMod("c");
    gainMod(m);
    setTimeout(() => toast("PIP SLIPS YOU A MOD: " + MODS[m].n, C.li), 900);
  }
  meta.stats.runs++;
  if (!run.daily) meta.shield = shield;
  saveMeta();
  run.map = genMap(1);
  saveRun();
}
function saveRun() { try { if (run) localStorage.setItem(RUN_KEY, JSON.stringify(run)); } catch (e) {} }
function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} }
function loadRun() {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (!r || !r.map || !Array.isArray(r.map.nodes) || !r.shield) return null;
    // runs saved by older versions
    if (!Array.isArray(r.curses)) r.curses = [];
    if (r.asc == null) r.asc = 0;
    if (!r.grades) r.grades = {S: 0, A: 0, B: 0, C: 0};
    if (!r.usedEvents) r.usedEvents = [];
    return r;
  } catch (e) { return null; }
}
function hurtRun(n) { run.lives = Math.max(0, run.lives - n); }
function depthDiff(depth, layer) { if (depth === 5) return 1.22 + (layer || 0) * 0.03; return 1 + (depth - 1) * 0.16 + (layer || 0) * 0.025; }
const npcHere = id => !!(meta.npcs && meta.npcs[id]);
function runWaves(depth, layer, kind) {
  const pools = [null,
    ["sentry", "sentry", "spreader", "sniper"],
    ["sentry", "spreader", "sniper", "armor", "rusher", "shielder", "miner"],
    ["spreader", "sniper", "armor", "rusher", "splitter", "sentry", "shielder", "miner", "mirror"],
    ["sentry", "spreader", "sniper", "armor", "rusher", "splitter", "mirror", "shielder", "miner"],
    ["hollow", "mimic", "sentry", "spreader", "hollow", "mimic", "armor", "sentry"]];
  const pool = pools[depth];
  const dN = depth === 5 ? 2 : depth;
  const nW = kind === "elite" ? 3 : 2;
  const out = [];
  for (let w = 0; w < nW; w++) {
    const n = 2 + dN + Math.floor(layer / 2) + w + (kind === "elite" ? 1 : 0)
      + (run && run.asc >= 5 ? 1 : 0) + (run && (run.curses || []).includes("hunted") ? 1 : 0);
    const list = [];
    for (let i = 0; i < n; i++) list.push(rpick(pool));
    out.push(list);
  }
  return out;
}
const BOSS_FOR = [null, "warden", "furnace", "hydra", "echo"];

function endRun(kind) {
  const glass = run.shield === "glass";
  const won = kind === "win" || kind === "true" || kind === "free" || kind === "stay";
  let t = run.bank + Math.floor(run.kills * 0.5) + Math.floor(run.perfects * 0.3);
  if (kind === "win") t += 60;
  if (kind === "true") t += 150;
  if (kind === "free" || kind === "stay") t += 200;
  if (glass) t *= 2;
  const nCurse = (run.curses || []).length;
  t *= (1 + 0.15 * nCurse) * (1 + 0.2 * (run.asc || 0));
  t = Math.round(t);
  const extra = [];
  if (won) {
    unlockAch("ascend");
    if (nCurse >= 3) unlockAch("cursed");
    if (run.asc >= 1) unlockAch("asc1");
    if (run.asc >= 5) unlockAch("asc5");
    if (!run.daily && (run.asc || 0) >= (meta.asc || 0) && (meta.asc || 0) < 5) {
      meta.asc = (meta.asc || 0) + 1;
      extra.push("ASCENSION " + meta.asc + " UNLOCKED");
    }
  }
  if (kind === "true") unlockAch("true_end");
  let dailyScore = null;
  if (run.daily) {
    dailyScore = run.depth * 1000 + run.kills * 10 + run.perfects * 25 + run.bosses * 500 + (won ? 3000 : 0) + (kind === "true" ? 2000 : 0);
    meta.daily = {date: run.daily, done: true, score: dailyScore, depth: run.depth, win: won};
    meta.dailyBest = Math.max(meta.dailyBest || 0, dailyScore);
    unlockAch("daily");
    meta.stats.dailies = (meta.stats.dailies || 0) + 1;
    try { if (typeof gjDailyScore === "function") gjDailyScore(dailyScore); } catch (e) {}
  }
  if (!Array.isArray(meta.history)) meta.history = [];
  meta.history.unshift({d: Date.now(), k: kind, dp: run.depth, ki: run.kills, pf: run.perfects, sh: run.shield,
    a: run.asc || 0, c: nCurse, t, dy: run.daily ? 1 : 0, m: ownedMods().length});
  meta.history = meta.history.slice(0, 10);
  meta.tokens += t; meta.earned += t;
  meta.stats.bestDepth = Math.max(meta.stats.bestDepth, run.depth);
  if (won) meta.stats.wins++;
  const unlocks = [];
  if (kind === "true") {
    meta.stats.trueEnd++;
    if (!meta.shields.signal) { meta.shields.signal = true; unlocks.push("SECRET SHIELD: SIGNAL"); }
    meta.secrets.echo = true;
  }
  saveMeta(); clearRun(); checkTapes();
  try { if (typeof onlineEvent === "function") onlineEvent(); } catch (e) {}
  const summary = {kind, tokens: t, depth: run.depth, kills: run.kills, perfects: run.perfects, bosses: run.bosses,
    mods: ownedMods().map(id => MODS[id].n + (run.mods[id] > 1 ? " X" + run.mods[id] : "")), unlocks: unlocks.concat(extra), glass,
    asc: run.asc || 0, curses: nCurse, daily: run.daily, dailyScore, grades: run.grades};
  run = null;
  return summary;
}

/* ---------------- events ---------------- */
const EVENTS = [
  {id:"cabinet", t:"THE BROKEN CABINET", b:"AN OLD ARCADE CABINET FLICKERS IN THE DARK. THE COIN SLOT IS STILL WARM.", c:[
    {l:"INSERT 25 COINS", req:() => run.coins >= 25, go:() => { run.coins -= 25; const m = rollMod("r"); gainMod(m); return "THE SCREEN LIGHTS UP. YOU WIN " + MODS[m].n + "."; }},
    {l:"KICK IT", go:() => { if (rr() < 0.5) { run.coins += 45; return "COINS SPILL OUT ONTO THE FLOOR. +45 COINS."; } hurtRun(1); return "IT KICKS BACK. -1 SHIELD."; }},
    {l:"LEAVE IT", go:() => "YOU WALK AWAY. IT KEEPS FLICKERING BEHIND YOU."}]},
  {id:"static", t:"STATIC", b:"THE WALLS DISSOLVE INTO NOISE. SOMEWHERE INSIDE IT, A VOICE IS COUNTING BACKWARDS.", minDepth:2, weight:3, c:[
    {l:"LISTEN CLOSELY (-1 MAX SHIELD)", go:() => {
      run.maxLives = Math.max(1, run.maxLives - 1); run.lives = Math.min(run.lives, run.maxLives);
      if (grantFragment(4)) return "IT STOPS AT ZERO. YOU ARE HOLDING SOMETHING THAT WASN'T THERE BEFORE.";
      run.bank += 40; return "THE COUNT ENDS. YOU ALREADY KNOW WHAT IT MEANS. +40 TOKENS.";
    }},
    {l:"TURN AWAY", go:() => "THE NOISE FOLLOWS YOU FOR A WHILE. THEN IT DOESN'T."}]},
  {id:"scrap", t:"SCRAPYARD", b:"PILES OF BROKEN MACHINES. SOME OF THEM ARE STILL TWITCHING.", c:[
    {l:"SCAVENGE THE TOP", go:() => { run.coins += 25; return "+25 COINS."; }},
    {l:"DIG DEEPER (-1 SHIELD)", go:() => { hurtRun(1); const m = rollMod(); gainMod(m); return "SOMETHING BITES. YOU PULL OUT " + MODS[m].n + "."; }}]},
  {id:"tuner", t:"THE TUNER", b:"A FIGURE WITH A SOLDERING IRON OFFERS TO WORK ON YOUR GEAR. FOR FREE, APPARENTLY.", c:[
    {l:"TUNE A MOD", req:() => ownedMods().length > 0, go:() => { const m = rpick(ownedMods()); gainMod(m); return MODS[m].n + " TUNED. IT STACKS AGAIN."; }},
    {l:"SELL A MOD (+50 COINS)", req:() => ownedMods().length > 0, go:() => { const m = rpick(ownedMods()); loseMod(m); run.coins += 50; return "SOLD " + MODS[m].n + ". +50 COINS."; }},
    {l:"DECLINE", go:() => "THE IRON COOLS."}]},
  {id:"lens", t:"THE GLASS EYE", b:"A GLASS EYE RESTS ON A PEDESTAL. LOOKING THROUGH IT, THE MAP IS NOT QUITE THE SAME.", cond:() => !run.lens && meta.upg.carto === 0, c:[
    {l:"TAKE IT (-1 MAX SHIELD)", go:() => { run.lens = true; run.maxLives = Math.max(1, run.maxLives - 1); run.lives = Math.min(run.lives, run.maxLives); return "HIDDEN ROOMS WILL SHOW ON THE MAP FOR THE REST OF THIS RUN."; }},
    {l:"LEAVE IT", go:() => "IT WATCHES YOU GO."}]},
  {id:"fortune", t:"DOUBLE OR NOTHING", b:"A MACHINE WITH ONE BUTTON. THE LABEL SAYS: DOUBLE OR NOTHING.", c:[
    {l:"BET 30 COINS", req:() => run.coins >= 30, go:() => { if (rr() < 0.45) { run.coins += 30; return "DOUBLE. +30 COINS."; } run.coins -= 30; return "NOTHING. -30 COINS."; }},
    {l:"WALK AWAY", go:() => "PROBABLY WISE."}]},
  {id:"shrine", t:"THE CIRCUIT SHRINE", b:"A SHRINE BUILT FROM OLD CIRCUIT BOARDS. A PLAQUE READS: GIVE, AND BE MENDED.", c:[
    {l:"GIVE 20 COINS", req:() => run.coins >= 20, go:() => { run.coins -= 20; run.lives = Math.min(run.maxLives, run.lives + 2); return "WARMTH. +2 SHIELDS."; }},
    {l:"PRAY", go:() => { if (rr() < 0.3) { run.maxLives++; run.lives++; return "SOMETHING ANSWERS. +1 MAX SHIELD."; } return "NOTHING ANSWERS."; }}]}
];
function pickEvent() {
  if (run.depth === 5) {
    const lore = EVENTS.filter(e => (e.id === "missing" || e.id === "other") && !run.usedEvents.includes(e.id));
    if (lore.length) return rpick(lore);
  }
  const cagedOk = run.depth >= 1 && !run.daily && NPCS.some(n => !npcHere(n.id)) && !run.usedEvents.includes("caged");
  if (cagedOk && rr() < 0.3) return makeCaged();
  const ok = EVENTS.filter(e => e.id !== "caged" && !run.usedEvents.includes(e.id) && (!e.minDepth || run.depth >= e.minDepth) && (!e.cond || e.cond())
    && !(e.id === "static" && meta.fragments[4] && rr() < 0.6));
  const pool = ok.length ? ok : EVENTS.filter(e => e.id !== "lens" && e.id !== "caged");
  let tot = 0; for (const e of pool) tot += e.weight || 1;
  let x = rr() * tot;
  for (const e of pool) { x -= e.weight || 1; if (x <= 0) return e; }
  return pool[0];
}
