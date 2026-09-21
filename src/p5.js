/* ================================================================
   Combat drawing
   ================================================================ */
function drawArenaBg(pal) {
  R(0, 0, W, H, pal.bg);
  L.fillStyle = pal.grid;
  for (let x = AX0 + 8; x < AX1; x += 16) for (let y = AY0 + 8; y < AY1; y += 16) L.fillRect(x, y, 1, 1);
  RO(AX0, AY0, AX1 - AX0, AY1 - AY0, pal.grid);
  // corner brackets in the wall colour
  const c = pal.wall;
  for (const [x, y, sx, sy] of [[AX0, AY0, 1, 1], [AX1 - 1, AY0, -1, 1], [AX0, AY1 - 1, 1, -1], [AX1 - 1, AY1 - 1, -1, -1]]) {
    R(Math.min(x, x + sx * 6), y, 7, 1, c); R(x, Math.min(y, y + sy * 6), 1, 7, c);
  }
}

function drawFoe(f) {
  const base = FOE[f.type], fl = f.hit > 0;
  const appear = Math.min(1, f.born * 3);
  if (appear < 1 && Math.floor(f.born * 20) % 2) return;
  if (f.type === "warden") {
    disc(f.x, f.y, 10, fl ? C.wh : C.or); disc(f.x, f.y, 8, fl ? C.wh : C.ru);
    disc(f.x, f.y, 4, C.wh);
    R(f.x - 1 + Math.round(Math.cos(f.ang) * 2), f.y - 1 + Math.round(Math.sin(f.ang) * 2), 2, 2, C.nv);
    const np = f.p2 ? 6 : 3, ha = f.p2 ? 0.31 : 0.65;
    for (let i = 0; i < np; i++) { const a = f.plate + i * TAU / np; arcPx(f.x, f.y, 15, a - ha, a + ha, f.p2 ? C.or : C.ye, 2); }
  } else if (f.type === "furnace") {
    const hot = f.burst > 0;
    R(f.x - 11, f.y - 11, 22, 22, fl ? C.wh : C.ru);
    R(f.x - 10, f.y - 10, 20, 20, "#3B1A12");
    R(f.x - 6, f.y - 6, 3, 2, C.ye); R(f.x + 3, f.y - 6, 3, 2, C.ye);
    for (let k = 0; k < 3; k++) R(f.x - 7, f.y + 1 + k * 3, 14, 1, hot ? (k % 2 ? C.ye : C.or) : C.ru);
    arcPx(f.x, f.y, 17, f.plate - 1.3, f.plate + 1.3, f.p2 ? C.ye : C.or, 2);
    if (f.p2 && Math.floor(G.t * 10) % 2) RO(f.x - 12, f.y - 12, 24, 24, C.or);
  } else if (f.type === "hydra") {
    disc(f.x, f.y, 11, fl ? C.wh : C.li); disc(f.x, f.y, 9, fl ? C.wh : C.gr);
    for (const [ex, ey] of [[-5, -3], [0, -5], [5, -3]]) {
      R(f.x + ex - 1, f.y + ey - 1, 3, 3, C.wh);
      P(f.x + ex + Math.round(Math.cos(f.ang)), f.y + ey + Math.round(Math.sin(f.ang)), C.k);
    }
    R(f.x - 4, f.y + 4, 9, 1, C.k);
  } else if (f.type === "milo") {
    drawSpr(SPR.milo, f.x, f.y, fl, 2);
    const down = f.guardT > 0;
    if (!down || Math.floor(G.t * 10) % 3 === 0) arcPx(f.x, f.y, 14, f.shAng - 1.0, f.shAng + 1.0, down ? C.gy : (fl ? C.wh : C.lg), down ? 1 : 2);
  } else if (f.type === "mimic" && f.dormant) {
    drawSpr(Math.floor((G.t + f.x) * 8) % 2 ? SPR.coin : SPR.coin2, f.x, f.y);
  } else if (f.type === "hollow") {
    drawSpr(SPR.hollow, f.x + (f.seen ? 0 : (rand() - 0.5) * 1.2), f.y, fl);
  } else if (f.type === "echo") {
    drawSpr(SPR.echo, f.x, f.y, fl, 2);
    const col = fl ? C.wh : C.pk;
    arcPx(f.x, f.y, 14, f.shAng - 1.0, f.shAng + 1.0, col, 2);
  } else {
    const s = SPR[base.spr];
    if (f.elite) drawOutline(s, f.x, f.y);
    drawSpr(s, f.x, f.y, fl);
    if (f.type === "mirror") arcPx(f.x, f.y, 8, f.shAng - 0.7, f.shAng + 0.7, fl ? C.wh : C.lg, 1);
    if (f.type === "mine") {
      const k = f.fuse < 1.2 ? 16 : f.born < 0.8 ? 2 : 5;
      if (Math.floor(G.t * k) % 2) R(f.x - 1, f.y - 1, 2, 2, f.fuse < 1.2 ? C.wh : C.ye);
      if (f.fuse < 1.2) ringDots(f.x, f.y, 10 + (1.2 - f.fuse) * 6, C.rd, 4);
    }
    if (f.type === "sentry") R(f.x - 1 + Math.round(Math.cos(f.ang) * 1.5), f.y - 1 + Math.round(Math.sin(f.ang) * 1.5), 2, 2, C.nv);
    if (f.type === "armor") arcPx(f.x, f.y, 9, f.plate - 1.15, f.plate + 1.15, C.ye, 2);
    if (f.maxhp > 1) for (let k = 0; k < f.maxhp; k++) P(f.x - f.maxhp + 1 + k * 2, f.y + f.r + 3, k < f.hp ? C.wh : C.gy);
  }
  if (f.type === "sniper" && f.tele > 0 && Math.floor(f.tele * 14) % 2 === 0)
    line(f.x, f.y, f.x + Math.cos(f.ang) * 420, f.y + Math.sin(f.ang) * 420, C.pk, 3);
}

