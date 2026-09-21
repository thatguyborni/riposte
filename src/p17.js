/* ================================================================
   Something in the cabinet: tapes, haunting, whispers, the fake crash
   The horror is opt-out (Settings > HAUNTING appears after the first tape)
   and it escalates only as the player finds more of the story.
   ================================================================ */
let WHO = "";
try { if (window.rpWho) window.rpWho().then(n => { WHO = String(n || ""); }).catch(() => {}); } catch (e) {}
function playerName() {
  const n = normText(WHO).replace(/[^A-Z0-9 ]/g, "").trim().slice(0, 12);
  return n || meta.name || meta.initials || "PLAYER";
}
function dateStr(d) {
  d = d || new Date();
  return String(d.getDate()).padStart(2, "0") + " " + ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getMonth()] + " " + d.getFullYear();
}
const isNight = () => { const h = new Date().getHours(); return h < 5 || h >= 23; };

/* ---------------- the tapes ---------------- */
const TAPES = [
  null,
  {d: "02 MAR 1989", h: "DELIVERY", t: "UNIT 0417 CAME IN FROM LANTERN COIN-OP TODAY. GOOD HEAVY CABINET. THE MANUAL SAYS THE OPPONENT 'LEARNS THE PLAYER'S HABITS FOR A BETTER FIGHT.' THE DRIVER CALLED THE CHIP ECHO. RAN THE SELF-TEST. ALL OK. THE KIDS WERE QUEUING BEFORE I HAD THE BACK PANEL ON."},
  {d: "19 MAR 1989", h: "MILO", t: "COIN BOX IS FULL EVERY NIGHT. MOSTLY ONE KID. MILO, ELEVEN OR SO. COMES STRAIGHT FROM SCHOOL AND PLAYS UNTIL WE CLOSE. HE HOLDS EVERY SPOT ON THE HIGH SCORE TABLE. MLO, MLO, MLO. I TOLD HIM TO LEAVE SOME FOR THE OTHERS. HE SAID THE OTHERS AREN'T GOOD ENOUGH."},
  {d: "04 APR 1989", h: "THE DEMO", t: "THE ATTRACT MODE IS MEANT TO PLAY A CANNED DEMO. I WATCHED IT TONIGHT AFTER CLOSE. THE LITTLE SHIELD MOVES EXACTLY LIKE MILO. THE SAME LITTLE WIGGLE BEFORE A CATCH. IT MUST RECORD THE LAST PLAYER. CLEVER MACHINE."},
  {d: "30 APR 1989", h: "IT TALKS", t: "MILO SAYS ECHO CATCHES HIS SHOTS THE WAY HE WOULD NOW. HE THINKS IT'S FUNNY. HE ALSO SAYS IT TALKS TO HIM. I TOLD HIM THERE IS NO SPEECH CHIP IN THAT CABINET. HE SAID 'I KNOW.'"},
  {d: "22 MAY 1989", h: "UNPLUGGED", t: "I PULL EVERY PLUG AT CLOSE. I HAVE DONE IT FOR NINE YEARS. THIS MORNING 0417 WAS ON. ATTRACT SCREEN. THE DEMO PLAYER WAS STANDING STILL IN THE MIDDLE WITH ITS SHIELD POINTED AT THE GLASS. LIKE IT WAS WAITING FOR SOMEONE TO WALK IN."},
  {d: "11 OCT 1989", h: "MISSING", t: "THE POLICE CAME BY. MILO DIDN'T GO HOME LAST NIGHT. HIS BIKE IS STILL LOCKED OUT FRONT. I WAS THE LAST ONE TO SEE HIM. TEN O'CLOCK, AT CLOSE, PLAYING RIPOSTE. I TOLD THEM HE LEFT. I THINK HE LEFT. I DIDN'T SEE HIM LEAVE."},
  {d: "14 OCT 1989", h: "THE TABLE", t: "THE HIGH SCORE TABLE RESET ITSELF. EVERY ENTRY SAYS MLO NOW. SCORES I'VE NEVER SEEN. THE TOP ONE KEPT GOING UP WHILE I WATCHED. NOBODY WAS PLAYING."},
  {d: "02 NOV 1989", h: "THE CHIP", t: "LANTERN COIN-OP'S NUMBER IS DISCONNECTED. I OPENED THE BOARD. THERE IS A CHIP THAT ISN'T ON THE SCHEMATIC. SOMEONE WROTE ON IT IN MARKER: ECHO. UNDERNEATH, IN PENCIL: 'DON'T LET IT WIN. DON'T LET IT LEARN YOU.'"},
  {d: "17 DEC 1989", h: "COUNTING", t: "THE SPEAKER WAS COUNTING TONIGHT. BACKWARDS, FROM TEN. SLOW. IT STOPPED AT ZERO. THEN A KID'S VOICE SAID 'AGAIN.'"},
  {d: "06 JAN 1990", h: "CLOSING", t: "STARLITE IS CLOSING. THE OWNER WANTS 0417 GONE AND NOBODY WILL BUY IT. I'M TAKING IT HOME. SOMEBODY SHOULD KEEP AN EYE ON IT. EVERY TIME I WALK PAST, THE SCREEN SAYS PLAY AGAIN? AND THE CURSOR IS ALREADY ON YES."},
  {d: "03 AUG 1994", h: "UNDER A SHEET", t: "IT HAS BEEN UNDER A SHEET IN MY BASEMENT FOR FOUR YEARS. UNPLUGGED. SOME NIGHTS I HEAR THE COIN DOOR CLICK. LAST NIGHT I HEARD THE SOUND IT MAKES WHEN YOU CATCH ONE PERFECTLY. OVER AND OVER. I DIDN'T GO DOWN."},
  {d: null, h: "TO WHOEVER IS PLAYING", t: "IT'S ON A NEW SCREEN NOW. I DON'T KNOW HOW. {NAME}, IF THAT'S YOU: IT HAS BEEN WATCHING HOW YOU CATCH. YOU CATCH LIKE HIM. THAT'S WHY IT LIKES YOU. HE'S IN THE BASEMENT. HE HAS BEEN WAITING A LONG TIME FOR SOMEONE GOOD ENOUGH TO BEAT HIM. THE DOOR IS OPEN NOW.  ~ D.O."}
];
const TAPE_COUNT = 12;
function tapeText(i) { return TAPES[i].t.replace("{NAME}", playerName()); }
function tapeDate(i) { return TAPES[i].d || dateStr(new Date(meta.logs[i] || Date.now())); }
const tapesRead = () => Object.keys(meta.logs || {}).length;
const tapeRead = i => !!(meta.logs && meta.logs[i]);
const tapeDue = i => !!(meta.tapesDue && meta.tapesDue[i]) && !tapeRead(i);
const dueTapes = () => { const o = []; for (let i = 1; i <= TAPE_COUNT; i++) if (tapeDue(i)) o.push(i); return o; };
const basementOpen = () => tapeRead(12) || tapeDue(12);

