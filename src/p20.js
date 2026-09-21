/* ================================================================
   Phones and tablets
   Twin thumb sticks and buttons in combat, the page fitted to the
   screen (notches, portrait, fullscreen), and the small things that
   differ on touch: sound unlock, pausing when the app is hidden,
   vibration.
   ================================================================ */
const COARSE = (() => { try { return matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } })();
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let usedKeyboard = false;
// touch mode follows the last thing the player used: a tap switches it on, a key or the mouse switches it off
function isTouch() { return !PAD.connected && (lastPointerTouch || (COARSE && !usedKeyboard && !mouseUsed)); }
let mouseUsed = false;
const isStandalone = () => { try { return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true; } catch (e) { return false; } };
if (COARSE) document.body.classList.add("touch");

/* ---------------- layout, in CSS pixels over the game screen ---------------- */
const SAFE = {l: 0, r: 0, t: 0, b: 0};
function readSafe() {
  const d = document.getElementById("safe");
  if (!d) return;
  const cs = getComputedStyle(d);
  SAFE.t = parseFloat(cs.paddingTop) || 0; SAFE.r = parseFloat(cs.paddingRight) || 0;
  SAFE.b = parseFloat(cs.paddingBottom) || 0; SAFE.l = parseFloat(cs.paddingLeft) || 0;
}
readSafe();
window.addEventListener("resize", readSafe);
window.addEventListener("orientationchange", () => setTimeout(readSafe, 300));

let TLO = null, TLO_KEY = "";
function touchLayout() {
  const r = screenCv.getBoundingClientRect();
  const key = r.width + "x" + r.height + ":" + S_OX + ":" + DPR + ":" + SAFE.l + SAFE.r + SAFE.b + ":" + (meta.settings.tsize || 1);
  if (TLO && key === TLO_KEY) return TLO;
  const w = r.width, h = r.height, gutter = Math.max(0, S_OX / DPR);
  const big = [0.85, 1, 1.2][meta.settings.tsize == null ? 1 : meta.settings.tsize] || 1;
  const B = clamp(Math.min(w, h) * 0.17, 52, 96) * big;          // pulse button diameter
  const m = Math.max(10, B * 0.16);
  const rFree = gutter - SAFE.r, lFree = gutter - SAFE.l;
  const inR = rFree >= B + 8;                                      // there's a black bar beside the picture to use
  const px = inR ? w - SAFE.r - rFree / 2 : w - SAFE.r - m - B / 2;
  const py = h - SAFE.b - m - B / 2;
  const pulse = {id: "pulse", x: px, y: py, r: B / 2, label: "PULSE", col: C.bl};
  const dash = inR ? {id: "dash", x: px, y: py - B * 1.12, r: B * 0.4, label: "DASH", col: C.li}
                   : {id: "dash", x: px - B * 1.02, y: py - B * 0.5, r: B * 0.4, label: "DASH", col: C.li};
  const ps = B * 0.46;
  const pause = {id: "pause", x: inR ? w - SAFE.r - rFree / 2 : w - SAFE.r - m - ps / 2, y: SAFE.t + m + ps / 2, r: ps / 2, label: "", col: C.lg};
  // walking around (the back room): USE where PULSE sits, EXIT where pause sits
  const use = {id: "use", x: pulse.x, y: pulse.y, r: pulse.r, label: "USE", col: C.ye};
  const exit = {id: "exit", x: pause.x, y: pause.y, r: pause.r, label: "", col: C.lg};
  const R = clamp(Math.min(w, h) * 0.13, 38, 70) * big;             // stick radius
  TLO = {w, h, B, m, R, gutter, buttons: [pulse, dash, pause], walkButtons: [use, exit], split: w * 0.45,
    moveHint: {x: lFree >= R * 2 + 8 ? SAFE.l + lFree / 2 : SAFE.l + m + R, y: h - SAFE.b - m - R},
    aimHint: {x: Math.min(px - B * 1.9, w * 0.72), y: h - SAFE.b - m - R}};
  TLO_KEY = key;
  return TLO;
}

