/* ================================================================
   Fair fights
   Enemies don't get pinned in corners, they sidestep when you crowd
   them, guardians shove you out of their space (after a warning),
   and hiding in a corner stops being safe: the corners are live.
   ================================================================ */
const WALL_M = 26;         // enemies start steering off a wall this close to it
const CORNER_BOX = 38;     // how deep into a corner counts as hiding there
const CORNER_R = 60;       // the zap covers this far from the corner point

// while an enemy decides where to go: tv = [vx, vy] it wants to move at
function steerFoe(f, base, p, dist, tv) {
  let wx = 0, wy = 0;
  if (f.x < AX0 + WALL_M) wx += AX0 + WALL_M - f.x;
  if (f.x > AX1 - WALL_M) wx -= f.x - (AX1 - WALL_M);
  if (f.y < AY0 + WALL_M) wy += AY0 + WALL_M - f.y;
  if (f.y > AY1 - WALL_M) wy -= f.y - (AY1 - WALL_M);
  if (!wx && !wy) return;
  const crowd = dist < (f.want || 90) * 0.85;       // the player is pressing in
  const k = crowd ? 4.5 : 2.2;
  tv[0] += wx * k; tv[1] += wy * k;
  if (crowd) {
    // circle round the player towards open floor, instead of backing into the wall
    const tx = -(p.y - f.y) / dist, ty = (p.x - f.x) / dist;
    const side = tx * (ACX - f.x) + ty * (ACY - f.y) >= 0 ? 1 : -1;
    if (Math.sign(f.orbit) !== side) f.orbit = (Math.abs(f.orbit) || 0.7) * side;
  }
}

const NO_DODGE = {rusher: 1, hollow: 1, mine: 1};
// after an enemy moves: sidesteps, and the guardians' personal space
function foeDefense(f, base, p, dist, dt) {
  if (G.mode === "attract" || G.mode === "training" || G.over || f.dormant) return;
  if (base.boss) { bossSpace(f, p, dist, dt); return; }
  if (NO_DODGE[f.type] || f.born < 1) return;
  if (f.dodgeCd > 0) { f.dodgeCd -= dt; return; }
  if (dist > f.r + 22) return;
  // crowded: slip sideways towards open floor
  const nx = (f.x - p.x) / dist, ny = (f.y - p.y) / dist;
  let sx = -ny, sy = nx;
  if (sx * (ACX - f.x) + sy * (ACY - f.y) < 0) { sx = -sx; sy = -sy; }
  f.vx = (sx * 0.8 + nx * 0.6) * 165; f.vy = (sy * 0.8 + ny * 0.6) * 165;
  f.dodgeCd = (f.elite ? 1.2 : 2) + rand() * 0.8;
  burst(f.x, f.y, 6, C.gy, 60, 0.25);
}

const repelWind = f => (f.p2 ? 0.42 : 0.55) * DLV().wind;
const repelRadius = f => f.r + 58;
function bossSpace(f, p, dist, dt) {
  if (f.born < 1.6) return;
  if (f.repelCd > 0) f.repelCd -= dt;
  if (f.repelT > 0) {                                   // winding up: the warning ring closes in
    f.repelT -= dt;
    if (f.repelT <= 0) bossRepel(f, p);
    return;
  }
  const close = dist < f.r + 30;
  f.crowdT = close ? (f.crowdT || 0) + dt : Math.max(0, (f.crowdT || 0) - dt * 2);
  if (f.crowdT > 0.45 && !(f.repelCd > 0)) {
    f.repelT = repelWind(f); f.crowdT = 0;
    tone(150, repelWind(f), "sawtooth", 0.09, 420);
    if (!(meta.flags && meta.flags.repelTip)) { if (meta.flags) meta.flags.repelTip = 1; floatTxt(f.x, f.y - f.r - 10, "BACK OFF", C.rd); }
  }
  // guardians don't stay pinned against a wall either
  const wall = f.x < AX0 + 22 || f.x > AX1 - 22 || f.y < AY0 + 22 || f.y > AY1 - 22;
  f.wallT = wall && dist < 90 ? (f.wallT || 0) + dt : 0;
  if (f.wallT > 1.1) {
    f.wallT = 0;
    const a = Math.atan2(ACY - f.y, ACX - f.x);
    f.vx = Math.cos(a) * 200; f.vy = Math.sin(a) * 200;
    burst(f.x, f.y, 10, C.lg, 90, 0.3);
  }
}
function bossRepel(f, p) {
  const RR = repelRadius(f);
  f.repelCd = f.p2 ? 2.4 : 3.2;
  ring(f.x, f.y, RR, C.rd, 0.4); ring(f.x, f.y, RR * 0.6, C.or, 0.3);
  burst(f.x, f.y, 24, C.rd, 170, 0.45);
  G.shake = Math.min(6, G.shake + 4);
  noise(0.3, 0.2, 500, 90); tone(110, 0.25, "square", 0.14, 50);
  // your shots crowding it get swatted out of the air
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    if (b && b.friend && Math.hypot(b.x - f.x, b.y - f.y) < RR) { burst(b.x, b.y, 3, C.or, 40, 0.2); G.bullets.splice(i, 1); }
  }
  const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1;
  if (d < RR) {
    p.vx += dx / d * 300; p.vy += dy / d * 300;
    if (p.inv <= 0) hurt();
    else floatTxt(p.x, p.y - 10, "DODGED", C.li);     // dashing through it still works
  }
}

