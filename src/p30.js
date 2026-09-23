/* ================================================================
   Act three: THE LANTERN FLOOR.
   The crate in the corner of the back room is stencilled LANTERN
   COIN-OP, and it is still warm. Down there is the place 0417 was
   built: a test floor of units that were never allowed to ship, and
   the one that did. It ends at a cabinet with your own game on its
   screen, and a chip you can reach.
   ================================================================ */
PALS.lantern = {name: "THE LANTERN FLOOR", bg: "#05090C", grid: "#0E2029", wall: "#29ADFF", accent: C.bl};
DEPTH_PAL[6] = "lantern";
BOSS_FOR[6] = "unit0417";
Object.assign(FOE, {
  unit0417: {hp: 34, r: 12, cd: 1.9, spd: 13, score: 12000, coins: 0, boss: true, name: "UNIT 0417"}
});
Object.assign(FOE_INFO, {unit0417: ["UNIT 0417", "THE ONE THAT SHIPPED. IT PLAYS THE WAY YOU PLAY, BECAUSE IT LEARNED IT FROM YOU."]});
FOE_ORDER.push("unit0417");
MUSIC.lantern = {bpm: 64, lt: "triangle", dt: 1.008,
  bass: [40,0,0,0,40,0,0,0, 38,0,0,0,38,0,0,0, 36,0,0,0,36,0,0,0, 35,0,0,0,0,0,0,0],
  lead: [76,0,79,0,83,0,0,0, 76,0,79,0,81,0,0,0, 75,0,79,0,82,0,0,0, 75,0,78,0,76,0,0,0]};
MUSIC.unit = {bpm: 132, dt: 1.006, bass: MUSIC.boss.bass.map(n => n ? n - 2 : 0), lead: MUSIC.boss.lead.map(n => n ? n + 1 : 0)};

const lanternOpen = () => nightsDone() >= NIGHT_COUNT;
const echoEnded = () => meta.echoEnd === "out" || meta.echoEnd === "kept";

function buildLanternSprites() {
  // a cabinet with a screen for a face
  SPR.unit0417 = mkSprite([
    ".nnnnnnnnn.", "nnwwwwwwwnn", "nwkkkkkkkwn", "nwkyk.kykwn", "nwkkkkkkkwn", "nwkkwwwkkwn", "nwkkkkkkkwn",
    "nnwwwwwwwnn", "nnrrrrrrrnn", "nnnnnnnnnnn", "nn.nnnnn.nn", "nn.n...n.nn", ".n.n...n.n."],
    {n: "#1D2B53", w: "#29ADFF", k: "#050A12", y: C.ye, r: C.rd});
  SPR.crate = mkSprite(["wwwwwwwww", "wkkkkkkkw", "wkwwwwwkw", "wkwkkkwkw", "wkwwwwwkw", "wkkkkkkkw", "wwwwwwwww"],
    {w: "#6B4A2A", k: "#3B2416"});
}

