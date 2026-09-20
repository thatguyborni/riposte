/* ================================================================
   Workshop, records, codes, input, loop
   ================================================================ */
const WorkshopScene = {
  back() { go(backTarget()); },
  enter() { this.tab = this.tab || "shields"; music("map"); },
  rows() {
    if (this.tab === "shields") return Object.keys(SHIELDS).map(k => {
      const s = SHIELDS[k], own = meta.shields[k];
      if (s.secret && !own) return {n: "???", d: "SECRET. " + s.hint + ".", state: "LOCKED", col: C.gy, dis: true, act: () => {}};
      if (own) return {n: s.n, d: s.d, state: meta.shield === k ? "EQUIPPED" : "EQUIP", col: s.secret ? C.pk : C.wh,
        act: () => { meta.shield = k; saveMeta(); }};
      return {n: s.n, d: s.d, state: "@" + s.cost, col: C.wh, dis: meta.tokens < s.cost,
        act: () => { meta.tokens -= s.cost; meta.shields[k] = true; meta.shield = k; saveMeta(); sfx.pick(); toast("UNLOCKED " + s.n, C.or); }};
    });
    if (this.tab === "upgrades") return Object.keys(UPG).map(k => {
      const u = UPG[k], lv = meta.upg[k];
      if (lv >= u.max) return {n: u.n + (u.max > 1 ? " " + lv + "/" + u.max : ""), d: u.d, state: "MAXED", col: C.li, dis: true, act: () => {}};
      const c = u.cost[lv];
      return {n: u.n + (u.max > 1 ? " " + lv + "/" + u.max : ""), d: u.d, state: "@" + c, col: C.wh, dis: meta.tokens < c,
        act: () => { meta.tokens -= c; meta.upg[k]++; saveMeta(); sfx.pick(); toast(u.n + " UPGRADED", C.or); }};
    });
    return Object.keys(MOD_UNLOCK_COST).map(k => {
      const m = MODS[k], c = MOD_UNLOCK_COST[k], own = meta.unlocked.includes(k);
      if (own) return {n: m.n, d: m.d, state: "IN POOL", col: RAR_COL[m.r], dis: true, act: () => {}};
      return {n: m.n, d: m.d, state: "@" + c, col: RAR_COL[m.r], dis: meta.tokens < c,
        act: () => { meta.tokens -= c; meta.unlocked.push(k); saveMeta(); sfx.pick(); toast(m.n + " CAN NOW APPEAR IN RUNS", C.or); }};
    });
  },
  draw() {
    menuBg(PALS.foundry);
    title("WORKSHOP", 12, C.or);
    txt("TOKENS  @" + meta.tokens, W - 8, 16, C.or, 1, "r");
    beginItems(this);
    const tabs = [["shields", "SHIELDS"], ["upgrades", "UPGRADES"], ["mods", "MOD POOL"]];
    tabs.forEach(([k, l], i) => btn(this, l, 40 + i * 104, 32, 96, 12, () => { this.tab = k; }, {col: this.tab === k ? C.ye : C.lg, dim: this.tab === k ? C.ye : C.gy}));
    const rows = this.rows();
    let selRow = null;
    rows.forEach((r, i) => {
      const y = 52 + i * 15;
      const s = btn(this, null, 40, y, 304, 13, r.act, {col: r.col, dim: C.nv, disabled: !!r.dis});
      const lit = s && !r.dis;
      txt(r.n, 46, y + 4, lit ? C.k : r.col);
      txt(r.state, 338, y + 4, lit ? C.k : (r.state.startsWith("@") ? (r.dis ? C.gy : C.or) : C.lg), 1, "r");
      if (s) selRow = r;
    });
    btn(this, "BACK", W / 2 - 30, 222, 60, 12, () => this.back(), {col: C.gy});
    endItems(this);
    const shown = selRow || rows[0];
    if (shown) { R(40, 196, 304, 20, C.ink); RO(40, 196, 304, 20, C.nv); wrap(shown.d, 290).slice(0, 2).forEach((l, i) => txt(l, 47, 200 + i * 7, C.lg)); }
  }
};

