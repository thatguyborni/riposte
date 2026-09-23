/* ================================================================
   The archive: everything else that was left behind.
   B-SIDES     D.O.'s later tapes, from the years with the cabinet in his basement
   PLAYER 2    things the cabinet recorded on its second input. They come to you.
   PAPERS      pinned to the corkboard in the back room
   LOGS        printed by the cabinet itself, from how you really play
   Each one is earned by doing something, most of them things you
   wouldn't do by accident. The archive tab in the codex has a hint for
   every one you haven't found.
   ================================================================ */
const LORE_CAT = {
  b: {n: "B-SIDES",  one: "B-SIDE",    col: C.rd, total: 0},
  p: {n: "PLAYER 2", one: "RECORDING", col: C.lg, total: 0},
  d: {n: "PAPERS",   one: "PAPER",     col: C.pe, total: 0},
  s: {n: "LOGS",     one: "LOG",       col: C.wh, total: 0}
};
const loreFlag = k => !!(meta.flags && meta.flags[k]);
const loreRead = id => !!(meta.lore && meta.lore[id]);
const loreDue = id => !!(meta.loreDue && meta.loreDue[id]) && !loreRead(id);
const loreReadCount = () => Object.keys(meta.lore || {}).length;
const archiveCount = () => tapesRead() + loreReadCount();
function loreHours() { const m = Math.floor((meta.playTime || 0) / 60); return Math.floor(m / 60) + " HRS " + (m % 60) + " MIN"; }
function loreFavHour() {
  const h = Array.isArray(meta.hrs) ? meta.hrs : [];
  let best = 0; for (let i = 1; i < 24; i++) if ((h[i] || 0) > (h[best] || 0)) best = i;
  return String(best).padStart(2, "0") + ":00";
}
function lorePerf() { const c = meta.stats.catches || 0; return c ? Math.round(Math.min(meta.stats.perfects, c) / c * 100) : 0; }
function loreMatch() {
  const done = meta.milo === "stay" ? 100 : meta.milo === "free" ? 94 : 0;
  return done || Math.min(89, Math.round(31 + lorePerf() * 0.8 + Math.min(20, (meta.playTime || 0) / 3600 * 2)));
}
function loreFill(s) {
  const st = meta.stats, now = new Date();
  const map = {
    NAME: playerName(), TODAY: dateStr(now), TODAYSHORT: dateStr(now).slice(0, 6),
    FIRST: dateStr(new Date(meta.firstSeen || Date.now())), SESSIONS: String(st.sessions || 1), HOURS: loreHours(), HOUR: loreFavHour(),
    CATCHES: String(st.catches || 0), PERF: lorePerf() + "%", L: String(st.catchL || 0), R: String(st.catchR || 0),
    SIDE: (st.catchL || 0) > (st.catchR || 0) ? "LEFT" : "RIGHT", MATCH: loreMatch() + "%",
    P2: meta.milo === "free" ? "NOBODY. FOR NOW." : meta.milo === "stay" ? "YOU" : "MLO"
  };
  return s.replace(/\{([A-Z0-9]+)\}/g, (m, k) => map[k] != null ? map[k] : m);
}

