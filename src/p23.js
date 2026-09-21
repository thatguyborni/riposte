/* ================================================================
   Cloud saves
   When you're logged in with GameJolt, your progress is also kept in
   your own GameJolt data store, so you can carry on from the PC, the
   laptop or a phone. Each device writes only its own slot, so nothing
   ever overwrites another device's save. Every save carries a small
   counter per device (how many times each device has backed up along
   its history), which tells the game whether another device's save is
   newer, older, or went its own way:
   - newer, and this device hasn't moved on: take it, no questions;
   - both moved on: show the two saves side by side and let you pick.
   Settings and the login itself stay per device.
   ================================================================ */
const CLOUD = {checked: false, busy: false, tryT: -99, lastUp: -99, fpT: -99, checkT: -99, changed: false, conflict: null, adopt: null,
  status: "", syncedAt: 0, snooze: false, seen: {}, ownVV: {}};
const DEVICE_ID = (() => {
  try {
    let d = localStorage.getItem("riposte.device");
    if (!d) { d = Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 8); localStorage.setItem("riposte.device", d); }
    return d;
  } catch (e) { return "nostore"; }
})();
const slotKey = () => "save-" + DEVICE_ID;
const CLOUD_LOCAL = {gj: 1, settings: 1, cloud: 1, sent: 1, saveT: 1};   // never leave this device

// per-device counters: a is newer (1), older (-1), the same (0), or they split (2)
function vvMax(a, b) { const o = Object.assign({}, a || {}); for (const k in b || {}) o[k] = Math.max(o[k] || 0, b[k] | 0); return o; }
function vvCmp(a, b) {
  let gt = false, lt = false;
  for (const k of new Set(Object.keys(a || {}).concat(Object.keys(b || {})))) {
    const x = (a || {})[k] | 0, y = (b || {})[k] | 0;
    if (x > y) gt = true; if (x < y) lt = true;
  }
  return gt && lt ? 2 : gt ? 1 : lt ? -1 : 0;
}

function cloudUserKey() { const u = gjUser(); return u ? String(u.user).toLowerCase() : ""; }
function cloudMine() { const c = meta.cloud || {}; return c.user && c.user === cloudUserKey() ? c : {}; }
function deviceLabel() { return window.RIPOSTE_APP ? "WINDOWS" : COARSE ? "PHONE" : "BROWSER"; }
function runText() { try { return localStorage.getItem(RUN_KEY) || ""; } catch (e) { return ""; } }

// what counts as progress: everything except play time, per-device settings and one-off tips
function cloudFingerprint(m, runStr) {
  const c = {};
  for (const k in m) if (!CLOUD_LOCAL[k] && k !== "playTime") c[k] = m[k];
  if (c.stats) { c.stats = Object.assign({}, c.stats); delete c.stats.activeTime; }
  if (c.flags) { c.flags = Object.assign({}, c.flags); delete c.flags.iosHint; delete c.flags.cornerTip; delete c.flags.repelTip; }
  return hash(JSON.stringify(c) + "|" + (runStr || ""));
}
const cloudDirty = () => { const mine = cloudMine(); return mine.vv ? cloudFingerprint(meta, runText()) !== mine.fp : !freshSave(meta); };

// big saves go in the request body; GameJolt then signs the url plus "data" plus the data itself
function gjPost(endpoint, params, data, keepalive) {
  if (!gjReady()) return Promise.reject(new Error("not set up"));
  let url = "https://api.gamejolt.com/api/game/v1_2/" + endpoint + "/?game_id=" + encodeURIComponent(GJ.gameId);
  for (const k in params) if (params[k] !== undefined && params[k] !== "") url += "&" + k + "=" + encodeURIComponent(params[k]);
  url += "&signature=" + md5(url + "data" + data + GJ.key);
  return fetch(url, {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: "data=" + encodeURIComponent(data), keepalive: !!keepalive})
    .then(r => r.json()).then(j => {
      const res = j && j.response;
      if (!res || String(res.success) !== "true") throw new Error((res && res.message) || "failed");
      return res;
    });
}

