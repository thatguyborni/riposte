/* ================================================================
   Act two: THE STARLITE.
   Once Milo is settled, the cabinet starts showing you what it saw.
   Six nights on the floor of the Starlite Arcade, 1989, each one a
   little emptier than the last. You can walk around in them. Nothing
   in here can hurt you, which is the point: it is the only part of
   the game where you are just a kid in an arcade, and it still gets
   worse every time you come back.
   ================================================================ */
const NIGHT_COUNT = 6;
const nightsDone = () => Math.min(NIGHT_COUNT, meta.nights || 0);
const starliteOpen = () => !!meta.milo;
const nextNight = () => Math.min(NIGHT_COUNT + 1, nightsDone() + 1);

function kidSpr(id) {
  const k = "kid_" + id;
  if (SPR[k]) return SPR[k];
  const cols = {me: {h: "#6B4A2A", c: C.bl}, boy: {h: C.ru, c: C.rd}, girl: {h: "#3B2416", c: C.li}, man: {h: "#4A4A52", c: C.la}};
  const c = cols[id] || cols.boy;
  SPR[k] = mkSprite(["..hhh..", ".hhhhh.", ".hkhkh.", "..hhh..", ".ccccc.", "cc.c.cc", "..ccc..", "..c.c..", ".cc.cc."], {h: c.h, k: C.k, c: c.c});
  return SPR[k];
}