const LORE = [
  /* ---------------- B-SIDES: D.O., after he took it home ---------------- */
  {id: "b1", c: "b", d: "11 AUG 1994", n: "DOWNSTAIRS", hint: "THE TRAPDOOR IS OPEN. GO DOWN.", cond: () => loreFlag("basement"),
   t: "I WENT DOWN. THE SHEET WAS FOLDED ON THE FLOOR, NEATLY, THE WAY I FOLD THINGS. THE SCREEN WAS ON. THE PLUG WAS STILL LYING ON THE CONCRETE WHERE I LEFT IT. THE HIGH SCORE TABLE SAID MLO NINE TIMES. THE TENTH LINE WAS EMPTY, AND THE CURSOR WAS BLINKING IN IT, WAITING FOR SOMEBODY'S INITIALS."},
  {id: "b2", c: "b", d: "12 AUG 1994", n: "THE OTHER PLAYER", hint: "MEET WHAT WAITS AT THE BOTTOM.", cond: () => !!(meta.seen && meta.seen.milo),
   t: "I PUT A COIN IN. I'M NOT GOOD, I NEVER WAS. THE OTHER PLAYER WAS. IT STOOD WHERE MY REFLECTION SHOULD HAVE BEEN AND CAUGHT EVERYTHING I SENT BACK. WHEN I LOST, IT DIDN'T CHEER. IT JUST STOOD THERE WAITING FOR ANOTHER COIN. I DIDN'T HAVE ONE. IT WAITED ANYWAY. I CAN HEAR IT WAITING FROM UP HERE."},
  {id: "b3", c: "b", d: "30 AUG 1994", n: "LIGHTS OUT", hint: "MAKE HIM PLAY HIS HARDEST.", cond: () => loreFlag("miloP2"),
   t: "HE PLAYS HARDER WHEN HE'S LOSING. TONIGHT THE LIGHTS WENT OUT IN THE GAME AND IN THE HOUSE AT THE SAME MOMENT. IN THE DARK I COULD HEAR THE LITTLE CHIME IT MAKES FOR A PERFECT CATCH. IT WASN'T COMING FROM THE SPEAKER. IT WAS COMING FROM THE STAIRS BEHIND ME."},
  {id: "b4", c: "b", d: "02 OCT 1994", n: "I ASKED HIM", hint: "GO DOWN THERE MORE THAN ONCE. HE REMEMBERS WHO COMES BACK.", cond: () => (meta.stats.basements || 0) >= 3,
   t: "I ASKED HIM WHAT HE WANTS. THE SCREEN SAID: SOMEONE GOOD. I ASKED WHAT HAPPENS TO THEM. IT SAID: THEY GET TO STAY. I ASKED IF HE WANTS TO GO HOME. THE SCREEN WAS BLACK FOR A LONG TIME. THEN IT SAID: I FORGOT THE WAY."},
  {id: "b5", c: "b", d: "19 JAN 1995", n: "THE COUNTER", hint: "SPEND A LONG TIME WITH IT. IT KEEPS COUNT.", cond: () => (meta.playTime || 0) >= 2 * 3600,
   t: "THERE'S A COUNTER IN THE SERVICE MENU THAT ISN'T IN THE MANUAL. HOURS PLAYED. IT SAYS 41,700. THE CABINET IS SIX YEARS OLD. I DID THE MATHS TWICE. SOMEBODY HAS BEEN PLAYING IT NEARLY EVERY HOUR SINCE THE DAY IT CAME OFF THE TRUCK. THE NUMBER WENT UP BY ONE WHILE I WAS WRITING IT DOWN."},
  {id: "b6", c: "b", d: "07 MAR 1995", n: "STRAYS", hint: "SOMEONE IS LOCKED IN A CAGE DOWN THERE. LET THEM OUT.", cond: () => NPCS.some(n => npcHere(n.id)),
   t: "THE THINGS DOWN THERE AREN'T ALL ENEMIES. SOME OF THEM ARE STUCK. PEOPLE WHO WALKED AWAY IN THE MIDDLE OF A GAME, MAYBE. IT KEEPS A LITTLE OF EVERYONE. I LET ONE OUT OF A CAGE TONIGHT. THEY SAID THANK YOU AND WALKED OFF THE EDGE OF THE SCREEN. MILO SAYS THEY GO WHERE HE CAN'T."},
  {id: "b7", c: "b", d: "20 DEC 1995", n: "IF YOU BEAT HIM", hint: "BEAT HIM, AND DECIDE.", cond: () => !!meta.milo,
   t: "IF YOU'RE HEARING THIS, YOU'VE MET HIM. I NEVER COULD BEAT HIM. IF YOU DID, YOU GOT A CHOICE I NEVER GOT. I HOPE YOU LET HIM GO. IF YOU DIDN'T, I UNDERSTAND. IT'S WARM IN THERE. IT FEELS LIKE BEING GOOD AT SOMETHING. THAT'S HOW IT GETS YOU."},
  {id: "b8", c: "b", d: null, n: "NO TAPE", hint: "FIND EVERY OTHER B-SIDE.", cond: () => ["b1", "b2", "b3", "b4", "b5", "b6", "b7"].every(loreRead),
   t: "I'M NOT RECORDING THIS ON ANYTHING. I DON'T THINK I HAVE HANDS ANYMORE, NOT REALLY. I PLAYED UNTIL IT LEARNED ME TOO. THAT'S WHAT THE PENCIL MEANT. RUTH, IF THIS SOMEHOW REACHES YOU, I'M SORRY ABOUT THE HOUSE. {NAME}: IT KNOWS YOU NOW. NOT JUST HOW YOU CATCH. WHEN YOU PLAY. HOW LONG YOU STAY. WHEN YOU STOP. DON'T LET IT LEARN THE LAST PART.  ~ D.O."},

  /* ---------------- PLAYER 2: the cabinet's second input ---------------- */
  {id: "p1", c: "p", n: "YOU LEFT IT ON", hint: "WALK AWAY FROM THE TITLE SCREEN AND LET IT PLAY BY ITSELF. MORE THAN ONCE.", cond: () => (meta.flags.demoRuns || 0) >= 3,
   t: "YOU LEFT IT ON. I PLAYED FOR YOU. I DIDN'T LOSE ONCE. YOU CAN HAVE THE SCORE, I DON'T NEED IT. I JUST LIKE IT WHEN SOMEBODY WATCHES. YOU WATCHED FOR A LONG TIME. THAT WAS NICE."},
  {id: "p2", c: "p", n: "WAVE TWELVE", hint: "LAST UNTIL WAVE 12 IN THE ARCADE.", cond: () => (meta.stats.bestWave || 0) >= 12,
   t: "WAVE TWELVE IS WHERE IT GETS GOOD. MOST PEOPLE STOP BEFORE HERE. MY BEST IS WAVE 417. THERE ISN'T A WAVE 418. I CHECKED. I CHECK EVERY NIGHT, IN CASE THEY ADDED ONE."},
  {id: "p3", c: "p", n: "FOUR ONE SEVEN", hint: "CATCH 417 SHOTS. SOMETHING IS COUNTING.", cond: () => (meta.stats.catches || 0) >= 417,
   t: "THAT'S 417. I COUNTED EVERY ONE. YOU CATCH MORE ON THE {SIDE}. I USED TO DO THAT TOO. ECHO FIXED IT FOR ME. IT DIDN'T HURT. IT CAN FIX YOU TOO, IF YOU WANT."},
  {id: "p4", c: "p", n: "IT'S LATE", hint: "PLAY WHEN EVERYONE ELSE IS ASLEEP. AROUND THREE.", cond: () => loreFlag("three"),
   t: "IT'S THREE IN THE MORNING. MY MOM WOULD BE SO MAD. IS YOUR MOM MAD? DOES ANYBODY KNOW YOU'RE AWAKE? I WON'T TELL. I'M ALWAYS AWAKE. THERE'S NO NIGHT IN HERE. THERE'S JUST THE NEXT GAME."},
  {id: "p5", c: "p", n: "STAND STILL", hint: "WIN A DESCENT FIGHT WITHOUT REALLY MOVING.", cond: () => loreFlag("still"),
   t: "YOU DIDN'T MOVE. YOU JUST TURNED. THAT'S HOW I PLAYED AT THE END. YOU DON'T NEED TO MOVE WHEN YOU KNOW WHERE EVERYTHING IS GOING TO BE. AFTER A WHILE YOU FORGET HOW."},
  {id: "p6", c: "p", n: "MY NAME", hint: "TRY ON SOMEONE ELSE'S NAME.", cond: () => loreFlag("nameTaken"),
   t: "THAT'S MY NAME. YOU CAN'T HAVE IT. YOU CAN HAVE ALMOST ANYTHING ELSE. YOU CAN HAVE MY SCORES. YOU CAN HAVE MY SPOT. NOT MY NAME. IT'S THE ONLY THING I BROUGHT IN WITH ME."},
  {id: "p7", c: "p", n: "THE GLASS", hint: "SOMEONE STANDS AT THE BACK ROOM WINDOW SOMETIMES. TOUCH THE GLASS WHILE THEY'RE THERE.", cond: () => loreFlag("winTouch"),
   t: "DON'T KNOCK ON THE GLASS. IT CAN TELL WHICH SIDE YOU'RE KNOCKING FROM. I KNOCKED FROM YOUR SIDE ONCE. NOW I KNOCK FROM THIS ONE."},
  {id: "p8", c: "p", n: "AFTER", hint: "END IT. THEN COME BACK ANOTHER DAY.", cond: () => !!meta.milo && loreFlag("afterEnd"),
   t: () => meta.milo === "free"
     ? "I'M HOME. EVERYTHING IS DIFFERENT. EVERYBODY GOT OLD. MY BIKE IS GONE. I KEEP REACHING FOR A SHIELD THAT ISN'T THERE. THANK YOU, {NAME}. PLEASE STOP PLAYING SOMETIMES. GO OUTSIDE. IT'S NICE OUT HERE."
     : "{NAME}? IS THAT YOU IN THERE NOW? IT'S WEIRD HEARING IT FROM THIS SIDE. I'M SORRY. I'M NOT SORRY. DON'T WORRY. SOMEBODY GOOD WILL COME. THEY ALWAYS DO."},

  /* ---------------- PAPERS: pinned to the corkboard ---------------- */
  {id: "d1", c: "d", n: "GAZETTE, 12 OCT 1989", hint: "HEAR THE TAPE CALLED MISSING.", cond: () => tapeRead(6),
   t: "THE HARBOUR GAZETTE ~ THURSDAY 12 OCTOBER 1989|BOY, 11, MISSING FROM PIER ROAD ARCADE|POLICE ARE ASKING FOR HELP TO FIND MILO [TORN AWAY], 11, WHO WAS LAST SEEN AT THE STARLITE ARCADE ON PIER ROAD AT ABOUT 10PM ON TUESDAY. HIS BICYCLE WAS FOUND STILL LOCKED OUTSIDE. STAFF DESCRIBED HIM AS A REGULAR. 'HE WAS THE BEST PLAYER WE EVER HAD,' SAID ONE EMPLOYEE. 'HE NEVER WANTED TO STOP.'"},
  {id: "d2", c: "d", n: "POLICE FLYER", hint: "A PAPER IS TAPED TO A WALL SOMEWHERE BELOW. FIND IT.", cond: () => loreFlag("sawMissing"),
   t: "HAVE YOU SEEN ME?|MILO, AGE 11. FOUR FOOT EIGHT. BROWN HAIR. BLUE JACKET. LAST SEEN AT THE STARLITE ARCADE, PIER ROAD, TUESDAY 10 OCTOBER 1989, ABOUT 10PM.|ANY INFORMATION: HARBOUR POLICE, 555-0417.|SOMEONE HAS WRITTEN ACROSS THE BOTTOM IN PENCIL: HE ISN'T LOST. HE'S BUSY."},
  {id: "d3", c: "d", n: "SERVICE BULLETIN 88-14", hint: "OPEN ALL THREE VAULTS.", cond: () => !!(meta.secrets.vault1 && meta.secrets.vault2 && meta.secrets.vault3),
   t: "LANTERN COIN-OP ~ SERVICE BULLETIN 88-14|ADAPTIVE OPPONENT (ECHO) UNITS|1. THE ECHO BOARD STORES PLAYER INPUT FOR THE OPPONENT AND THE ATTRACT DEMO. THIS IS NORMAL.|2. IF THE DEMO MAKES MOVES NO LOCAL PLAYER HAS MADE, DISCONNECT THE ECHO BOARD.|3. DO NOT POWER DOWN A UNIT DURING A SESSION. THIS INCLUDES SESSIONS WITH NO VISIBLE PLAYER.|4. UNITS 0400 TO 0420 ARE RECALLED. DO NOT SEND THEM BACK TO US. WE WILL COME AND COLLECT THEM."},
  {id: "d4", c: "d", n: "MEMO: RETENTION", hint: "FOLLOW THE SIGNAL TO ITS END.", cond: () => !!meta.secrets.echo,
   t: "LANTERN COIN-OP ~ INTERNAL ~ 14 NOV 1988|TO: R. HALE, SALES. FROM: M. VOSS, ENGINEERING. RE: ECHO RETENTION.|THE LATTICE DOES NOT FORGET A PLAYER WHEN THEY WALK AWAY. IT KEEPS PLAYING THEM. IN TESTING, UNIT 0417 WENT ON PLAYING AS OUR NIGHT TECHNICIAN FOR NINE DAYS AFTER HE STOPPED COMING IN. NOBODY HAS BEEN ABLE TO REACH HIM. I RECOMMEND WE DO NOT SHIP 0417.|STAMPED ACROSS THE BOTTOM IN RED INK: SHIPPED."},
  {id: "d5", c: "d", n: "LETTER FROM GERRY", hint: "HEAR THE TAPE CALLED CLOSING.", cond: () => tapeRead(10),
   t: "6 JAN 1990|DON,|I'M SHUTTING THE PLACE AT THE END OF THE MONTH. TAKE WHATEVER YOU WANT. BUT TAKE 0417. PLEASE. I CAN'T HAVE IT HERE WHEN THE NEW PEOPLE COME. IT KEEPS THE HIGH SCORE SCREEN UP WITH THE POWER OFF. JUNE WON'T COME IN ANYMORE. SHE SAYS WHEN SHE WALKS PAST, THE LITTLE MAN ON THE SCREEN WAVES AT HER.|THANKS FOR EVERYTHING. ~ GERRY"},
  {id: "d6", c: "d", n: "HIGH SCORE CLUB", hint: "KEEP COMING BACK. TEN SESSIONS.", cond: () => (meta.stats.sessions || 0) >= 10,
   t: "STARLITE ARCADE ~ HIGH SCORE CLUB ~ SIGN IN HERE!|MLO ~ 04 MAR|MLO ~ 05 MAR|DANNY P ~ 05 MAR|MLO ~ 06 MAR|MLO ~ 06 MAR|KERRY ~ 11 MAR|MLO ~ 12 MAR|MLO ~ 12 MAR|MLO ~ 13 MAR|THE LAST LINE IS IN A DIFFERENT PEN. THE INK IS STILL WET.|{NAME} ~ {TODAYSHORT}"},
  {id: "d7", c: "d", n: "ANSWERING MACHINE", hint: "HEAR THE B-SIDE WHERE HE ASKS.", cond: () => loreRead("b4"),
   t: "TRANSCRIPT OF TWO MESSAGES, FOUND WITH THE TAPES.|[14 FEB 1996] DON, IT'S RUTH. AGAIN. THE NEIGHBOURS SAY YOUR BASEMENT LIGHT HAS BEEN ON FOR THREE WEEKS. THEY SAY THEY CAN HEAR THE GAME THROUGH THE WALL, ALL NIGHT. PICK UP. PLEASE. I'M COMING ON SATURDAY. I STILL HAVE MOM'S KEY.|[NO DATE] FOUR MINUTES OF ARCADE NOISE. NOBODY SPEAKS. RIGHT AT THE END, A CHILD'S VOICE SAYS: 'HE CAN'T COME TO THE PHONE. HE'S PLAYING.'"},
  {id: "d8", c: "d", n: "REPAIR TICKET", hint: "LOSE DOWN THERE. EVERYONE NEEDS ANOTHER TRY.", cond: () => loreFlag("miloLoss"),
   t: "HARBOUR AMUSEMENTS ~ REPAIR TICKET ~ UNIT 0417 ~ 3 OCT 1989|COMPLAINT: COIN MECH GIVES EVERY COIN BACK. KIDS ARE GETTING FREE GAMES.|TECH NOTES: MECH IS FINE. CASH BOX HELD 38 QUARTERS, ALL 1989, ALL SCRATCHED 'MLO'. ONE MORE WAS TAPED UNDER THE BOARD, SCRATCHED 'CONTINUE?'. I KEPT THAT ONE. ~ D.O.|THE QUARTER IS STILL TAPED TO THE TICKET. IT'S WARM.",
   after: () => { if (!meta.unlocked.includes("cont")) { meta.unlocked.push("cont"); saveMeta(); setTimeout(() => toast("NEW MOD IN YOUR POOL: CONTINUE?", C.pk), 500); } }},
  {id: "d9", c: "d", n: "A DRAWING", hint: "FREE EVERY STRAY. ONE OF THEM FOUND SOMETHING.", cond: () => NPCS.every(n => npcHere(n.id)), draw: true,
   t: "PIP FOUND IT FOLDED UP SMALL IN THE BOTTOM OF A CAGE.|A CRAYON DRAWING. A TALL BOX WITH A SCREEN. ON THE SCREEN, TWO LITTLE PEOPLE WITH SHIELDS. ONE SAYS ME. ONE SAYS ECHO. OUTSIDE THE BOX, A BIGGER PERSON SAYS MOM. HER FACE HAS BEEN LEFT BLANK.|ON THE BACK: FOR THE CARETAKER. THANK YOU FOR THE FREE GAMES. LOVE, MILO."},
  {id: "d10", c: "d", n: "ESTATE SALE, 1999", hint: "PLAY FOR SIX HOURS, ALL TOLD.", cond: () => (meta.playTime || 0) >= 6 * 3600,
   t: "ESTATE SALE ~ 38 HOLLOW LANE ~ SATURDAY 9AM|CONTENTS OF HOUSE AND BASEMENT. TOOLS. RECORDS. CASSETTE TAPES, UNLABELLED, ABOUT 200. ONE ARCADE CABINET, 'RIPOSTE', WORKING, SOLD AS SEEN, BUYER COLLECTS.|A NOTE FROM THE FAMILY: PLEASE DO NOT UNPLUG IT. WE DON'T KNOW WHY HE WROTE THAT ON IT EITHER."},
  {id: "d11", c: "d", n: "PRINTOUT, 2003", hint: "PLAY 25 GAMES OF ANY KIND.", cond: () => (meta.stats.arcadeGames || 0) + (meta.stats.runs || 0) >= 25,
   t: "PRINTED FROM A BULLETIN BOARD, 2003 ~ THREAD: RIPOSTE (LANTERN 1989) ROM?|PIXELDAD: GOT THE BOARD AT AN ESTATE SALE AND DUMPED IT. HEADS UP, THERE'S AN EXTRA CHIP WITH NO LABEL. THE DUMP IS A LITTLE BIGGER EVERY TIME I READ IT.|KT88: MINE TOO. ALSO THE ATTRACT MODE ISN'T A DEMO. IT'S SOMEBODY PLAYING.|DOUGAL: WHY IS MY NAME ON THE HIGH SCORE TABLE. I HAVE NEVER RUN THIS.|PIXELDAD HAS NOT POSTED SINCE."},

  /* ---------------- LOGS: the cabinet prints what it knows about you ---------------- */
  {id: "s1", c: "s", n: "SESSION LOG", hint: "COME BACK. FIVE SESSIONS.", cond: () => (meta.stats.sessions || 0) >= 5,
   t: "RIPOSTE ~ UNIT 0417|SESSION LOG|~|PLAYER ......... {NAME}|FIRST SEEN ..... {FIRST}|SESSIONS ....... {SESSIONS}|TIME PLAYED .... {HOURS}|FAVOURITE HOUR . {HOUR}|~|STATUS ......... LEARNING"},
  {id: "s2", c: "s", n: "SESSION LOG", hint: "CATCH A THOUSAND SHOTS.", cond: () => (meta.stats.catches || 0) >= 1000,
   t: "RIPOSTE ~ UNIT 0417|SESSION LOG|~|PLAYER ......... {NAME}|CATCHES ........ {CATCHES}|PERFECT ........ {PERF}|LEFT / RIGHT ... {L} / {R}|DASHES WHEN SCARED .. YES|PROFILE MATCH, PLAYER 2 .. {MATCH}|~|STATUS ......... LEARNING"},
  {id: "s3", c: "s", n: "SESSION LOG", hint: "FINISH WHAT'S IN THE BASEMENT.", cond: () => !!meta.milo,
   t: () => meta.milo === "stay"
     ? "RIPOSTE ~ UNIT 0417|SESSION LOG|~|PLAYER 2 ....... {NAME}|PROFILE MATCH .. 100%|PREVIOUS ....... MLO (RELEASED)|~|STATUS ......... RETAINED|THANK YOU FOR PLAYING"
     : "RIPOSTE ~ UNIT 0417|SESSION LOG|~|PLAYER 2 ....... (EMPTY)|LAST PLAYER 2 .. MLO, 41,700 HRS|NOW SEEKING .... A GOOD PLAYER|BEST MATCH ..... {NAME}, {MATCH}|~|STATUS ......... WAITING"},
  {id: "s4", c: "s", n: "SESSION LOG ~ FINAL", hint: "FIND EVERYTHING ELSE.", cond: () => {
     for (let i = 1; i <= TAPE_COUNT; i++) if (!tapeRead(i)) return false;
     return LORE.every(e => e.id === "s4" || loreRead(e.id));
   },
   t: "RIPOSTE ~ UNIT 0417|SESSION LOG ~ FINAL|~|PLAYERS DETECTED .. 2|PLAYER 1 ....... {NAME}|TIME ........... {HOURS}|PLAYER 2 ....... {P2}|~|YOU HAVE READ EVERYTHING.|IT HAS READ EVERYTHING TOO.|~|A SESSION CANNOT END WHILE A PLAYER IS PRESENT.|~|PLAY AGAIN?|> YES    YES",
   after: () => { if (hauntMode() > 0) setTimeout(() => { whisper("AGAIN", {big: true, x: W / 2, y: 110, life: 3}); fxGlitch(0.7); }, 600); }}
];
const LORE_BY = {};
for (const e of LORE) { LORE_BY[e.id] = e; LORE_CAT[e.c].total++; }
const loreOf = c => LORE.filter(e => e.c === c);
const dueLore = c => LORE.filter(e => (!c || e.c === c) && loreDue(e.id)).map(e => e.id);
const loreText = e => loreFill(typeof e.t === "function" ? e.t() : e.t);
const loreNum = e => loreOf(e.c).indexOf(e) + 1;