// back this device's save up into its own slot (merge: also count past every save it has been shown)
function cloudUpload(keepalive, merge) {
  const u = gjUser();
  if (!u || CLOUD.busy || CLOUD.conflict || !CLOUD.checked) return Promise.resolve(false);
  const mine = cloudMine(), vv = vvMax(mine.vv, merge ? CLOUD.seen : null);
  vv[DEVICE_ID] = (vv[DEVICE_ID] | 0) + 1;
  const m = {};
  for (const k in meta) if (!CLOUD_LOCAL[k]) m[k] = meta[k];
  let r = null; try { r = JSON.parse(runText() || "null"); } catch (e) {}
  const fp = cloudFingerprint(meta, runText());
  const body = JSON.stringify({v: VERSION, vv, t: Date.now(), device: DEVICE_ID, dev: deviceLabel(), saved: meta.saveT || Date.now(), meta: m, run: r});
  CLOUD.busy = true; CLOUD.lastUp = T;
  return gjPost("data-store/set", {key: slotKey(), username: u.user, user_token: u.token}, body, keepalive && body.length < 60000)
    .then(() => {
      meta.cloud = {user: cloudUserKey(), vv, fp, play: meta.playTime || 0};
      CLOUD.seen = vvMax(CLOUD.seen, vv);
      CLOUD.syncedAt = Date.now(); CLOUD.changed = false; CLOUD.status = "";
      saveMeta();
      return true;
    })
    .catch(() => { CLOUD.status = "COULDN'T BACK UP TO GAMEJOLT, WILL TRY AGAIN"; return false; })
    .then(ok => { CLOUD.busy = false; return ok; });
}

// a save with nothing in it yet (a new device) gives way without asking
function freshSave(m) {
  return !(m.stats && (m.stats.runs || m.stats.arcadeGames || m.stats.kills)) && !Object.keys(m.ach || {}).length && !m.earned;
}
// every slot on this account (this device's own included)
function cloudSlots(u) {
  const auth = {username: u.user, user_token: u.token};
  return gjCall("data-store/get-keys", Object.assign({pattern: "save-*"}, auth)).then(r => {
    const keys = (Array.isArray(r.keys) ? r.keys : []).map(k => k.key).filter(Boolean).slice(0, 25);
    if (!keys.length) return [];
    return gjBatch(keys.map(k => ["data-store", Object.assign({key: k}, auth)])).then(rs => rs.map(x => {
      try { return x && String(x.success) === "true" ? JSON.parse(x.data) : null; } catch (e) { return null; }
    }).filter(c => c && c.meta && c.vv));
  });
}
function cloudCheck() {
  const u = gjUser();
  if (!u || !gjReady() || CLOUD.busy) return;
  CLOUD.busy = true; CLOUD.checkT = T;
  if (!CLOUD.checked) CLOUD.status = "CHECKING YOUR GAMEJOLT SAVE...";
  cloudSlots(u).then(slots => {
    CLOUD.busy = false; CLOUD.checked = true; CLOUD.status = "";
    const mine = cloudMine(), own = slots.find(c => c.device === DEVICE_ID), others = slots.filter(c => c.device !== DEVICE_ID);
    for (const c of slots) CLOUD.seen = vvMax(CLOUD.seen, c.vv);
    CLOUD.ownVV = own ? own.vv : {};
    const byTime = (a, b) => b.t - a.t;
    const split = others.filter(c => vvCmp(c.vv, mine.vv) === 2).sort(byTime);
    const newer = others.filter(c => vvCmp(c.vv, mine.vv) === 1).sort(byTime);
    if (split.length) { CLOUD.conflict = split[0]; return; }                         // two devices went their own ways
    if (newer.length) { if (cloudDirty()) CLOUD.conflict = newer[0]; else CLOUD.adopt = newer[0]; return; }
    if (cloudDirty() || !own || mine.push) cloudUpload(false, !!mine.push);          // we're the newest: make sure our slot says so
    else CLOUD.syncedAt = Date.now();
  }).catch(() => { CLOUD.busy = false; CLOUD.status = "COULDN'T REACH GAMEJOLT FOR YOUR SAVE"; });
}

