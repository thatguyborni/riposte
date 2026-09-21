/* ================================================================
   Difficulty and the GAME MODES screen
   One setting, five steps. It scales how fast enemies fire and how
   fast their shots fly, how tough they are, how wide your shield is,
   how many lives you start with, and how much warning you get before
   a guardian's shove or a live corner. Arcade scores are multiplied to
   match, so the online boards stay fair. The daily run is always
   NORMAL, so everyone plays the same game. A descent keeps the
   difficulty it started with.
   ================================================================ */
const DIFFS = [
  {n: "VERY EASY", tag: "VE", col: C.li, diff: 0.72, hp: 0.75, arc: 1.25, lives: 2,  score: 0.25, wind: 1.6,  corner: 2,
   d: "SLOW SHOTS, A WIDE SHIELD, 2 EXTRA LIVES"},
  {n: "EASY",      tag: "E",  col: C.bl, diff: 0.86, hp: 0.9,  arc: 1.12, lives: 1,  score: 0.5,  wind: 1.3,  corner: 1.5,
   d: "SLOWER SHOTS, A WIDER SHIELD, 1 EXTRA LIFE"},
  {n: "NORMAL",    tag: "",   col: C.wh, diff: 1,    hp: 1,    arc: 1,    lives: 0,  score: 1,    wind: 1,    corner: 1,
   d: "THE GAME AS IT WAS MADE"},
  {n: "HARD",      tag: "H",  col: C.or, diff: 1.14, hp: 1.15, arc: 0.94, lives: 0,  score: 1.5,  wind: 0.85, corner: 0.8,
   d: "FASTER SHOTS, TOUGHER ENEMIES, A NARROWER SHIELD"},
  {n: "VERY HARD", tag: "VH", col: C.rd, diff: 1.28, hp: 1.3,  arc: 0.88, lives: -1, score: 2,    wind: 0.7,  corner: 0.65,
   d: "ONE LIFE LESS. EVERYTHING HITS FASTER AND HARDER."}
];
const DIFF_NORMAL = 2;
function diffLevel() { const v = meta.settings.diff; return v == null ? DIFF_NORMAL : clamp(v | 0, 0, DIFFS.length - 1); }
function setDiff(v) { meta.settings.diff = clamp(v, 0, DIFFS.length - 1); saveMeta(); sfx.move(); }
// the level a fight is played at: arcade uses the setting, a descent the level it started on, everything else NORMAL
function fightDiff(mode) {
  if (mode === "arcade") return diffLevel();
  if (mode === "run" && typeof run !== "undefined" && run && !run.daily && run.dl != null) return run.dl;
  return DIFF_NORMAL;
}
const DLV = () => DIFFS[G && G.dl != null ? G.dl : DIFF_NORMAL];
const scoreMulText = d => "X" + (d.score % 1 ? d.score.toFixed(2).replace(/0$/, "") : d.score);

/* ---------------- the slider, shared by GAME MODES and the settings row ---------------- */
function drawDiffSlider(x, y, w, lv, selected) {
  const n = DIFFS.length, sw = Math.floor((w - (n - 1) * 3) / n);
  R(x - 2, y - 2, w + 4, 12, C.ink);                // a dark strip, so the blocks read on a highlighted row too
  for (let i = 0; i < n; i++) {
    const on = i <= lv, sx = x + i * (sw + 3);
    R(sx, y, sw, 8, on ? DIFFS[i].col : C.ink);
    RO(sx, y, sw, 8, on ? DIFFS[i].col : selected ? C.gy : C.nv);
  }
  return sw;
}