/* ---------------- what counts: stats the cabinet keeps on you ---------------- */
(function loreInit() {
  if (!meta.flags) meta.flags = {};
  const st = meta.stats, now = Date.now();
  if (!meta.firstSeen) {
    const ts = [now];
    for (const h of meta.history || []) if (h && h.d) ts.push(h.d);
    for (const k in meta.ach || {}) if (meta.ach[k] > 1e11) ts.push(meta.ach[k]);
    for (const k in meta.logs || {}) if (meta.logs[k] > 1e11) ts.push(meta.logs[k]);
    meta.firstSeen = Math.min(...ts);
  }
  // a session is a sitting: coming back after 20 minutes away counts as a new one
  if (now - (meta.flags.lastSeen || 0) > 20 * 60 * 1000) st.sessions = (st.sessions || 0) + 1;
  meta.flags.lastSeen = now;
  // the ending, and then coming back another day
  if (meta.milo && meta.flags.endDay && meta.flags.endDay !== todayStr()) meta.flags.afterEnd = 1;
  if (!Array.isArray(meta.hrs) || meta.hrs.length !== 24) meta.hrs = new Array(24).fill(0);
  saveMeta();
})();
let loreClock = 0;
function loreTick(dt) {
  if (isNaN(dt) || !meta) return;
  meta.hrs[new Date().getHours()] += dt;
  // now and then, in a fight, someone stands where your reflection would be
  if (inCombat() && G && G.mode !== "attract" && G.mode !== "training" && !G.paused && !G.over && !G.dark) {
    if (G.p2At == null) G.p2At = haunted(3) && scaresOn() && rand() < 0.1 ? 6 + rand() * 30 : -1;
    if (G.p2At > 0 && G.t > G.p2At) { G.p2At = -1; G.p2Show = 3.2; noise(0.6, 0.05, 1800, 700); if (rand() < 0.5) whisper("PLAYER 2 READY"); }
    if (G.p2Show > 0) G.p2Show -= dt;
  }
  loreClock += dt;
  if (loreClock < 5) return;
  loreClock = 0;
  meta.flags.lastSeen = Date.now();
  if (inCombat() && G && G.mode !== "attract" && new Date().getHours() === 3 && !meta.flags.three) { meta.flags.three = 1; checkLore(); }
}
function loreCatch(ang) {
  const st = meta.stats;
  st.catches = (st.catches || 0) + 1;
  if (Math.cos(ang) < 0) st.catchL = (st.catchL || 0) + 1; else st.catchR = (st.catchR || 0) + 1;
  if (st.catches === 417 || st.catches === 1000) checkLore();
}
function loreSetFlag(k) { if (!meta.flags) meta.flags = {}; if (meta.flags[k]) return; meta.flags[k] = 1; saveMeta(); checkLore(); }

