/* ================================================================
   Mods, part two: three slots, levels, and the new mods' moving parts.
   You carry three mods. Finding one you already hold levels it up
   (to III). Finding a new one with full slots asks what to drop.
   ================================================================ */
SYNERGIES.push(
  {id: "permafrost", n: "PERMAFROST",    m: ["cold", "stun"],          d: "FROZEN OR SLOWED ENEMIES TAKE +1 FROM EVERY HIT.",      a: S => S.permafrost = true},
  {id: "supernova",  n: "SUPERNOVA",     m: ["nova", "split"],         d: "EVERY NOVA THROWS 2 MORE SHOTS.",                       a: S => S.supernova = true},
  {id: "juggernaut", n: "JUGGERNAUT",    m: ["ram", "bulwark"],        d: "YOUR DASH HITS HARDER AND KEEPS YOU SAFE LONGER.",      a: S => S.juggernaut = true},
  {id: "nest",       n: "SNIPER'S NEST", m: ["anchor", "longshot"],    d: "SHOTS RETURNED WHILE STANDING STILL COUNT AS LONG SHOTS.", a: S => S.nest = true},
  {id: "compound",   n: "COMPOUND",      m: ["interest", "salvage"],   d: "INTEREST CAN PAY OUT TWICE AS MUCH.",                  a: S => S.compound = true},
  {id: "horizon",    n: "EVENT HORIZON", m: ["gravity", "magnet"],     d: "SHOTS BEND MUCH HARDER, AND THE CATCH ZONE GROWS.",    a: S => { S.horizon = true; S.bandOut += 2; }},
  {id: "timelord",   n: "BORROWED TIME", m: ["stopwatch", "reflex"],   d: "STOPWATCH SLOWS THE WORLD TWICE AS LONG.",             a: S => S.timelord = true},
  {id: "deadringer", n: "DEAD RINGER",   m: ["afterimage", "twin"],    d: "YOUR GHOST SHIELD LASTS TWICE AS LONG.",               a: S => S.deadringer = true},
  {id: "thunder",    n: "THUNDERCLAP",   m: ["discharge", "shockwave"],d: "DISCHARGE HITS FOR 1 MORE.",                           a: S => S.thunder = true},
  {id: "orbit",      n: "CLOSE ORBIT",   m: ["satellite", "capacitor"],d: "ONE MORE DRONE CIRCLES YOU.",                          a: S => S.sat++},
  {id: "redmist",    n: "RED MIST",      m: ["berserk", "laststand"],  d: "ON YOUR LAST SHIELD YOU ALSO MOVE 30% FASTER.",        a: S => S.redmist = true}
);