// when does each tape turn up in the back room (checked, so it works for old saves too)
function tapeEarned(i) {
  const st = meta.stats, a = meta.ach || {}, f = meta.flags || {};
  const own = meta.arcade.filter(e => !e.friend);
  switch (i) {
    case 1: return st.runs > 0 || st.kills > 0 || own.length > 0;
    case 2: return st.runs >= 3 || (st.bestWave || 0) >= 5 || own.some(e => (e.w || 0) >= 5);
    case 3: return !!f.demoSeen;
    case 4: return !!a.warden;
    case 5: return (meta.playTime || 0) >= 45 * 60 || !!f.lateNight;
    case 6: return !!a.furnace;
    case 7: return own.length >= 2 || !!f.initials;
    case 8: return !!a.vault;
    case 9: return !!meta.secrets.static;
    case 10: return !!a.hydra;
    case 11: return st.wins > 0;
    case 12: for (let k = 1; k <= 11; k++) if (!tapeRead(k)) return false; return true;
  }
  return false;
}
function checkTapes() {
  if (!meta.tapesDue) meta.tapesDue = {};
  let fresh = 0;
  for (let i = 1; i <= TAPE_COUNT; i++) if (!meta.tapesDue[i] && !tapeRead(i) && tapeEarned(i)) { meta.tapesDue[i] = 1; fresh++; }
  if (fresh) {
    saveMeta();
    setTimeout(() => toast(fresh > 1 ? fresh + " TAPES WERE LEFT IN THE BACK ROOM." : "A TAPE WAS LEFT IN THE BACK ROOM.", C.pl), 700);
  }
  checkLore();
}

