/* ================================================================
   Players: every player picks a name once, their best arcade score
   goes to GameJolt by itself (guests too), and a shared PLAYERS list
   (GameJolt's data store) shows who plays and how much.
   ================================================================ */
const NAME_MAX = 12;
const NAME_ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function cleanName(s) {
  return normText(String(s || "")).replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
}
// the cabinet's own top 10 (and the share codes) keep classic 1-3 letter initials, taken from the name
function nameInitials(n) { return cleanName(n).replace(/[^A-Z0-9]/g, "").slice(0, 3) || "AAA"; }
function myName() { return meta.name || meta.initials || "PLAYER"; }
// one name is already in use, and always will be
const nameTaken = n => ["MILO", "MLO"].includes(cleanName(n).replace(/ /g, ""));
function takenGlitch() {
  sfx.deny(); fxGlitch(0.7); sfxGlitch(true);
  if (hauntMode() > 0) { tone(41, 1, "sine", 0.18); setTimeout(() => whisper("MINE"), 400); }
  loreSetFlag("nameTaken");
}

// one-time setup for this save: a hidden id so two players with the same name stay apart
(function playersInit() {
  if (!meta.flags) meta.flags = {};
  let dirty = false;
  if (!meta.pid) { meta.pid = Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 8); dirty = true; }
  if (!meta.flags.pl1) {
    meta.flags.pl1 = 1; dirty = true;
    meta.stats.activeTime = Math.max(meta.stats.activeTime || 0, Math.round(meta.playTime || 0));
    const best = (meta.arcade || []).filter(e => !e.friend && !e.ghost).sort((a, b) => b.s - a.s)[0];
    if (best && best.s > (meta.stats.bestScore || 0)) { meta.stats.bestScore = best.s; meta.stats.bestScoreWave = best.w || 0; }
  }
  if (dirty) saveMeta();
})();

/* ---------------- after the boot screen: ask for a name once ---------------- */
function urlGjName() {
  try { return new URLSearchParams(location.search).get("gjapi_username") || ""; } catch (e) { return ""; }
}
function setPlayerName(n) {
  meta.name = n;
  meta.initials = nameInitials(n);
  if (!meta.flags) meta.flags = {};
  meta.flags.named = 1;
  saveMeta();
  playerPush(true);
  gjSyncBest();
}
function afterBoot() {
  if (meta.name) return TitleScene;
  const g = cleanName(urlGjName());          // playing on gamejolt.com while logged in: we already know who it is
  if (g) { setPlayerName(g); return TitleScene; }
  return NameScene;
}