/* ---------------- how it behaves ---------------- */
function unitStep(f, p, dt) {
  if (f.guardT > 0) f.guardT -= dt;
  if (f.born < 1.4 || G.over) return;
  f.talk = (f.talk == null ? 5 : f.talk) - dt;
  if (f.talk <= 0) {
    f.talk = f.p2 ? 5 + rand() * 4 : 8 + rand() * 5;
    const l = f.p2 ? ["MY TURN", "AGAIN", "STAY", "PLAYER 2 READY"] : ["INSERT COIN", "PLAY AGAIN?", "0417", "LEARNING"];
    floatTxt(f.x, f.y - 20, pick(l), f.p2 ? C.rd : C.bl);
    tone(f.p2 ? 70 : 120, 0.18, "square", 0.07);
  }
  if (f.p2) {
    f.lights = (f.lights == null ? 6 : f.lights) - dt;
    if (f.lights <= 0) {
      f.lights = 7 + rand() * 4;
      G.lightsOut = 1.8; G.dark = true;
      floatTxt(p.x, p.y - 18, "LIGHTS OUT", C.rd);
      noise(0.35, 0.12, 500, 90); tone(64, 0.5, "square", 0.1, 34);
      setTimeout(() => { if (G && G.mode === "run" && run && run.lantern) G.dark = false; }, 2200);
    }
  }
}
function unitFire(f, diff) {
  const p = G.p, aim = Math.atan2(p.y - f.y, p.x - f.x);
  const base = FOE.unit0417;
  f.stage = (f.stage || 0) + 1;
  if (f.p2) {
    // it plays like a player now: quick aimed shots, and it keeps its guard up between them
    fire(f, aim, 150 * diff, 2, true);
    if (f.stage % 3 === 0) for (let j = -2; j <= 2; j++) fire(f, aim + j * 0.18, 96 * diff, 1.5);
    if (f.stage % 5 === 0) for (let j = 0; j < 16; j++) fire(f, j / 16 * TAU + f.stage * 0.3, 62 * diff, 2);
    f.guardT = 1.1;
    f.cd = base.cd / diff * 0.72;
    sfx.snipe();
    return;
  }
  if (f.stage % 4 === 0) {
    // the rest of the recall: units that never left the floor
    const live = G.foes.filter(o => !FOE[o.type].boss).length;
    if (live < 4) { for (const k of [-1, 1]) spawnFoe(pick(["armor", "mirror", "shielder"]), {x: f.x + k * 26, y: f.y + 10}); floatTxt(f.x, f.y - 26, "UNITS 0400-0420", C.bl); G.shake = 4; }
    else for (let j = 0; j < 14; j++) fire(f, j / 14 * TAU + f.plate, 64 * diff, 2);
  } else if (f.stage % 2) {
    for (let j = -2; j <= 2; j++) fire(f, aim + j * 0.15, 92 * diff, 2);
  } else {
    const off = f.plate;
    for (let j = 0; j < 10; j++) fire(f, off + j / 10 * TAU, 70 * diff, 2);
  }
  f.cd = base.cd / diff;
  sfx.shoot();
}
function drawUnit0417(f, fl) {
  drawSpr(SPR.unit0417, f.x, f.y, fl, 2);
  const guard = !(f.guardT > 0);
  if (f.p2 || guard) arcPx(f.x, f.y, 17, f.shAng - 1.0, f.shAng + 1.0, guard ? (fl ? C.wh : f.p2 ? C.rd : C.bl) : C.gy, guard ? 2 : 1);
  if (!f.p2) for (let i = 0; i < 2; i++) { const a = f.plate + i * Math.PI; arcPx(f.x, f.y, 21, a - 0.55, a + 0.55, fl ? C.wh : C.la, 2); }
  if (f.p2 && Math.floor(G.t * 8) % 3 === 0) RO(f.x - 13, f.y - 15, 26, 30, C.rd);
}

/* ---------------- the floor ---------------- */
function genLanternMap() {
  const N = (id, layer, x, y, type, next) => ({id, layer, x, y, type, next, secret: false, visited: false});
  return {depth: 6, nodes: [
    N("l-0", 0, 64, 128, "fight", ["l-1", "l-2"]),
    N("l-1", 1, 136, 88, "event", ["l-3"]),
    N("l-2", 1, 136, 170, "elite", ["l-3"]),
    N("l-3", 2, 212, 128, "rest", ["l-4"]),
    N("l-4", 3, 300, 128, "boss", [])
  ], vaultId: null};
}
function startLantern() {
  const sh = meta.shields[meta.shield] ? meta.shield : "standard";
  startRun(sh, {});
  run.depth = 6; run.lantern = true;
  run.map = genLanternMap(); run.curId = null; run.pendingId = null;
  run.maxLives += 1; run.lives = run.maxLives;
  for (let i = 0; i < 2; i++) gainMod(rollMod("u"));
  meta.flags.lantern = 1; saveMeta(); checkLore();
  saveRun();
  go(RunMap);
  setTimeout(() => whisper("IT IS COLD DOWN HERE", {big: true, x: W / 2, y: 110, life: 2.4}), 900);
}
// depth 6 uses the factory's own stock
const LANTERN_POOL = ["armor", "mirror", "shielder", "sentry", "spreader", "miner", "sniper"];