/* ---------------- how haunted are we ---------------- */
function hauntLevel() {
  if (meta.milo === "free") return 0;
  if (meta.milo === "stay") return 5;
  const n = tapesRead();
  return n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 9 ? 3 : n < 12 ? 4 : 5;
}
const hauntMode = () => meta.settings.haunt == null ? 2 : meta.settings.haunt;   // 0 off, 1 subtle, 2 full
const haunted = lv => hauntMode() > 0 && hauntLevel() >= (lv || 1);
const scaresOn = () => hauntMode() === 2 && fxScale() > 0;

/* phantom high score: always just out of reach */
function phantomEntry() {
  if (!haunted(1) && meta.milo !== "stay") return null;
  const best = Math.max(0, ...meta.arcade.filter(e => !e.friend && !e.ghost).map(e => e.s));
  if (meta.milo === "stay") return {i: (meta.initials || "YOU"), s: 999417, w: "??", ghost: true};
  return {i: "MLO", s: Math.max(41700, Math.ceil((best * 1.12 + 1) / 10000) * 10000 + 417), w: "??", ghost: true};
}
function boardWithPhantom() {
  const ph = phantomEntry();
  const rows = meta.arcade.slice();
  if (ph) rows.push(ph);
  rows.sort((a, b) => b.s - a.s);
  return rows.slice(0, 10);
}
function ghostInitials(e) {
  if (!e.ghost || meta.milo === "stay") return e.i;
  const k = Math.floor(T * 1.3) % 9;
  return k === 4 && Math.floor(T * 12) % 3 === 0 ? "HLP" : e.i;
}

/* ---------------- whispers and faces ---------------- */
const WHISPERS = [];
const WHISPER_LINES = [
  "AGAIN", "DON'T LET IT LEARN YOU", "HE'S STILL IN THERE", "YOU CATCH LIKE HIM", "PLAYER 2 READY",
  "IT REMEMBERS EVERY SHOT", "PLAY AGAIN?", "HE'S WATCHING THE WAY YOU MOVE", "NOBODY WAS PLAYING", "0417",
  "{NAME}", "IT'S LATE", "HE NEVER WENT HOME", "YOU'RE GOOD. HE LIKES GOOD."
];
const STAY_LINES = ["NOW YOU KNOW", "PLAY AGAIN?", "THEY'LL COME", "IT'S WARM IN HERE", "{NAME}?"];
function whisper(text, o) {
  if (hauntMode() === 0) return;
  o = o || {};
  text = normText(text.replace("{NAME}", playerName()));
  WHISPERS.push({text, t: 0, life: o.life || 3.4, big: !!o.big,
    x: o.x != null ? o.x : 40 + rand() * (W - 80), y: o.y != null ? o.y : 40 + rand() * (H - 90)});
  noise(0.7, 0.05, 1800, 700);
}
const FACE = {t: 0, max: 0, a: 0};
function hauntFace(dur, strong) {
  if (!scaresOn()) return;
  FACE.t = FACE.max = dur || 0.35; FACE.a = strong ? 0.3 : 0.18;
  tone(38, 0.8, "sine", 0.22); noise(0.4, 0.08, 400, 120);
  fxGlitch(0.35);
}
const HT = {whisper: 120, face: 200, hb: 0, fig: 0, lights: 0, pauseT: 0, night: false};
function hauntTick(dt) {
  // heartbeat on the last shield (not a scare: it's just good feedback)
  if (inCombat() && G && G.mode !== "attract" && !G.over && !G.paused && G.lives === 1) {
    HT.hb -= dt;
    if (HT.hb <= 0) { HT.hb = 0.9; tone(58, 0.12, "sine", 0.3); setTimeout(() => tone(50, 0.12, "sine", 0.22), 160); }
  } else HT.hb = 0.3;
  if (meta && !isNaN(dt)) {
    meta.playTime = (meta.playTime || 0) + dt;
    loreTick(dt);
    HT.save = (HT.save || 0) + dt;
    if (HT.save > 30) { HT.save = 0; saveMeta(); }
  }
  if (inCombat() && G && G.mode !== "attract" && isNight() && !(meta.flags && meta.flags.lateNight)) { if (!meta.flags) meta.flags = {}; meta.flags.lateNight = 1; }
  for (let i = WHISPERS.length - 1; i >= 0; i--) { WHISPERS[i].t += dt; if (WHISPERS[i].t > WHISPERS[i].life) WHISPERS.splice(i, 1); }
  if (FACE.t > 0) FACE.t -= dt;
  const h = hauntLevel();
  if (!h || hauntMode() === 0) return;
  const fighting = inCombat() && G && G.mode !== "attract" && !G.paused && !G.over;
  const basement = fighting && G.dark;
  if (fighting && h >= 2) {
    HT.whisper -= dt;
    if (HT.whisper <= 0) {
      HT.whisper = (basement ? 35 : 110) + rand() * 90 / (0.6 + 0.25 * h);
      const pool = meta.milo === "stay" ? STAY_LINES : WHISPER_LINES;
      whisper(pick(pool));
    }
    HT.face -= dt;
    if (HT.face <= 0) {
      HT.face = (basement ? 28 : 150) + rand() * (basement ? 30 : 160) / (0.5 + 0.2 * h);
      if (h >= 3 || basement) hauntFace(0.3);
    }
  }
}
function drawHauntOverlay() {
  if (FACE.t > 0 && SPR.face) {
    const k = FACE.t / FACE.max, a = FACE.a * Math.sin(Math.PI * (1 - k));
    L.globalAlpha = Math.max(0, a);
    drawSpr(SPR.face, W / 2 + (rand() - 0.5) * 3, H / 2 - 6 + (rand() - 0.5) * 2, false, 6);
    L.globalAlpha = 1;
  }
  for (const w of WHISPERS) {
    const shown = w.text.slice(0, Math.floor(w.t * 16));
    const fade = w.t > w.life - 0.8 ? (w.life - w.t) / 0.8 : 1;
    L.globalAlpha = Math.max(0, fade) * (0.55 + rand() * 0.25);
    const jx = (rand() - 0.5) * 1.5, jy = (rand() - 0.5) * 1.5;
    if (w.big) txtS(shown, w.x + jx, w.y + jy, C.rd, 4, "c", C.k);
    else txt(shown, w.x + jx, w.y + jy, C.rd, 1, "c");
    L.globalAlpha = 1;
  }
  // a face in the dark glass of the pause screen, very rarely
  if (inCombat() && G && G.paused && haunted(3) && scaresOn()) {
    HT.pauseT += 1 / 60;
    if (HT.pauseT % 26 > 24.8) { L.globalAlpha = 0.07; drawSpr(SPR.face, W / 2, H / 2 + 10, false, 7); L.globalAlpha = 1; }
  } else HT.pauseT = 0;
}

