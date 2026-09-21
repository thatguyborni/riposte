/* ================================================================
   Settings
   ================================================================ */
const SETTING_ROWS = [
  {k: "diff",    n: "DIFFICULTY",      type: "lvl", opts: ["VERY EASY", "EASY", "NORMAL", "HARD", "VERY HARD"], hidden: () => inCombat()},
  {k: "vol",     n: "MASTER VOLUME",   type: "num", min: 0, max: 10},
  {k: "musVol",  n: "MUSIC VOLUME",    type: "num", min: 0, max: 10},
  {k: "sfxVol",  n: "EFFECTS VOLUME",  type: "num", min: 0, max: 10},
  {k: "sound",   n: "SOUND",           type: "opt", opts: ["OFF", "EFFECTS ONLY", "MUSIC + EFFECTS"]},
  {k: "crt",     n: "CRT SCREEN",      type: "bool"},
  {k: "curve",   n: "SCREEN CURVE",    type: "opt", opts: ["FLAT", "LOW", "CLASSIC", "HEAVY"]},
  {k: "phosphor",n: "PHOSPHOR TRAILS", type: "bool"},
  {k: "tint",    n: "COLOUR",          type: "opt", opts: ["FULL COLOUR", "AMBER MONO", "GREEN MONO", "GREYSCALE"]},
  {k: "effects", n: "GLITCH EFFECTS",  type: "opt", opts: ["OFF", "LOW", "FULL"]},
  {k: "shake",   n: "SCREEN SHAKE",    type: "bool"},
  {k: "rumble",  n: "RUMBLE / VIBRATION", type: "bool"},
  {k: "taim",    n: "TOUCH AIM",       type: "opt", opts: ["ASSIST", "MANUAL"], hidden: () => !COARSE},
  {k: "tsize",   n: "TOUCH BUTTONS",   type: "opt", opts: ["SMALL", "NORMAL", "LARGE"], hidden: () => !COARSE},
  {k: "tfs",     n: "AUTO FULLSCREEN", type: "bool", hidden: () => !COARSE || !document.fullscreenEnabled},
  {k: "haunt",   n: "HAUNTING",        type: "opt", opts: ["OFF", "SUBTLE", "FULL"], hidden: () => !meta.hauntSeen}
];
const visibleSettings = () => SETTING_ROWS.filter(r => !r.hidden || !r.hidden());
function settingValue(r) {
  const v = meta.settings[r.k];
  if (r.type === "num") { const n = v == null ? 8 : v; return "[" + "|".repeat(n) + ".".repeat(r.max - n) + "] " + n; }
  if (r.type === "bool") return v === false ? "OFF" : "ON";
  if (r.type === "lvl") { const n = v == null ? 2 : v; return "[" + "|".repeat(n + 1) + ".".repeat(r.opts.length - n - 1) + "] " + r.opts[n]; }
  if (r.k === "haunt" && v == null) return r.opts[2];
  return r.opts[v == null ? 0 : v] || r.opts[0];
}
function changeSetting(r, dir) {
  const s = meta.settings;
  if (r.type === "num") s[r.k] = clamp((s[r.k] == null ? 8 : s[r.k]) + dir, r.min, r.max);
  else if (r.type === "lvl") s[r.k] = clamp((s[r.k] == null ? 2 : s[r.k]) + dir, 0, r.opts.length - 1);
  else if (r.type === "bool") s[r.k] = s[r.k] === false;
  else { const n = r.opts.length, cur = s[r.k] == null ? (r.k === "haunt" ? 2 : 0) : s[r.k]; s[r.k] = ((cur + dir) % n + n) % n; }
  applyVolumes(); saveMeta();
  sfx.move();
  if (r.k === "effects" || r.k === "crt" || r.k === "curve" || r.k === "tint") fxGlitch(0.4);
  if (r.k === "rumble" && s.rumble) padRumble(0.6, 0.4, 150);
}
// more rows (phones get a few extra) squeeze a little closer so everything still fits
const settingGap = () => visibleSettings().length > 12 ? Math.max(11, Math.floor(184 / visibleSettings().length)) : 15;
function settingsEnd(y0) { return y0 + visibleSettings().length * settingGap() + 4; }
function drawSettingRows(sc, y0) {
  const gap = settingGap();
  visibleSettings().forEach((r, i) => {
    const y = y0 + i * gap;
    // clicking the left half of a number row turns it down, the right half turns it up
    const bar = r.type === "num" || r.type === "lvl";
    const s = btn(sc, null, 44, y, 296, Math.min(12, gap - 1), () => changeSetting(r, bar && menuClickX != null && menuClickX < 192 ? -1 : 1), {col: C.wh, dim: C.nv});
    txt(r.n, 50, y + 4, s ? C.k : C.lg);
    txt((s ? "< " : "") + settingValue(r) + (s ? " >" : ""), 334, y + 4, s ? C.k : C.bl, 1, "r");
    if (bar && isTouch()) { txt("-", 38, y + 4, C.gy, 1, "c"); txt("+", 346, y + 4, C.gy, 1, "c"); }
  });
}
const settingsHint = () => ctl("LEFT / RIGHT TO CHANGE  ~  ESC TO GO BACK", "LEFT / RIGHT TO CHANGE  ~  B TO GO BACK", "TAP A ROW TO CHANGE IT  ~  LEFT HALF OF A BAR TURNS IT DOWN");
// the same list, opened from the pause menu without leaving the fight
function drawPauseSettings(sc) {
  L.globalAlpha = 0.86; R(0, 0, W, H, C.k); L.globalAlpha = 1;
  title("SETTINGS", 10, C.bl);
  beginItems(sc);
  drawSettingRows(sc, 32);
  const y2 = settingsEnd(32);
  btn(sc, "BACK", W / 2 - 30, y2, 60, 12, () => { sc.pauseSettings = false; sc.sel = 2; }, {col: C.gy});
  endItems(sc);
  if (y2 + 12 < 227) txt(settingsHint(), W / 2, 229, C.gy, 1, "c");
}
const SettingsScene = {
  back() { go(this.from || TitleScene); },
  enter(from) { this.from = from && from.draw ? from : null; music("map"); },
  key(k) {
    const r = visibleSettings()[this.sel];
    if (!r) return false;
    if (k === "arrowleft" || k === "a") { changeSetting(r, -1); return true; }
    if (k === "arrowright" || k === "d") { changeSetting(r, 1); return true; }
    return false;
  },
  draw() {
    menuBg(PALS.grid);
    title("SETTINGS", 10, C.bl);
    beginItems(this);
    drawSettingRows(this, 32);
    const y2 = settingsEnd(32);
    // the program has its own fullscreen switch; phone browsers get one too
    const fsBtn = window.rpToggleFullscreen || (COARSE && document.fullscreenEnabled);
    const fsOn = window.rpToggleFullscreen ? meta.settings.fullscreen : !!document.fullscreenElement;
    if (fsBtn) btn(this, "FULLSCREEN: " + (fsOn ? "ON" : "OFF"), 44, y2, 144, 12, () => toggleFullscreen(), {col: C.wh, dim: C.nv});
    btn(this, "BACK", fsBtn ? 196 : 162, y2, 60, 12, () => this.back(), {col: C.gy});
    endItems(this);
    if (y2 + 12 < 227) txt(settingsHint(), W / 2, 229, C.gy, 1, "c");
  }
};
