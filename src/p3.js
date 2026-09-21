/* ================================================================
   Combat engine — shared by Arcade, Descent fights and the title demo
   ================================================================ */
const FOE = {
  sentry:  {hp:1, r:4.5, cd:2.0, spd:21, score:100, coins:1, spr:"sentry"},
  spreader:{hp:2, r:5,   cd:2.9, spd:17, score:150, coins:2, spr:"spreader"},
  sniper:  {hp:1, r:4.5, cd:3.4, spd:14, score:200, coins:2, spr:"sniper"},
  rusher:  {hp:2, r:4.5, cd:99,  spd:60, score:150, coins:1, spr:"rusher"},
  armor:   {hp:3, r:5.5, cd:2.6, spd:15, score:300, coins:3, spr:"armor"},
  splitter:{hp:2, r:5.5, cd:3.2, spd:18, score:200, coins:2, spr:"splitter"},
  shard:   {hp:1, r:2.5, cd:1.7, spd:44, score:75,  coins:0, spr:"shard"},
  shielder:{hp:2, r:5,   cd:3.6, spd:16, score:250, coins:2, spr:"shielder"},
  mirror:  {hp:2, r:5,   cd:3.0, spd:20, score:300, coins:3, spr:"mirror"},
  miner:   {hp:2, r:5.5, cd:3.0, spd:14, score:250, coins:2, spr:"miner"},
  mine:    {hp:1, r:3.5, cd:99,  spd:0,  score:25,  coins:0, spr:"mine"},
  warden:  {hp:22, r:10, cd:2.2, spd:12, score:3000, coins:15, boss:true, name:"WARDEN"},
  furnace: {hp:26, r:11, cd:0.12,spd:10, score:4000, coins:18, boss:true, name:"FURNACE"},
  hydra:   {hp:30, r:11, cd:1.6, spd:14, score:5000, coins:20, boss:true, name:"HYDRA"},
  echo:    {hp:24, r:9,  cd:1.5, spd:42, score:8000, coins:0,  boss:true, name:"ECHO"}
};

function baseStats() {
  return {arc:0.80, bandIn:8, bandOut:19, perfectD:12, pMul:1.55, ppMul:2.4, bounce:1, pBounce:2,
    seek:0.55, seekTurn:2.7, split:0, pierce:0, moveMul:1, pulseCd:5, coinMul:1, twin:false, zap:0,
    reflex:0, glassHeal:false, perfectAll:false, mirror:false, phase:false};
}

let G = null;
function newCombat(o) {
  G = {
    mode: o.mode, depth: o.depth || 1, pal: PALS[o.pal || "grid"], S: o.S || baseStats(),
    p: {x:ACX, y:ACY + 20, vx:0, vy:0, r:3.5, aim:-Math.PI / 2, inv:0, pulseCd:0, flash:0, dashT:0, dashCd:0},
    ghosts: [],
    lives: o.lives || 3, maxLives: o.maxLives || o.lives || 3,
    bullets:[], foes:[], parts:[], floats:[], coins:[], drops:[], zaps:[],
    waves: o.waves || null, waveIdx: -1, spawnQ: [], waveT: 0.9, wave: 0,
    score:0, combo:1, comboT:0, bestChain:1, perfects:0, kills:0, hits:0, coinsGot:0,
    shake:0, hitstop:0, ts:1, flash:0, acc:0, t:0,
    diff: o.diff || 1, elite: !!o.elite, buff:null, buffT:0,
    over:false, won:false, endT:0, ended:false, endFired:false, onEnd:o.onEnd, paused:false,
    runPerf: o.runPerf || 0, banner:null, bossName:null, touch:false
  };
  return G;
}
function banner(text, col, t) { G.banner = {text: normText(text), col: col || C.wh, t: t || 1.6, max: t || 1.6}; }