/* ---------------- boot lines change as it wakes up ---------------- */
function bootLines() {
  const lines = [["RIPOSTE ARCADE SYSTEM", "REV " + VERSION],
    ["CPU", "OK"], ["WORK RAM 64K", "OK"], ["VIDEO 384X240", "OK"], ["SOUND CHIP", "OK"],
    ["SHIELD CALIBRATION", "OK"], ["CHECKING ROM", "OK"], ["LOADING DEPTHS 1-3", "OK"]];
  const h = hauntLevel();
  // after the last B-side, somebody else is in there too
  const extra = hauntMode() > 0 && loreRead("b8") ? 1 : 0;
  if (meta.milo === "free") { lines.push(["PLAYERS DETECTED", String(1 + extra)], ["SIGNAL", extra ? "D.O." : "QUIET"]); return lines; }
  if (meta.milo === "stay") { lines.push(["PLAYERS DETECTED", String(1 + extra)], ["SIGNAL", meta.initials || "YOU"]); return lines; }
  if (h >= 1 && hauntMode() > 0) lines.push(["PLAYERS DETECTED", String(2 + extra)]);
  lines.push(["SIGNAL", h >= 3 && hauntMode() > 0 ? "I SEE YOU" : "???"]);
  return lines;
}

/* ---------------- listening to a tape ---------------- */
const TapeScene = {
  captureKeys: true,
  enter(o) {
    this.id = o.id; this.from = o.from || HubScene; this.t = 0;
    this.text = tapeText(this.id);
    this.lines = wrap(this.text, 300);
    this.first = !tapeRead(this.id);
    if (!meta.logs) meta.logs = {};
    if (!meta.logs[this.id]) meta.logs[this.id] = Date.now();
    if (meta.tapesDue) delete meta.tapesDue[this.id];
    if (!meta.hauntSeen) meta.hauntSeen = true;
    saveMeta();
    musTrack = null; this.ticks = 0;
    tone(180, 0.08, "square", 0.1); noise(0.12, 0.12, 2000, 800);
    if (tapesRead() >= TAPE_COUNT) unlockAch("tapes");
  },
  update(dt) {
    this.t += dt;
    const shown = Math.floor(this.t * 34);
    if (shown < this.text.length && Math.floor(this.t * 34) !== Math.floor((this.t - dt) * 34) && this.text[shown] !== " ") {
      if (++this.ticks % 2) tone(1400 + rand() * 300, 0.012, "square", 0.025);
    }
    if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) noise(0.5, 0.018, 3000, 2500);   // tape hiss
  },
  done() { return this.t * 34 >= this.text.length; },
  close() {
    const id = this.id, first = this.first;
    go(this.from, this.from === CodexScene ? undefined : {fromTape: id});
    if (first) setTimeout(() => afterTape(id), 350);
    checkTapes();
  },
  key(k) { if (!this.done()) this.t = 999; else this.close(); return true; },
  click() { this.key("enter"); return true; },
  back() { this.close(); },
  draw() {
    R(0, 0, W, H, "#07060A");
    // the cassette
    const cx = W / 2, cy = 40;
    R(cx - 44, cy - 20, 88, 44, "#1F1A28"); RO(cx - 44, cy - 20, 88, 44, C.la);
    R(cx - 36, cy - 14, 72, 14, C.pe); txt("0417 ~ " + String(this.id).padStart(2, "0"), cx, cy - 10, C.k, 1, "c");
    R(cx - 30, cy + 4, 60, 12, C.k);
    const spin = this.done() ? 0 : this.t * 5;
    for (const ox of [-18, 18]) {
      R(cx + ox - 5, cy + 5, 10, 10, "#2A2438");
      for (let s = 0; s < 3; s++) { const a = spin + s * TAU / 3; P(cx + ox + Math.round(Math.cos(a) * 3), cy + 10 + Math.round(Math.sin(a) * 3), C.lg); }
    }
    txt("TAPE " + String(this.id).padStart(2, "0") + " / " + TAPE_COUNT + "  ~  " + tapeDate(this.id), W / 2, 72, C.gy, 1, "c");
    txt(TAPES[this.id].h, W / 2, 82, C.pk, 1, "c");
    let left = Math.floor(this.t * 34);
    this.lines.forEach((l, i) => {
      if (left <= 0) return;
      txt(l.slice(0, left), 42, 100 + i * 9, C.lg);
      left -= l.length + 1;
    });
    if (!this.done() && Math.floor(this.t * 4) % 2) R(W - 30, 224, 5, 5, C.rd);
    txt(this.done() ? ctl("ANY KEY TO STOP THE TAPE", "ANY BUTTON TO STOP THE TAPE", "TAP TO STOP THE TAPE") : ctl("ANY KEY TO SKIP", "ANY BUTTON TO SKIP", "TAP TO SKIP"), W / 2, 226, C.gy, 1, "c");
  }
};