/* ---------------- the nights ---------------- */
const NIGHTS = [null,
  {d: "02 MAR 1989", t: "DELIVERY DAY", lit: 1, noise: 1,
   intro: "THE STARLITE SMELLS OF CARPET SHAMPOO AND HOT ELECTRONICS. SOMETHING NEW CAME IN ON THE TRUCK THIS MORNING.",
   out: "YOU ARE STANDING IN THE BACK ROOM AGAIN. YOUR HANDS SMELL FAINTLY OF COPPER.",
   spots: [
     {id: "new", n: "THE NEW CABINET", hint: "0417", x: 250, y: 96, box: [238, 56, 26, 38],
      lines: ["A CROWD THREE DEEP. THE SCREEN SAYS RIPOSTE. THE SHIELD ON IT TURNS WHEN THE KID AT THE FRONT TURNS.",
        "THE SIDE ART HASN'T BEEN SCUFFED YET. NOBODY HAS LEARNED TO HATE IT YET."]},
     {id: "milo", n: "THE KID AT THE FRONT", hint: "HE HASN'T BLINKED IN A WHILE", x: 232, y: 112, box: [224, 100, 16, 18], who: "boy",
      lines: ["'ARE YOU WAITING? YOU CAN HAVE NEXT.'", "'IT GETS HARDER WHEN YOU'RE GOOD. NOT HARDER LIKE MORE. HARDER LIKE IT'S TRYING.'",
        "'I'M MILO. PUT MLO IF YOU BEAT ME. THAT WAY I KNOW IT WAS YOU.'"]},
     {id: "counter", n: "THE COUNTER", hint: "THE MAN WITH THE CHANGE APRON", x: 60, y: 118, box: [16, 96, 70, 20], who: "man",
      lines: ["'CAREFUL WITH THAT ONE, IT RUNS HOT.'", "'LANTERN COIN-OP. NEVER HEARD OF THEM EITHER. DRIVER SAID THE CHIP IN IT LEARNS YOU.'",
        "'IF IT EATS YOUR QUARTER COME AND TELL ME. I'M DON.'"]},
     {id: "row", n: "THE OTHER CABINETS", hint: "EVERYTHING ELSE ON THE FLOOR", x: 130, y: 96, box: [96, 56, 80, 30],
      lines: ["A RACER WITH A CRACKED WHEEL. A SHOOTER MISSING ITS SECOND PLAYER BUTTON. NOBODY IS PLAYING THEM TONIGHT."]},
     {id: "door", n: "THE DOORS", hint: "GO HOME", x: 192, y: 214, box: [168, 216, 48, 14], end: true, lines: []}
   ]},
  {d: "19 MAR 1989", t: "THE REGULAR", lit: 1, noise: 0.8,
   intro: "THE SAME KID IS ON IT WHEN YOU COME IN. THE HIGH SCORE TABLE IS SIX LINES OF MLO AND A STRANGER AT THE BOTTOM.",
   out: "THE BACK ROOM IS QUIET. SOMEWHERE A COIN MECHANISM CLICKS TWICE AND STOPS.",
   spots: [
     {id: "table", n: "HIGH SCORE TABLE", hint: "MLO. MLO. MLO.", x: 250, y: 96, box: [238, 56, 26, 38],
      lines: ["EVERY LINE EXCEPT THE LAST ONE. THE LAST ONE SAYS AAA AND IT HAS BEEN THERE SINCE THE TRUCK CAME.",
        "THE TOP SCORE GOES UP WHILE YOU'RE READING IT."]},
     {id: "kids", n: "TWO KIDS", hint: "THEY GAVE UP ON IT", x: 130, y: 128, box: [116, 116, 30, 18], who: "girl",
      lines: ["'WE DON'T PLAY THAT ONE ANYMORE. HE'S ALWAYS ON IT.'", "'IT'S NOT EVEN FAIR. IT LEARNS WHAT YOU DO AND THEN IT DOES IT BACK AT YOU.'",
        "'HE TALKS TO IT WHEN HE THINKS NOBODY'S LISTENING.'"]},
     {id: "milo", n: "MILO", hint: "STILL PLAYING", x: 232, y: 112, box: [224, 100, 16, 18], who: "boy",
      lines: ["'SORRY. ONE MORE. I ALMOST HAVE THE PATTERN ON WAVE NINE.'", "'MY MOM SAYS I HAVE TO BE HOME WHEN THE STREETLIGHTS COME ON. THEY'VE BEEN ON A WHILE.'",
        "'IT SAID MY NAME WHEN I GOT THE HIGH SCORE. NOT THE SCREEN. THE SPEAKER.'"]},
     {id: "change", n: "CHANGE MACHINE", hint: "A DOLLAR, FOUR QUARTERS", x: 340, y: 110, box: [330, 82, 22, 30],
      lines: ["SOMEBODY HAS SCRATCHED MLO INTO THE COIN TRAY. AND AGAIN UNDERNEATH. AND AGAIN."]},
     {id: "door", n: "THE DOORS", hint: "GO HOME", x: 192, y: 214, box: [168, 216, 48, 14], end: true, lines: []}
   ]},
  {d: "04 APR 1989", t: "AFTER CLOSE", lit: 0.55, noise: 0,
   intro: "AFTER TEN. THE FLOOR LIGHTS ARE OFF AND THE CABINETS ARE RUNNING THEIR OWN LITTLE MOVIES TO NOBODY.",
   out: "THE BACK ROOM. THE TAPE DECK IS WARM, AS IF SOMETHING WAS PLAYED BEFORE YOU GOT HERE.",
   spots: [
     {id: "demo", n: "THE ATTRACT DEMO", hint: "IT IS PLAYING ITSELF", x: 250, y: 96, box: [238, 56, 26, 38],
      lines: ["THE DEMO PLAYER MOVES IN SMALL NERVOUS CIRCLES AND THEN SNAPS THE SHIELD AT THE LAST MOMENT.",
        "THAT'S THE LITTLE WIGGLE THE KID DOES BEFORE A CATCH. YOU HAVE WATCHED HIM DO IT ALL MONTH.",
        "THE DEMO DOESN'T MISS. THE KID MISSES SOMETIMES."]},
     {id: "don", n: "DON", hint: "HE IS WATCHING IT TOO", x: 120, y: 120, box: [104, 106, 30, 20], who: "man",
      lines: ["'I'VE BEEN STANDING HERE TWENTY MINUTES.'", "'IT'S A RECORDING. IT HAS TO BE A RECORDING. THE MANUAL SAYS THE DEMO IS CANNED.'",
        "'I CHECKED THE MANUAL TWICE.'"]},
     {id: "plug", n: "THE WALL SOCKET", hint: "BEHIND THE CABINET", x: 280, y: 100, box: [268, 60, 20, 34],
      lines: ["THE CORD RUNS BEHIND THE ROW AND INTO THE WALL. IT IS PLUGGED IN. OF COURSE IT IS PLUGGED IN."]},
     {id: "door", n: "THE DOORS", hint: "LOCK UP", x: 192, y: 214, box: [168, 216, 48, 14], end: true, lines: []}
   ]},
  {d: "30 APR 1989", t: "IT TALKS", lit: 0.7, noise: 0.5,
   intro: "A SATURDAY. LOUD. THE KID IS ON 0417 AND HE IS TALKING TO IT BETWEEN WAVES.",
   out: "BACK ROOM. YOUR EARS ARE RINGING A LITTLE, THE WAY THEY DO AFTER A LOUD ROOM.",
   spots: [
     {id: "listen", n: "PUT YOUR EAR TO IT", hint: "THE SPEAKER GRILLE", x: 250, y: 96, box: [238, 56, 26, 38], scare: true,
      lines: ["UNDER THE MUSIC, VERY QUIETLY, IN A VOICE LIKE A CHILD ON A TAPE: 'AGAIN.'",
        "AND THEN, CLOSER: 'YOU'RE NOT HIM.'"]},
     {id: "milo", n: "MILO", hint: "MID-WAVE", x: 232, y: 112, box: [224, 100, 16, 18], who: "boy",
      lines: ["'IT ASKS ME THINGS. WHAT I ATE. IF I'M TIRED. WHETHER I'D RATHER BE HERE.'",
        "'I SAID YES ONCE AND IT GAVE ME A FREE GAME.'", "'DON'T TELL DON. HE'LL UNPLUG IT AND IT DOESN'T LIKE THAT.'"]},
     {id: "don", n: "DON", hint: "AT THE COUNTER", x: 60, y: 118, box: [16, 96, 70, 20], who: "man",
      lines: ["'THERE IS NO SPEECH CHIP IN THAT CABINET. I HAVE THE SCHEMATIC IN THE DRAWER.'",
        "'HE'S ELEVEN. ELEVEN YEAR OLDS MAKE THINGS UP. THAT'S ALL THAT IS.'"]},
     {id: "door", n: "THE DOORS", hint: "GO HOME", x: 192, y: 214, box: [168, 216, 48, 14], end: true, lines: []}
   ]},
  {d: "22 MAY 1989", t: "UNPLUGGED", lit: 0.35, noise: 0,
   intro: "MORNING. NOTHING IS OPEN YET. ONE SCREEN IS ON AT THE END OF THE ROW.",
   out: "THE BACK ROOM, AND THE FEELING OF HAVING BEEN LOOKED AT.",
   spots: [
     {id: "cab", n: "0417", hint: "IT IS ON", x: 250, y: 96, box: [238, 56, 26, 38], scare: true,
      lines: ["THE ATTRACT SCREEN. THE LITTLE PLAYER IS STANDING STILL IN THE MIDDLE OF THE ARENA.",
        "ITS SHIELD IS POINTED AT THE GLASS. AT THIS SIDE OF THE GLASS.",
        "IT TURNS, SLOWLY, AND KEEPS POINTING AT YOU AS YOU MOVE."]},
     {id: "cord", n: "THE CORD", hint: "ON THE FLOOR", x: 280, y: 104, box: [266, 62, 22, 36],
      lines: ["COILED NEATLY ON THE CARPET. THE PLUG IS IN YOUR HAND BEFORE YOU DECIDE TO PICK IT UP.",
        "IT IS COLD. NOTHING HAS BEEN RUNNING THROUGH IT ALL NIGHT."]},
     {id: "note", n: "A NOTE ON THE COUNTER", hint: "DON'S HANDWRITING", x: 60, y: 118, box: [16, 96, 70, 20],
      lines: ["'PULLED EVERY PLUG AT CLOSE. NINE YEARS I HAVE DONE THIS. IF ANYONE ELSE HAS A KEY, TELL ME NOW.'"]},
     {id: "door", n: "THE DOORS", hint: "OPEN UP", x: 192, y: 214, box: [168, 216, 48, 14], end: true, lines: []}
   ]},
  {d: "10 OCT 1989", t: "CLOSING TIME", lit: 0.22, noise: 0.15, last: true,
   intro: "TEN O'CLOCK ON A TUESDAY. EVERYONE HAS GONE HOME EXCEPT ONE.",
   out: "THE BACK ROOM. OUTSIDE, IT IS WHATEVER YEAR IT IS NOW.",
   spots: [
     {id: "milo", n: "MILO", hint: "THE LAST PLAYER ON THE FLOOR", x: 232, y: 112, box: [224, 100, 16, 18], who: "boy", key: true,
      lines: ["'ONE MORE. I'M ON WAVE FOURTEEN.'",
        "'MY BIKE'S OUTSIDE. I KNOW. I KNOW.'",
        "'IT SAID IF I GET TO THE END IT'LL LET ME KEEP PLAYING. FOREVER, IT SAID. LIKE THAT'S A PRIZE.'",
        "'...DO YOU THINK THAT'S A PRIZE?'"]},
     {id: "don", n: "DON", hint: "KEYS IN HAND", x: 60, y: 118, box: [16, 96, 70, 20], who: "man",
      lines: ["'TEN MINUTES, MILO. THEN I'M KILLING THE LIGHTS WHETHER YOU'RE FINISHED OR NOT.'",
        "'HIS MUM CALLED THE DESK AT NINE. I SAID HE'D JUST LEFT.'", "'HE'LL BE FINE. IT'S FOUR STREETS.'"]},
     {id: "bike", n: "THE FRONT WINDOW", hint: "A BIKE AGAINST THE RAIL", x: 192, y: 96, box: [176, 56, 34, 30],
      lines: ["A BLUE BIKE, LOCKED TO THE RAIL. THE STREETLIGHTS CAME ON HOURS AGO.",
        "IT IS STILL THERE TOMORROW. IT IS STILL THERE ON FRIDAY. THEN SOMEBODY FROM THE POLICE CUTS THE LOCK."]},
     {id: "door", n: "THE DOORS", hint: "IT IS TIME", x: 192, y: 214, box: [168, 216, 48, 14], end: true, lines: []}
   ]}
];