function drawBullet(b) {
  if (b.friend) {
    const col = b.perfect ? C.wh : C.bl;
    const s = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / s, uy = b.vy / s;
    for (let k = 1; k <= (b.perfect ? 4 : 3); k++) P(b.x - ux * k * 2, b.y - uy * k * 2, k === 1 ? col : (b.perfect ? C.lg : C.nv));
    R(b.x - 1, b.y - 1, b.perfect ? 3 : 2, b.perfect ? 3 : 2, col);
  } else {
    const col = b.rally ? C.pk : C.rd;
    if (b.fast) {
      const s = Math.hypot(b.vx, b.vy) || 1;
      for (let k = 1; k <= 3; k++) P(b.x - b.vx / s * k * 2, b.y - b.vy / s * k * 2, C.pl);
    }
    P(b.x, b.y - 1, col); P(b.x, b.y + 1, col); P(b.x - 1, b.y, col); P(b.x + 1, b.y, col);
    P(b.x, b.y, b.rally ? C.wh : C.pk);
  }
}

function drawPlayer() {
  const p = G.p, S = G.S;
  if (G.over && !G.won) return;
  const blink = p.inv > 0 && Math.floor(p.inv * 14) % 2;
  for (const gh of G.ghosts) { L.globalAlpha = gh.t / 0.22 * 0.6; drawSpr(SPR.player, gh.x, gh.y, true); }
  L.globalAlpha = 1;
  if (!blink) drawSpr(SPR.player, p.x, p.y, p.flash > 0);
  const arc = curArc();
  const col = p.flash > 0 ? C.wh : (G.buff === "wide" ? C.bl : C.ye);
  if (!blink) {
    arcPx(p.x, p.y, 13, p.aim - arc, p.aim + arc, col, 2);
    for (const s of [-1, 1]) {
      const a = p.aim + s * arc;
      line(p.x + Math.cos(a) * 11, p.y + Math.sin(a) * 11, p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, col);
    }
    if (S.twin) arcPx(p.x, p.y, 13, p.aim + Math.PI - arc * 0.8, p.aim + Math.PI + arc * 0.8, C.or, 1);
    if (!S.perfectAll) {
      L.fillStyle = "rgba(255,241,232,0.45)";
      const r = S.perfectD - 1;
      for (let a = p.aim - arc * 0.85; a <= p.aim + arc * 0.85; a += 0.35)
        L.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r), 1, 1);
    }
  }
  if (p.pulseCd <= 0 && G.mode !== "attract" && Math.floor(G.t * 3) % 2) ringDots(p.x, p.y, 20, C.bl, 5);
}

