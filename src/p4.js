/* ================================================================
   Combat update
   ================================================================ */
const keys = Object.create(null);
const mouse = {x: ACX, y: ACY - 60};

function combatTick(raw) {
  if (!G || G.paused) return;
  if (G.banner) { G.banner.t -= raw; if (G.banner.t <= 0) G.banner = null; }
  if (G.hitstop > 0) { G.hitstop -= raw; return; }
  G.acc += raw * G.ts;
  let guard = 0;
  while (G.acc >= STEP && guard++ < 24) { combatStep(STEP); G.acc -= STEP; if (G.ended) break; }
  if (guard >= 24) G.acc = 0;
  if (G.ended && !G.endFired) {
    G.endFired = true;
    const cb = G.onEnd;
    if (cb) cb({win: G.won});
  }
}

function nearestHostile(maxD) {
  let best = null, bd = maxD || 1e9;
  for (const b of G.bullets) {
    if (b.friend) continue;
    const d = Math.hypot(b.x - G.p.x, b.y - G.p.y);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

function waveLogic(dt) {
  if (G.over || G.mode === "training") return;
  if (G.spawnQ.length) {
    G.waveT -= dt;
    if (G.waveT <= 0) { spawnFoe(G.spawnQ.shift()); G.waveT = 0.28; }
    return;
  }
  if (G.foes.some(f => f.type !== "mine")) return;
  if (G.mode === "run") {
    if (G.waveIdx + 1 < G.waves.length) {
      G.waveT -= dt;
      if (G.waveT <= 0) {
        G.waveIdx++;
        G.spawnQ = G.waves[G.waveIdx].slice();
        G.waveT = 0.3;
        if (G.waves.length > 1 && !FOE[G.spawnQ[0]].boss) { banner("WAVE " + (G.waveIdx + 1) + "/" + G.waves.length, G.pal.accent, 1.1); sfx.wave(); }
      }
    } else {
      // cleared
      G.over = true; G.won = true; G.endT = 1.4;
      for (const c of G.coins) c.t = Math.max(c.t, 0.5);
      for (const b of G.bullets) if (!b.friend) burst(b.x, b.y, 2, C.gy, 30, 0.3);
      G.bullets = G.bullets.filter(b => b.friend);
      for (const f of G.foes) burst(f.x, f.y, 6, C.gy, 40, 0.3);
      G.foes = [];
      banner("CLEAR", C.li, 1.4);
      gradeFight();
      seq([523, 659, 784, 1047], 70, "square", 0.12);
    }
    return;
  }
  // arcade / attract: endless
  G.waveT -= dt;
  if (G.waveT <= 0) {
    G.wave++;
    G.spawnQ = arcadeComp(G.wave);
    G.waveT = 0.35;
    G.diff = (1 + G.wave * 0.026) * DLV().diff;
    if (G.mode === "arcade" && G.wave % 5 !== 0) { banner("WAVE " + G.wave, C.bl, 1.1); sfx.wave(); }
  }
}

function combatStep(dt) {
  const p = G.p, S = G.S;
  G.t += dt;
  if (G.buff) { G.buffT -= dt; if (G.buffT <= 0) G.buff = null; }
  if (G.lightsOut > 0) G.lightsOut -= dt;
  const slowed = G.buff === "slow";

  /* ---- player ---- */
  let ax = 0, ay = 0;
  if (G.mode === "attract" && G.possess) {
    // it stops playing and looks out of the screen
    ax = (ACX - p.x) / 40; ay = (ACY + 10 - p.y) / 40;
    const m = Math.hypot(ax, ay); if (m > 1) { ax /= m; ay /= m; }
    p.aim += ((((Math.PI / 2 - p.aim) + Math.PI * 3) % TAU) - Math.PI) * Math.min(1, dt * 6);
    p.inv = 0.5;
  } else if (G.mode === "attract") {
    const t = performance.now() / 1000;
    const tx = ACX + Math.cos(t * 0.42) * 92, ty = ACY + Math.sin(t * 0.63) * 54;
    ax = (tx - p.x) / 64; ay = (ty - p.y) / 64;
    const m = Math.hypot(ax, ay); if (m > 1) { ax /= m; ay /= m; }
    const nb = nearestHostile();
    if (nb) p.aim = Math.atan2(nb.y - p.y, nb.x - p.x); else p.aim += dt * 1.1;
    p.inv = 0.5;
  } else if (!G.over) {
    if (keys.a || keys.arrowleft) ax -= 1;
    if (keys.d || keys.arrowright) ax += 1;
    if (keys.w || keys.arrowup) ay -= 1;
    if (keys.s || keys.arrowdown) ay += 1;
    if (TCH.mx || TCH.my) { ax = TCH.mx; ay = TCH.my; }
    if (PAD.connected && (PAD.lx || PAD.ly)) { ax = PAD.lx; ay = PAD.ly; }
    const m = Math.hypot(ax, ay); if (m > 1) { ax /= m; ay /= m; }
    if (isTouch()) touchAim(p);
    else if (PAD.connected && PAD.useAim) {
      if (Math.hypot(PAD.rx, PAD.ry) > 0.35) p.aim = Math.atan2(PAD.ry, PAD.rx);   // otherwise hold the last aim
    } else p.aim = Math.atan2(mouse.y - p.y, mouse.x - p.x);
  }
  const boost = (slowed ? 1.6 : 1) * S.moveMul;
  if (p.dashT > 0) { p.dashT -= dt; if ((G.t * 60 | 0) % 2 === 0) G.ghosts.push({x: p.x, y: p.y, t: 0.22}); }
  if (p.dashCd > 0) p.dashCd -= dt;
  for (let i = G.ghosts.length - 1; i >= 0; i--) { G.ghosts[i].t -= dt; if (G.ghosts[i].t <= 0) G.ghosts.splice(i, 1); }
  const ACC = 700 * boost, MAXV = 122 * boost;
  p.vx += ax * ACC * dt; p.vy += ay * ACC * dt;
  const fr = Math.pow(0.0016, dt); p.vx *= fr; p.vy *= fr;
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > MAXV && p.dashT <= 0) { p.vx = p.vx / sp * MAXV; p.vy = p.vy / sp * MAXV; }
  p.x += p.vx * dt; p.y += p.vy * dt;
  const pad = 8;
  if (p.x < AX0 + pad) { p.x = AX0 + pad; p.vx *= -0.35; }
  if (p.x > AX1 - pad) { p.x = AX1 - pad; p.vx *= -0.35; }
  if (p.y < AY0 + pad) { p.y = AY0 + pad; p.vy *= -0.35; }
  if (p.y > AY1 - pad) { p.y = AY1 - pad; p.vy *= -0.35; }
  if (p.inv > 0) p.inv -= dt;
  if (p.flash > 0) p.flash -= dt;
  if (p.pulseCd > 0) p.pulseCd -= dt;
  if (G.flash > 0) G.flash -= dt * 3;

  waveLogic(dt);
  const diff = G.diff;
  const fslow = slowed ? 0.45 : 1;

  /* ---- foes ---- */
  for (let i = G.foes.length - 1; i >= 0; i--) {
    const f = G.foes[i];
    if (!f) continue;
    const base = FOE[f.type];
    f.born += dt;
    if (f.hit > 0) f.hit -= dt;
    if (f.flashT > 0) f.flashT -= dt;
    const dx = p.x - f.x, dy = p.y - f.y, dist = Math.hypot(dx, dy) || 1;
    f.ang = Math.atan2(dy, dx);

    if (f.type === "armor") f.plate += dt * 1.05 * f.orbit;
    else if (f.type === "warden") f.plate += dt * (f.p2 ? 1.25 : 0.62) * f.orbit;
    else if (f.type === "furnace") {
      const d = ((f.ang - f.plate + Math.PI * 3) % TAU) - Math.PI;
      const tr = f.p2 ? 1.35 : 0.9;
      f.plate += clamp(d, -tr * dt, tr * dt);
    } else if (f.type === "echo" || f.type === "mirror" || f.type === "milo") {
      const d = ((f.ang - f.shAng + Math.PI * 3) % TAU) - Math.PI;
      const turn = f.type === "mirror" ? 2.5 : f.type === "milo" ? (f.p2 ? 3 : 2.4) : f.p2 ? 3.2 : 2.1;
      f.shAng += clamp(d, -turn * dt, turn * dt);
    } else if (f.type === "shielder") {
      let best = null, bd = 90;
      for (const o of G.foes) {
        if (o === f || o.type === "shielder" || o.type === "mine" || FOE[o.type].boss) continue;
        const d = Math.hypot(o.x - f.x, o.y - f.y); if (d < bd) { bd = d; best = o; }
      }
      f.link = best;
    }
    if (f.type === "milo") miloStep(f, p, dt);
    if (base.boss && !f.p2 && f.born > 1.4 && f.hp <= f.maxhp * 0.5 && G.mode !== "attract") enterPhase2(f);
    if (f.type === "mine") {
      if (f.born > 0.8 && dist < 20 && f.fuse > 0.35) f.fuse = 0.35;
      f.fuse -= dt;
      if (f.fuse <= 0) { mineBlast(f); G.foes.splice(i, 1); }
      continue;
    }

    if (f.type === "hollow") hollowStep(f, p, dt, dx, dy, dist);
    else if (f.type === "mimic" && f.dormant) mimicStep(f, p, dt, dist);
    else if (f.type === "rusher") {
      const acc = base.spd * 2.4;
      f.vx += dx / dist * acc * dt; f.vy += dy / dist * acc * dt;
      const s2 = Math.hypot(f.vx, f.vy), cap = base.spd * diff * (f.elite ? 1.2 : 1);
      if (s2 > cap) { f.vx = f.vx / s2 * cap; f.vy = f.vy / s2 * cap; }
    } else {
      const radial = (dist - f.want) * 0.9;
      let spd = base.spd * (f.elite ? 1.25 : 1);
      let tvx = dx / dist * radial + (-dy / dist) * spd * f.orbit;
      let tvy = dy / dist * radial + ( dx / dist) * spd * f.orbit;
      const cap = spd * 2.1, ts = Math.hypot(tvx, tvy);
      if (ts > cap) { tvx = tvx / ts * cap; tvy = tvy / ts * cap; }
      if (f.type === "milo" && f.p2 && f.born > 1.4) {
        // player 2: stands where your reflection would be
        const mx = clamp(2 * ACX - p.x, AX0 + 14, AX1 - 14), my = clamp(2 * ACY - p.y, AY0 + 14, AY1 - 14);
        tvx = clamp((mx - f.x) * 2.2, -150, 150); tvy = clamp((my - f.y) * 2.2, -150, 150);
      }
      else { const tv = [tvx, tvy]; steerFoe(f, base, p, dist, tv); tvx = tv[0]; tvy = tv[1]; }   // off the walls, out of corners
      if (base.boss && f.born < 1.4) { tvx = (ACX - f.x) * 1.2; tvy = (70 - f.y) * 1.6; }
      f.vx += (tvx - f.vx) * Math.min(1, dt * 2.4);
      f.vy += (tvy - f.vy) * Math.min(1, dt * 2.4);
      if (f.type === "echo" || (f.type === "milo" && !f.p2)) {
        f.dash -= dt;
        if (f.dash <= 0) { f.dash = f.p2 ? 1.1 + rand() * 0.8 : 2 + rand() * 1.5; const a = rand() * TAU; f.vx += Math.cos(a) * 150; f.vy += Math.sin(a) * 150; f.orbit *= -1; }
      }
    }
    f.x += f.vx * dt * fslow; f.y += f.vy * dt * fslow;
    if (f.born > 1.5) { f.x = clamp(f.x, AX0 + 6, AX1 - 6); f.y = clamp(f.y, AY0 + 6, AY1 - 6); }
    foeDefense(f, base, p, dist, dt * fslow);
    if (!G.foes.includes(f)) continue;

    if (f.type !== "rusher" && f.born > (base.boss ? 1.4 : 0.6) && !G.over) foeFire(f, dt * fslow, diff);

    if (G.mode !== "attract" && p.inv <= 0 && !G.over && dist < f.r + p.r) {
      hurt();
      if (f.type === "rusher" || f.type === "hollow") { burst(f.x, f.y, 16, f.type === "hollow" ? C.gy : C.rd, 96, 0.5); G.foes.splice(i, 1); continue; }
    }
  }

  cornerHazard(p, dt);

  /* ---- coins ---- */
  for (let i = G.coins.length - 1; i >= 0; i--) {
    const c = G.coins[i];
    c.t += dt;
    if (c.t < 0.35) {
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vx *= Math.pow(0.02, dt); c.vy *= Math.pow(0.02, dt);
    } else {
      const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1;
      const s = 60 + c.t * 340;
      c.x += dx / d * s * dt; c.y += dy / d * s * dt;
      if (d < 5) { G.coinsGot++; G.coins.splice(i, 1); sfx.coin(); }
    }
  }

  /* ---- drops (arcade) ---- */
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i];
    d.life -= dt; d.spin += dt * 2.2;
    d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= Math.pow(0.25, dt); d.vy *= Math.pow(0.25, dt);
    d.x = clamp(d.x, AX0 + 6, AX1 - 6); d.y = clamp(d.y, AY0 + 6, AY1 - 6);
    if (d.life <= 0) { G.drops.splice(i, 1); continue; }
    if (G.mode === "arcade" && Math.hypot(d.x - p.x, d.y - p.y) < 9) { takeDrop(d); G.drops.splice(i, 1); }
  }

  /* ---- bullets ---- */
  const arc = curArc();
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    if (!b) continue;   // a hit can clear several shots at once
    b.life -= dt;
    if (b.life <= 0) { G.bullets.splice(i, 1); continue; }
    if (b.friend && b.seek > 0) {
      b.seek -= dt;
      let tgt = null, td = 208;
      for (const f of G.foes) { const d = Math.hypot(f.x - b.x, f.y - b.y); if (d < td) { td = d; tgt = f; } }
      if (tgt) {
        let ba = Math.atan2(b.vy, b.vx);
        const da = ((Math.atan2(tgt.y - b.y, tgt.x - b.x) - ba + Math.PI * 3) % TAU) - Math.PI;
        ba += clamp(da, -S.seekTurn * dt, S.seekTurn * dt);
        const bs = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(ba) * bs; b.vy = Math.sin(ba) * bs;
      }
    }
    const bs = (!b.friend && slowed) ? 0.45 : 1;
    b.x += b.vx * dt * bs; b.y += b.vy * dt * bs;

    if (b.x < AX0 + 2 || b.x > AX1 - 2 || b.y < AY0 + 2 || b.y > AY1 - 2) {
      if (b.friend && b.bounce > 0) {
        b.bounce--;
        if (b.x < AX0 + 2 || b.x > AX1 - 2) { b.vx *= -1; b.x = clamp(b.x, AX0 + 2, AX1 - 2); }
        if (b.y < AY0 + 2 || b.y > AY1 - 2) { b.vy *= -1; b.y = clamp(b.y, AY0 + 2, AY1 - 2); }
        burst(b.x, b.y, 3, C.bl, 36, 0.3);
        if (S.storm) stormZap(b);
      } else { G.bullets.splice(i, 1); continue; }
    }

    if (!b.friend) {
      if (G.over) continue;
      const pdx = b.x - p.x, pdy = b.y - p.y, pd = Math.hypot(pdx, pdy);
      if (pd > S.bandIn && pd < S.bandOut && (pdx * b.vx + pdy * b.vy) < 0) {
        const ang = Math.atan2(pdy, pdx);
        if (angDiff(ang, p.aim) < arc || (S.twin && angDiff(ang, p.aim + Math.PI) < arc * 0.8)) {
          parry(b, ang, S.perfectAll || pd <= S.perfectD); continue;
        }
      }
      if (G.mode !== "attract" && p.inv <= 0 && pd < p.r + b.r) { G.bullets.splice(i, 1); hurt(); continue; }
    } else {
      for (let j = G.foes.length - 1; j >= 0; j--) {
        const f = G.foes[j];
        if (Math.hypot(b.x - f.x, b.y - f.y) >= f.r + b.r) continue;
        const hitAng = Math.atan2(b.y - f.y, b.x - f.x);
        if ((f.type === "echo" || (f.type === "milo" && !(f.guardT > 0))) && f.born > 1.4 && angDiff(hitAng, f.shAng) < 1.0) {
          // ECHO returns your shot
          b.friend = false;
          const a = Math.atan2(p.y - f.y, p.x - f.x) + (rand() - 0.5) * 0.18;
          const s = Math.min(Math.hypot(b.vx, b.vy) * 1.1, 290);
          b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s;
          b.x = f.x + Math.cos(a) * (f.r + 8); b.y = f.y + Math.sin(a) * (f.r + 8);
          b.rally++; b.life = 6; b.fast = true; b.r = 2; b.seek = 0;
          floatTxt(f.x, f.y - 14, f.type === "milo" ? "HE CATCHES IT" : b.rally > 2 ? "RALLY " + b.rally : "RETURNED", f.type === "milo" ? C.lg : C.pk);
          burst(b.x, b.y, 8, C.pk, 90, 0.3); sfx.clank();
          break;
        }
        if (f.type === "mirror" && f.born > 0.6 && !S.phase && angDiff(hitAng, f.shAng) < 0.7) {
          b.friend = false;
          const a = Math.atan2(p.y - f.y, p.x - f.x) + (rand() - 0.5) * 0.3;
          const s = Math.min(Math.hypot(b.vx, b.vy) * 0.9, 230);
          b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s;
          b.x = f.x + Math.cos(a) * (f.r + 7); b.y = f.y + Math.sin(a) * (f.r + 7);
          b.rally++; b.life = 6; b.r = 2; b.seek = 0;
          floatTxt(f.x, f.y - 12, "MIRRORED", C.la);
          burst(b.x, b.y, 6, C.la, 80, 0.3); sfx.clank();
          break;
        }
        if (plateBlocks(f, hitAng) || isShielded(f)) {
          const s = Math.hypot(b.vx, b.vy) * 0.82;
          b.vx = Math.cos(hitAng) * s; b.vy = Math.sin(hitAng) * s;
          b.x = f.x + Math.cos(hitAng) * (f.r + b.r + 6); b.y = f.y + Math.sin(hitAng) * (f.r + b.r + 6);
          b.seek = 0; b.bounce = Math.max(b.bounce, 1);
          burst(b.x, b.y, 6, C.or, 72, 0.3); sfx.clank();
          break;
        }
        burst(b.x, b.y, 5, C.bl, 64, 0.3);
        const dmg = 1 + (b.rally >= 2 ? 1 : 0) + (b.perfect && S.glassCannon ? 1 : 0);
        f.hp -= dmg; f.hit = 0.12;
        if (f.hp <= 0) {
          b.chain++;
          killFoe(f, j, b.chain);
          b.vx *= 0.82; b.vy *= 0.82; b.seek = 0.25;
        } else {
          if (b.pierce > 0) { b.pierce--; b.vx *= 0.7; b.vy *= 0.7; b.seek = 0.3; }
          else G.bullets.splice(i, 1);
          G.shake = Math.min(4, G.shake + 1); sfx.kill();
        }
        break;
      }
    }
  }

  for (let i = G.zaps.length - 1; i >= 0; i--) { G.zaps[i].t -= dt; if (G.zaps[i].t <= 0) G.zaps.splice(i, 1); }
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 1; }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.life -= dt;
    if (q.life <= 0) { G.parts.splice(i, 1); continue; }
    if (!q.ring) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(0.12, dt); q.vy *= Math.pow(0.12, dt); }
  }
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const f = G.floats[i]; f.life -= dt; f.y -= 14 * dt;
    if (f.life <= 0) G.floats.splice(i, 1);
  }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 18);

  const nb = G.mode !== "attract" && !G.over ? nearestHostile(30 + 10 * S.reflex) : null;
  const want = G.over ? (G.won ? 1 : 0.45) : nb ? Math.max(0.3, 0.55 - 0.1 * S.reflex) : 1;
  G.ts += (want - G.ts) * Math.min(1, dt * 14);

  if (G.over) { G.endT -= dt; if (G.endT <= 0) G.ended = true; }
}