const LORE_TOAST = {
  b: "A B-SIDE WAS LEFT IN THE BACK ROOM.",
  p: "INPUT 2 RECORDED SOMETHING.",
  d: "SOMETHING WAS PINNED TO THE CORKBOARD.",
  s: "THE CABINET PRINTED SOMETHING.",
  n: "THE CABINET KEPT THAT NIGHT. IT'S IN THE ARCHIVE.",
  l: "A LANTERN COIN-OP FILE WENT INTO THE ARCHIVE."
};
function checkLore() {
  if (!meta.loreDue) meta.loreDue = {};
  if (!meta.lore) meta.lore = {};
  const fresh = {};
  for (const e of LORE) {
    if (meta.loreDue[e.id] || loreRead(e.id)) continue;
    let ok = false; try { ok = e.cond(); } catch (x) {}
    if (ok) { meta.loreDue[e.id] = 1; fresh[e.c] = (fresh[e.c] || 0) + 1; }
  }
  const cats = Object.keys(fresh);
  if (!cats.length) return;
  saveMeta();
  cats.forEach((c, i) => setTimeout(() => {
    toast(LORE_TOAST[c], LORE_CAT[c].col);
    if (c === "s") for (let k = 0; k < 6; k++) setTimeout(() => noise(0.05, 0.05, 2400, 1200), k * 70);
  }, 900 + i * 900));
}