const RecordsScene = {
  back() { go(backTarget()); },
  enter(o) { this.hl = o && o.hl; music("map"); },
  draw() {
    menuBg(PALS.grid);
    title("RECORDS", 8, C.bl);
    // arcade table
    panel(8, 26, 176, 142, C.bl);
    txt("ARCADE TOP 10", 96, 31, C.bl, 1, "c");
    const board = boardWithPhantom();
    if (!board.length) txt("NO SCORES YET", 96, 60, C.gy, 1, "c");
    // late in the story, for a moment, every name on the table is the same
    const allMlo = haunted(4) && scaresOn() && meta.milo !== "stay" && T % 7 < 0.22;
    board.forEach((e, i) => {
      const y = 42 + i * 12, hl = this.hl && e === this.hl && Math.floor(T * 3) % 2;
      const col = hl ? C.ye : e.ghost ? (Math.floor(T * 5) % 7 ? C.pl : C.rd) : e.friend ? C.pk : C.wh;
      txt(String(i + 1).padStart(2, " ") + ".", 16, y, C.gy);
      txt(allMlo ? "MLO" : ghostInitials(e) + (e.friend ? "*" : ""), 34, y, col);
      txt(String(e.s), 140, y, col, 1, "r");
      txt("W" + (e.w || "-"), 176, y, C.gy, 1, "r");
    });
    // descent
    panel(192, 26, 184, 142, C.li);
    txt("DESCENT", 284, 31, C.li, 1, "c");
    const st = meta.stats;
    [["RUNS", st.runs], ["ASCENSIONS", st.wins], ["DEEPEST", st.bestDepth || "-"], ["TOKENS EARNED", meta.earned]].forEach((r, i) => {
      txt(r[0], 200, 42 + i * 9, C.gy); txt(String(r[1]), 368, 42 + i * 9, C.wh, 1, "r");
    });
    txt("FRAGMENTS", 200, 82, C.gy);
    meta.fragments.forEach((f, i) => txt(f ? "@" : "~", 330 + i * 7, 82, f ? C.pk : C.gy));
    txt("SECRETS", 200, 94, C.gy);
    SECRETS.forEach((s, i) => {
      const got = meta.secrets[s.k];
      txt(got ? s.n : "??? ", 200, 102 + i * 8, got ? C.pk : C.gy);
    });
    const hover = SECRETS.find((s, i) => mouse.x > 196 && mouse.x < 372 && mouse.y >= 101 + i * 8 && mouse.y < 109 + i * 8);
    if (hover && !meta.secrets[hover.k]) { R(8, 172, 368, 11, C.ink); txt("HINT: " + hover.h, W / 2, 175, C.la, 1, "c"); }
    else txt("* = A FRIEND'S SCORE ADDED BY CODE", W / 2, 175, C.gy, 1, "c");
    beginItems(this);
    const bw = 88;
    btn(this, "SHARE MY BEST", 8, 190, bw, 12, () => openShare(), {col: C.ye, disabled: !meta.arcade.some(e => !e.friend)});
    btn(this, "ADD FRIEND CODE", 100, 190, bw, 12, () => openAddFriend(), {col: C.pk});
    btn(this, "BACK UP SAVE", 192, 190, bw, 12, () => openBackup(), {col: C.bl});
    btn(this, "RESTORE SAVE", 284, 190, bw, 12, () => openRestore(), {col: C.bl});
    btn(this, "RUN HISTORY", 8, 212, 88, 12, () => go(HistoryScene), {col: C.li});
    btn(this, "ACHIEVEMENTS " + achCount() + "/" + ACH.length, 100, 212, 88, 12, () => { CodexScene.tab = "ach"; go(CodexScene); }, {col: C.ye});
    btn(this, "ONLINE", 192, 212, 88, 12, () => go(OnlineScene), {col: C.bl});
    btn(this, "BACK", 284, 212, 88, 12, () => this.back(), {col: C.gy});
    endItems(this);
  }
};

