/* ================================================================
   Score checks
   Every score the game sends carries the stats behind it (wave, kills,
   best chain, catches, time) and a checksum. The boards inside the game
   only show entries whose numbers add up, so a score typed straight into
   GameJolt's API, or one that's impossible for the run it claims, is
   left out. Scores from before this version stay if they were sent
   before the switch-over.
   ================================================================ */
const LEGACY_CUTOFF = 1790294400;          // 25 Sep 2026 00:00 UTC: gives everyone a few days to update
const SCORE_MAX = 1e8;

function scoreProof(parts) { return md5((GJ.key || "riposte") + "|" + parts.join("|")).slice(0, 10); }
const proofName = n => String(n || "").toLowerCase();

// arcade: A3|wave|kills|best chain|perfects|parries|seconds|difficulty|proof
function arcadeExtra(r, name) {
  const f = [r.w | 0, r.k | 0, r.c | 0, r.p | 0, r.r | 0, r.t | 0, r.d == null ? DIFF_NORMAL : r.d | 0];
  return ["A3"].concat(f, [scoreProof(["A3", proofName(name), r.s | 0].concat(f))]).join("|");
}
function entryDiff(x) { const m = /^A3\|(?:\d+\|){6}(\d)\|/.exec(String(x || "")); return m ? +m[1] : DIFF_NORMAL; }
// daily: D2|date|depth|kills|perfects|guardians|won|true end|proof
function dailyExtra(d, name, score) {
  const f = [d.date, d.d | 0, d.k | 0, d.p | 0, d.b | 0, d.w ? 1 : 0, d.t ? 1 : 0];
  return ["D2"].concat(f, [scoreProof(["D2", proofName(name), score | 0].concat(f))]).join("|");
}

function entryName(s) { return String(s.user || s.guest || ""); }
function legacyOk(s) { return (parseInt(s.stored_timestamp, 10) || 0) < LEGACY_CUTOFF; }

function arcadeValid(s) {
  const score = parseInt(s.sort, 10) || 0, x = String(s.extra_data || "");
  if (score < 0 || score > SCORE_MAX) return false;
  const m = /^(A2|A3)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(?:(\d)\|)?([0-9a-f]{10})$/.exec(x);
  if (!m) return /^w\d+$/.test(x) && score <= 500000 && legacyOk(s);
  const v = m[1], [w, k, c, p, r, t] = m.slice(2, 8).map(Number), dl = v === "A3" ? +m[8] : DIFF_NORMAL;
  if ((v === "A3") !== (m[8] != null) || !DIFFS[dl]) return false;
  const parts = [v, proofName(entryName(s)), score, w, k, c, p, r, t].concat(v === "A3" ? [dl] : []);
  if (m[9] !== scoreProof(parts)) return false;
  // what the run claims has to be possible (checked on the points before the difficulty multiplier)
  if (w < 1 || w > 400 || c > k + 1 || t < (w - 1) * 3 || p > k * 10 + 500 || r > k * 20 + 800) return false;
  const ceiling = (k * 96000 + (p + 40) * 30 + r * 10) * Math.max(1, c) + 2000;
  return score / DIFFS[dl].score <= ceiling + 1;
}
function dailyValid(s) {
  const score = parseInt(s.sort, 10) || 0, x = String(s.extra_data || "");
  const m = /^D2\|(\d{4}-\d{2}-\d{2})\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|([01])\|([01])\|([0-9a-f]{10})$/.exec(x);
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(x) && score <= 20000 && legacyOk(s);
  const [d, k, p, b, w, t] = m.slice(2, 8).map(Number);
  if (m[8] !== scoreProof(["D2", proofName(entryName(s)), score, m[1], d, k, p, b, w, t])) return false;
  if (d < 1 || d > 6 || b > d + 1 || k > 800 || p > k * 10 + 500) return false;
  return score === d * 1000 + k * 10 + p * 25 + b * 500 + w * 3000 + t * 2000;   // the daily score is a formula, so it must match exactly
}
function entryDate(x) {
  const m = /^D2\|(\d{4}-\d{2}-\d{2})\|/.exec(String(x || ""));
  return m ? m[1] : String(x || "");
}
// the board rows the game shows, with anything that doesn't add up left out
function checkedRows(scores, kind) {
  const all = scores || [];
  const ok = all.filter(kind === "daily" ? dailyValid : arcadeValid);
  return {rows: ok.map(s => ({i: normText(entryName(s) || "?").slice(0, 12), s: parseInt(s.sort, 10) || 0, x: s.extra_data || "",
      d: kind === "daily" ? DIFF_NORMAL : entryDiff(s.extra_data)})),
    hidden: all.length - ok.length};
}

// the player list is sent by every copy of the game too: drop records that can't be real
function playerRecordOk(d) {
  return d && typeof d.n === "string" && d.n.length > 0 && d.n.length <= 24 &&
    (+d.t || 0) >= 0 && (+d.t || 0) < 3.2e7 && (+d.g || 0) >= 0 && (+d.g || 0) < 1e6 && (+d.b || 0) >= 0 && (+d.b || 0) <= SCORE_MAX;
}