function cloudAdopt(c) {
  try {
    const m = mergeDeep(freshMeta(), JSON.parse(JSON.stringify(c.meta)));
    m.gj = meta.gj; m.settings = meta.settings; m.sent = meta.sent || {};
    const runStr = c.run ? JSON.stringify(c.run) : "";
    // this device's slot gets rewritten with the loaded save on the next start (push), counted past everything seen
    m.cloud = {user: cloudUserKey(), vv: vvMax(c.vv, CLOUD.ownVV), fp: cloudFingerprint(m, runStr), play: m.playTime || 0, push: 1};
    NO_SAVE = true;                                  // nothing may write the old save back over it now
    localStorage.setItem(SAVE_KEY, JSON.stringify(m));
    if (runStr) localStorage.setItem(RUN_KEY, runStr); else localStorage.removeItem(RUN_KEY);
    if (meta.pid && m.pid && meta.pid !== m.pid) sessionStorage.setItem("riposte.oldpid", meta.pid);
    sessionStorage.setItem("riposte.cloudmsg", "SAVE LOADED FROM GAMEJOLT (" + (c.dev || "ANOTHER DEVICE") + ")");
    sessionStorage.setItem("riposte.resume", scene === HubScene || hubReturn ? "hub" : "title");
    location.reload();
  } catch (e) { NO_SAVE = false; toast("COULDN'T LOAD THE GAMEJOLT SAVE", C.rd); }
}

const cloudCalm = () => !modalOpen && [TitleScene, HubScene, OnlineScene, RecordsScene, ModesScene].includes(scene);
function cloudTick() {
  if (!gjUser() || !gjReady()) {
    if (CLOUD.checked || CLOUD.conflict) Object.assign(CLOUD, {checked: false, conflict: null, adopt: null, status: "", syncedAt: 0});
    return;
  }
  if (!CLOUD.checked) {
    if (!CLOUD.busy && T - CLOUD.tryT > 30 && scene !== BootScene && scene !== NameScene) { CLOUD.tryT = T; cloudCheck(); }
    return;
  }
  if (CLOUD.adopt && cloudCalm()) { const c = CLOUD.adopt; CLOUD.adopt = null; cloudAdopt(c); return; }
  if (CLOUD.conflict) { if (!CLOUD.snooze && cloudCalm() && scene !== CloudScene) go(CloudScene, {c: CLOUD.conflict, back: scene}); return; }
  // someone else on this account may be playing too: look again now and then, between games
  if (T - CLOUD.checkT > 600 && cloudCalm() && !CLOUD.busy) { cloudCheck(); return; }
  // keep the copy on GameJolt fresh: progress goes up within half a minute (play time rides along with it)
  if (T - CLOUD.fpT > 5) { CLOUD.fpT = T; CLOUD.changed = cloudDirty(); }
  if (CLOUD.changed && T - CLOUD.lastUp > 20) cloudUpload();
}
function cloudFlush() { if (gjUser() && CLOUD.checked && !CLOUD.conflict && !CLOUD.busy && cloudDirty()) cloudUpload(true); }
function cloudReset() { Object.assign(CLOUD, {checked: false, busy: false, tryT: -99, conflict: null, adopt: null, status: "", syncedAt: 0, snooze: false, seen: {}}); }

function cloudStatus() {
  if (!gjUser()) return "LOG IN TO KEEP YOUR SAVE ON GAMEJOLT TOO";
  if (CLOUD.status) return CLOUD.status;
  if (CLOUD.conflict) return "TWO DIFFERENT SAVES: CHOOSE ONE FROM THE TITLE SCREEN";
  if (!CLOUD.syncedAt) return "CLOUD SAVE: ON";
  const m = Math.floor((Date.now() - CLOUD.syncedAt) / 60000);
  return "SAVE BACKED UP TO GAMEJOLT " + (m < 1 ? "JUST NOW" : m + (m === 1 ? " MINUTE" : " MINUTES") + " AGO");
}