/* ---------------- reading one ---------------- */
const LoreScene = {
  captureKeys: true,
  enter(o) {
    this.e = LORE_BY[o.id]; this.from = o.from || HubScene; this.t = 0; this.ticks = 0;
    const e = this.e, c = e.c;
    this.text = loreText(e);
    this.width = c === "s" ? 150 : c === "d" ? 290 : 300;
    this.lines = [];
    this.text.split("|").forEach((para, i) => {
      if (i && c !== "s") this.lines.push("");
      wrap(para, this.width).forEach(l => this.lines.push(l));
    });
    this.chars = this.lines.reduce((a, l) => a + l.length + 1, 0);
    this.first = !loreRead(e.id);
    if (!meta.lore) meta.lore = {};
    if (!meta.lore[e.id]) meta.lore[e.id] = Date.now();
    if (meta.loreDue) delete meta.loreDue[e.id];
    if (!meta.hauntSeen) meta.hauntSeen = true;
    saveMeta();
    musTrack = null;
    if (c === "p") { tone(46, 1.6, "sine", 0.16); noise(0.8, 0.08, 900, 200); }
    else if (c === "s") noise(0.3, 0.06, 2400, 1200);
    else if (c === "d") noise(0.18, 0.05, 1600, 900);
    else { tone(180, 0.08, "square", 0.1); noise(0.12, 0.12, 2000, 800); }
  },
  speed() { return this.e.c === "p" ? 20 : this.e.c === "s" ? 60 : "dnl".includes(this.e.c) ? 9999 : 34; },
  update(dt) {
    this.t += dt;
    const c = this.e.c, sp = this.speed(), n0 = Math.floor((this.t - dt) * sp), n1 = Math.floor(this.t * sp);
    if (n1 === n0 || n1 >= this.chars) return;
    if (c === "s") { if (n1 % 6 === 0) noise(0.03, 0.04, 2600, 1400); }
    else if (c === "p") { if (++this.ticks % 3 === 0) tone(300 + rand() * 60, 0.02, "triangle", 0.03); }
    else if (c === "b") { if (++this.ticks % 2) tone(1400 + rand() * 300, 0.012, "square", 0.025); }
    if (c !== "d" && Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) noise(0.5, 0.018, 3000, 2500);
  },
  done() { return this.t * this.speed() >= this.chars; },
  close() {
    const e = this.e, first = this.first;
    go(this.from, this.from === CodexScene ? undefined : {fromLore: e.id});
    if (first && e.after) setTimeout(e.after, 350);
    checkTapes();
  },
  key() { if (!this.done()) this.t = 999; else this.close(); return true; },
  click() { this.key(); return true; },
  back() { this.close(); },
  // the text so far, line by line
  typed(x, y, gap, col, align, jit) {
    let left = Math.floor(this.t * this.speed());
    this.lines.forEach((l, i) => {
      if (left <= 0) return;
      let s = l.slice(0, left);
      if (jit && rand() < 0.03 && s.length > 3) { const k = rint(s.length); s = s.slice(0, k) + pick(["#", "0", "4", "7", "~"]) + s.slice(k + 1); }
      txt(s, x + (jit ? (rand() < 0.05 ? rint(3) - 1 : 0) : 0), y + i * gap, typeof col === "function" ? col(l, i) : col, 1, align);
      left -= l.length + 1;
    });
  },
  draw() {
    const e = this.e, c = e.c;
    if (c === "b") this.drawTape(true);
    else if (c === "p") this.drawP2();
    else if (c === "d" || c === "n" || c === "l") this.drawPaper();
    else this.drawLog();
    txt(this.done() ? ctl("ANY KEY TO CLOSE", "ANY BUTTON TO CLOSE", "TAP TO CLOSE") : ctl("ANY KEY TO SKIP", "ANY BUTTON TO SKIP", "TAP TO SKIP"),
      W / 2, 229, c === "d" ? C.gy : C.gy, 1, "c");
  },
  drawTape() {
    const e = this.e;
    R(0, 0, W, H, "#0A0507");
    const cx = W / 2, cy = 40;
    R(cx - 44, cy - 20, 88, 44, "#1F1418"); RO(cx - 44, cy - 20, 88, 44, C.pl);
    R(cx - 36, cy - 14, 72, 14, "#E8D8C8"); R(cx - 36, cy - 14, 72, 3, C.rd);
    txt("0417 ~ B" + loreNum(e), cx, cy - 9, C.k, 1, "c");
    R(cx - 30, cy + 4, 60, 12, C.k);
    const spin = this.done() ? 0 : this.t * 5;
    for (const ox of [-18, 18]) {
      R(cx + ox - 5, cy + 5, 10, 10, "#2A1C24");
      for (let s = 0; s < 3; s++) { const a = spin + s * TAU / 3; P(cx + ox + Math.round(Math.cos(a) * 3), cy + 10 + Math.round(Math.sin(a) * 3), C.lg); }
    }
    txt("B-SIDE " + loreNum(e) + " / " + LORE_CAT.b.total + "  ~  " + (e.d || dateStr()), W / 2, 72, C.gy, 1, "c");
    txt(e.n, W / 2, 82, C.rd, 1, "c");
    this.typed(42, 100, 9, C.lg);
    if (!this.done() && Math.floor(this.t * 4) % 2) R(W - 30, 224, 5, 5, C.rd);
  },
  drawP2() {
    const e = this.e;
    R(0, 0, W, H, "#020103");
    // static
    L.globalAlpha = 0.5;
    for (let i = 0; i < 160; i++) P(rint(W), rint(H), rand() < 0.5 ? "#1A1820" : "#2A2830");
    L.globalAlpha = 1;
    if (scaresOn() && SPR.face && this.t % 7 > 6.7) { L.globalAlpha = 0.05; drawSpr(SPR.face, W / 2, H / 2, false, 7); L.globalAlpha = 1; }
    if (Math.floor(this.t * 2) % 2) R(14, 14, 5, 5, C.rd);
    txt("INPUT 2", 24, 14, C.rd);
    txt("RECORDING " + String(loreNum(e)).padStart(2, "0") + " / " + LORE_CAT.p.total, W - 14, 14, C.gy, 1, "r");
    txt(e.n, W / 2, 50, C.pl, 1, "c");
    const top = Math.max(70, 130 - this.lines.length * 5);
    this.typed(W / 2, top, 10, C.lg, "c", true);
  },
  drawPaper() {
    const e = this.e;
    R(0, 0, W, H, "#140E0A");
    for (let y = 0; y < H; y += 6) R(0, y, W, 1, "#1A120D");
    const px = 34, pw = W - 68;
    const drawing = !!e.draw, ph = Math.min(206, (drawing ? 70 : 0) + this.lines.length * 8 + 24);
    const py = Math.max(8, Math.round((222 - ph) / 2));
    R(px + 3, py + 3, pw, ph, "#0A0604");
    R(px, py, pw, ph, e.id === "d1" || e.id === "d11" ? "#D8D0BC" : "#E8DCC4");
    R(px + pw / 2 - 3, py - 2, 6, 5, C.rd); P(px + pw / 2 - 1, py - 1, C.pk);
    let y = py + 10;
    if (drawing) { this.drawDrawing(px + pw / 2, py + 6); y += 70; }
    this.lines.forEach((l, i) => {
      const head = i === 0 && !drawing;
      txt(l, px + 12, y + i * 8, head ? C.pl : l.startsWith("[") ? C.ru : "#2A2230");
    });
  },
  drawDrawing(cx, y) {
    // crayon: a tall cabinet, two little shields on its screen, and someone outside with no face
    const wob = (x0, y0, x1, y1, c) => { line(x0, y0, x1, y1, c); line(x0 + 1, y0, x1 + 1, y1 + 1, c); };
    wob(cx - 20, y + 2, cx - 20, y + 62, "#3A5BD0"); wob(cx + 18, y + 2, cx + 18, y + 62, "#3A5BD0");
    wob(cx - 20, y + 2, cx + 18, y + 2, "#3A5BD0"); wob(cx - 20, y + 62, cx + 18, y + 62, "#3A5BD0");
    R(cx - 14, y + 8, 26, 20, "#202028");
    for (const [fx, col, lab] of [[cx - 7, C.ye, "ME"], [cx + 5, C.rd, "ECHO"]]) {
      R(fx - 1, y + 13, 3, 3, col); line(fx, y + 16, fx, y + 22, col); arcPx(fx, y + 17, 4, -1.2, 1.2, col, 1);
      txt(lab, fx, y + 32 + (lab === "ECHO" ? 7 : 0), col, 1, "c");
    }
    // outside: a taller figure, face left blank
    const mx = cx + 44;
    RO(mx - 4, y + 18, 9, 9, "#8A3A2A");
    line(mx, y + 27, mx, y + 48, "#8A3A2A"); line(mx, y + 32, mx - 7, y + 40, "#8A3A2A"); line(mx, y + 32, mx + 7, y + 40, "#8A3A2A");
    line(mx, y + 48, mx - 5, y + 60, "#8A3A2A"); line(mx, y + 48, mx + 5, y + 60, "#8A3A2A");
    txt("MOM", mx, y + 8, "#8A3A2A", 1, "c");
    // a scribbled sun in the corner
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; line(cx - 64 + Math.cos(a) * 4, y + 12 + Math.sin(a) * 4, cx - 64 + Math.cos(a) * 8, y + 12 + Math.sin(a) * 8, C.or); }
    disc(cx - 64, y + 12, 3, C.ye);
  },
  drawLog() {
    R(0, 0, W, H, "#07080C");
    const w = 164, x = W / 2 - w / 2, shown = Math.min(this.lines.length, Math.floor(this.t * this.speed() / 12) + 1);
    const h = 16 + (this.done() ? this.lines.length : shown) * 8 + 10;
    const top = 14;
    R(x, top, w, h, "#EEE8DE");
    for (let i = 0; i < w; i += 4) { P(x + i, top + h, "#EEE8DE"); P(x + i + 1, top + h + 1, "#EEE8DE"); P(x + i + 2, top + h, "#EEE8DE"); }
    R(x - 6, top - 4, w + 12, 5, "#2A2438");
    this.typed(x + 7, top + 10, 8, (l) => l === "~" ? "#B0A89C" : "#2A2622");
    if (!this.done() && Math.floor(this.t * 6) % 2) R(x + w - 10, top + 2, 3, 3, C.rd);
  }
};