/* ---------------- in the fight ---------------- */
function modTick(dt) {
  const S = G.S, p = G.p;
  const still = Math.hypot(p.vx, p.vy) < 24 && p.dashT <= 0 ? 1 : 0;
  G.anch += (still - G.anch) * Math.min(1, dt * 8);
  if (S.sat) satTick(dt);
  for (let i = G.decoys.length - 1; i >= 0; i--) { G.decoys[i].t -= dt; if (G.decoys[i].t <= 0) G.decoys.splice(i, 1); }
}
// GRAVITY WELL: enemy shots close to you curve toward the middle of your shield
function gravityBend(b, dt) {
  const p = G.p, S = G.S;
  const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
  if (d > 58 || d < S.bandOut - 2 || dx * b.vx + dy * b.vy >= 0) return;
  const gx = p.x + Math.cos(p.aim) * 13, gy = p.y + Math.sin(p.aim) * 13;
  let ba = Math.atan2(b.vy, b.vx);
  const da = ((Math.atan2(gy - b.y, gx - b.x) - ba + Math.PI * 3) % TAU) - Math.PI;
  const turn = S.gravity * (S.horizon ? 2.8 : 1.7) * dt;
  ba += clamp(da, -turn, turn);
  const bs = Math.hypot(b.vx, b.vy);
  b.vx = Math.cos(ba) * bs; b.vy = Math.sin(ba) * bs;
}
// SATELLITE: drones circle you, swing toward the nearest incoming shot and eat it, then need a moment to recharge
const SAT_R = 22, SAT_CD = 1.6;
function satTick(dt) {
  const S = G.S, p = G.p;
  if (!G.sats || G.sats.length !== S.sat) G.sats = Array.from({length: S.sat}, (_, k) => ({a: k * TAU / S.sat, cd: 0}));
  const taken = [];
  for (const d of G.sats) {
    if (d.cd > 0) d.cd -= dt;
    let best = null, bd = 56;
    if (d.cd <= 0) for (const b of G.bullets) {
      if (b.friend || taken.includes(b)) continue;
      const dx = b.x - p.x, dy = b.y - p.y, dist = Math.hypot(dx, dy);
      if (dist < bd && dist > SAT_R - 6 && dx * b.vx + dy * b.vy < 0) { bd = dist; best = b; }
    }
    if (best) {
      taken.push(best);
      const want = Math.atan2(best.y - p.y, best.x - p.x), da = ((want - d.a + Math.PI * 3) % TAU) - Math.PI;
      d.a += clamp(da, -9 * dt, 9 * dt);
    } else d.a += 2.4 * dt;
  }
}
function satPos(k) { const a = G.sats[k].a; return [G.p.x + Math.cos(a) * SAT_R, G.p.y + Math.sin(a) * SAT_R]; }
function satBlock(b) {
  if ((G.over && !G.won) || !G.sats) return false;
  for (let k = 0; k < G.sats.length; k++) {
    if (G.sats[k].cd > 0) continue;
    const [x, y] = satPos(k);
    if (Math.hypot(b.x - x, b.y - y) < 4.5 + b.r) {
      G.sats[k].cd = SAT_CD;
      burst(b.x, b.y, 6, C.la, 55, 0.25); tone(1600, 0.03, "square", 0.04);
      return true;
    }
  }
  return false;
}
// AFTERIMAGE: the ghost you leave behind catches too
function decoyCatch(b) {
  for (const d of G.decoys) {
    const dx = b.x - d.x, dy = b.y - d.y, dd = Math.hypot(dx, dy);
    if (dd > 5 && dd < 17 && dx * b.vx + dy * b.vy < 0) { parry(b, Math.atan2(dy, dx), false, d); return true; }
  }
  return false;
}
function modDamage(b, f) {
  const S = G.S;
  let d = S.dmg;
  if (S.longshot && (b.dist || 0) > 150) d += S.longshot;
  if (lastStand()) d++;
  if (S.momentum && G.combo >= 10) d++;
  if (S.permafrost && (f.stun > 0 || f.slowT > 0)) d++;
  return d;
}
// NOVA
function novaBurst(x, y) {
  const S = G.S, n = 2 + 2 * S.nova + (S.supernova ? 2 : 0), off = rand() * TAU;
  for (let k = 0; k < n && G.bullets.length < 480; k++) {
    const a = off + k / n * TAU;
    G.bullets.push({x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 4, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 1.5, friend: true, life: 1.1,
      seek: 0.25, bounce: 0, chain: 1, fast: false, perfect: false, pierce: 0, rally: 0, nova: true, dist: 0});
  }
  ring(x, y, 12, C.or, 0.25);
}
function drawModFx() {
  if (!G || !G.S) return;
  const S = G.S, p = G.p, blink = Math.floor(G.t * 8) % 2;
  for (const d of G.decoys) {
    L.globalAlpha = 0.2 + 0.45 * (d.t / d.max);
    drawSpr(SPR.player, d.x, d.y);
    ringDots(d.x, d.y, 12, C.ye, 3);
    L.globalAlpha = 1;
  }
  if (S.sat && G.sats && !(G.over && !G.won)) G.sats.forEach((d, k) => {
    const [x, y] = satPos(k);
    if (d.cd > 0) { P(x, y, C.gy); return; }
    R(x - 1, y - 1, 3, 3, C.la); P(x, y, blink ? C.wh : C.bl);
  });
  if (p.whirlT > 0) ringDots(p.x, p.y, 13, C.ye, 2);
  for (const f of G.foes) {
    if (f.stun > 0 && SCARE.freeze <= 0) for (let k = 0; k < 3; k++) { const a = G.t * 5 + k * TAU / 3; P(f.x + Math.cos(a) * (f.r + 3), f.y - f.r - 3 + Math.sin(a) * 1.5, C.ye); }
    else if (f.slowT > 0 && blink) ringDots(f.x, f.y, f.r + 3, C.bl, 4);
    if (S.spotter && !f.dormant && f.born > 0.6 && FOE[f.type].cd < 50 && f.type !== "furnace" && f.cd > 0 && f.cd < 0.4)
      ringDots(f.x, f.y, f.r + 4 + f.cd * 12, C.wh, 3);
  }
  if (S.longshot) for (const b of G.bullets) if (b.friend && b.dist > 150) P(b.x, b.y - 2, C.or);
  if (G.p2Show > 0 && !(G.over && !G.won)) {
    const k = G.p2Show / 3.2, a = Math.min(1, k * 4, (1 - k) * 4) * (0.16 + rand() * 0.08);
    const gx = clamp(2 * ACX - p.x, AX0 + 10, AX1 - 10), gy = clamp(2 * ACY - p.y, AY0 + 10, AY1 - 10), ga = p.aim + Math.PI, arc = curArc();
    L.globalAlpha = a;
    drawSpr(SPR.ghostPlayer || SPR.player, gx, gy);
    arcPx(gx, gy, 13, ga - arc, ga + arc, C.lg, 2);
    L.globalAlpha = 1;
  }
}
// after a descent fight: coins, repairs, and a spent CONTINUE?
function modsAfterFight(win) {
  const S = G.S;
  run.leechK = G.leechK || 0;
  if (G.contUsed && run.mods.cont) { loseMod("cont", true); setTimeout(() => toast("CONTINUE? IS SPENT. THE SLOT IS EMPTY.", C.ye), 500); }
  if (!win) return;
  if (S.interest) {
    const g = Math.min(Math.floor(run.coins * 0.1), 15 * S.interest * (S.compound ? 2 : 1));
    if (g > 0) { run.coins += g; setTimeout(() => toast("INTEREST: +" + g + " COINS", C.or), 300); }
  }
  if (S.mender && G.hits === 0 && run.lives < run.maxLives) { run.lives++; setTimeout(() => toast("SELF-REPAIR: +1 SHIELD", C.li), 400); }
}