// after loading another device's save: say so, and tidy up this device's old player entry
(function cloudAfterReload() {
  try {
    const msg = sessionStorage.getItem("riposte.cloudmsg"), old = sessionStorage.getItem("riposte.oldpid");
    sessionStorage.removeItem("riposte.cloudmsg"); sessionStorage.removeItem("riposte.oldpid");
    if (msg) setTimeout(() => toast(msg, C.li), 900);
    if (msg) { CLOUD.checked = true; CLOUD.syncedAt = Date.now(); }
    if (old && gjReady()) setTimeout(() => gjCall("data-store/remove", {key: "p_" + old}).catch(() => {}), 3000);
  } catch (e) {}
})();

/* ---------------- two saves: pick one ---------------- */
function saveSummary(m) {
  const ach = Object.keys(m.ach || {}).filter(id => ACH_BY[id]).length, st = m.stats || {};
  return [["TIME PLAYED", fmtPlayTime(st.activeTime || m.playTime || 0)], ["TOKENS", String(m.tokens || 0)],
    ["TROPHIES", ach + "/" + ACH.length], ["ARCADE BEST", String(st.bestScore || 0)],
    ["DESCENTS WON", String(st.wins || 0)], ["TAPES FOUND", String(Object.keys(m.logs || {}).length)]];
}
function whenText(t) {
  if (!t) return "-";
  const d = new Date(t);
  return String(d.getDate()).padStart(2, "0") + " " + ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getMonth()] +
    " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
const CloudScene = {
  enter(o) { this.c = o.c; this.backTo = o.back && o.back !== CloudScene ? o.back : TitleScene; this.armed = null; this.sel = 0; music("map"); },
  back() { CLOUD.snooze = true; go(this.backTo); },
  pick(which) {
    if (this.armed !== which || T - this.armedT > 3) { this.armed = which; this.armedT = T; sfx.deny(); return; }
    if (which === "cloud") { CLOUD.conflict = null; cloudAdopt(this.c); }
    else { CLOUD.conflict = null; CLOUD.snooze = false; cloudUpload(false, true).then(ok => toast(ok ? "THIS DEVICE'S SAVE IS NOW ON GAMEJOLT" : "COULDN'T REACH GAMEJOLT", ok ? C.li : C.rd)); go(this.backTo); }
  },
  draw() {
    menuBg(PALS.grid);
    title("TWO SAVES", 8, C.ye);
    wrap("YOUR GAMEJOLT ACCOUNT HAS A SAVE FROM ANOTHER DEVICE, AND THIS DEVICE HAS PROGRESS OF ITS OWN. KEEP ONE: THE OTHER GETS REPLACED.", 340)
      .forEach((l, i) => txt(l, W / 2, 28 + i * 8, C.lg, 1, "c"));
    const cols = [["THIS DEVICE (" + deviceLabel() + ")", meta, meta.saveT, 8, C.bl], ["GAMEJOLT (" + (this.c.dev || "?") + ")", this.c.meta, this.c.saved || this.c.t, 196, C.pk]];
    for (const [head, m, t, x, col] of cols) {
      panel(x, 50, 180, 124, col);
      txt(head, x + 90, 55, col, 1, "c");
      txt("LAST SAVED " + whenText(t), x + 90, 66, C.gy, 1, "c");
      saveSummary(m).forEach(([k, v], i) => { txt(k, x + 8, 82 + i * 14, C.lg); txt(v, x + 172, 82 + i * 14, C.wh, 1, "r"); });
    }
    beginItems(this);
    const armed = this.armed && T - this.armedT < 3;
    btn(this, armed && this.armed === "local" ? "SURE? TAP AGAIN" : "KEEP THIS ONE", 8, 180, 180, 13, () => this.pick("local"), {col: C.bl});
    btn(this, armed && this.armed === "cloud" ? "SURE? TAP AGAIN" : "LOAD THIS ONE", 196, 180, 180, 13, () => this.pick("cloud"), {col: C.pk});
    btn(this, "DECIDE LATER", W / 2 - 50, 200, 100, 12, () => this.back(), {col: C.gy});
    endItems(this);
    txt("UNTIL YOU CHOOSE, NOTHING IS BACKED UP.", W / 2, 222, C.gy, 1, "c");
  }
};