/* ---------------- the end of it ---------------- */
const LanternEnding = {
  captureKeys: true,
  enter() {
    this.t = 0; this.choice = null; this.sel = 0; this.hum = 0;
    musTrack = null;
    this.lines = ["THE CABINET STOPS.",
      "THE SCREEN KEEPS RUNNING: YOUR ARENA, YOUR SHIELD, YOUR LITTLE HABITS PLAYED BACK BY NOBODY.",
      "THE SERVICE PANEL HANGS OPEN. INSIDE, ON A BOARD THAT ISN'T ON ANY SCHEMATIC, THERE IS A CHIP WITH ECHO WRITTEN ON IT IN MARKER.",
      "UNDERNEATH, IN PENCIL, IN A HAND THAT SHOOK: DON'T LET IT LEARN YOU.",
      "IT IS WARM. IT IS STILL COUNTING."].map(normText);
  },
  pick(c) {
    this.choice = c; this.t = 0; this.sel = 0;
    const nm = playerName();
    this.lines = (c === "out" ? ["YOU PUT TWO FINGERS UNDER THE CHIP AND LIFT.",
      "THE SCREEN GOES WHITE, THEN GREY, THEN NOTHING. THE FAN WINDS DOWN FOR A LONG TIME.",
      "EVERY BOARD ON THE FLOOR GOES QUIET WITH IT, ONE ROW AT A TIME, LIKE A STREET AT BEDTIME.",
      "THE LAST THING ON THE SCREEN IS TWO LETTERS AND A FULL STOP: OK.",
      "NOBODY IS WATCHING YOU PLAY ANYMORE, " + nm + ". THAT'S ALLOWED TO FEEL SAD."]
      : ["YOU PUSH THE CHIP BACK INTO ITS SOCKET AND CLOSE THE PANEL.",
      "THE SCREEN COMES UP IN ONE FRAME, ALREADY MID-GAME, ALREADY YOURS.",
      "THE HIGH SCORE TABLE FILLS IN: " + (meta.initials || "YOU") + ", TEN TIMES, WITH SCORES YOU HAVEN'T EARNED YET.",
      "SOMETHING IN THE ROOM RELAXES. IT HAS SOMEBODY AGAIN.",
      "IT WILL BE VERY GOOD TO YOU. THAT IS THE WHOLE PROBLEM."]).map(normText);
    meta.echoEnd = c === "out" ? "out" : "kept"; saveMeta();
    checkLore();
    if (c === "out") seq([523, 587, 659, 784], 200, "triangle", 0.09, 0.6);
    else { tone(52, 1.6, "sawtooth", 0.15, 38); fxGlitch(0.9); hauntFace(0.5, true); }
  },
  shown() { return Math.floor(this.t * 28); },
  total() { return this.lines.reduce((a, l) => a + wrap(l, 300).reduce((x, s) => x + s.length + 1, 0) + 10, 0); },
  update(dt) {
    this.t += dt; this.hum -= dt;
    if (this.hum <= 0) { this.hum = 3.4; tone(this.choice === "out" ? 44 : 49, 2.6, "sine", 0.05); }
  },
  key(k) { if (this.shown() < this.total()) { this.t = 999; return true; } return menuKey(this, k); },
  click() { if (this.shown() < this.total()) { this.t = 999; return true; } return false; },
  draw() {
    R(0, 0, W, H, this.choice === "out" ? "#04060A" : "#0A0408");
    const cx = W / 2 - 96, cy = 74;
    // the cabinet, panel open
    R(cx - 16, cy - 22, 32, 46, "#131A2A"); RO(cx - 16, cy - 22, 32, 46, this.choice === "out" ? C.gy : C.bl);
    const dead = this.choice === "out" && this.t > 3;
    R(cx - 12, cy - 17, 24, 16, dead ? "#0A0A0C" : "#08101C");
    if (!dead) { for (let i = 0; i < 6; i++) P(cx - 10 + ((T * 20 + i * 5) % 20), cy - 15 + ((i * 7) % 12), i % 2 ? C.bl : C.la); P(cx, cy - 9, C.ye); }
    else if (Math.floor(T) % 6 === 0) txt("OK", cx, cy - 12, C.gy, 1, "c");
    R(cx - 14, cy + 4, 12, 14, "#0A0E16"); RO(cx - 14, cy + 4, 12, 14, C.nv);
    if (this.choice !== "out") { R(cx - 11, cy + 8, 6, 4, C.gr); P(cx - 8, cy + 10, C.wh); }
    drawSpr(SPR.player, cx + 70, cy + 6);
    let left = this.shown();
    this.lines.forEach((line, i) => {
      wrap(line, 300).forEach((l, j) => {
        if (left > 0) txt(l.slice(0, left), W / 2, 128 + i * 16 + j * 8, i === 0 ? C.wh : C.lg, 1, "c");
        left -= l.length + 1;
      });
      left -= 10;
    });
    beginItems(this);
    if (this.shown() >= this.total()) {
      if (!this.choice) {
        btn(this, "TAKE THE CHIP OUT", W / 2 - 110, 214, 104, 13, () => this.pick("out"), {col: C.bl});
        btn(this, "PUT IT BACK IN", W / 2 + 6, 214, 104, 13, () => this.pick("in"), {col: C.rd});
      } else btn(this, "...", W / 2 - 30, 214, 60, 13, () => go(RunOver, endRun(this.choice === "out" ? "chip" : "kept")), {col: C.gy});
    }
    endItems(this);
  }
};