const NameScene = {
  captureKeys: true,
  enter(o) {
    this.change = !!(o && o.change);
    this.letters = (meta.name || "").split("");
    this.touched = !!meta.name;
    this.waitLogin = false; this.err = ""; this.sel = 0;
    music("map");
  },
  back() { if (this.change) go(OnlineScene); },
  value() { return cleanName(this.letters.join("")); },
  prefill() {
    // suggest a name: the GameJolt account, else the computer's user name, else initials they typed before
    const u = gjUser();
    const n = cleanName(u ? u.user : WHO) || (meta.flags && meta.flags.initials ? cleanName(meta.initials) : "");
    if (n) this.letters = n.split("");
  },
  edit() { this.touched = true; this.err = ""; },
  confirm() {
    const n = this.value();
    if (!n) { this.err = "TYPE A NAME FIRST."; sfx.deny(); return; }
    if (nameTaken(n)) { this.err = "THAT NAME IS TAKEN."; this.letters = []; takenGlitch(); return; }
    sfx.select();
    setPlayerName(n);
    toast(this.change ? "NAME CHANGED TO " + n : "HELLO, " + n + ".", C.li);
    go(this.change ? OnlineScene : TitleScene);
  },
  update() {
    if (!this.touched && !this.letters.length) this.prefill();
    if (this.waitLogin && !modalOpen) {
      this.waitLogin = false;
      const u = gjUser();
      if (u) { this.letters = cleanName(u.user).split(""); this.touched = true; this.confirm(); }
    }
  },
  draw() {
    menuBg(PALS.grid);
    title(this.change ? "CHANGE NAME" : "WHO'S PLAYING?", 28, C.ye);
    txt("YOUR NAME GOES ON THE ONLINE SCORE BOARDS.", W / 2, 52, C.lg, 1, "c");
    const sc = 3, cw = 4 * sc, x0 = Math.round(W / 2 - (NAME_MAX * cw - sc) / 2), y0 = 72;
    panel(x0 - 10, y0 - 8, NAME_MAX * cw + 17, 34, C.ye);
    const n = this.letters.join("");
    txt(n, x0, y0, C.wh, sc);
    for (let i = 0; i < NAME_MAX; i++) R(x0 + i * cw, y0 + 18, cw - sc, 1, i < this.letters.length ? C.lg : C.gy);
    if (this.letters.length < NAME_MAX && Math.floor(T * 3) % 2) R(x0 + this.letters.length * cw, y0, cw - sc, 15, C.ye);
    txt(ctl("TYPE YOUR NAME, THEN PRESS ENTER", "UP/DOWN: LETTER  ~  RIGHT: NEXT  ~  LEFT: DELETE  ~  A: DONE", "TAP THE BOX TO TYPE YOUR NAME"),
      W / 2, 108, isTouch() ? C.lg : C.gy, 1, "c");
    if (this.err) txt(this.err, W / 2, 118, C.rd, 1, "c");
    beginItems(this);
    const v = this.value();
    btn(this, this.change ? "SAVE NAME" : "PLAY AS " + (v || "..."), W / 2 - 80, 130, 160, 12, () => this.confirm(), {col: C.ye, disabled: !v});
    let y = 146;
    if (gjReady() && !gjUser()) {
      btn(this, "LOG IN WITH GAMEJOLT", W / 2 - 80, y, 160, 12, () => { this.waitLogin = true; openGjLogin(); }, {col: C.bl});
      y += 16;
    }
    if (this.change) btn(this, "CANCEL", W / 2 - 80, y, 160, 12, () => this.back(), {col: C.gy});
    endItems(this);
    const foot = gjUser() ? "LOGGED IN TO GAMEJOLT AS " + normText(gjUser().user) + ". SCORES, TROPHIES AND YOUR SAVE GO TO YOUR ACCOUNT."
      : gjReady() ? "OPTIONAL: LOG IN WITH GAMEJOLT TO EARN TROPHIES AND CARRY YOUR SAVE BETWEEN DEVICES." : "";
    wrap(foot, 300).forEach((l, i) => txt(l, W / 2, 188 + i * 9, C.la, 1, "c"));
    txt("YOU CAN CHANGE IT ANY TIME IN RECORDS > ONLINE.", W / 2, 214, C.gy, 1, "c");
  },
  // phones have no keys to press: the box opens the phone's own keyboard
  click(x, y) {
    if (!(y >= 60 && y < 100 && x >= 70 && x < 314)) return false;
    this.typeOnPhone();
    return true;
  },
  typeOnPhone() {
    openModal("YOUR NAME", "UP TO " + NAME_MAX + " LETTERS AND NUMBERS. IT GOES ON THE ONLINE SCORE BOARDS.", this.letters.join(""), "OK", v => {
      const n = cleanName(v);
      if (!n) return modalMsg("TYPE A NAME FIRST.", true);
      if (nameTaken(n)) { takenGlitch(); return modalMsg("THAT NAME IS TAKEN.", true); }
      this.letters = n.split(""); this.touched = true; this.err = "";
      closeModal();
    });
  },
  key(k) {
    if (k === "enter") { this.confirm(); return true; }
    if (k === "escape") { this.back(); return true; }
    const L = this.letters;
    if (k === "backspace" || k === "arrowleft" || k === "delete") { if (L.length) { L.pop(); sfx.move(); } this.edit(); return true; }
    if (k === "arrowright") { if (L.length < NAME_MAX) { L.push("A"); sfx.move(); } this.edit(); return true; }
    if (k === "arrowup" || k === "arrowdown") {
      if (!L.length) L.push(k === "arrowup" ? "Z" : "B");
      const i = L.length - 1, c = NAME_ABC.indexOf(L[i]);
      L[i] = NAME_ABC[((c < 0 ? 0 : c) + (k === "arrowup" ? -1 : 1) + NAME_ABC.length) % NAME_ABC.length];
      sfx.move(); this.edit(); return true;
    }
    if (k === " ") { if (L.length && L[L.length - 1] !== " " && L.length < NAME_MAX) L.push(" "); this.edit(); return true; }
    if (k.length === 1 && NAME_ABC.includes(k.toUpperCase())) {
      if (L.length < NAME_MAX) { L.push(k.toUpperCase()); sfx.move(); } else sfx.deny();
      this.edit(); return true;
    }
    return true;
  }
};