/* ---------------- spawning ---------------- */
function spawnFoe(type, at) {
  const base = FOE[type];
  const a = rand() * TAU;
  const f = {type, hp:base.hp, maxhp:base.hp, r:base.r,
    x: at ? at.x : ACX + Math.cos(a) * 232, y: at ? at.y : ACY + Math.sin(a) * 152,
    vx:0, vy:0, cd: base.cd * (0.5 + rand() * 0.7), tele:0, ang:0, hit:0, born:0,
    orbit: rand() < 0.5 ? 1 : -1, want: 76 + rand() * 56, plate: rand() * TAU,
    spin:0, burst:0, stage:0, elite:false, summoned:false, dash:2 + rand() * 2, shAng:0};
  if (G.elite && !base.boss && type !== "mine") { f.elite = true; f.hp++; f.maxhp++; }
  if (type === "mine") { f.fuse = 4.5; f.cd = 99; }
  if (type === "mimic") {
    f.dormant = true; f.elite = false; f.hp = f.maxhp = 1;
    if (!at) { f.x = AX0 + 30 + rand() * (AX1 - AX0 - 60); f.y = AY0 + 30 + rand() * (AY1 - AY0 - 60);
      if (Math.hypot(f.x - G.p.x, f.y - G.p.y) < 70) f.x = G.p.x < ACX ? AX1 - 40 : AX0 + 40; }
  }
  if (type === "mirror") f.shAng = f.ang;
  if (G.mode !== "attract") markSeen(type);
  if (base.boss) {
    f.hp = f.maxhp = G.mode === "arcade" ? 16 + Math.floor(G.wave * 1.6) : Math.round(base.hp * (G.mode === "run" && run && run.asc >= 4 ? 1.25 : 1));
    f.x = ACX; f.y = -26; f.want = type === "echo" ? 96 : 92; f.born = 0;
    G.bossName = base.name;
    banner(base.name, C.rd, 1.8);
    fxGlitch(0.6); fxRoll();
    sfx.boss();
  }
  G.foes.push(f);
  return f;
}
function arcadeComp(n) {
  if (n % 5 === 0) return ["warden", "sentry", "sentry"];
  const pool = ["sentry"];
  if (n >= 2) pool.push("spreader");
  if (n >= 3) pool.push("sniper");
  if (n >= 4) pool.push("armor");
  if (n >= 6) pool.push("rusher");
  if (n >= 7) pool.push("splitter");
  if (n >= 8) pool.push("shielder");
  if (n >= 9) pool.push("miner");
  if (n >= 11) pool.push("mirror");
  const out = [], count = 2 + Math.floor(n * 1.15);
  for (let i = 0; i < count; i++) out.push(pick(pool));
  return out;
}

/* ---------------- effects ---------------- */
function burst(x, y, n, col, spd, life) {
  if (G.parts.length > 700) return;
  for (let i = 0; i < n; i++) {
    const a = rand() * TAU, s = spd * (0.25 + rand() * 0.95);
    G.parts.push({x, y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, life: life * (0.5 + rand() * 0.7), max: life, col, ring:false, R:0});
  }
}
function ring(x, y, R, col, life) { G.parts.push({x, y, vx:0, vy:0, life, max:life, col, ring:true, R}); }
function floatTxt(x, y, t, col) {
  if (G.floats.length > 30) G.floats.shift();
  G.floats.push({x, y, t: normText(t), col, life: 0.9, max: 0.9});
}
function addScore(n, x, y, col) { G.score += n; floatTxt(x, y, "+" + n, col || C.ye); }

/* ---------------- arcade drops ---------------- */
const DROP_NAME = {wide:"WIDE GUARD", pierce:"PIERCE", slow:"DILATE", life:"+1 SHIELD"};
const DROP_ICON = {wide:"W", pierce:"P", slow:"S", life:"&"};
function maybeDrop(x, y, ch) {
  if (G.mode !== "arcade" || rand() > ch) return;
  let k = pick(["wide", "pierce", "slow", "life"]);
  if (k === "life" && G.lives >= 5) k = "pierce";
  G.drops.push({x, y, vx:(rand() - 0.5) * 16, vy:(rand() - 0.5) * 16, kind:k, life:13, spin:0});
}
function takeDrop(d) {
  sfx.pick();
  if (d.kind === "life") { G.lives = Math.min(5, G.lives + 1); G.maxLives = Math.max(G.maxLives, G.lives); }
  else { G.buff = d.kind; G.buffT = 9; }
  floatTxt(G.p.x, G.p.y - 12, DROP_NAME[d.kind], C.bl);
  ring(d.x, d.y, 16, C.bl, 0.3);
}
function dropCoins(x, y, n) {
  for (let i = 0; i < n; i++) G.coins.push({x, y, vx:(rand() - 0.5) * 90, vy:(rand() - 0.5) * 90, t: -rand() * 0.1});
}