// hiding in a corner: after a while it sparks, with a warning first
function cornerHazard(p, dt) {
  if (G.mode === "attract" || G.mode === "training" || G.over) { G.cornerT = 0; G.cornerZap = null; return; }
  const z = G.cornerZap;
  if (z) {
    z.t -= dt;
    if (z.t <= 0) {
      G.cornerZap = null; G.cornerT = 0;
      const ix = z.x < ACX ? 1 : -1, iy = z.y < ACY ? 1 : -1;
      ring(z.x, z.y, CORNER_R, C.ye, 0.35);
      burst(z.x + ix * 14, z.y + iy * 14, 30, C.ye, 150, 0.5);
      G.shake = Math.min(6, G.shake + 3);
      noise(0.35, 0.22, 4200, 900);
      if (Math.hypot(p.x - z.x, p.y - z.y) < CORNER_R && p.inv <= 0) hurt();
    }
    return;
  }
  const inCorner = (p.x < AX0 + CORNER_BOX || p.x > AX1 - CORNER_BOX) && (p.y < AY0 + CORNER_BOX || p.y > AY1 - CORNER_BOX);
  const busy = G.foes.some(f => f.type !== "mine" && !f.dormant);
  G.cornerT = inCorner && busy ? (G.cornerT || 0) + dt : Math.max(0, (G.cornerT || 0) - dt);
  if (G.cornerT > 2.4 * DLV().corner) {
    const wt = 0.9 * DLV().wind;
    G.cornerZap = {x: p.x < ACX ? AX0 : AX1, y: p.y < ACY ? AY0 : AY1, t: wt, max: wt};
    tone(880, 0.1, "square", 0.08); tone(660, 0.12, "square", 0.08, null, AC && AC.currentTime + 0.14);
    if (meta.flags && !meta.flags.cornerTip) {
      meta.flags.cornerTip = 1;
      floatTxt(clamp(p.x, 60, W - 60), clamp(p.y + (p.y < ACY ? 22 : -22), 30, H - 20), "THE CORNERS ARE LIVE", C.ye);
    }
  }
}

// warnings: a guardian winding up its shove, and a corner about to spark
function drawDefenses() {
  const blink = Math.floor(T * 10) % 2;
  for (const f of G.foes) {
    if (!(f.repelT > 0)) continue;
    const k = 1 - f.repelT / repelWind(f);
    const r = repelRadius(f) * (1 - k * 0.75) + f.r * k * 0.75;
    ringDots(f.x, f.y, repelRadius(f), blink ? C.rd : C.pl, 4);
    ringDots(f.x, f.y, r, blink ? C.or : C.rd, 3);
  }
  const z = G.cornerZap;
  if (z) {
    L.save(); L.beginPath(); L.rect(AX0, AY0, AX1 - AX0, AY1 - AY0); L.clip();
    L.globalAlpha = blink ? 0.22 : 0.1;
    L.fillStyle = C.rd; L.beginPath(); L.arc(z.x, z.y, CORNER_R, 0, TAU); L.fill();
    L.globalAlpha = 1;
    ringDots(z.x, z.y, CORNER_R, blink ? C.ye : C.rd, 3);
    const k = 1 - z.t / z.max;
    for (let i = 0; i < 6; i++) {                     // sparks crawling along both walls
      const s = (i / 6 + T * 1.7) % 1 * CORNER_R * (0.4 + k * 0.6);
      P(z.x + (z.x < ACX ? 1 : -2), z.y + (z.y < ACY ? s : -s), C.ye);
      P(z.x + (z.x < ACX ? s : -s), z.y + (z.y < ACY ? 1 : -2), C.ye);
    }
    L.restore();
  }
}