function drawCombat(opts) {
  opts = opts || {};
  drawArenaBg(G.pal);
  const shk = meta.settings.shake === false ? 0 : G.shake * (meta.settings.effects === 0 ? 0.4 : 1);
  const sx = Math.round((rand() - 0.5) * shk * 2), sy = Math.round((rand() - 0.5) * shk * 2);
  L.save(); L.translate(sx, sy);
  for (const c of G.coins) drawSpr(Math.floor((G.t + c.x) * 8) % 2 ? SPR.coin : SPR.coin2, c.x, c.y);
  for (const d of G.drops) {
    if (d.life < 3 && Math.floor(d.life * 7) % 2) continue;
    R(d.x - 4, d.y - 4, 9, 9, C.k); RO(d.x - 4, d.y - 4, 9, 9, C.bl);
    txt(DROP_ICON[d.kind], d.x - 1, d.y - 2, C.bl);
  }
  for (const f of G.foes) if (f.type === "shielder" && f.link && G.foes.includes(f.link) && f.born > 0.4) {
    line(f.x, f.y, f.link.x, f.link.y, C.bl, 2);
    if (Math.floor(G.t * 6) % 3) ringDots(f.link.x, f.link.y, f.link.r + 4, C.bl, 3);
  }
  for (const f of G.foes) drawFoe(f);
  for (const q of G.parts) {
    const t = Math.max(0, q.life / q.max);
    if (q.ring) { if (t > 0.15) ringDots(q.x, q.y, Math.max(2, q.R * (1 - t) * 1.1 + 4), q.col, 3); }
    else if (t > 0.1 || Math.floor(q.life * 30) % 2) P(q.x, q.y, q.col);
  }
  for (const z of G.zaps) {
    let x = z.x1, y = z.y1;
    for (let k = 1; k <= 6; k++) {
      const nx = z.x1 + (z.x2 - z.x1) * k / 6 + (k < 6 ? (rand() - 0.5) * 8 : 0);
      const ny = z.y1 + (z.y2 - z.y1) * k / 6 + (k < 6 ? (rand() - 0.5) * 8 : 0);
      line(x, y, nx, ny, k % 2 ? C.wh : C.bl); x = nx; y = ny;
    }
  }
  for (const b of G.bullets) drawBullet(b);
  drawPlayer();
  L.restore();
  if (G.dark) drawDarkness();
  drawDefenses();
  for (const f of G.floats) {
    if (f.life / f.max < 0.3 && Math.floor(f.life * 20) % 2) continue;
    txtS(f.t, f.x, f.y, f.col, 1, "c");
  }
  if (G.flash > 0) { L.globalAlpha = Math.min(0.6, G.flash * 0.5); R(0, 0, W, H, C.wh); L.globalAlpha = 1; }
  if (G.banner) {
    const b = G.banner, k = b.t / b.max;
    if (k > 0.12 || Math.floor(b.t * 20) % 2) txtS(b.text, W / 2, 104, b.col, 3, "c", C.k);
  }
  if (G.grade && G.over && G.won) {
    const gc = {S: C.ye, A: C.li, B: C.bl, C: C.lg}[G.grade];
    txtS("GRADE", W / 2, 132, C.lg, 1, "c", C.k);
    txtS(G.grade, W / 2, 142, gc, 4, "c", C.k);
    if (G.gradeBonus) txtS("+" + G.gradeBonus + " COINS", W / 2, 174, C.ye, 1, "c", C.k);
  }
  if (!opts.noHud) drawHud();
}

function heartRow(x, y, n, max, align) {
  if (Math.max(n, max) > 8) { txt("&X" + n, x, y, C.rd, 1, align); return; }
  const total = Math.max(n, max);
  let sx = align === "r" ? x - total * 6 + 1 : x;
  for (let i = 0; i < total; i++) txt("&", sx + i * 6, y, i < n ? C.rd : C.gy);
}
function drawHud() {
  R(0, 0, W, 15, C.k); R(0, 14, W, 1, G.pal.grid);
  let x = 12;   // kept clear of the tube's curved corners
  if (G.mode === "arcade") {
    txt("SCORE", x, 2, C.gy); txt(String(G.score).padStart(7, "0"), x, 8, C.wh); x += 34;
    txt("WAVE", x, 2, C.gy); txt(String(G.wave), x, 8, C.wh); x += 22;
  } else if (G.mode === "run") {
    txt("COINS", x, 2, C.gy); txt("$" + (run.coins + Math.round(G.coinsGot * G.S.coinMul)), x, 8, C.ye); x += 30;
    txt("DEPTH", x, 2, C.gy); txt(run.depth + "~" + (G.pal.name.replace("THE ", "")), x, 8, C.wh); x += 64;
  }
  txt("CHAIN", x, 2, C.gy);
  const pulseC = G.combo > 1 && G.comboT > 2.9;
  txt("X" + G.combo, x, 8, G.combo >= 10 ? (Math.floor(T * 8) % 2 ? C.ye : C.or) : G.combo > 1 ? (pulseC ? C.wh : C.bl) : C.wh);
  if (G.combo > 1) { R(x + 12, 10, 12, 2, C.nv); R(x + 12, 10, Math.round(12 * clamp(G.comboT / 3.2, 0, 1)), 2, C.bl); }
  x += 30;
  if (G.buff) { txt(DROP_NAME[G.buff], x, 2, C.bl); txt(G.buffT.toFixed(1) + "S", x, 8, C.bl); }
  // right side
  heartRow(W - 12, 5, G.lives, G.maxLives, "r");
  const px0 = W - 12 - Math.min(8, Math.max(G.lives, G.maxLives)) * 6 - 36;
  const dr = G.p.dashCd <= 0 ? 1 : 1 - G.p.dashCd / 1.1;
  txt("DASH", px0 - 26, 2, C.gy);
  R(px0 - 26, 9, 18, 3, C.nv); R(px0 - 26, 9, Math.round(18 * clamp(dr, 0, 1)), 3, dr >= 1 ? C.wh : C.la);
  txt("PULSE", px0, 2, C.gy);
  const r = G.p.pulseCd <= 0 ? 1 : 1 - G.p.pulseCd / G.S.pulseCd;
  R(px0, 9, 28, 3, C.nv); R(px0, 9, Math.round(28 * clamp(r, 0, 1)), 3, r >= 1 ? C.bl : C.la);
  const boss = G.foes.find(f => FOE[f.type].boss);
  if (boss && boss.born > 0.8) {
    const bw = 160, bx = W / 2 - bw / 2;
    txt(FOE[boss.type].name, W / 2, 18, C.rd, 1, "c");
    R(bx, 25, bw, 3, C.pl); R(bx, 25, Math.round(bw * Math.max(0, boss.hp / boss.maxhp)), 3, C.rd);
  }
}