function foeFire(f, dt, diff) {
  const p = G.p;
  if (f.dormant) return;
  f.cd -= dt * (G.fireMul || 1);
  const aim = Math.atan2(p.y - f.y, p.x - f.x);
  const el = f.elite ? 1.25 : 1;
  if (f.type === "sniper" && f.cd < 0.8 && f.cd > 0 && f.tele <= 0) f.tele = 0.001;
  if (f.tele > 0) f.tele += dt;

  if (f.type === "furnace") {
    // spiral bursts, then a breather that spits out rushers
    if (f.burst > 0) {
      f.burst -= dt;
      if (f.cd <= 0) {
        f.cd = 0.12 / diff;
        if (f.p2) {
          // three arms, and the spin flips every burst
          f.spin += 0.3 * (f.stage2 % 2 ? -1 : 1);
          for (let k = 0; k < 3; k++) fire(f, f.spin + k * TAU / 3, 74 * diff, 1.5);
        } else {
          f.spin += 0.36;
          fire(f, f.spin, 70 * diff, 1.5); fire(f, f.spin + Math.PI, 70 * diff, 1.5);
        }
        if (f.stage % 4 === 0) sfx.shoot();
        f.stage++;
      }
    } else {
      if (f.cd <= -1.8) {
        f.burst = f.p2 ? 3.2 : 2.6; f.cd = 0; f.stage2 = (f.stage2 || 0) + 1;
        if (G.foes.filter(o => o.type === "rusher").length < 3) spawnFoe("rusher", {x: f.x, y: f.y + 16});
      }
    }
    return;
  }
  if (f.cd > 0) return;
  f.flashT = 0.3;
  const base = FOE[f.type];
  f.cd = base.cd / diff / el * (0.85 + rand() * 0.3);
  f.tele = 0;
  switch (f.type) {
    case "sentry": case "shard": fire(f, aim, 86 * diff * el, 1.5); sfx.shoot(); break;
    case "spreader": case "splitter": for (let j = -1; j <= 1; j++) fire(f, aim + j * 0.26, 74 * diff * el, 1.5); sfx.shoot(); break;
    case "sniper": fire(f, aim, 224 * diff, 1.5, true); sfx.snipe(); break;
    case "armor": for (const j of [-1, 1]) fire(f, aim + j * 0.13, 80 * diff * el, 1.5); sfx.shoot(); break;
    case "warden":
      f.stage = (f.stage + 1) % 3;
      if (f.stage === 0) { const n = f.p2 ? 18 : 14; for (let j = 0; j < n; j++) fire(f, j / n * TAU + f.plate, 66 * diff, 2); }
      else { const w = f.p2 ? 3 : 2; for (let j = -w; j <= w; j++) fire(f, aim + j * 0.17, 94 * diff, 2); }
      if (f.p2) f.cd *= 0.8;
      sfx.shoot();
      if (!f.summoned && f.hp <= f.maxhp / 2) { f.summoned = true; spawnFoe("sentry"); spawnFoe("sniper"); floatTxt(f.x, f.y - 20, "REINFORCE", C.or); }
      break;
    case "hydra": {
      const st = f.hp <= f.maxhp * 0.33 ? 2 : f.hp <= f.maxhp * 0.66 ? 1 : 0;
      if (st > f.summoned) {
        f.summoned = st;
        for (const k of [-1, 1]) spawnFoe("splitter", {x: f.x + k * 18, y: f.y + 6});
        if (st === 2) for (const k of [-1, 1]) spawnFoe("shard", {x: f.x, y: f.y + k * 16});
        floatTxt(f.x, f.y - 20, "IT SPLITS", C.li); G.shake = 4;
      }
      f.stage++;
      if (f.stage % 3 === 0) {
        for (let j = 0; j < 12; j++) fire(f, j / 12 * TAU + f.stage * 0.2, 62 * diff, 2);
        for (let j = 0; j < 12; j++) fire(f, (j + 0.5) / 12 * TAU + f.stage * 0.2, 50 * diff, 2);
      } else {
        const way = f.p2 ? [-2, -1, 0, 1, 2] : [-1, 0, 1], hs = f.p2 ? 1.2 : 1, g0 = G;
        for (let k = 0; k < 3; k++) setTimeout(() => { if (G === g0 && G.foes.includes(f) && !G.over && !G.paused) { for (const j of way) fire(f, Math.atan2(G.p.y - f.y, G.p.x - f.x) + j * 0.2, 90 * diff * hs, 1.5); } }, k * 140);
      }
      f.cd = base.cd / diff * (st === 2 ? 0.7 : 1);
      sfx.shoot();
      break;
    }
    case "shielder": fire(f, aim, 70 * diff * el, 1.5); sfx.shoot(); break;
    case "mirror": for (const j of [-0.08, 0.08]) fire(f, aim + j, 96 * diff * el, 1.5); sfx.shoot(); break;
    case "miner":
      if (G.foes.filter(o => o.type === "mine").length < 4) {
        const m = spawnFoe("mine", {x: f.x, y: f.y}); m.born = 0.3;
        tone(240, 0.06, "square", 0.08, 120);
      } else { fire(f, aim, 80 * diff * el, 1.5); sfx.shoot(); }
      break;
    case "mimic": for (const j of [-0.12, 0.12]) fire(f, aim + j, 84 * diff, 1.5); sfx.shoot(); break;
    case "milo": {
      f.stage++;
      if (f.p2) {
        fire(f, aim, 130 * diff, 2, true);
        fire(f, Math.PI - aim, 100 * diff, 1.5);
        if (f.stage % 4 === 0) for (let j = 0; j < 14; j++) fire(f, j / 14 * TAU + f.stage, 58 * diff, 2);
      } else if (f.stage % 3 === 0) { for (let j = -2; j <= 2; j++) fire(f, aim + j * 0.2, 100 * diff, 1.5); }
      else fire(f, aim, 150 * diff, 2, true);
      f.guardT = 1.15;   // he lowers his shield to shoot
      f.cd = base.cd / diff * (f.p2 ? 0.8 : 1);
      sfx.snipe();
      break;
    }
    case "echo":
      f.stage++;
      if (f.hp < f.maxhp / 2 && f.stage % 3 === 0) for (let j = 0; j < 10; j++) fire(f, j / 10 * TAU + f.stage, 70, 2);
      else if (f.stage % 2) fire(f, aim, 140, 2, true);
      else for (const j of [-1, 0, 1]) fire(f, aim + j * 0.22, 100, 1.5);
      sfx.snipe();
      break;
  }
}