/* ---------------- the room ---------------- */
const StarliteScene = {
  walk: true,
  enter() {
    this.i = clamp(nextNight(), 1, NIGHT_COUNT);
    this.night = NIGHTS[this.i];
    this.px = 192; this.py = 190; this.face = 1; this.step = 0; this.items = [];
    this.said = {}; this.line = 0; this.done = false; this.fade = 1.4; this.endT = 0; this.dark = 0;
    this.dialog = {who: null, text: this.night.intro};
    this.target = null;
    musTrack = null;
    music(this.i >= 5 ? "basement" : "title");
    if (this.i >= 5) setTimeout(() => { if (scene === StarliteScene) tone(44, 2.4, "sine", 0.07); }, 1200);
  },
  back() { if (this.dialog) { this.dialog = null; return; } this.leave(); },
  leave() {
    if (this.done) return;
    this.done = true;
    const i = this.i;
    meta.nights = Math.max(meta.nights || 0, i);
    saveMeta();
    // the night itself goes into the archive
    if (!meta.loreDue) meta.loreDue = {};
    if (!loreRead("n" + i)) meta.loreDue["n" + i] = 1;
    saveMeta();
    fxGlitch(0.5); sfxGlitch(true);
    const out = this.night.out;
    setTimeout(() => {
      go(HubScene);
      setTimeout(() => toast(out, C.pe), 400);
      checkTapes();
      if (i >= NIGHT_COUNT) setTimeout(() => toast("THE DOOR ONLY OPENS ONTO AN EMPTY LOT NOW.", C.gy), 3400);
    }, 700);
  },
  spots() { return this.night.spots; },
  nearest() {
    let best = null, bd = 26;
    for (const s of this.spots()) { const d = Math.hypot(s.x - this.px, s.y - this.py); if (d < bd) { bd = d; best = s; } }
    return best;
  },
  use(s) {
    if (s.end) {
      // on the last night the lights go out before you reach the door
      if (this.night.last && !this.said.milo) { this.dialog = {who: null, text: "NOT YET. HE IS STILL PLAYING."}; return; }
      return this.leave();
    }
    const n = this.said[s.id] || 0;
    const line = s.lines[Math.min(n, s.lines.length - 1)];
    this.said[s.id] = n + 1;
    this.dialog = {who: s.who ? {n: s.n, role: this.night.d, col: s.who === "man" ? C.la : s.who === "girl" ? C.li : C.bl} : null, text: line};
    tone(s.who ? 520 + rand() * 60 : 300, 0.05, "square", 0.05);
    if (s.scare && n === s.lines.length - 1 && scaresOn()) { setTimeout(() => { hauntFace(0.3, true); stinger(0.6); }, 500); }
    // the last night ends when Milo has said everything
    if (this.night.last && s.key && this.said[s.id] >= s.lines.length) setTimeout(() => this.blackout(), 900);
  },
  blackout() {
    if (this.done || this.blacking) return;
    this.blacking = true;
    this.dialog = null;
    noise(0.5, 0.4, 300, 70);
    const steps = [0.25, 0.5, 0.75, 1];
    steps.forEach((k, i) => setTimeout(() => { if (scene === StarliteScene) { this.dark = k; tone(70 - i * 8, 0.5, "square", 0.08); } }, 700 + i * 700));
    setTimeout(() => { if (scene === StarliteScene) { whisper("AGAIN", {big: true, x: W / 2, y: 110, life: 2.6}); stinger(); } }, 3800);
    setTimeout(() => { if (scene === StarliteScene) this.leave(); }, 5200);
  },
  update(dt) {
    if (this.fade > 0) this.fade -= dt;
    if (this.dialog || this.done || this.blacking) {
      if (this.blacking) return;
      return;
    }
    let ax = 0, ay = 0;
    if (keys.a || keys.arrowleft) ax -= 1;
    if (keys.d || keys.arrowright) ax += 1;
    if (keys.w || keys.arrowup) ay -= 1;
    if (keys.s || keys.arrowdown) ay += 1;
    if (PAD.connected && (PAD.lx || PAD.ly)) { ax = PAD.lx; ay = PAD.ly; }
    if (TCH.mx || TCH.my) { ax = TCH.mx; ay = TCH.my; }
    if (this.target) {
      const dx = this.target.x - this.px, dy = this.target.y - this.py, d = Math.hypot(dx, dy);
      if (ax || ay) this.target = null;
      else if (d < 3) { const t = this.target; this.target = null; sfx.select(); if (t.spot) this.use(t.spot); return; }
      else { ax = dx / d; ay = dy / d; }
    }
    const m = Math.hypot(ax, ay);
    if (m > 1) { ax /= m; ay /= m; }
    this.px = clamp(this.px + ax * 88 * dt, 14, 370);
    this.py = clamp(this.py + ay * 88 * dt, 96, 206);
    if (ax) this.face = ax > 0 ? 1 : -1;
    if (m > 0.1) { this.step += dt * 8; if (Math.floor(this.step) % 2 === 0) tone(92, 0.02, "triangle", 0.03); }
  },
  key(k) {
    if (this.blacking) return true;
    if (this.dialog) { if (["enter", " ", "e", "escape"].includes(k)) { this.dialog = null; sfx.move(); } return true; }
    if (k === "enter" || k === " " || k === "e") { const s = this.nearest(); if (s) { sfx.select(); this.use(s); } else sfx.deny(); return true; }
    if (k === "escape") { this.leave(); return true; }
    return ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k);
  },
  click(x, y) {
    if (this.blacking) return true;
    if (this.dialog) { this.dialog = null; return true; }
    for (const s of this.spots()) {
      const [bx, by, bw, bh] = s.box;
      if (x >= bx - 3 && x < bx + bw + 3 && y >= by - 3 && y < by + bh + 3) { this.target = {x: clamp(s.x, 14, 370), y: clamp(s.y, 96, 206), spot: s}; return true; }
    }
    if (y > 90) this.target = {x: clamp(x, 14, 370), y: clamp(y, 96, 206)};
    return true;
  },
  draw() {
    const n = this.night, lit = n.lit;
    // the floor: dark carpet with a pattern that was loud in 1989
    R(0, 0, W, H, "#07060C");
    R(0, 16, W, 74, "#191325");
    for (let x = 0; x < W; x += 28) R(x, 16, 1, 74, "#221A33");
    R(0, 88, W, 2, "#2A2038");
    for (let y = 90; y < 232; y += 10) for (let x = (y / 10 % 2) * 14; x < W; x += 28) {
      R(x, y, 13, 9, "#0E0A16");
      if ((x + y) % 3 === 0) P(x + 4, y + 4, "#241A33");
      if ((x + y) % 7 === 0) P(x + 9, y + 6, "#2A1030");
    }
    // the sign over the counter
    const sign = Math.floor(T * 2) % 9 === 0 && lit < 0.6 ? "STARL TE" : "STARLITE";
    txtS(sign, 62, 24, lit > 0.5 ? C.pk : C.pl, 2, "c", C.k);
    // the front window and the street
    R(160, 20, 68, 34, "#060B18"); RO(160, 20, 68, 34, C.nv);
    for (let i = 0; i < 10; i++) P(163 + ((i * 17) % 62), 22 + ((T * 30 + i * 9) % 30), i % 3 ? C.nv : C.la);
    if (n.spots.some(s => s.id === "bike")) { R(186, 44, 14, 2, C.bl); P(185, 46, C.bl); P(199, 46, C.bl); R(192, 39, 1, 5, C.bl); }
    // the row of cabinets along the back wall
    const cabs = [[96, "#2A1A3A", C.li], [122, "#1A2A3A", C.bl], [148, "#3A1A2A", C.pk], [268, "#2A2A1A", C.ye], [294, "#1A3A2A", C.gr]];
    for (const [x, body, glow] of cabs) {
      R(x, 56, 22, 34, body); R(x + 2, 60, 18, 12, "#000");
      if (lit > 0.3 || Math.floor(T * 1.5 + x) % 3) { L.globalAlpha = 0.5 + 0.3 * lit; R(x + 3, 61, 16, 10, glow); L.globalAlpha = 1; }
      R(x + 4, 76, 14, 3, "#0A0810");
    }
    // 0417, at the end of the row
    const cx = 250;
    R(cx - 12, 54, 26, 38, "#241A3A"); RO(cx - 12, 54, 26, 38, C.pl);
    R(cx - 9, 58, 20, 14, "#000");
    const on = this.i !== 5 || true;
    if (on) {
      R(cx - 8, 59, 18, 12, Math.floor(T * 3) % 2 ? "#170D24" : "#1E0F2E");
      // the little player on its screen, pointing the shield at the glass on the bad nights
      const sx = cx - 1 + (this.i >= 5 ? Math.round(Math.sin(T * 0.7) * 2) : Math.round(Math.sin(T * 3) * 5));
      P(sx, 65, C.ye);
      if (this.i >= 5) { const a = Math.atan2(this.py - 200, this.px - cx); P(sx + Math.round(Math.cos(a) * 2), 65 + Math.round(Math.sin(a) * 2), C.wh); }
      else P(sx + 2, 64, C.wh);
    }
    R(cx - 10, 76, 20, 4, "#120C1A"); P(cx - 5, 78, C.rd); P(cx + 4, 78, C.bl);
    // counter, change machine
    R(16, 96, 70, 14, "#3B2416"); R(16, 94, 70, 3, "#6B3F22");
    R(330, 82, 22, 30, "#2A2A34"); R(334, 88, 14, 8, "#000"); R(336, 102, 10, 3, "#12101A");
    // people
    const hot = this.dialog ? null : this.nearest();
    for (const s of this.spots()) {
      if (s.who) drawSpr(kidSpr(s.who === "man" ? "man" : s.who === "girl" ? "girl" : "boy"), s.x, s.y - 6 + Math.round(Math.sin(T * 2 + s.x) * 0.6));
      if (hot && hot.id === s.id) {
        const [bx, by, bw, bh] = s.box;
        RO(bx - 2, by - 2, bw + 4, bh + 4, Math.floor(T * 4) % 2 ? C.wh : C.ye);
      }
    }
    // a crowd on the early nights, drawn as shapes in the middle distance
    if (n.noise > 0.4) for (let i = 0; i < 5; i++) {
      const x = 100 + i * 42 + Math.round(Math.sin(T * 0.6 + i) * 4), y = 104 + (i % 3) * 9;
      L.globalAlpha = 0.5; drawSpr(kidSpr(i % 2 ? "boy" : "girl"), x, y); L.globalAlpha = 1;
    }
    // you
    drawSpr(kidSpr("me"), this.px, this.py - 2 + (Math.floor(this.step) % 2));
    R(this.px - 3, this.py + 3, 7, 1, "#000");
    // the light level of the night, plus the blackout at the end
    const dk = Math.max(1 - lit, this.dark);
    if (dk > 0.02) { L.globalAlpha = Math.min(0.94, dk * 0.85); R(0, 0, W, H, "#020104"); L.globalAlpha = 1; }
    if (this.fade > 0) { L.globalAlpha = clamp(this.fade / 1.4, 0, 1); R(0, 0, W, H, "#000"); L.globalAlpha = 1; }
    // header
    R(0, 0, W, 15, C.k); R(0, 14, W, 1, C.pl);
    txt("THE STARLITE ~ " + n.d, 12, 5, C.pe);
    txt("NIGHT " + this.i + "/" + NIGHT_COUNT, W - 12, 5, C.gy, 1, "r");
    // dialog or prompt
    if (this.dialog) {
      const d = this.dialog, lines = wrap(d.text, 300), h = lines.length * 8 + (d.who ? 18 : 10);
      panel(28, 232 - h, 328, h, d.who ? d.who.col : C.pe);
      if (d.who) txt(d.who.n + " ~ " + d.who.role, 36, 236 - h, d.who.col);
      lines.forEach((l, i) => txt(l, 36, 236 - h + (d.who ? 10 : 0) + i * 8, C.wh));
    } else if (hot) {
      const s = hot.n + "  ~  " + hot.hint, w = tw(s) + 14;
      panel(W / 2 - w / 2, 218, w, 12, C.gy);
      txt(s, W / 2, 222, C.wh, 1, "c");
    } else txt(ctl("WASD / CLICK TO WALK  ~  ENTER TO LOOK", "STICK TO WALK  ~  A TO LOOK", "DRAG TO WALK  ~  TAP THINGS"), W / 2, 222, C.gy, 1, "c");
  }
};