/* ---------------- the sticks and buttons ---------------- */
const TCH = {move: null, aim: null, btn: {}, press: {}, mx: 0, my: 0, aimA: null, aimT: -9, usedMove: false, usedAim: false};
function tPos(e) { const r = screenCv.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; }
function touchCombatOn() {
  return isTouch() && inCombat() && G && !G.paused && !G.over && G.mode !== "attract" && !portraitBlocked();
}
// rooms you walk around in (the back room): a stick, USE and EXIT
function touchWalkOn() {
  return isTouch() && scene && scene.walk && !scene.count && !modalOpen && !portraitBlocked();
}
function touchMode() { return touchCombatOn() ? "fight" : touchWalkOn() ? "walk" : null; }
function touchButtons(mode) { const Lo = touchLayout(); return mode === "walk" ? Lo.walkButtons : Lo.buttons; }
function touchButtonAct(id) {
  if (id === "pulse") doPulse();
  else if (id === "dash") doDash();
  else if (id === "pause") dispatchKey("p");
  else if (id === "use") dispatchKey("enter");
  else if (id === "exit") { if (scene && scene.back) scene.back(); }
}
function touchDown(e, mode) {
  const p = tPos(e), Lo = touchLayout();
  try { screenCv.setPointerCapture(e.pointerId); } catch (er) {}
  for (const b of touchButtons(mode)) {
    if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r + Lo.m * 0.6) {
      TCH.btn[e.pointerId] = b.id; TCH.press[b.id] = T; buzz(8); touchButtonAct(b.id); return;
    }
  }
  if (mode === "walk") {
    // drag anywhere to walk; a tap without dragging walks over to what you tapped (and uses it)
    if (!TCH.move) TCH.move = {id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y, walk: true, moved: 0, lo: toLo(e)};
    return;
  }
  if (p.x < Lo.split) { if (!TCH.move) { TCH.move = {id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y}; TCH.usedMove = true; } }
  else if (!TCH.aim) { TCH.aim = {id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y, t0: T, moved: 0}; }
  sticks();
}
function touchMove(e) {
  const p = tPos(e), R = touchLayout().R;
  for (const s of [TCH.move, TCH.aim]) {
    if (!s || s.id !== e.pointerId) continue;
    s.x = p.x; s.y = p.y;
    const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy);
    if (s.walk || s === TCH.aim) s.moved = Math.max(s.moved, d);
    if (s === TCH.move && d > R) { s.ox = s.x - dx / d * R; s.oy = s.y - dy / d * R; }   // the stick follows a wandering thumb
  }
  sticks();
}
function touchUp(e) {
  if (TCH.btn[e.pointerId]) { delete TCH.btn[e.pointerId]; return; }
  if (TCH.move && TCH.move.id === e.pointerId) {
    const s = TCH.move; TCH.move = null;
    if (s.walk && s.moved < 12 && e.type === "pointerup" && scene && touchWalkOn()) {
      if (scene.click) scene.click(s.lo.x, s.lo.y);
    }
  }
  if (TCH.aim && TCH.aim.id === e.pointerId) {
    const a = TCH.aim; TCH.aim = null;
    if (e.type === "pointerup" && a.moved < 9 && T - a.t0 < 0.25 && touchCombatOn()) doPulse();   // a quick tap on the right side pulses too
  }
  sticks();
}
function touchReset() { TCH.move = TCH.aim = null; TCH.btn = {}; TCH.mx = TCH.my = 0; }
function sticks() {
  const R = touchLayout().R;
  if (TCH.move && !(TCH.move.walk && TCH.move.moved < 12)) {
    let dx = (TCH.move.x - TCH.move.ox) / R, dy = (TCH.move.y - TCH.move.oy) / R;
    const m = Math.hypot(dx, dy);
    if (m < 0.14) dx = dy = 0; else if (m > 1) { dx /= m; dy /= m; }
    TCH.mx = dx; TCH.my = dy;
  } else TCH.mx = TCH.my = 0;
  if (TCH.aim) {
    const dx = TCH.aim.x - TCH.aim.ox, dy = TCH.aim.y - TCH.aim.oy;
    if (Math.hypot(dx, dy) > 10) { TCH.aimA = Math.atan2(dy, dx); TCH.aimT = T; TCH.usedAim = true; }
  }
}
// where the shield points on touch: the right thumb, else (with assist) the closest incoming shot
function touchAim(p) {
  if (TCH.aim && TCH.aimA != null) { p.aim = TCH.aimA; return; }
  if (meta.settings.taim === 1 || T - TCH.aimT < 0.5) return;
  const nb = nearestHostile(80);
  if (nb) p.aim = Math.atan2(nb.y - p.y, nb.x - p.x);
}

