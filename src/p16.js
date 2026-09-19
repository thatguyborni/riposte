/* ================================================================
   GameJolt: global scores, daily board and trophies
   Fill in GJ.gameId / GJ.key (Game → Manage → Game API → API Settings),
   the two score table ids and the trophy ids. Until then everything
   online stays switched off and the game works exactly as before.
   ================================================================ */
const GJ = {
  gameId: "",            // e.g. "912345"
  key: "",               // the game's PRIVATE key
  tables: {arcade: "", daily: ""},
  trophies: {            // achievement id -> GameJolt trophy id
    trained: "", first_kill: "", perfect10: "", chain10: "", chain25: "", trick: "", wave10: "", wave20: "",
    score50k: "", warden: "", furnace: "", hydra: "", echo: "", clean_boss: "", grade_s: "", ascend: "",
    true_end: "", vault: "", synergy: "", cursed: "", asc1: "", asc5: "", rescue: "", all_rescued: "",
    daily: "", defuse: "", mirror: "", witching: "", tapes: "", laid: "", stay: ""
  },
  board: {arcade: null, daily: null, status: "", t: 0}
};
const gjReady = () => !!(GJ.gameId && GJ.key);
const gjUser = () => meta.gj && meta.gj.ok ? meta.gj : null;

/* md5 (RFC 1321), only used to sign API calls */
function md5(str) {
  const s = unescape(encodeURIComponent(str));
  const k = [], r = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
  const n = ((s.length + 8) >> 6) + 1, words = new Array(n * 16).fill(0);
  for (let i = 0; i < s.length; i++) words[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
  words[s.length >> 2] |= 0x80 << ((s.length % 4) * 8);
  words[n * 16 - 2] = s.length * 8;
  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  for (let blk = 0; blk < words.length; blk += 16) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const tmp = d; d = c; c = b;
      const x = (a + f + k[i] + words[blk + g]) | 0;
      const sh = r[(i >> 4) * 4 + (i % 4)];
      b = (b + ((x << sh) | (x >>> (32 - sh)))) | 0;
      a = tmp;
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
  }
  let out = "";
  for (const v of [a0, b0, c0, d0]) for (let i = 0; i < 4; i++) out += ((v >>> (i * 8)) & 255).toString(16).padStart(2, "0");
  return out;
}

function gjCall(endpoint, params) {
  if (!gjReady()) return Promise.reject(new Error("not set up"));
  let url = "https://api.gamejolt.com/api/game/v1_2/" + endpoint + "/?game_id=" + encodeURIComponent(GJ.gameId);
  for (const k in params) if (params[k] !== undefined && params[k] !== "") url += "&" + k + "=" + encodeURIComponent(params[k]);
  url += "&signature=" + md5(url + GJ.key);
  return fetch(url).then(r => r.json()).then(j => {
    const res = j && j.response;
    if (!res || res.success !== "true" && res.success !== true) throw new Error((res && res.message) || "failed");
    return res;
  });
}

/* hosted on gamejolt.com, the site hands us the player's name and token */
(function gjFromUrl() {
  try {
    const q = new URLSearchParams(location.search);
    const u = q.get("gjapi_username"), t = q.get("gjapi_token");
    if (u && t && gjReady()) gjLogin(u, t, true);
  } catch (e) {}
})();

function gjLogin(user, token, quiet) {
  return gjCall("users/auth", {username: user, user_token: token}).then(() => {
    meta.gj = {user, token, ok: true}; saveMeta();
    if (!quiet) toast("GAMEJOLT: LOGGED IN AS " + normText(user), C.li);
    // trophies earned while offline catch up now
    for (const id in meta.ach || {}) gjTrophy(id);
    return true;
  }).catch(e => { if (!quiet) toast("GAMEJOLT LOGIN FAILED", C.rd); return false; });
}
function gjLogout() { meta.gj = null; saveMeta(); toast("GAMEJOLT: LOGGED OUT", C.gy); }

function gjTrophy(id) {
  const u = gjUser(), tid = GJ.trophies[id];
  if (!u || !tid || !gjReady()) return;
  gjCall("trophies/add-achieved", {username: u.user, user_token: u.token, trophy_id: tid}).catch(() => {});
}
function gjAddScore(table, score, label, extra, guest) {
  if (!gjReady() || !GJ.tables[table]) return Promise.resolve(false);
  const u = gjUser();
  const p = {score: label, sort: score, table_id: GJ.tables[table], extra_data: extra || ""};
  if (u) { p.username = u.user; p.user_token = u.token; } else p.guest = guest || meta.initials || "AAA";
  return gjCall("scores/add", p).then(() => { GJ.board.t = 0; return true; }).catch(() => false);
}
function gjArcadeScore(score, wave, initials) { return gjAddScore("arcade", score, score + " PTS ~ WAVE " + wave, "w" + wave, initials); }
function gjDailyScore(score) { return gjAddScore("daily", score, score + " PTS ~ " + todayStr(), todayStr()); }