/* ---------------- best score to GameJolt, for guests too ---------------- */
// one line per player on the board: we only send a score when it beats what this player already sent
function gjIdent() { const u = gjUser(); return u ? "u:" + String(u.user).toLowerCase() : "g:" + meta.pid; }
let gjSyncBusy = false;
function gjSyncBest(loud) {
  const best = meta.stats.bestScore || 0, run = meta.stats.bestRun;
  // a best from before scores carried their stats can't be checked, so it stays where it already is
  if (!gjReady() || !GJ.tables.arcade || !meta.name || best <= 0 || gjSyncBusy || !run || run.s !== best) return;
  if (!meta.sent || typeof meta.sent !== "object") meta.sent = {};
  const k = gjIdent() + "|arcade";
  if ((meta.sent[k] || 0) >= best) return;
  gjSyncBusy = true;
  gjArcadeScore(run).then(ok => {
    gjSyncBusy = false;
    if (!ok) return;                     // offline: the next check tries again
    meta.sent[k] = best; saveMeta();
    if (loud) toast("NEW BEST SENT TO GAMEJOLT", C.li);
  });
}

/* ---------------- the PLAYERS list (GameJolt data store) ---------------- */
const ONLINE = {pushT: 20, lastPush: "", busy: false, players: null, status: "", fetchT: 0, loading: false};
function playerRecord() {
  const u = gjUser();
  return {n: myName(), u: u ? String(u.user) : "", g: meta.stats.arcadeGames || 0, r: meta.stats.runs || 0,
    d: meta.stats.dailies || 0, t: Math.round(meta.stats.activeTime || 0), b: meta.stats.bestScore || 0,
    w: meta.stats.bestWave || 0, dp: meta.stats.bestDepth || 0, a: achCount(), v: VERSION,
    p: window.RIPOSTE_APP ? "win" : "web", l: Math.floor(Date.now() / 1000)};
}
function playerPush(force) {
  if (!gjReady() || !meta.name || ONLINE.busy) return;
  const rec = playerRecord(), same = JSON.stringify(Object.assign({}, rec, {l: 0}));
  if (!force && same === ONLINE.lastPush) return;
  ONLINE.busy = true;
  gjCall("data-store/set", {key: "p_" + meta.pid, data: JSON.stringify(rec)})
    .then(() => { ONLINE.lastPush = same; }).catch(() => {}).then(() => { ONLINE.busy = false; });
}
// time only counts while someone is actually playing, not while the game sits open
function onlineTick(dt) {
  if (T - lastInput < 60 && !document.hidden) meta.stats.activeTime = (meta.stats.activeTime || 0) + dt;
  ONLINE.pushT -= dt;
  if (ONLINE.pushT <= 0) { ONLINE.pushT = 300; playerPush(); gjSyncBest(); }
  cloudTick();
}
function onlineEvent() { playerPush(); gjSyncBest(); }