/* ---------------- codes (DOM modal) ---------------- */
const $ = id => document.getElementById(id);
let modalOpen = false, modalApply = null;
function openModal(titleTxt, desc, value, applyLabel, apply) {
  modalOpen = true; modalApply = apply;
  $("m-title").textContent = titleTxt; $("m-desc").textContent = desc;
  $("m-text").value = value || ""; $("m-text").readOnly = !apply;
  $("m-ok").hidden = !apply; $("m-ok").textContent = applyLabel || "APPLY";
  $("m-msg").textContent = ""; $("m-msg").className = "msg";
  $("modal").hidden = false;
  setTimeout(() => { $("m-text").focus(); if (!apply) $("m-text").select(); }, 30);
}
function closeModal() { modalOpen = false; $("modal").hidden = true; for (const k in keys) keys[k] = false; }
function modalMsg(t, bad) { $("m-msg").textContent = t; $("m-msg").className = "msg" + (bad ? " bad" : ""); }
$("m-close").addEventListener("click", closeModal);
$("m-copy").addEventListener("click", () => { $("m-text").focus(); $("m-text").select(); try { document.execCommand("copy"); modalMsg("COPIED (OR PRESS CTRL+C)."); } catch (e) { modalMsg("SELECTED. PRESS CTRL+C TO COPY."); } });
$("m-ok").addEventListener("click", () => { if (modalApply) modalApply($("m-text").value.trim()); });
$("modal").addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); e.stopPropagation(); });
$("modal").addEventListener("click", e => { if (e.target === $("modal")) closeModal(); });

function scoreCode(e) { const body = e.i + "-" + e.s + "-" + (e.w || 0); return "RIP-" + body + "-" + hash(body + "|riposte").slice(-4); }
function openShare() {
  const mine = meta.arcade.filter(e => !e.friend)[0];
  if (!mine) return;
  openModal("SHARE YOUR BEST", "SEND THIS CODE TO A FRIEND. THEY PASTE IT INTO ADD FRIEND CODE AND YOUR SCORE SHOWS ON THEIR BOARD.", scoreCode(mine), null, null);
}
function openAddFriend() {
  openModal("ADD A FRIEND'S SCORE", "PASTE THE RIP- CODE A FRIEND SENT YOU.", "", "ADD TO BOARD", v => {
    const m = /^RIP-([A-Z0-9]{1,3})-(\d{1,9})-(\d{1,4})-([A-Z0-9]{1,4})$/i.exec(v.replace(/\s+/g, ""));
    if (!m) return modalMsg("THAT DOESN'T LOOK LIKE A SCORE CODE.", true);
    const body = m[1].toUpperCase() + "-" + m[2] + "-" + m[3];
    if (hash(body + "|riposte").slice(-4) !== m[4].toUpperCase()) return modalMsg("THE CODE DOESN'T CHECK OUT. WAS IT COPIED IN FULL?", true);
    const e = {i: m[1].toUpperCase(), s: parseInt(m[2], 10), w: parseInt(m[3], 10), friend: true};
    if (meta.arcade.some(x => x.friend && x.i === e.i && x.s === e.s)) return modalMsg("ALREADY ON YOUR BOARD.", true);
    meta.arcade.push(e); meta.arcade.sort((a, b) => b.s - a.s); meta.arcade = meta.arcade.slice(0, 10); saveMeta();
    modalMsg(meta.arcade.includes(e) ? "ADDED. " + e.i + " IS ON YOUR BOARD." : "VALID, BUT IT DIDN'T MAKE YOUR TOP 10.");
  });
}
function openBackup() {
  const json = JSON.stringify(meta);
  let b64 = "";
  try { b64 = btoa(unescape(encodeURIComponent(json))); } catch (e) { b64 = ""; }
  openModal("BACK UP YOUR SAVE", "PROGRESS IS STORED IN THIS BROWSER. KEEP THIS CODE SOMEWHERE SAFE. RESTORE SAVE BRINGS EVERYTHING BACK, ON ANY DEVICE.",
    "RSV3." + b64 + "." + hash(b64).slice(-5), null, null);
}
function openRestore() {
  openModal("RESTORE A SAVE", "PASTE A BACKUP CODE. THIS REPLACES YOUR CURRENT PROGRESS.", "", "RESTORE", v => {
    const parts = v.replace(/\s+/g, "").split(".");
    if (parts.length !== 3 || parts[0] !== "RSV3") return modalMsg("THAT ISN'T A RIPOSTE SAVE CODE.", true);
    if (hash(parts[1]).slice(-5) !== parts[2]) return modalMsg("THE CODE IS DAMAGED. COPY IT AGAIN IN FULL.", true);
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(parts[1]))));
      meta = mergeDeep(freshMeta(), data); saveMeta();
      modalMsg("RESTORED. WELCOME BACK.");
    } catch (e) { modalMsg("COULDN'T READ THAT SAVE.", true); }
  });
}