/* ---------------- drawing the controls (a flat layer over the CRT) ---------------- */
const tuiCv = document.getElementById("tui"), tctx = tuiCv ? tuiCv.getContext("2d") : null;
let tuiDirty = false;
function tCircle(x, y, r, fill, stroke, lw) {
  tctx.beginPath(); tctx.arc(x, y, r, 0, TAU);
  if (fill) { tctx.fillStyle = fill; tctx.fill(); }
  if (stroke) { tctx.lineWidth = lw || 2; tctx.strokeStyle = stroke; tctx.stroke(); }
}
function tText(s, x, y, px, col) {
  tctx.font = Math.round(px) + 'px "Press Start 2P", monospace';
  tctx.textAlign = "center"; tctx.textBaseline = "middle"; tctx.fillStyle = col;
  tctx.fillText(s, x, y + 1);
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
}
let tuiMode = null;
function drawTouchUI() {
  if (!tctx) return;
  const mode = touchMode();
  if (mode !== tuiMode) { touchReset(); tuiMode = mode; }
  if (!mode) {
    if (tuiDirty) { tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tuiCv.width, tuiCv.height); tuiDirty = false; }
    return;
  }
  const Lo = touchLayout(), d = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.round(Lo.w * d), ch = Math.round(Lo.h * d);
  if (tuiCv.width !== cw || tuiCv.height !== ch) { tuiCv.width = cw; tuiCv.height = ch; }
  tctx.setTransform(d, 0, 0, d, 0, 0); tctx.clearRect(0, 0, Lo.w, Lo.h); tuiDirty = true;
  if (mode === "walk") { drawWalkUI(Lo); return; }
  const p = G.p, R = Lo.R;
  // move stick
  if (TCH.move) {
    const s = TCH.move;
    tCircle(s.ox, s.oy, R, "rgba(5,6,12,0.28)", "rgba(255,241,232,0.35)", 2);
    tCircle(s.ox + TCH.mx * R, s.oy + TCH.my * R, R * 0.42, hexA(C.bl, 0.55), hexA(C.bl, 0.9), 2);
  } else if (!TCH.usedMove) {
    tCircle(Lo.moveHint.x, Lo.moveHint.y, R, null, "rgba(255,241,232,0.16)", 2);
    tText("MOVE", Lo.moveHint.x, Lo.moveHint.y, 9, "rgba(255,241,232,0.3)");
  }
  // aim stick
  if (TCH.aim) {
    const s = TCH.aim;
    tCircle(s.ox, s.oy, R, "rgba(5,6,12,0.28)", "rgba(255,236,39,0.35)", 2);
    if (TCH.aimA != null && s.moved > 10) {
      const kx = s.ox + Math.cos(TCH.aimA) * R * 0.7, ky = s.oy + Math.sin(TCH.aimA) * R * 0.7;
      tctx.lineWidth = 3; tctx.strokeStyle = hexA(C.ye, 0.6);
      tctx.beginPath(); tctx.moveTo(s.ox, s.oy); tctx.lineTo(kx, ky); tctx.stroke();
      tCircle(kx, ky, R * 0.3, hexA(C.ye, 0.5), hexA(C.ye, 0.9), 2);
    }
  } else if (!TCH.usedAim) {
    tCircle(Lo.aimHint.x, Lo.aimHint.y, R, null, "rgba(255,236,39,0.16)", 2);
    tText("AIM", Lo.aimHint.x, Lo.aimHint.y, 9, "rgba(255,236,39,0.32)");
  }
  // buttons
  for (const b of Lo.buttons) {
    const down = T - (TCH.press[b.id] || -9) < 0.12;
    let cd = 0;
    if (b.id === "pulse" && p.pulseCd > 0) cd = p.pulseCd / Math.max(0.01, G.S.pulseCd);
    if (b.id === "dash" && p.dashCd > 0) cd = p.dashCd / 1.1;
    const col = cd > 0 ? C.gy : b.col;
    tCircle(b.x, b.y, b.r, down ? hexA(b.col, 0.55) : "rgba(5,6,12,0.42)", hexA(col, cd > 0 ? 0.5 : 0.85), 2.5);
    if (cd > 0) {     // the ring fills back up as it recharges
      tctx.lineWidth = 3; tctx.strokeStyle = hexA(b.col, 0.8);
      tctx.beginPath(); tctx.arc(b.x, b.y, b.r - 4, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cd)); tctx.stroke();
    }
    if (b.id === "pause") {
      const s = b.r * 0.42;
      tctx.fillStyle = "rgba(255,241,232,0.8)";
      tctx.fillRect(b.x - s * 0.8, b.y - s, s * 0.55, s * 2); tctx.fillRect(b.x + s * 0.25, b.y - s, s * 0.55, s * 2);
    } else tText(b.label, b.x, b.y, Math.max(8, b.r * 0.3), hexA(col, cd > 0 ? 0.6 : 1));
  }
}