/* ---------------- core helpers ---------------- */
function curArc() { return G.S.arc * (G.buff === "wide" ? 1.5 : 1); }
function plateBlocks(f, hitAng) {
  if (G.S.phase) return false;
  let n = 0, arc = 0;
  if (f.type === "armor") { n = 1; arc = 2.3; }
  else if (f.type === "warden") { n = f.p2 ? 6 : 3; arc = f.p2 ? 0.62 : 1.3; }
  else if (f.type === "furnace") { n = 1; arc = 2.6; }
  else return false;
  for (let i = 0; i < n; i++) if (angDiff(hitAng, f.plate + i * TAU / n) < arc / 2) return true;
  return false;
}
function fire(f, ang, speed, r, fast) {
  if (G.bullets.length > 480) return;
  G.bullets.push({x: f.x + Math.cos(ang) * (f.r + 2), y: f.y + Math.sin(ang) * (f.r + 2),
    vx: Math.cos(ang) * speed * (G.bulletMul || 1), vy: Math.sin(ang) * speed * (G.bulletMul || 1), r: r || 1.5, friend:false, life:7,
    seek:0, bounce:0, chain:0, fast:!!fast, perfect:false, pierce:0, rally:0});
}
function setFriendly(b, ang, out, perfect) {
  const S = G.S, p = G.p;
  b.vx = Math.cos(ang) * out; b.vy = Math.sin(ang) * out;
  b.friend = true; b.seek = S.seek + (perfect ? 0.2 : 0); b.bounce = perfect ? S.pBounce : S.bounce;
  b.life = 4.5; b.r = perfect ? 2.5 : 2; b.chain = 0; b.perfect = !!perfect;
  b.pierce = S.pierce + (G.buff === "pierce" ? 1 : 0);
  b.x = p.x + Math.cos(ang) * 16; b.y = p.y + Math.sin(ang) * 16;
}
function parry(b, ang, perfect) {
  const S = G.S, p = G.p;
  const spd = Math.hypot(b.vx, b.vy);
  G.parries = (G.parries || 0) + 1;
  const out = Math.max(spd * (perfect ? S.ppMul : S.pMul), perfect ? 248 : 188);
  setFriendly(b, ang, out, perfect);
  const extra = S.split + (perfect && S.mirror ? 2 : 0);
  for (let k = 1; k <= extra; k++) {
    const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.24;
    const nb = Object.assign({}, b);
    setFriendly(nb, ang + off, out * 0.92, perfect);
    G.bullets.push(nb);
  }
  burst(b.x, b.y, perfect ? 12 : 7, perfect ? C.wh : C.bl, perfect ? 144 : 104, 0.32);
  G.shake = Math.min(4, G.shake + (perfect ? 2.2 : 1.4));
  G.hitstop = Math.max(G.hitstop, perfect ? 0.07 : 0.03);
  p.flash = perfect ? 0.22 : 0.14;
  if (G.mode !== "attract") {
    if (perfect) {
      G.perfects++; G.runPerf++;
      addScore(30 * G.combo, b.x, b.y, C.wh);
      floatTxt(p.x, p.y - 16, "PERFECT", C.wh);
      G.combo++; if (G.combo > G.bestChain) G.bestChain = G.combo;
      ring(p.x, p.y, 28, C.wh, 0.26); fxGlitch(0.07);
      if (S.glassHeal && G.runPerf % 5 === 0 && G.lives < G.maxLives) { G.lives++; floatTxt(p.x, p.y - 24, "+1 SHIELD", C.li); }
    } else addScore(10 * G.combo, b.x, b.y, C.bl);
    G.comboT = Math.max(G.comboT, perfect ? 3.2 : 1.6);
  }
  perfect ? sfx.perfect(G.combo) : sfx.parry(G.combo);
  if (perfect) buzz(14);
}
function doPulse() {
  if (!G || G.mode === "attract" || G.over || G.paused || G.p.pulseCd > 0) return;
  const p = G.p, R = 47;
  p.pulseCd = G.S.pulseCd;
  G.pulses = (G.pulses || 0) + 1;
  for (const b of G.bullets) {
    if (b.friend) continue;
    const dx = b.x - p.x, dy = b.y - p.y;
    if (Math.hypot(dx, dy) < R) parry(b, Math.atan2(dy, dx), G.S.perfectAll || G.S.overload);
  }
  for (const f of G.foes) {
    if (FOE[f.type].boss) continue;
    const dx = f.x - p.x, dy = f.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < R * 1.5) { f.vx += dx / d * 104; f.vy += dy / d * 104; }
  }
  ring(p.x, p.y, R, C.bl, 0.42);
  burst(p.x, p.y, 14, C.bl, 130, 0.4);
  G.shake = Math.min(5, G.shake + 3);
  sfx.pulse();
}
function doDash() {
  if (!G || G.mode === "attract" || G.over || G.paused) return;
  const p = G.p;
  if (p.dashCd > 0) return;
  let dx = 0, dy = 0;
  if (keys.a || keys.arrowleft) dx -= 1;
  if (keys.d || keys.arrowright) dx += 1;
  if (keys.w || keys.arrowup) dy -= 1;
  if (keys.s || keys.arrowdown) dy += 1;
  if (!dx && !dy && (TCH.mx || TCH.my)) { dx = TCH.mx; dy = TCH.my; }
  if (!dx && !dy) { const sp = Math.hypot(p.vx, p.vy); if (sp > 5) { dx = p.vx / sp; dy = p.vy / sp; } else { dx = Math.cos(p.aim); dy = Math.sin(p.aim); } }
  const m = Math.hypot(dx, dy) || 1;
  p.vx = dx / m * 340 * G.S.moveMul; p.vy = dy / m * 340 * G.S.moveMul;
  p.dashT = 0.13; p.dashCd = 1.1; p.inv = Math.max(p.inv, 0.22);
  G.dashes = (G.dashes || 0) + 1;
  noise(0.16, 0.12, 900, 3200); tone(420, 0.08, "square", 0.06, 900);
}
function hurt() {
  const p = G.p;
  if (p.inv > 0 || G.mode === "attract" || G.over) return;
  G.lives--; G.hits++;
  p.inv = 1.4; G.combo = 1; G.comboT = 0;
  fxGlitch(0.75); fxWobble(0.9); sfxGlitch(true); padRumble(0.9, 0.6, 220);
  G.shake = 6; G.hitstop = Math.max(G.hitstop, 0.1); G.flash = Math.max(G.flash, 0.5);
  burst(p.x, p.y, 26, C.rd, 130, 0.7);
  sfx.hurt();
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    if (!b.friend && Math.hypot(b.x - p.x, b.y - p.y) < 60) G.bullets.splice(i, 1);
  }
  if (G.lives <= 0) {
    G.lives = 0; G.over = true; G.won = false; G.endT = 1.5;
    burst(p.x, p.y, 60, C.ye, 170, 1.1); sfx.dead();
  }
}
function damageFoe(f, n, chain, noZap) {
  f.hp -= n; f.hit = 0.12;
  if (f.hp <= 0) { const i = G.foes.indexOf(f); if (i > -1) killFoe(f, i, chain || 1, noZap); return true; }
  return false;
}
function killFoe(f, idx, chain, noZap) {
  const base = FOE[f.type];
  if (G.mode !== "attract") {
    const gain = base.score * G.combo * (chain > 1 ? chain : 1) * (f.elite ? 2 : 1);
    addScore(gain, f.x, f.y, chain > 1 ? C.bl : C.ye);
    G.combo++; G.comboT = 3.2; if (G.combo > G.bestChain) G.bestChain = G.combo;
    G.kills++;
    if (chain > 1) floatTxt(f.x, f.y - 10, "CHAIN " + chain, C.bl);
  }
  if (G.mode !== "attract") onFoeKilled(f, chain);
  if (base.boss) {
    const bc = f.type === "milo" ? C.lg : C.or;
    burst(f.x, f.y, 90, bc, 190, 1.1); burst(f.x, f.y, 40, C.wh, 120, 0.8); fxGlitch(0.8); fxWobble(0.6); padRumble(1, 1, 450);
    ring(f.x, f.y, 80, C.ye, 0.8);
    G.flash = 1; G.shake = 6; G.bossName = null;
    if (G.mode === "arcade") {
      G.lives = Math.min(5, G.lives + 1); G.maxLives = Math.max(G.maxLives, G.lives);
      floatTxt(f.x, f.y - 20, "+1 SHIELD", C.li);
      maybeDrop(f.x + 10, f.y, 1); maybeDrop(f.x - 10, f.y, 1);
    }
    sfx.bossdie();
  } else {
    burst(f.x, f.y, 18, f.elite ? C.wh : C.rd, 112, 0.6);
    G.shake = Math.min(5, G.shake + 2.2);
    G.hitstop = Math.max(G.hitstop, 0.04);
    chain > 1 ? sfx.chain(chain) : sfx.kill();
    maybeDrop(f.x, f.y, f.type === "armor" ? 0.34 : 0.085);
  }
  if (G.mode === "run") dropCoins(f.x, f.y, base.coins + (f.elite ? 3 : 0));
  G.foes.splice(idx, 1);
  if (f.type === "splitter") for (const k of [-1, 1]) spawnFoe("shard", {x: f.x + k * 8, y: f.y});
  if (!noZap && G.S.zap > 0 && G.mode !== "attract") {
    let best = null, bd = 90;
    for (const o of G.foes) { const d = Math.hypot(o.x - f.x, o.y - f.y); if (d < bd) { bd = d; best = o; } }
    if (best) { G.zaps.push({x1:f.x, y1:f.y, x2:best.x, y2:best.y, t:0.18}); damageFoe(best, G.S.zap, 1, true); }
  }
}