/* ---------------- input ---------------- */
let lastPointerTouch = false;
window.addEventListener("keydown", e => {
  if (modalOpen || !e || typeof e.key !== "string") return;
  const k = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(k)) e.preventDefault();
  audioInit();
  if (e.repeat && (k === " " || k === "enter" || k === "tab")) return;
  keys[k] = true;
  lastInput = T;
  if (k === "f11" || (k === "enter" && e.altKey)) { e.preventDefault(); toggleFullscreen(); return; }
  if (k === "m" && !(scene && scene.captureKeys)) { cycleSound(); return; }
  if (k === "escape" && scene && scene.back && !scene.captureKeys) { scene.back(); return; }
  if (scene && scene.key && scene.key(k)) return;
  if (scene) menuKey(scene, k);
});
window.addEventListener("keyup", e => { if (e && typeof e.key === "string") keys[e.key.toLowerCase()] = false; });
window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; if (inCombat() && G && !G.over) G.paused = true; });

screenCv.addEventListener("pointermove", e => {
  const p = toLo(e);
  if (Math.abs(p.x - mouse.x) + Math.abs(p.y - mouse.y) > 2) { lastInput = T; PAD.useAim = false; }
  mouse.x = p.x; mouse.y = p.y;
  if (touch.on && e.pointerId === touch.id) { touch.x = p.x; touch.y = p.y; }
  if (scene && !(inCombat() && G && !G.paused)) menuMove(scene, p.x, p.y);
});
screenCv.addEventListener("pointerdown", e => {
  audioInit(); lastInput = T;
  const p = toLo(e); mouse.x = p.x; mouse.y = p.y;
  lastPointerTouch = e.pointerType === "touch";
  if (G) G.touch = lastPointerTouch;
  if (inCombat() && G && !G.paused) {
    if (e.button === 2) { doPulse(); return; }
    if (lastPointerTouch) { touch.on = true; touch.id = e.pointerId; touch.ox = touch.x = p.x; touch.oy = touch.y = p.y; try { screenCv.setPointerCapture(e.pointerId); } catch (er) {} }
    return;
  }
  if (scene && scene.click && scene.click(p.x, p.y)) return;
  if (scene) { menuMove(scene, p.x, p.y); menuClick(scene, p.x, p.y); }
});
const endTouch = e => { if (touch.on && e.pointerId === touch.id) { touch.on = false; } };
screenCv.addEventListener("pointerup", e => {
  if (touch.on && e.pointerId === touch.id) {
    const moved = Math.hypot(touch.x - touch.ox, touch.y - touch.oy);
    touch.on = false;
    if (moved < 4 && inCombat()) doPulse();   // a tap pulses
  }
});
screenCv.addEventListener("pointercancel", endTouch);
screenCv.addEventListener("contextmenu", e => { e.preventDefault(); if (inCombat()) doPulse(); });

/* ---------------- loop ---------------- */
let last = performance.now(), errCount = 0;
function recover(err) {
  errCount++;
  if (errCount < 6 && window.console) console.error("[riposte]", err);
  try {
    if (G) {
      G.bullets = G.bullets.filter(b => b && isFinite(b.x) && isFinite(b.y));
      G.foes = G.foes.filter(f => f && isFinite(f.x) && isFinite(f.y));
      G.parts = []; G.floats = [];
      if (!isFinite(G.p.x) || !isFinite(G.p.y)) { G.p.x = ACX; G.p.y = ACY; G.p.vx = G.p.vy = 0; }
    }
    L.setTransform(RS, 0, 0, RS, 0, 0); L.globalAlpha = 1; L.globalCompositeOperation = "source-over";
    if (errCount > 40) { errCount = 0; go(TitleScene); }
  } catch (e2) {}
}
function frame(now) {
  try {
    let raw = Math.min(0.1, (now - last) / 1000);
    if (!(raw >= 0)) raw = 1 / 60;
    last = now; T += raw;
    fxTick(raw, inCombat() && G && !G.paused);
    if (inCombat() && G && G.mode !== "attract" && !G.over && G.lives === 1) FX.wobble = Math.max(FX.wobble, 0.12);
    pollPad(raw);
    hauntTick(raw);
    if (typeof onlineTick === "function") onlineTick(raw);
    if (scene.update) scene.update(raw);
    L.setTransform(RS, 0, 0, RS, 0, 0); L.globalAlpha = 1; L.globalCompositeOperation = "source-over";
    scene.draw();
    drawHauntOverlay();
    drawFxOverlay();
    drawToasts(raw);
    if (updatePending) {
      if (safeToReload()) applyUpdate();
      else if (!updateNoticed) { updateNoticed = true; toast("NEW VERSION READY. IT LOADS WHEN THIS FIGHT OR SCREEN ENDS.", C.li); }
    }
    present();
    musicTick();
  } catch (err) { recover(err); }
  requestAnimationFrame(frame);
}