function drawWalkUI(Lo) {
  const R = Lo.R, s = TCH.move;
  if (s && s.moved >= 12) {
    tCircle(s.ox, s.oy, R, "rgba(5,6,12,0.28)", "rgba(255,241,232,0.35)", 2);
    tCircle(s.ox + TCH.mx * R, s.oy + TCH.my * R, R * 0.42, hexA(C.bl, 0.55), hexA(C.bl, 0.9), 2);
  }
  // USE lights up when there's something to use (or someone talking)
  const canUse = !!(scene.dialog || (scene.nearest && scene.nearest()));
  for (const b of Lo.walkButtons) {
    const down = T - (TCH.press[b.id] || -9) < 0.12, on = b.id !== "use" || canUse;
    tCircle(b.x, b.y, b.r, down ? hexA(b.col, 0.55) : "rgba(5,6,12,0.42)", hexA(on ? b.col : C.gy, on ? 0.85 : 0.5), 2.5);
    if (b.id === "exit") {                            // an X
      const k = b.r * 0.38;
      tctx.lineWidth = 3; tctx.strokeStyle = "rgba(255,241,232,0.85)";
      tctx.beginPath(); tctx.moveTo(b.x - k, b.y - k); tctx.lineTo(b.x + k, b.y + k); tctx.moveTo(b.x + k, b.y - k); tctx.lineTo(b.x - k, b.y + k); tctx.stroke();
    } else tText(scene.dialog ? "OK" : b.label, b.x, b.y, Math.max(8, b.r * 0.3), hexA(on ? b.col : C.gy, on ? 1 : 0.6));
  }
}

/* ---------------- vibration (Android; iPhones don't allow it) ---------------- */
function buzz(ms) {
  if (!isTouch() || meta.settings.rumble === false || !navigator.vibrate) return;
  try { navigator.vibrate(ms); } catch (e) {}
}

/* ---------------- portrait, fullscreen, the home screen ---------------- */
const portraitQ = (() => { try { return matchMedia("(orientation: portrait) and (pointer: coarse) and (max-width: 760px)"); } catch (e) { return null; } })();
function portraitBlocked() { return !!(portraitQ && portraitQ.matches); }
let fsTried = false;
// the first tap asks for fullscreen and sideways (Android; iPhones use Add to Home Screen instead)
function touchFirstGesture() {
  if (fsTried || !COARSE) return;
  fsTried = true;
  iosHomeHint();
  if (meta.settings.tfs === false || isStandalone() || document.fullscreenElement) return;
  goFullscreen();
}
function goFullscreen() {
  const el = document.documentElement;
  if (!el.requestFullscreen) return;
  try {
    el.requestFullscreen({navigationUI: "hide"}).then(() => {
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
    }).catch(() => {});
  } catch (e) {}
}
function iosHomeHint() {
  if (!IOS || isStandalone() || window.top !== window || !meta.flags || meta.flags.iosHint) return;
  meta.flags.iosHint = 1; saveMeta();
  setTimeout(() => toast("TIP: SHARE > ADD TO HOME SCREEN PLAYS FULL SCREEN", C.bl), 1500);
}

/* ---------------- leaving the app and coming back ---------------- */
function onHidden() {
  if (inCombat() && G && !G.over && G.mode !== "attract") G.paused = true;
  touchReset();
  try { saveMeta(); if (typeof run !== "undefined" && run) saveRun(); } catch (e) {}
  try { cloudFlush(); } catch (e) {}
  try { if (AC && AC.state === "running") AC.suspend(); } catch (e) {}
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) onHidden();
  else { try { if (AC && AC.state === "suspended") AC.resume(); } catch (e) {} }
});
window.addEventListener("pagehide", onHidden);
// iOS only lets sound start from the end of a tap
window.addEventListener("touchend", () => audioInit(), {passive: true});
// the phone site (the page that has an app manifest) keeps working offline once it has been opened
(function registerOffline() {
  try {
    if (!("serviceWorker" in navigator) || window.top !== window || !document.querySelector('link[rel="manifest"]')) return;
    if (location.protocol !== "https:" && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  } catch (e) {}
})();
if (portraitQ && portraitQ.addEventListener) portraitQ.addEventListener("change", () => { if (portraitBlocked() && inCombat() && G && !G.over) G.paused = true; });