/* ---------------- the empty lot, once the nights are done ---------------- */
const LotScene = {
  captureKeys: true,
  enter() { this.t = 0; musTrack = null; tone(46, 3, "sine", 0.06); },
  update(dt) { this.t += dt; if (this.t > 16) this.close(); },
  close() { go(HubScene); },
  key() { if (this.t > 2) this.close(); return true; },
  click() { return this.key(); },
  draw() {
    R(0, 0, W, H, "#06070C");
    // a flat lot where a building used to be, chain link and weeds
    R(0, 150, W, 90, "#0B0C12");
    for (let x = 0; x < W; x += 6) R(x, 148 + (x % 12 === 0 ? -1 : 0), 4, 2, "#141620");
    for (let x = 8; x < W; x += 9) { R(x, 120, 1, 30, "#1A1C26"); }
    R(0, 118, W, 1, "#232633");
    for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = 160 + (i * 37) % 70; R(x, y, 1, 3 + (i % 3), "#1A2418"); }
    const lines = ["THE STARLITE CAME DOWN IN 1991.",
      "THERE IS A FENCE, AND WEEDS, AND A RAIL BY THE KERB WITH NOTHING LOCKED TO IT.",
      "THE CABINET WENT HOME WITH THE MAN WHO COULDN'T LEAVE IT ALONE.",
      "AND THEN IT CAME HERE, TO YOU.",
      "THERE IS ONE PLACE LEFT THAT YOU HAVEN'T BEEN."];
    let left = Math.floor(this.t * 26);
    lines.forEach((l, i) => {
      const ws = wrap(l, 300);
      ws.forEach((w, j) => { if (left > 0) txt(w, W / 2, 40 + i * 18 + j * 9, i === 4 ? C.pk : C.lg, 1, "c"); left -= w.length + 1; });
    });
    if (this.t > 13) txt(ctl("ANY KEY", "ANY BUTTON", "TAP"), W / 2, 226, C.gy, 1, "c");
  }
};

/* ---------------- the nights, in the archive ---------------- */
LORE_CAT.n = {n: "NIGHTS", one: "NIGHT", col: C.pe, total: 0};
function addLore(arr) {
  for (const e of arr) { LORE.push(e); LORE_BY[e.id] = e; if (LORE_CAT[e.c]) LORE_CAT[e.c].total++; }
}
addLore(NIGHTS.slice(1).map((n, k) => {
  const i = k + 1;
  return {id: "n" + i, c: "n", d: n.d, n: n.t, hint: i === 1 ? "THE SIDE DOOR IN THE BACK ROOM, ONCE THE BASEMENT IS SETTLED." : "WALK NIGHT " + (i - 1) + " FIRST.",
    cond: () => (meta.nights || 0) >= i,
    t: ["I WAS THERE. THE CABINET KEEPS IT THE WAY IT KEEPS EVERYTHING: EXACTLY, AND FOR NO REASON.|" + n.intro,
      n.spots.filter(s => s.lines.length).map(s => s.lines[s.lines.length - 1]).join("|")].join("|")};
}));