/* scripted moments after certain tapes (never more than once) */
function afterTape(id) {
  if (!meta.flags) meta.flags = {};
  const f = meta.flags;
  if (hauntMode() === 0) return;
  if (id === 6 && !f.crash1) {
    f.crash1 = 1; saveMeta();
    if (scene === HubScene) go(CrashScene, {next: HubScene});
    return;
  }
  if (id === 9 && !f.count1 && scene === HubScene) { f.count1 = 1; saveMeta(); HubScene.startCountdown(); return; }
  if (id === 12 && !f.note1) {
    f.note1 = 1; saveMeta();
    if (window.rpLeaveNote && hauntMode() === 2) {
      try { window.rpLeaveNote("i'm still down here.\r\n\r\nit's the same level over and over and i'm really good at it now.\r\n" +
        "the man who wrote the tapes stopped coming down.\r\n\r\nyou catch like me. come and play.\r\n\r\n- mlo"); } catch (e) {}
    }
    whisper("THE DOOR IS OPEN", {big: true, x: W / 2, y: 110, life: 3});
    fxGlitch(0.6);
  }
}

/* ---------------- the fake crash ---------------- */
const CrashScene = {
  captureKeys: true,
  enter(o) {
    this.next = o.next; this.t = 0; this.done = false;
    musTrack = null;
    FX.power = 0.004;
    if (scaresOn()) { noise(0.6, 0.3, 4000, 200); tone(60, 0.5, "sawtooth", 0.2, 30); }
  },
  update(dt) {
    this.t += dt;
    const t = this.t;
    if (t < 0.5) FX.power = 0.004;
    else FX.power = Math.min(1, (t - 0.5) * 5);
    if (t > 3.4 && t < 3.5) { fxGlitch(1); fxRoll(); sfxGlitch(true); }
    if (t > 6.6 && t - dt <= 6.6) { tone(90, 0.3, "square", 0.08); }
    if (t > 8) this.finish();
  },
  finish() { if (this.done) return; this.done = true; FX.power = 1; go(this.next || HubScene); fxGlitch(0.8); },
  key() { if (this.t > 2.5) this.finish(); return true; },
  click() { return this.key(); },
  draw() {
    const t = this.t;
    if (t < 3.5) {
      R(0, 0, W, H, "#00008A");
      if (t > 0.8) {
        txt("RIPOSTE ARCADE SYSTEM", 24, 24, C.wh);
        const L2 = ["A FATAL EXCEPTION 0E HAS OCCURRED AT 0417:ECHO.", "", "THE CURRENT PLAYER COULD NOT BE REMOVED.",
          "INPUT 2 IS ACTIVE. NO SECOND CONTROLLER IS CONNECTED.", "", (isTouch() ? "*  TOUCH THE SCREEN TO CONTINUE PLAYING." : "*  PRESS ANY KEY TO CONTINUE PLAYING."), "*  THERE IS NO OTHER OPTION."];
        L2.forEach((l, i) => { if (t > 1 + i * 0.25) txt(l, 24, 48 + i * 10, C.wh); });
        if (Math.floor(t * 2) % 2) R(24, 128, 5, 7, C.wh);
      }
      return;
    }
    R(0, 0, W, H, "#020308");
    const lines = [["REBOOTING", "..."], ["PLAYER 1", playerName()], ["PLAYER 2", "MLO"], ["PLAYERS DETECTED", "2"], ["SIGNAL", "FOUND YOU"]];
    lines.forEach((l, i) => {
      if (t < 4 + i * 0.5) return;
      txt(l[0], 24, 30 + i * 12, C.lg);
      txt(l[1], 190, 30 + i * 12, i >= 2 ? C.rd : C.li);
    });
    if (t > 7) txt("~", W / 2, 180, C.rd, 2, "c");
  }
};