function gjRows(scores) {
  return (scores || []).map(s => ({i: normText(String(s.user || s.guest || "?")).slice(0, 12), s: parseInt(s.sort, 10) || 0, x: s.extra_data || ""}));
}
function gjFetchBoards(force) {
  if (!gjReady() || (!force && performance.now() - GJ.board.t < 60000)) return;
  GJ.board.t = performance.now(); GJ.board.status = "LOADING...";
  const jobs = [];
  if (GJ.tables.arcade) jobs.push(gjCall("scores", {table_id: GJ.tables.arcade, limit: 10}).then(r => { GJ.board.arcade = gjRows(r.scores); }));
  if (GJ.tables.daily) jobs.push(gjCall("scores", {table_id: GJ.tables.daily, limit: 100}).then(r => { GJ.board.daily = gjRows(r.scores); }));
  Promise.all(jobs).then(() => { GJ.board.status = ""; }).catch(() => { GJ.board.status = "COULDN'T REACH GAMEJOLT"; });
}
const gjFetchDaily = () => gjFetchBoards(false);
function gjDailyRows() {
  if (!GJ.board.daily) return null;
  const d = todayStr();
  return GJ.board.daily.filter(r => r.x === d).slice(0, 8);
}

function openGjLogin() {
  openModal("LOG IN TO GAMEJOLT", "TYPE YOUR GAMEJOLT USERNAME, A SPACE, THEN YOUR GAME TOKEN (NOT YOUR PASSWORD). THE TOKEN IS IN YOUR GAMEJOLT PROFILE MENU UNDER 'GAME TOKEN'.", "", "LOG IN", v => {
    const parts = v.trim().split(/\s+/);
    if (parts.length !== 2) return modalMsg("USERNAME, A SPACE, THEN THE TOKEN.", true);
    modalMsg("CHECKING...");
    gjLogin(parts[0], parts[1]).then(ok => ok ? closeModal() : modalMsg("GAMEJOLT SAID NO. CHECK THE NAME AND TOKEN.", true));
  });
}

const OnlineScene = {
  back() { go(RecordsScene); },
  enter() { music("map"); gjFetchBoards(true); },
  draw() {
    menuBg(PALS.grid);
    title("ONLINE", 8, C.bl);
    beginItems(this);
    if (!gjReady()) {
      wrap("THE ONLINE BOARD ISN'T SWITCHED ON IN THIS BUILD YET. ONCE RIPOSTE IS ON GAMEJOLT AND ITS GAME ID AND KEY ARE FILLED IN, SCORES AND TROPHIES SYNC HERE AUTOMATICALLY.", 300)
        .forEach((l, i) => txt(l, W / 2, 60 + i * 9, C.lg, 1, "c"));
    } else {
      const u = gjUser();
      txt(u ? "LOGGED IN AS " + normText(u.user) : "PLAYING AS A GUEST (" + (meta.initials || "AAA") + ")", W / 2, 28, u ? C.li : C.gy, 1, "c");
      panel(8, 38, 180, 150, C.bl);
      txt("WORLD ARCADE TOP 10", 98, 43, C.bl, 1, "c");
      panel(196, 38, 180, 150, C.pk);
      txt("TODAY'S DAILY", 286, 43, C.pk, 1, "c");
      const drawRows = (rows, x0, x1) => {
        if (!rows) return txt(GJ.board.status || "...", (x0 + x1) / 2, 100, C.gy, 1, "c");
        if (!rows.length) return txt("NO SCORES YET", (x0 + x1) / 2, 100, C.gy, 1, "c");
        rows.slice(0, 10).forEach((r, i) => {
          const me = u && r.i === normText(u.user);
          txt(String(i + 1).padStart(2, " ") + ". " + r.i, x0, 56 + i * 12, me ? C.ye : C.wh);
          txt(String(r.s), x1, 56 + i * 12, me ? C.ye : C.wh, 1, "r");
        });
      };
      drawRows(GJ.board.arcade, 16, 180);
      drawRows(gjDailyRows(), 204, 368);
      if (GJ.board.status) txt(GJ.board.status, W / 2, 192, C.gy, 1, "c");
      btn(this, u ? "LOG OUT" : "LOG IN", W / 2 - 104, 204, 100, 12, () => u ? gjLogout() : openGjLogin(), {col: C.li});
      btn(this, "REFRESH", W / 2 + 4, 204, 100, 12, () => gjFetchBoards(true), {col: C.bl});
    }
    btn(this, "BACK", W / 2 - 30, 222, 60, 12, () => this.back(), {col: C.gy});
    endItems(this);
  }
};
