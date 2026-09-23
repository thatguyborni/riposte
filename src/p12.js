/* ================================================================
   Training room — teaches the moves one at a time, and checks you did them
   ================================================================ */
const ctl = (kb, pad, tch) => PAD.connected ? pad : (tch && isTouch() ? tch : kb);
const TRAIN_STEPS = [
  {t: () => ctl("MOVE AROUND WITH W A S D.", "MOVE AROUND WITH THE LEFT STICK.", "PUT YOUR LEFT THUMB DOWN ANYWHERE ON THE LEFT AND DRAG TO MOVE."), done: g => g.trainMoved > 140},
  {t: () => ctl("YOUR SHIELD FOLLOWS THE MOUSE. SWING IT ALL THE WAY AROUND YOU.", "AIM THE SHIELD WITH THE RIGHT STICK. SWING IT ALL THE WAY AROUND.", "DRAG YOUR RIGHT THUMB ON THE RIGHT SIDE TO AIM THE SHIELD. SWING IT ALL THE WAY AROUND."),
   done: g => g.trainSwing > TAU * 1.2},
  {t: () => "A SHOT IS COMING. POINT YOUR SHIELD AT IT TO CATCH IT.", setup: g => trainSpawn("sentry", 0.7), done: g => g.parries >= 1},
  {t: () => "CAUGHT SHOTS FLY BACK AND HUNT THE NEAREST ENEMY. THEIR BULLETS ARE YOUR ONLY WEAPON. FINISH IT.",
   setup: g => { if (!g.foes.length) trainSpawn("sentry", 0.7); }, done: g => g.kills >= 1},
  {t: () => "PERFECT CATCH: KEEP THE SHIELD AWAY, LET THE SHOT COME ALL THE WAY IN, THEN SNAP ONTO IT ON THE WHITE INNER LINE. DO IT TWICE.",
   hint: "TIME SLOWS DOWN WHILE A SHOT IS CLOSE. WAIT FOR THE LINE TO LIGHT UP, THEN TURN.",
   slow: true, setup: g => { g.foes = []; g.bullets = []; trainSpawn("sentry", 0.5); }, done: g => g.perfects >= 2},
  {t: () => ctl("TOO MUCH COMING AT ONCE? PRESS SPACE TO PULSE. IT CATCHES EVERYTHING CLOSE TO YOU.", "TOO MUCH COMING AT ONCE? PULL RT TO PULSE. IT CATCHES EVERYTHING CLOSE TO YOU.", "TOO MUCH COMING AT ONCE? TAP PULSE. IT CATCHES EVERYTHING CLOSE TO YOU."),
   setup: g => { trainSpawn("spreader", 0.7); trainSpawn("spreader", 0.7); g.p.pulseCd = 0; }, done: g => g.pulses >= 1},
  {t: () => ctl("PRESS SHIFT TO DASH. NOTHING CAN HIT YOU MID-DASH.", "PULL LT (OR PRESS A) TO DASH. NOTHING CAN HIT YOU MID-DASH.", "TAP DASH. NOTHING CAN HIT YOU MID-DASH."), done: g => g.dashes >= 1},
  {t: () => "AMBER ENEMIES WEAR A ROTATING PLATE THAT THROWS YOUR SHOTS BACK. HIT THROUGH THE GAP, OR BOUNCE A SHOT OFF A WALL INTO THEIR BACK.",
   setup: g => { g.foes = []; g.bullets = []; g.kills = 0; trainSpawn("armor", 0.7); }, done: g => g.kills >= 1 && !g.foes.length}
];
function trainSpawn(type, diff) {
  G.diff = diff;
  const a = rand() * TAU;
  const f = spawnFoe(type, {x: ACX + Math.cos(a) * 110, y: ACY + Math.sin(a) * 70});
  f.want = 110;
  return f;
}
const TrainingScene = {
  enter() {
    newCombat({mode: "training", pal: "grid", lives: 3, maxLives: 3});
    Object.assign(G, {trainMoved: 0, trainSwing: 0, parries: 0, pulses: 0, dashes: 0, step: -1, stepT: 0, lastAim: G.p.aim, lastX: G.p.x, lastY: G.p.y});
    this.done = 0;
    this.next();
    music("map");
  },
  next() {
    G.step++;
    G.stepT = 0;
    if (G.step >= TRAIN_STEPS.length) {
      this.done = 2.2;
      banner("TRAINING COMPLETE", C.li, 2);
      seq([523, 659, 784, 1047], 80, "square", 0.14, 0.2);
      if (!meta.tutorialDone) { meta.tutorialDone = true; saveMeta(); }
      unlockAch("trained");
      return;
    }
    const st = TRAIN_STEPS[G.step];
    if (st.setup) st.setup(G);
    if (G.step > 0) { sfx.pick(); fxGlitch(0.25); }
  },
  update(dt) {
    if (G.paused) return;
    const p = G.p;
    G.trainMoved += Math.hypot(p.x - G.lastX, p.y - G.lastY); G.lastX = p.x; G.lastY = p.y;
    let da = Math.abs(((p.aim - G.lastAim + Math.PI * 3) % TAU) - Math.PI); G.trainSwing += da; G.lastAim = p.aim;
    G.lives = 3;
    // the perfect step: the world slows right down while a shot is in the zone, so the timing is visible
    const st0 = TRAIN_STEPS[G.step];
    if (st0 && st0.slow && !G.over) {
      const close = G.bullets.some(b => !b.friend && Math.hypot(b.x - G.p.x, b.y - G.p.y) < 34 && ((b.x - G.p.x) * b.vx + (b.y - G.p.y) * b.vy) < 0);
      G.slowT = close ? 0.3 : 0;
    }
    combatTick(dt);
    G.stepT += dt;
    if (this.done > 0) { this.done -= dt; if (this.done <= 0) go(backTarget()); return; }
    const st = TRAIN_STEPS[G.step];
    if (st && st.done(G)) this.next();
    // keep something to practise on
    if (st && st.setup && !G.foes.length && G.step >= 2 && G.step !== 3 && G.step !== 7) st.setup(G);
  },
  draw() {
    drawCombat({noHud: true});
    R(0, 0, W, 15, C.k); R(0, 14, W, 1, C.nv);
    txt("TRAINING", 12, 5, C.bl);
    for (let i = 0; i < TRAIN_STEPS.length; i++) R(70 + i * 9, 6, 6, 3, i < G.step ? C.li : i === G.step ? C.wh : C.nv);
    txt(ctl("ENTER: SKIP STEP  ~  ESC: MENU", "START: MENU", "PAUSE: MENU AND SKIP STEP"), W - 12, 5, C.gy, 1, "r");
    const st = TRAIN_STEPS[G.step];
    if (st && !this.done) {
      const lines = wrap(st.t(), 330);
      const hint = st.hint && G.stepT > 14 ? wrap("TIP: " + st.hint, 330) : [];
      const h = (lines.length + hint.length) * 8 + 10;
      panel(20, 232 - h, 344, h, C.bl);
      lines.forEach((l, i) => txt(l, W / 2, 237 - h + i * 8, C.wh, 1, "c"));
      hint.forEach((l, i) => txt(l, W / 2, 237 - h + (lines.length + i) * 8, C.ye, 1, "c"));
    }
    this.items = [];
    if (G.paused) drawPause(this, "LEAVE TRAINING", () => go(backTarget()), this.done ? null : {label: "SKIP STEP", act: () => { G.paused = false; this.next(); }});
  },
  key(k) {
    if (!G.paused && k === "enter" && !this.done) { this.next(); return true; }
    return combatKey(this, k);
  },
  back() {
    if (G.paused && this.pauseSettings) { this.pauseSettings = false; this.sel = 2; }
    else if (!G.paused) { G.paused = true; this.sel = 0; }
    else G.paused = false;
  }
};
