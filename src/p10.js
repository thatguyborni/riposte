/* ================================================================
   Controller support (Xbox / PlayStation / generic, via Gamepad API)
   Left stick move · right stick aim · RT/RB pulse · LT/LB dash
   A confirm · B back · Start pause · D-pad / stick for menus
   ================================================================ */
const PAD = {connected: false, lx: 0, ly: 0, rx: 0, ry: 0, prev: {}, useAim: false, navT: 0, navDir: null, name: ""};

function padRumble(strong, weak, ms) {
  if (!PAD.connected || meta.settings.rumble === false) return;
  try {
    const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(p => p && p.connected);
    if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect)
      gp.vibrationActuator.playEffect("dual-rumble", {duration: ms || 120, strongMagnitude: strong || 0.5, weakMagnitude: weak || 0.3});
  } catch (e) {}
}

function dispatchKey(k) {
  audioInit(); lastInput = T;
  if (k === "escape" && scene && scene.back && !(scene.key && scene.captureKeys)) { scene.back(); return; }
  if (scene && scene.key && scene.key(k)) return;
  if (scene) menuKey(scene, k);
}

function pollPad(dt) {
  let gp = null;
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) { gp = p; break; }
  } catch (e) {}
  if (!gp) {
    if (PAD.connected) { PAD.connected = false; PAD.useAim = false; toast("CONTROLLER DISCONNECTED", C.gy); }
    return;
  }
  if (!PAD.connected) { PAD.connected = true; PAD.name = gp.id || ""; toast("CONTROLLER CONNECTED", C.li); }
  const dz = v => (Math.abs(v) < 0.2 ? 0 : v);
  PAD.lx = dz(gp.axes[0] || 0); PAD.ly = dz(gp.axes[1] || 0);
  PAD.rx = dz(gp.axes[2] || 0); PAD.ry = dz(gp.axes[3] || 0);
  const btn = i => {
    const b = gp.buttons[i];
    return !!(b && (b.pressed || b.value > 0.45));
  };
  const cur = {a: btn(0), b: btn(1), x: btn(2), y: btn(3), lb: btn(4), rb: btn(5), lt: btn(6), rt: btn(7),
    back: btn(8), start: btn(9), up: btn(12), down: btn(13), left: btn(14), right: btn(15)};
  PAD.cur = cur;
  const hit = k => cur[k] && !PAD.prev[k];
  const anyInput = Object.values(cur).some(Boolean) || PAD.lx || PAD.ly || PAD.rx || PAD.ry;
  if (anyInput) lastInput = T;
  if (Math.hypot(PAD.rx, PAD.ry) > 0.35) PAD.useAim = true;

  const fighting = inCombat() && G && !G.paused && !G.over;
  if (fighting) {
    if (hit("rt") || hit("rb")) doPulse();
    if (hit("lt") || hit("lb") || hit("a")) doDash();
    if (hit("start")) dispatchKey("p");
  } else if (!modalOpen) {
    // menus: d-pad or left stick, with key-repeat (walkable rooms read the stick themselves)
    let dir = null;
    if (scene && scene.walk && !(cur.up || cur.down || cur.left || cur.right)) { PAD.navDir = null; }
    else
    if (cur.up || PAD.ly < -0.5) dir = "arrowup";
    else if (cur.down || PAD.ly > 0.5) dir = "arrowdown";
    else if (cur.left || PAD.lx < -0.5) dir = "arrowleft";
    else if (cur.right || PAD.lx > 0.5) dir = "arrowright";
    if (dir) {
      if (dir !== PAD.navDir) { PAD.navDir = dir; PAD.navT = 0.34; dispatchKey(dir); }
      else { PAD.navT -= dt; if (PAD.navT <= 0) { PAD.navT = 0.11; dispatchKey(dir); } }
    } else PAD.navDir = null;
    if (hit("a") || hit("start")) dispatchKey("enter");
    if (hit("b") || hit("back")) dispatchKey("escape");
    if (hit("y") && scene === RunMap) dispatchKey("tab");
    if (hit("lb") && scene && scene.key) dispatchKey("q");
    if (hit("rb") && scene && scene.key) dispatchKey("e");
  }
  PAD.prev = cur;
}