function gjSub(endpoint, params) {
  let u = "/" + endpoint + "/?game_id=" + encodeURIComponent(GJ.gameId);
  for (const k in params) if (params[k] !== undefined && params[k] !== "") u += "&" + k + "=" + encodeURIComponent(params[k]);
  return u + "&signature=" + md5(u + GJ.key);
}
function gjBatch(reqs) {
  if (!gjReady()) return Promise.reject(new Error("not set up"));
  let url = "https://api.gamejolt.com/api/game/v1_2/batch/?game_id=" + encodeURIComponent(GJ.gameId);
  for (const r of reqs) url += "&requests[]=" + encodeURIComponent(gjSub(r[0], r[1]));
  url += "&signature=" + md5(url + GJ.key);
  return fetch(url).then(r => r.json()).then(j => {
    const res = j && j.response;
    if (!res || String(res.success) !== "true") throw new Error((res && res.message) || "failed");
    return res.responses || [];
  });
}
function fetchPlayers(force) {
  if (!gjReady() || ONLINE.loading) return;
  if (!force && ONLINE.players && performance.now() - ONLINE.fetchT < 60000) return;
  ONLINE.loading = true; ONLINE.status = "LOADING...";
  gjCall("data-store/get-keys", {pattern: "p_*"}).then(r => {
    const keys = (Array.isArray(r.keys) ? r.keys : []).map(x => x.key).filter(Boolean).slice(0, 500);
    const jobs = [];
    for (let i = 0; i < keys.length; i += 25) {
      const part = keys.slice(i, i + 25);
      jobs.push(gjBatch(part.map(k => ["data-store", {key: k}])).then(rs => rs.map((x, j) => ({k: part[j], x}))));
    }
    return Promise.all(jobs);
  }).then(parts => {
    const list = [];
    for (const part of parts) for (const it of part) {
      if (!it.x || String(it.x.success) !== "true") continue;
      try {
        const d = JSON.parse(it.x.data);
        if (playerRecordOk(d)) list.push({key: it.k, n: cleanName(d.n) || "?", u: d.u || "", g: (+d.g || 0) + (+d.r || 0),
          t: +d.t || 0, b: +d.b || 0, l: +d.l || 0, me: it.k === "p_" + meta.pid});
      } catch (e) {}
    }
    ONLINE.players = list; ONLINE.status = ""; ONLINE.fetchT = performance.now();
  }).catch(() => { ONLINE.status = "COULDN'T REACH GAMEJOLT"; }).then(() => { ONLINE.loading = false; });
}

function fmtPlayTime(s) {
  const m = Math.floor(s / 60);
  if (m < 60) return m + "M";
  return Math.floor(m / 60) + "H " + String(m % 60).padStart(2, "0") + "M";
}
function fmtSeen(l) {
  const d = Math.floor(Date.now() / 1000) - l;
  if (!l) return "-";
  if (d < 600) return "NOW";
  if (d < 3600) return Math.floor(d / 60) + "M AGO";
  if (d < 86400) return Math.floor(d / 3600) + "H AGO";
  return Math.floor(d / 86400) + "D AGO";
}
const PLAYER_SORTS = [["TIME", (a, b) => b.t - a.t], ["GAMES", (a, b) => b.g - a.g], ["BEST", (a, b) => b.b - a.b], ["RECENT", (a, b) => b.l - a.l]];
const PLAYER_ROWS = 12;