/* ---------------- your three slots, drawn as a strip ---------------- */
function drawSlotStrip(y, hl) {
  const ids = ownedMods(), w = 118, x0 = W / 2 - (w * 3 + 8) / 2;
  for (let i = 0; i < MOD_SLOTS; i++) {
    const x = x0 + i * (w + 4), id = ids[i];
    R(x, y, w, 11, C.ink); RO(x, y, w, 11, id === hl ? C.ye : id ? RAR_COL[MODS[id].r] : C.nv);
    txt(id ? modName(id) : "EMPTY SLOT", x + w / 2, y + 3, id ? (id === hl ? C.ye : C.wh) : C.gy, 1, "c");
  }
}

/* ---------------- slots full: choose what to drop ---------------- */
const SwapScene = {
  // o: {id, price, done(took)} from the shop, otherwise the next mod waiting in run.pendingMods
  enter(o) {
    this.o = o && o.id ? o : null;
    this.id = this.o ? o.id : (run.pendingMods || [])[0];
    this.armed = -1; this.armT = 0;
    if (!this.id || !MODS[this.id]) { if (!this.o && run.pendingMods) run.pendingMods.shift(); return go(RunMap); }
    if (modFate(this.id) !== "swap") {   // a slot opened up (or it's already held): just take it
      if (!this.o) run.pendingMods.shift();
      gainMod(this.id); saveRun();
      return this.o ? this.o.done(true) : go(run.pendingMods.length ? SwapScene : RunMap);
    }
    music(run.depth === 5 ? "basement" : "map");
    sfx.secret();
  },
  decide(out) {
    const o = this.o, id = this.id;
    if (!o) run.pendingMods.shift();
    if (out) { swapMod(out, id); toast("DROPPED " + MODS[out].n + ". " + MODS[id].n + " IS IN.", RAR_COL[MODS[id].r]); }
    else if (!o) { run.coins += 15; toast("YOU LEAVE IT. +15 COINS", C.ye); }
    saveRun();
    if (o) return o.done(!!out);
    if (run.pendingMods.length) return go(SwapScene);
    go(RunMap);
  },
  arm(i, id) {
    if (this.armed === i && T - this.armT < 3) { this.armed = -1; this.decide(id); return; }
    this.armed = i; this.armT = T; sfx.deny(); fxWobble(0.2);
  },
  draw() {
    if (!run || !this.id) return;
    menuBg(PALS[DEPTH_PAL[run.depth]]);
    runHeader();
    title("YOUR SLOTS ARE FULL", 22, C.or);
    const id = this.id, m = MODS[id];
    txt(this.o ? "BUY FOR $" + this.o.price + ":" : "YOU FOUND:", 58, 38, C.lg, 1, "c");
    // the new mod, on its own on the left
    R(12, 45, 92, 120, C.ink); RO(12, 45, 92, 120, RAR_COL[m.r]); RO(13, 46, 90, 118, "#000");
    drawCardFace(id, 12, 45, 92, 120, false);
    txt("NEW", 58, 153, C.ye, 1, "c");
    txt("DROP ONE OF THESE:", 245, 38, C.lg, 1, "c");
    beginItems(this);
    const armed = this.armed >= 0 && T - this.armT < 3 ? this.armed : -1;
    ownedMods().slice(0, MOD_SLOTS).forEach((oid, i) => {
      drawCard(this, oid, 118 + i * 84, 45, 80, 120, () => this.arm(i, oid), null, {slot: true, armed: armed === i});
    });
    btn(this, this.o ? "DON'T BUY IT" : "KEEP MY MODS (+15 COINS)", W / 2 - 80, 176, 160, 14, () => this.decide(null), {col: C.gy});
    endItems(this);
    const hint = armed >= 0 ? "PRESS " + MODS[ownedMods()[armed]].n + " AGAIN TO DROP IT" : "YOU CAN CARRY " + MOD_SLOTS + " MODS. PICK ONE TO REPLACE, OR KEEP WHAT YOU HAVE.";
    wrap(hint, 340).forEach((l, i) => txt(l, W / 2, 198 + i * 8, armed >= 0 ? C.rd : C.gy, 1, "c"));
    if (activeSynergies().length) txt("CAREFUL: DROPPING A MOD CAN BREAK A SYNERGY.", W / 2, 216, C.pk, 1, "c");
  }
};