/* ---------------- boot ---------------- */
/* ---------------- live update (installed app) ----------------
   The desktop launcher opens this file with file-access allowed, so the page
   can re-read itself. When the file on disk changes (and has finished being
   written), the game saves and reloads at the next safe moment. */
let updatePending = false, updateNoticed = false;
function safeToReload() {
  return !modalOpen && [TitleScene, RunMap, WorkshopScene, RecordsScene, ArcadeOver, ShieldSelect, RunOver,
    HubScene, CodexScene, HistoryScene, OnlineScene, DailyScene, SettingsScene, PlayersScene].includes(scene);
}
function applyUpdate() {
  updatePending = false;
  try {
    saveMeta();
    if (run && scene === RunMap) saveRun();
    const where = scene === RunMap ? "map" : scene === WorkshopScene ? "workshop" : scene === RecordsScene ? "records"
      : scene === HubScene || hubReturn ? "hub" : "title";
    sessionStorage.setItem("riposte.resume", where);
    sessionStorage.setItem("riposte.updated", "1");
  } catch (e) {}
  location.reload();
}
(function watchSelf() {
  const isFile = location.protocol === "file:";
  if (!isFile && !window.RIPOSTE_APP) return;
  const url = isFile ? location.href.split("#")[0].split("?")[0] : "/riposte.html";
  let base = null, cand = null;
  function check() {
    const x = new XMLHttpRequest();
    x.onload = () => {
      const t = x.responseText || "";
      if (t.length > 1000) {
        const h = hash(t);
        if (base === null) base = h;
        else if (h !== base) {
          // only act once the new file has stopped changing and is complete
          if (cand === h && /<\/html>\s*$/i.test(t)) { updatePending = true; return; }
          cand = h;
        } else cand = null;
      }
      setTimeout(check, cand ? 700 : 2000);
    };
    x.onerror = () => { /* opened without file access (old shortcut): no live updates */ };
    try { x.open("GET", isFile ? url : url + "?t=" + Date.now(), true); x.send(); } catch (e) {}
  }
  setTimeout(check, 1500);
})();

function toggleFullscreen(silent) {
  if (!silent) fxGlitch(0.3);
  if (window.rpToggleFullscreen) {
    try { window.rpToggleFullscreen(); } catch (e) {}
    meta.settings.fullscreen = !meta.settings.fullscreen; saveMeta();   // remembered for next launch
    return;
  }
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  } catch (e) {}
}

if (window.RIPOSTE_APP) document.body.classList.add("app");   // the program's own window: no fake bezel
let fsRestored = false;
function restoreFullscreen() {
  if (fsRestored || resumed || !window.RIPOSTE_APP || !meta.settings.fullscreen || !window.rpToggleFullscreen) return;
  fsRestored = true;
  try { window.rpToggleFullscreen(); } catch (e) {}
}
setTimeout(restoreFullscreen, 60);
buildSprites();
fit();
let resumed = false;
try { resumed = !!sessionStorage.getItem("riposte.resume"); } catch (e) {}
go(resumed ? afterBoot() : BootScene);   // after a live update, players without a name still get asked once
try {
  const where = sessionStorage.getItem("riposte.resume");
  const updated = sessionStorage.getItem("riposte.updated");
  sessionStorage.removeItem("riposte.resume"); sessionStorage.removeItem("riposte.updated");
  if (where === "map") { const r = loadRun(); if (r) { run = r; go(RunMap); } }
  else if (where === "hub") go(HubScene);
  else if (where === "workshop") go(WorkshopScene);
  else if (where === "records") go(RecordsScene);
  if (updated) toast("UPDATED TO VERSION " + VERSION, C.li);
} catch (e) {}
requestAnimationFrame(frame);