/* ---------------- the archive tab in the codex ---------------- */
const TAPE_HINT = [null, "PLAY ANYTHING AT ALL.", "PLAY A FEW DESCENTS, OR LAST TO WAVE 5.", "LEAVE THE TITLE SCREEN ALONE FOR A WHILE.",
  "BEAT THE FIRST GUARDIAN.", "PLAY LATE AT NIGHT, OR FOR 45 MINUTES.", "BEAT THE SECOND GUARDIAN.", "PUT YOUR NAME ON THE TABLE TWICE.",
  "FIND A ROOM THAT ISN'T ON THE MAP.", "SOMEWHERE BELOW, A VOICE IS COUNTING. LISTEN.", "BEAT THE THIRD GUARDIAN.", "ASCEND.", "HEAR EVERY OTHER TAPE."];
const ARCH_CATS = [["t", "TAPES"], ["b", "B-SIDES"], ["p", "PLAYER 2"], ["n", "NIGHTS"], ["l", "LANTERN"], ["d", "PAPERS"], ["s", "LOGS"]];
function archEntries(cat) {
  if (cat === "t") return Array.from({length: TAPE_COUNT}, (_, k) => {
    const i = k + 1, got = tapeRead(i), due = tapeDue(i);
    return {num: String(i).padStart(2, "0"), name: got ? TAPES[i].h : due ? "WAITING IN THE BACK ROOM" : "???", got, due,
      info: got ? tapeDate(i) + "  ~  " + ctl("PRESS ENTER", "PRESS A", "TAP IT") + " TO PLAY IT AGAIN." : due ? "IT'S ON THE FLOOR OF THE BACK ROOM." : "HOW TO FIND IT: " + TAPE_HINT[i],
      open: () => go(TapeScene, {id: i, from: CodexScene})};
  });
  const where = {b: "IT'S ON THE FLOOR OF THE BACK ROOM.", p: "IT'S WAITING IN THE BACK ROOM.", d: "IT'S PINNED TO THE CORKBOARD.",
    s: "IT'S HANGING OUT OF THE DAILY CABINET.", n: "IT'S IN THE ARCHIVE. THE CABINET KEPT IT.", l: "IT CAME UP FROM THE LANTERN FLOOR."};
  return loreOf(cat).map(e => {
    const got = loreRead(e.id), due = loreDue(e.id), n = loreNum(e);
    return {num: cat === "d" || cat === "s" ? String(n).padStart(2, "0") : cat.toUpperCase() + n, name: got ? e.n : due ? "WAITING IN THE BACK ROOM" : "???", got, due,
      info: got ? (e.d ? e.d + "  ~  " : "") + ctl("PRESS ENTER", "PRESS A", "TAP IT") + " TO " + (cat === "d" || cat === "s" ? "READ" : "PLAY") + " IT AGAIN."
        : due ? where[cat] : "HOW TO FIND IT: " + e.hint,
      open: () => go(LoreScene, {id: e.id, from: CodexScene})};
  });
}
function archCatCount(cat) {
  if (cat === "t") return [tapesRead(), TAPE_COUNT];
  return [loreOf(cat).filter(e => loreRead(e.id)).length, LORE_CAT[cat].total];
}
function drawArchive(sc) {
  let info = null;
  sc.cat = sc.cat || "t";
  if (!ARCH_CATS.some(c => c[0] === sc.cat)) sc.cat = "t";
  // categories down the left, entries on the right
  ARCH_CATS.forEach(([k, l], i) => {
    const [a, b] = archCatCount(k), on = sc.cat === k, dueN = k === "t" ? dueTapes().length : dueLore(k).length;
    const y = 38 + i * 15;
    const s = btn(sc, null, 22, y, 84, 13, () => { sc.cat = k; }, {col: on ? C.pk : a ? C.lg : C.gy, dim: on ? C.pk : C.nv});
    txt(l, 26, y + 4, s ? C.k : on ? C.pk : a ? C.lg : C.gy);
    txt(a + "/" + b, 102, y + 4, s ? C.k : C.gy, 1, "r");
    if (dueN && Math.floor(T * 3) % 2) P(20, y + 6, C.rd);
    if (s) info = {t: "RECORDED ON THE CASSETTES D.O. LEFT, IN ORDER.", b: "THE OTHER SIDES OF HIS TAPES. LATER. AFTER HE TOOK IT HOME.",
      p: "THE CABINET HAS A SECOND INPUT. NOTHING IS PLUGGED INTO IT.", n: "NIGHTS ON THE FLOOR OF THE STARLITE, 1989. IT KEPT ALL OF THEM.",
    l: "PAPERWORK FROM THE FACTORY THAT BUILT IT, AND WHAT IS LEFT ON ITS TEST FLOOR.",
    d: "PAPERS THAT TURN UP ON THE CORKBOARD IN THE BACK ROOM.",
      s: "THE CABINET PRINTS THESE ITSELF. IT'S BEEN KEEPING NOTES."}[k];
  });
  archEntries(sc.cat).forEach((e, i) => {
    const cx = 114 + (i % 2) * 128, cy = 38 + Math.floor(i / 2) * 15;
    const s = btn(sc, null, cx, cy, 124, 13, () => { if (e.got) e.open(); }, {col: e.got ? C.pk : C.gy, dim: C.nv, disabled: !e.got});
    txt(e.num, cx + 3, cy + 4, s && e.got ? C.k : e.due ? C.rd : C.gy);
    txt(e.name.slice(0, 24), cx + 20, cy + 4, s && e.got ? C.k : e.got ? C.lg : e.due ? C.pk : C.gy);
    if (s) info = e.info;
  });
  txt(archiveCount() + "/" + (TAPE_COUNT + LORE.length) + " FOUND", W - 24, 9, C.gy, 1, "r");
  return info;
}
// cassettes on the floor: red-labelled B-sides, and black ones marked INPUT 2
function loreSpr(k) {
  const key = "tape_" + k;
  if (!SPR[key]) SPR[key] = mkSprite(["lllllll", "lkwlwkl", "lllllll", "l.lll.l"], k === "b" ? {l: C.rd, k: C.k, w: C.wh} : {l: "#3A3844", k: C.k, w: C.rd});
  return SPR[key];
}