const PlayersScene = {
  back() { go(OnlineScene); },
  enter() { music("map"); this.page = 0; this.sort = this.sort || 0; this.sel = 0; fetchPlayers(true); },
  rows() {
    const list = (ONLINE.players || []).slice().sort(PLAYER_SORTS[this.sort][1]);
    // someone has been here longer than anyone
    if (list.length && haunted(4) && meta.milo !== "free") list.push({n: "MLO", g: 0, t: 0, b: 0, l: 0, ghost: true});
    return list;
  },
  flip(d) {
    const pages = Math.max(1, Math.ceil(this.rows().length / PLAYER_ROWS));
    this.page = (this.page + d + pages) % pages; sfx.move();
  },
  draw() {
    menuBg(PALS.grid);
    title("PLAYERS", 8, C.bl);
    beginItems(this);
    if (!gjReady()) {
      wrap("THE PLAYER LIST NEEDS THE ONLINE BOARD, WHICH ISN'T SWITCHED ON IN THIS BUILD.", 300)
        .forEach((l, i) => txt(l, W / 2, 80 + i * 9, C.lg, 1, "c"));
    } else {
      const all = ONLINE.players, rows = this.rows();
      if (all) {
        const tot = all.reduce((s, p) => s + p.t, 0);
        txt(all.length + (all.length === 1 ? " PLAYER" : " PLAYERS") + "  ~  " + fmtPlayTime(tot) + " PLAYED IN TOTAL", W / 2, 27, C.lg, 1, "c");
      }
      panel(8, 36, 368, 164, C.bl);
      const cols = [["#", 22, "r"], ["NAME", 32, "l"], ["GAMES", 190, "r"], ["TIME", 236, "r"], ["BEST", 292, "r"], ["LAST SEEN", 366, "r"]];
      cols.forEach(c => txt(c[0], c[1], 42, C.bl, 1, c[2]));
      R(14, 50, 356, 1, C.gy);
      if (!all) txt(ONLINE.status || "...", W / 2, 110, C.gy, 1, "c");
      else if (!rows.length) txt("NOBODY YET. PLAY A GAME!", W / 2, 110, C.gy, 1, "c");
      const pages = Math.max(1, Math.ceil(rows.length / PLAYER_ROWS));
      if (this.page >= pages) this.page = pages - 1;
      rows.slice(this.page * PLAYER_ROWS, (this.page + 1) * PLAYER_ROWS).forEach((p, i) => {
        const y = 55 + i * 12, rank = this.page * PLAYER_ROWS + i + 1;
        if (p.ghost) {
          if (Math.floor(T * 7) % 9 === 0) return;
          [[String(rank), 22, "r"], ["MLO", 32, "l"], ["-", 190, "r"], ["37Y", 236, "r"], ["-", 292, "r"], ["STILL HERE", 366, "r"]]
            .forEach(c => txt(c[0], c[1], y, C.pl, 1, c[2]));
          return;
        }
        const col = p.me ? C.ye : C.wh;
        txt(String(rank), 22, y, C.gy, 1, "r");
        txt(p.n, 32, y, col);
        if (p.u) txt("GJ", 32 + tw(p.n) + 4, y, C.bl);
        txt(String(p.g), 190, y, col, 1, "r");
        txt(fmtPlayTime(p.t), 236, y, col, 1, "r");
        txt(p.b ? String(p.b) : "-", 292, y, col, 1, "r");
        const seen = fmtSeen(p.l);
        txt(seen, 366, y, seen === "NOW" ? C.li : C.lg, 1, "r");
      });
      if (pages > 1) txt("PAGE " + (this.page + 1) + "/" + pages, 366, 202, C.gy, 1, "r");
      if (all && ONLINE.status) txt(ONLINE.status, 14, 202, C.gy);
      btn(this, "SORT: " + PLAYER_SORTS[this.sort][0], 8, 212, 88, 12, () => { this.sort = (this.sort + 1) % PLAYER_SORTS.length; this.page = 0; }, {col: C.ye});
      btn(this, "< PAGE", 100, 212, 56, 12, () => this.flip(-1), {col: C.bl, disabled: pages < 2});
      btn(this, "PAGE >", 160, 212, 56, 12, () => this.flip(1), {col: C.bl, disabled: pages < 2});
      btn(this, "REFRESH", 220, 212, 72, 12, () => fetchPlayers(true), {col: C.bl});
    }
    btn(this, "BACK", 296, 212, 80, 12, () => this.back(), {col: C.gy});
    endItems(this);
  },
  key(k) {
    if (k === "q" || k === "pageup") { this.flip(-1); return true; }
    if (k === "e" || k === "pagedown") { this.flip(1); return true; }
    return false;
  }
};
