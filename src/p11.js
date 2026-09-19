/* ================================================================
   Settings
   ================================================================ */
const SETTING_ROWS = [
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
  {k: "rumble",  n: "CONTROLLER RUMBLE", type: "bool"},
  {k: "haunt",   n: "HAUNTING",        type: "opt", opts: ["OFF", "SUBTLE", "FULL"], hidden: () => !meta.hauntSeen}
];
const visibleSettings = () => SETTING_ROWS.filter(r => !r.hidden || !r.hidden());
function settingValue(r) {
  const v = meta.settings[r.k];
  if (r.type === "num") { const n = v == null ? 8 : v; return "[" + "|".repeat(n) + ".".repeat(r.max - n) + "] " + n; }
  if (r.type === "bool") return v === false ? "OFF" : "ON";
  if (r.k === "haunt" && v == null) return r.opts[2];
  return r.opts[v == null ? 0 : v] || r.opts[0];
}
function changeSetting(r, dir) {
  const s = meta.settings;
  if (r.type === "num") s[r.k] = clamp((s[r.k] == null ? 8 : s[r.k]) + dir, r.min, r.max);
  else if (r.type === "bool") s[r.k] = s[r.k] === false;
  else { const n = r.opts.length, cur = s[r.k] == null ? (r.k === "haunt" ? 2 : 0) : s[r.k]; s[r.k] = ((cur + dir) % n + n) % n; }
  applyVolumes(); saveMeta();
  sfx.move();
  if (r.k === "effects" || r.k === "crt" || r.k === "curve" || r.k === "tint") fxGlitch(0.4);
  if (r.k === "rumble" && s.rumble) padRumble(0.6, 0.4, 150);
}
function drawSettingRows(sc, y0) {
  visibleSettings().forEach((r, i) => {
    const y = y0 + i * 15;
    const s = btn(sc, null, 44, y, 296, 12, () => changeSetting(r, 1), {col: C.wh, dim: C.nv});
    txt(r.n, 50, y + 4, s ? C.k : C.lg);
    txt((s ? "< " : "") + settingValue(r) + (s ? " >" : ""), 334, y + 4, s ? C.k : C.bl, 1, "r");
  });
}
// the same list, opened from the pause menu without leaving the fight
function drawPauseSettings(sc) {
  L.globalAlpha = 0.86; R(0, 0, W, H, C.k); L.globalAlpha = 1;
  title("SETTINGS", 10, C.bl);
  beginItems(sc);
  drawSettingRows(sc, 32);
  btn(sc, "BACK", W / 2 - 30, 32 + visibleSettings().length * 15 + 4, 60, 12, () => { sc.pauseSettings = false; sc.sel = 2; }, {col: C.gy});
  endItems(sc);
  txt("LEFT / RIGHT TO CHANGE  ~  ESC TO GO BACK", W / 2, 229, C.gy, 1, "c");
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
    const y2 = 32 + visibleSettings().length * 15 + 4;
    if (window.rpToggleFullscreen) btn(this, "FULLSCREEN: " + (meta.settings.fullscreen ? "ON" : "OFF"), 44, y2, 144, 12, () => toggleFullscreen(), {col: C.wh, dim: C.nv});
    btn(this, "BACK", window.rpToggleFullscreen ? 196 : 162, y2, 60, 12, () => this.back(), {col: C.gy});
    endItems(this);
    txt("LEFT / RIGHT TO CHANGE  ~  ESC TO GO BACK", W / 2, 229, C.gy, 1, "c");
  }
};