/* ---------------- GAME MODES ---------------- */
const ModesScene = {
  back() { go(TitleScene); },
  enter() { music("map"); this.saved = loadRun(); this.newArmed = 0; this.sel = this.sel || 0; },
  key(k) {
    if (this.sel === 0 && (k === "arrowleft" || k === "a")) { setDiff(diffLevel() - 1); return true; }
    if (this.sel === 0 && (k === "arrowright" || k === "d")) { setDiff(diffLevel() + 1); return true; }
    return false;
  },
  // tapping a block of the slider picks that level
  click(x, y) {
    if (y < 34 || y > 44 || x < 120 || x > 372) return false;
    const sw = (252 - 12) / 5, i = Math.floor((x - 120) / (sw + 3));
    if (i >= 0 && i < DIFFS.length) { setDiff(i); this.sel = 0; }
    return true;
  },
  confirmNew() {
    if (this.newArmed && T - this.newArmed < 3) {
      this.newArmed = 0;
      run = this.saved; if (run) endRun("dead");
      this.saved = null; beginDescent();
    } else { this.newArmed = T; sfx.deny(); fxWobble(0.3); }
  },
  card(label, desc, side, y, col, act, o) {
    o = o || {};
    const s = btn(this, null, 8, y, o.w || 368, 30, act, {col, dim: C.nv});
    txt(label, 18, y + 7, s ? C.k : col, 1);
    txt(desc, 18, y + 18, s ? C.k : C.lg, 1);
    if (side) txt(side, (o.w || 368) + 2, y + 7, s ? C.k : o.sideCol || C.gy, 1, "r");
    return s;
  },
  draw() {
    menuBg(PALS.grid);
    title("GAME MODES", 8, C.li);
    beginItems(this);
    // difficulty
    const lv = diffLevel(), D = DIFFS[lv];
    const s0 = btn(this, null, 8, 28, 368, 32, () => setDiff((lv + 1) % DIFFS.length), {col: C.wh, dim: C.nv});
    txt("DIFFICULTY", 18, 36, s0 ? C.k : C.lg);
    drawDiffSlider(120, 34, 252, lv, s0);
    txt(D.n + "  ~  ARCADE SCORES " + scoreMulText(D), 18, 50, s0 ? C.k : D.col);
    txt(D.d, 372, 50, s0 ? C.k : C.gy, 1, "r");
    // the modes
    const sv = this.saved && !this.saved.daily ? this.saved : null;
    let y = 68;
    if (sv) {
      const armed = this.newArmed && T - this.newArmed < 3;
      this.card("CONTINUE DESCENT", "DEPTH " + sv.depth + "  ~  " + DIFFS[sv.dl != null ? sv.dl : DIFF_NORMAL].n, "", y, C.li, () => { run = sv; go(RunMap); }, {w: 296});
      btn(this, armed ? "SURE?" : "NEW", 308, y, 68, 30, () => this.confirmNew(), {col: armed ? C.rd : C.wh});
    } else this.card("DESCENT", "FIGHT DOWN THROUGH THE DEPTHS. MODS, CURSES, GUARDIANS.", meta.stats.bestDepth ? "DEEPEST " + meta.stats.bestDepth : "", y, C.li, beginDescent);
    y += 36;
    const dd = dailyToday();
    this.card("DAILY RUN", "ONE TRY A DAY, THE SAME SEED FOR EVERYONE. ALWAYS NORMAL.",
      dd && dd.done ? "DONE: " + dd.score : this.saved && this.saved.daily ? "IN PROGRESS" : "", y, C.pk, () => go(DailyScene, ModesScene), {sideCol: C.pk});
    y += 36;
    const newbie = !meta.tutorialDone && !meta.stats.runs && !meta.arcade.length;
    this.card("TRAINING", "LEARN THE MOVES, ONE AT A TIME.", newbie && Math.floor(T * 2) % 2 ? "START HERE" : "", y, C.bl, () => go(TrainingScene), {sideCol: C.bl});
    btn(this, "BACK", W / 2 - 40, 212, 80, 12, () => this.back(), {col: C.gy});
    endItems(this);
    if (this.newArmed && T - this.newArmed < 3) txt("THIS ABANDONS YOUR RUN. PRESS AGAIN.", W / 2, 202, C.rd, 1, "c");
    else txt(ctl("LEFT / RIGHT CHANGES THE DIFFICULTY", "LEFT / RIGHT CHANGES THE DIFFICULTY", "TAP A BLOCK TO CHANGE THE DIFFICULTY"), W / 2, 202, C.gy, 1, "c");
  }
};