/* ---------------- lore events in the descent ---------------- */
EVENTS.push(
  {id: "missing", t: "HAVE YOU SEEN ME?", b: "A PAPER IS TAPED TO THE WALL. MISSING: MILO, 11. LAST SEEN AT STARLITE ARCADE, 10 OCTOBER 1989. THE PHOTO HAS BEEN SCRATCHED OUT WITH SOMETHING SHARP.", minDepth: 2, cond: () => hauntLevel() >= 1, c: [
    {l: "FOLD IT INTO YOUR POCKET", go: () => { run.maxLives++; run.lives++; return "IT'S WARM. YOU FEEL STEADIER. +1 MAX SHIELD."; }},
    {l: "TEAR IT DOWN (+40 COINS)", go: () => { run.coins += 40; setTimeout(() => whisper("THAT WAS MINE"), 900); return "THERE ARE COINS TAPED BEHIND IT. SOMETHING BEHIND YOU LAUGHS."; }},
    {l: "LEAVE IT", go: () => "YOU LEAVE IT WHERE IT IS. WHEN YOU LOOK BACK, THE PHOTO ISN'T SCRATCHED ANYMORE. IT'S JUST BLACK."}]},
  {id: "other", t: "THE OTHER CABINET", b: "AN ARCADE CABINET STANDS ALONE IN THE DARK. ON ITS SCREEN, A SMALL FIGURE WITH A SHIELD IS PLAYING THIS LEVEL. IT MOVES EXACTLY THE WAY YOU DO.", cond: () => hauntLevel() >= 2, c: [
    {l: "WATCH IT", go: () => { run.revealed[run.depth] = true; return "IT WALKS SOMEWHERE ON THE MAP YOU HAVEN'T BEEN. THEN IT STOPS AND LOOKS UP AT YOU."; }},
    {l: "PLAY IT (-1 SHIELD)", go: () => { hurtRun(1); const m = rollMod("u"); gainMod(m); return "YOU LOSE. THE SCREEN SAYS PLAY AGAIN? YOU WIN " + MODS[m].n + " ANYWAY."; }},
    {l: "UNPLUG IT", go: () => { setTimeout(() => whisper("AGAIN"), 700); return "YOU PULL THE PLUG OUT OF THE WALL. THE SCREEN STAYS ON."; }}]}
);