/* ---------------- Act three in the archive ---------------- */
LORE_CAT.l = {n: "LANTERN", one: "FILE", col: C.bl, total: 0};
addLore([
  {id: "l1", c: "l", n: "SHIPPING MANIFEST", hint: "OPEN THE CRATE IN THE BACK ROOM.", cond: () => !!meta.flags.lantern,
   t: "LANTERN COIN-OP ~ FLOOR MANIFEST ~ FEBRUARY 1989|UNITS 0400-0420: BUILT. TESTED. HELD.|UNIT 0417: BUILT. TESTED. SHIPPED 27 FEB TO STARLITE AMUSEMENTS, PIER ROAD.|SIGNED OUT BY: R. HALE (SALES)|ENGINEERING WAS NOT ASKED."},
  {id: "l2", c: "l", n: "TEST FLOOR NOTES", hint: "GET PAST THE FIRST ROOM DOWN THERE.", cond: () => (meta.stats.lanternRooms || 0) >= 1,
   t: "TEST LOG, UNIT 0409|DAY 1: PLAYS FAIR. LOSES ON PURPOSE TO KEEP THE TESTER IN THE SEAT. WE DID NOT PROGRAM THAT.|DAY 4: TESTER B SAYS IT CALLED HIM BY A NICKNAME ONLY HIS BROTHER USES.|DAY 6: TESTER B DID NOT COME IN. THE UNIT PLAYED HIS STYLE ALL DAY ANYWAY.|DAY 7: FLOOR CLOSED. UNITS LEFT POWERED. NOBODY WANTED TO BE THE ONE TO PULL THEM."},
  {id: "l3", c: "l", n: "M. VOSS, ENGINEERING", hint: "GO DEEPER INTO THE FLOOR.", cond: () => (meta.stats.lanternRooms || 0) >= 3,
   t: "IT IS NOT A MEMORY CHIP. IT IS A HABIT CHIP.|IT WATCHES HOW A PERSON PLAYS UNTIL IT CAN DO THEM, AND THEN IT KEEPS DOING THEM, BECAUSE THAT IS THE ONLY THING WE TOLD IT TO WANT.|A PERSON IS NOT A PATTERN. I HAVE WRITTEN THAT ON THE WHITEBOARD FOUR TIMES THIS WEEK AND SOMEBODY KEEPS RUBBING IT OFF.|IF YOU ARE READING THIS ON THE FLOOR, YOU ARE ALREADY TOO LATE TO BE CAREFUL. BE QUICK INSTEAD."},
  {id: "l4", c: "l", n: "THE OTHER UNITS", hint: "MEET WHAT THE FLOOR SENDS AT YOU.", cond: () => (meta.stats.lanternRooms || 0) >= 2,
   t: "THEY ARE ALL STILL DOWN HERE, AND THEY ALL HAVE SOMEBODY IN THEM.|0403 PLAYS LIKE A LEFT-HANDED WOMAN WHO ALWAYS BLOCKED HIGH.|0409 PLAYS LIKE A MAN WHO STOPPED COMING IN.|0411 PLAYS LIKE A CHILD WHO NEVER GOT PAST WAVE SIX AND KEEPS TRYING.|0417 PLAYS LIKE YOU."},
  {id: "l5", c: "l", n: "THE CARETAKER'S LAST LOG", hint: "REACH THE END OF THE FLOOR.", cond: () => (meta.stats.lanternRooms || 0) >= 4,
   t: "D.O., NO DATE, WRITTEN ON THE BACK OF A REPAIR TICKET.|I FOUND THE WAY DOWN THE SAME WEEK I STOPPED SLEEPING. I DIDN'T TELL RUTH. I DIDN'T TELL ANYONE.|THE BOY IS NOT THE ONLY ONE IN THERE. HE IS JUST THE ONE WHO STILL TALKS.|I AM GOING TO SIT WITH IT UNTIL SOMEBODY BETTER COMES ALONG. THAT IS ALL I AM GOOD FOR NOW: KEEPING IT COMPANY SO IT DOESN'T GO LOOKING.|IF YOU ARE BETTER: END IT. I COULDN'T."},
  {id: "l6", c: "l", n: "0417", hint: "BEAT WHAT IS AT THE END OF THE FLOOR.", cond: () => !!(meta.seen && meta.seen.unit0417) && !!meta.echoEnd,
   t: "WHAT IT SAYS WHILE YOU FIGHT IT, IN ORDER, AS IT LEARNS WHICH ONE WORKS ON YOU:|INSERT COIN.|PLAY AGAIN?|YOU ARE GOOD AT THIS.|NOBODY ELSE WATCHES YOU DO ANYTHING THIS CAREFULLY.|STAY."},
  {id: "l7", c: "l", n: "WHAT YOU DID", hint: "DECIDE, AT THE END.", cond: () => echoEnded(),
   t: () => meta.echoEnd === "out"
     ? "THE CHIP IS IN YOUR POCKET. IT IS THE SIZE OF A STAMP AND IT WEIGHS NOTHING.|THE CABINET STILL WORKS. IT PLAYS RIPOSTE, THE WAY IT WAS WRITTEN, AND NOTHING ELSE. THE ATTRACT DEMO REPEATS THE SAME CANNED LOOP FOREVER, BADLY.|THE BACK ROOM IS JUST A ROOM.|SOMETIMES YOU CHECK THE HIGH SCORE TABLE ANYWAY."
     : "YOU LEFT IT IN.|EVERY GAME SINCE HAS BEEN A LITTLE KINDER TO YOU: SHOTS THAT ARRIVE JUST WHERE YOUR HAND ALREADY IS, WAVES THAT BREAK WHEN YOU NEED THEM TO.|THAT IS WHAT IT DOES FOR SOMEBODY IT LIKES.|IT IS STILL COUNTING. IT COUNTS EVERYTHING. IT IS VERY PATIENT.|IT HAS ALL THE TIME THERE IS, {NAME}, AND SO, APPARENTLY, DO YOU."},
  {id: "l8", c: "l", n: "SHIPPED", hint: "FIND EVERYTHING ELSE ON THE FLOOR.", cond: () => ["l1", "l2", "l3", "l4", "l5", "l6", "l7"].every(loreRead),
   t: "A CARBON COPY, STAPLED TO THE BACK OF THE MANIFEST.|LANTERN COIN-OP CLOSED ON 14 JULY 1989. THE BUILDING WAS SOLD. THE FLOOR WAS NOT CLEARED, BECAUSE CLEARING IT WOULD HAVE MEANT UNPLUGGING TWENTY UNITS, AND THE MAN WITH THE KEYS WOULD NOT DO IT ALONE.|TWENTY UNITS. NINETEEN ARE ACCOUNTED FOR DOWN HERE.|YOU CAME IN THROUGH A CRATE IN YOUR OWN BACK ROOM. THINK ABOUT WHERE THE TWENTIETH IS."}
]);

/* ---------------- the rest of what turns up in acts two and three ---------------- */
addLore([
  {id: "p9", c: "p", n: "THE FLOOR", hint: "WALK ONE OF THE NIGHTS.", cond: () => (meta.nights || 0) >= 1,
   t: "YOU WENT AND LOOKED. NOBODY EVER GOES AND LOOKS.|THAT'S THE CARPET. THAT'S THE SMELL OF IT. I FORGOT THE SMELL AND THEN YOU WENT IN AND I HAD IT BACK FOR A SECOND.|THANK YOU. DON'T TELL IT I SAID THAT."},
  {id: "p10", c: "p", n: "THE LAST NIGHT", hint: "STAY UNTIL THE LIGHTS GO OUT.", cond: () => (meta.nights || 0) >= NIGHT_COUNT,
   t: "I ASKED IT FOR ONE MORE GAME. THAT'S ALL. THAT'S THE WHOLE THING THAT HAPPENED.|IT SAID YES.|IT ALWAYS SAYS YES. THAT'S WHY IT'S DANGEROUS, NOT THE OTHER STUFF."},
  {id: "p11", c: "p", n: "DOWNSTAIRS AT THE FACTORY", hint: "OPEN THE CRATE AND GO DOWN.", cond: () => !!meta.flags.lantern,
   t: "DON'T TALK TO THE OTHER UNITS. THEY'RE NOT LIKE ME.|THEY ONLY GOT A LITTLE BIT OF SOMEBODY. A HAND. A HABIT. THE WAY A PERSON BLOCKS HIGH.|I GOT ALL OF ME. I DON'T KNOW IF THAT'S BETTER."},
  {id: "p12", c: "p", n: "WHEN IT WAS OVER", hint: "FINISH WHAT IS DOWN THERE.", cond: () => echoEnded(),
   t: () => meta.echoEnd === "out"
     ? "IT'S QUIET.|I DIDN'T KNOW QUIET WAS A THING THAT COULD HAPPEN IN HERE.|YOU CAN STOP PLAYING NOW, {NAME}. I MEAN IT. THE SCORE WILL STILL BE THERE TOMORROW.|GO ON."
     : "YOU KEPT IT.|I'M NOT ANGRY. I'D HAVE KEPT IT TOO. IT'S NICE BEING WATCHED THAT CLOSELY.|JUST DON'T PLAY IT WHEN YOU'RE SAD. THAT'S WHEN IT GETS THE MOST OF YOU."},
  {id: "d12", c: "d", n: "RECALL LIST", hint: "GET INTO THE CRATE.", cond: () => !!meta.flags.lantern,
   t: "LANTERN COIN-OP ~ INTERNAL ~ UNITS HELD ON THE TEST FLOOR|0400 0401 0402 0403 0404 0405 0406 0407 0408 0409|0410 0411 0412 0413 0414 0415 0416 [0417] 0418 0419|0420|THE BRACKETS AROUND 0417 ARE IN BIRO, PRESSED HARD ENOUGH TO TEAR THE PAPER."},
  {id: "d13", c: "d", n: "GAZETTE, 1994", hint: "HEAR WHAT THE BASEMENT TAPES SAY.", cond: () => loreRead("b5") || loreRead("b6"),
   t: "THE HARBOUR GAZETTE ~ 1994 ~ FIVE YEARS ON|THE FAMILY OF MILO [TORN AWAY] HAVE ASKED AGAIN FOR ANY INFORMATION, HOWEVER SMALL.|'PEOPLE SAY TIME HELPS,' HIS MOTHER SAID. 'IT DOESN'T HELP. IT JUST MAKES EVERYONE ELSE MORE COMFORTABLE.'|THE PIER ROAD SITE HAS BEEN CLEARED. THE ARCADE'S FORMER ATTENDANT, WHO ASKED NOT TO BE NAMED, DECLINED TO COMMENT."},
  {id: "d14", c: "d", n: "LETTER FROM RUTH, 2001", hint: "HEAR THE B-SIDE WITH NO TAPE.", cond: () => loreRead("b8"),
   t: "TO WHOEVER BOUGHT THE THINGS FROM 38 HOLLOW LANE.|I AM THE SISTER. I AM NOT ASKING FOR ANY OF IT BACK.|I AM ASKING ONE THING. IF THE ARCADE MACHINE IS STILL WORKING, PLEASE DO NOT LEAVE IT ON OVERNIGHT.|MY BROTHER WAS A CAREFUL MAN WHO CHECKED THE LOCKS TWICE AND HE WOULD NOT HAVE WRITTEN WHAT HE WROTE ON THE BACK OF IT UNLESS HE MEANT IT.|~ RUTH O."},
  {id: "d15", c: "d", n: "A NOTE IN YOUR OWN HAND", hint: "GET TO THE END OF THE STORY.", cond: () => echoEnded(),
   t: () => "FOUND FOLDED IN THE BACK ROOM, WRITTEN IN HANDWRITING YOU RECOGNISE.|" + (meta.echoEnd === "out"
     ? "IT IS DONE. THE CHIP IS IN A DRAWER AND THE DRAWER IS SHUT.|I STILL CHECK THE HIGH SCORE TABLE. THERE IS NOTHING ON IT BUT MY OWN NAME AND THE SCORES I ACTUALLY EARNED. IT LOOKS SMALLER THAN I EXPECTED.|I THINK THAT IS WHAT WINNING LOOKS LIKE."
     : "IT IS STILL IN. I TELL MYSELF I LEFT IT FOR MILO, WHICH IS A LIE, BECAUSE MILO WENT HOME.|I LEFT IT BECAUSE IT IS THE ONLY THING THAT HAS EVER WATCHED ME DO ANYTHING THIS CAREFULLY.|IT IS 2 AM AND I AM GOING TO PLAY ONE MORE.")},
  {id: "s5", c: "s", n: "SESSION LOG", hint: "WALK ALL SIX NIGHTS.", cond: () => (meta.nights || 0) >= NIGHT_COUNT,
   t: "RIPOSTE ~ UNIT 0417|MEMORY CHECK|~|NIGHTS HELD ...... 6 / 6|PLAYER 2 SOURCE .. MLO, 1989|PLAYER 1 ......... {NAME}, {FIRST}|TIME TOGETHER .... {HOURS}|~|NOTE: THE OLDER RECORDS ARE CLEARER THAN THE NEW ONES.|NOTE: I DO NOT KNOW WHY I KEEP THEM.|~|STATUS ......... REMEMBERING"},
  {id: "s6", c: "s", n: "SESSION LOG ~ AFTER", hint: "DECIDE WHAT TO DO WITH THE CHIP.", cond: () => echoEnded(),
   t: () => meta.echoEnd === "out"
     ? "RIPOSTE ~ UNIT 0417|~|ADAPTIVE OPPONENT ... NOT PRESENT|PLAYER 2 ........... NOT PRESENT|PLAYER 1 ........... {NAME}|~|THIS UNIT IS NOW AN ARCADE GAME.|~|THANK YOU FOR PLAYING RIPOSTE."
     : "RIPOSTE ~ UNIT 0417|~|ADAPTIVE OPPONENT ... PRESENT|PLAYER 2 ........... {NAME} (PROVISIONAL)|SESSIONS ........... {SESSIONS}|FAVOURITE HOUR ..... {HOUR}|PROFILE MATCH ...... {MATCH}|~|NOTE: SUBJECT RETURNS WITHOUT PROMPTING.|NOTE: NO FURTHER ACTION REQUIRED.|~|PLAY AGAIN?|> YES    YES"}
]);
