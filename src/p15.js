/* ================================================================
   The Back Room (walkable hub), codex, run history
   ================================================================ */
let hubReturn = false;
const backTarget = () => hubReturn ? HubScene : TitleScene;

const HUB_SPOTS = [
  {id: "bench",   n: "WORKBENCH",     hint: "SPEND TOKENS ON SHIELDS, UPGRADES AND MODS", x: 54,  y: 78,  box: [22, 42, 64, 26],  act: () => go(WorkshopScene)},
  {id: "shelf",   n: "TROPHY SHELF",  hint: "RECORDS, HISTORY AND THE ONLINE BOARD",      x: 140, y: 60,  box: [108, 20, 64, 26], act: () => go(RecordsScene)},
  {id: "archive", n: "ARCHIVE",       hint: "THE CODEX: EVERYTHING YOU'VE MET",           x: 222, y: 78,  box: [200, 22, 44, 46], act: () => go(CodexScene)},
  {id: "cab",     n: "DAILY CABINET", hint: "TODAY'S SEED. ONE TRY.",                     x: 314, y: 82,  box: [300, 26, 28, 46], act: () => go(DailyScene, HubScene)},
  {id: "dummy",   n: "TRAINING DUMMY",hint: "LEARN THE MOVES",                            x: 344, y: 168, box: [334, 138, 20, 26], act: () => go(TrainingScene)},
  {id: "tv",      n: "OLD TV",        hint: "SETTINGS",                                   x: 40,  y: 170, box: [22, 140, 34, 24], act: () => go(SettingsScene, HubScene)},
  {id: "door",    n: "DOOR",          hint: "BACK TO THE CABINET",                        x: 192, y: 214, box: [176, 224, 32, 12], act: () => go(TitleScene)}
];
const NPC_SPOT = {wren: [102, 112], moth: [262, 124], pip: [150, 176]};

const HubScene = {
  walk: true,
  enter() {
    hubReturn = true;
    if (this.px == null) { this.px = 192; this.py = 196; }
    this.dialog = null; this.face = 1; this.step = 0; this.items = []; this.count = null;
    checkTapes();
    // the figure in the corner creeps closer the more of the story you know
    const h = hauntLevel();
    const FIG = [[362, 66], [330, 96], [262, 150], [214, 118]];
    this.fig = haunted(2) && meta.flags && meta.flags.crash1 ? FIG[Math.min(3, Math.max(0, h - 2))] : null;
    this.figGone = false; this.lightsT = 8 + rand() * 12; this.dark = 0; this.winT = 6 + rand() * 10; this.winFig = 0; this.p2T = 0;
    this.tvOn = 0; this.cabOn = 0;
    this.posterName = haunted(4) && scaresOn() && rand() < 0.35;
    music(meta.milo === "free" ? "map" : haunted(3) ? "basement" : "map");
    if (!meta.hubSeen) { meta.hubSeen = true; saveMeta(); this.dialog = {who: null, text: "THE BACK ROOM. " + ctl("WALK UP TO THINGS AND PRESS ENTER.", "WALK UP TO THINGS AND PRESS A.", "DRAG ANYWHERE TO WALK. TAP THINGS (OR PRESS USE) TO USE THEM. THE X IN THE CORNER LEAVES.") + " EVERYTHING BEHIND THE CABINET LIVES HERE."}; }
  },
  back() { if (this.dialog) this.dialog = null; else go(TitleScene); },
  spots() {
    const out = HUB_SPOTS.slice();
    const TS = [[128, 150], [176, 186], [236, 170], [96, 196], [276, 196], [150, 124], [206, 146], [70, 122], [320, 140], [180, 100], [120, 168], [240, 108]];
    const floor = dueTapes().map(id => ({id: "tape" + id, n: "A TAPE", hint: "0417 ~ " + String(id).padStart(2, "0"), tape: id, act: () => go(TapeScene, {id, from: HubScene})}))
      .concat(dueLore("b").map(id => ({id: "lore" + id, n: "A TAPE", hint: "0417 ~ B-SIDE " + loreNum(LORE_BY[id]), tape: "b", act: () => go(LoreScene, {id, from: HubScene})})))
      .concat(scaresOn() ? [] : dueLore("p").map(id => ({id: "lore" + id, n: "A TAPE", hint: "LABELLED: INPUT 2", tape: "p", act: () => go(LoreScene, {id, from: HubScene})})));
    floor.forEach((f, i) => {
      const [x, y] = TS[i % TS.length];
      out.push(Object.assign(f, {x, y: y + 2, box: [x - 5, y - 4, 10, 8]}));
    });
    // the corkboard, the cabinet's printer, and the poster by the door
    const docs = loreOf("d").filter(e => loreRead(e.id) || loreDue(e.id)).length;
    out.push({id: "cork", n: "CORKBOARD", hint: dueLore("d").length ? "SOMETHING NEW IS PINNED UP" : docs ? docs + " PAPER" + (docs > 1 ? "S" : "") : "EMPTY", x: 355, y: 60, box: [334, 20, 42, 24], act: () => this.useCork()});
    if (dueLore("s").length) out.push({id: "receipt", n: "A RECEIPT", hint: "THE CABINET PRINTED IT BY ITSELF", x: 332, y: 76, box: [327, 58, 8, 16], act: () => go(LoreScene, {id: dueLore("s")[0], from: HubScene})});
    out.push({id: "poster", n: "POSTER", hint: haunted(2) ? "MISSING" : "RIPOSTE", x: 280, y: 60, box: [270, 22, 20, 18], act: () => this.usePoster()});
    if (lanternOpen()) out.push({id: "crate", n: "THE CRATE", hint: meta.echoEnd ? "EMPTY NOW" : "LANTERN COIN-OP. IT IS STILL WARM.", x: 108, y: 200, box: [96, 196, 24, 18],
      act: () => this.useCrate()});
    if (starliteOpen()) out.push({id: "side", n: "THE SIDE DOOR", hint: nightsDone() >= NIGHT_COUNT ? "IT ONLY GOES TO AN EMPTY LOT NOW" : "IT SMELLS LIKE 1989 THROUGH THERE",
      x: 26, y: 104, box: [8, 82, 16, 30], act: () => go(nightsDone() >= NIGHT_COUNT ? LotScene : StarliteScene)});
    if (basementOpen()) out.push({id: "trap", n: "TRAPDOOR", hint: meta.milo === "free" ? "IT'S QUIET DOWN THERE NOW" : "IT GOES DOWN", x: 300, y: 196, box: [288, 186, 24, 16], act: () => this.enterBasement()});
    if (meta.milo === "free") out.push({id: "milo", n: "MILO", hint: "THE LAST PLAYER", x: 282, y: 124, box: [277, 112, 10, 14], act: () => this.talkMilo()});
    for (const n of NPCS) if (npcHere(n.id)) {
      const [x, y] = NPC_SPOT[n.id];
      out.push({id: n.id, n: n.n, hint: n.role, x, y: y + 4, box: [x - 5, y - 6, 10, 14], npc: n, act: () => this.talk(n)});
    }
    return out;
  },
  useCrate() {
    if (meta.echoEnd) { this.dialog = {who: null, text: "AN EMPTY WOODEN CRATE WITH A STENCIL ON THE SIDE. THE STRAW INSIDE IS STILL PRESSED INTO THE SHAPE OF SOMETHING."}; return; }
    const r = loadRun();
    if (r && !r.lantern) { this.dialog = {who: null, text: "FINISH WHAT YOU STARTED FIRST. THE CRATE ISN'T GOING ANYWHERE."}; return; }
    if (r && r.lantern) { run = r; go(RunMap); return; }
    fxGlitch(0.7); sfxGlitch(true);
    startLantern();
  },
  useCork() {
    const due = dueLore("d");
    if (due.length) return go(LoreScene, {id: due[0], from: HubScene});
    if (loreOf("d").some(e => loreRead(e.id))) { CodexScene.tab = "tapes"; CodexScene.cat = "d"; return go(CodexScene); }
    this.dialog = {who: null, text: "AN EMPTY CORKBOARD. A FEW RUSTY PINS. SOMEBODY MEANT TO PUT THINGS UP HERE."};
  },
  usePoster() {
    let text = "A FADED RIPOSTE POSTER. 'CATCH EVERYTHING. SEND IT BACK.'";
    if (haunted(2)) text = "MISSING. MILO, 11. LAST SEEN 10 OCTOBER 1989. THE PHOTO IS JUST A BLACK SQUARE.";
    if (this.posterName) {
      this.posterName = false;
      text = "MISSING. " + playerName() + ". LAST SEEN: HERE, " + dateStr() + ". THE PHOTO IS JUST A BLACK SQUARE.";
      fxGlitch(0.6); sfxGlitch(true); tone(41, 1.1, "sine", 0.16);
      setTimeout(() => { if (scene === HubScene && this.dialog) this.dialog.text = "MISSING. MILO, 11. LAST SEEN 10 OCTOBER 1989. THE PHOTO IS JUST A BLACK SQUARE."; fxGlitch(0.3); }, 1600);
    }
    this.dialog = {who: null, text};
  },
  touchWindow() {
    this.winFig = 0; this.winT = 30 + rand() * 30; this.dark = 0.35;
    tone(80, 0.12, "sine", 0.3); setTimeout(() => tone(76, 0.12, "sine", 0.3), 260); setTimeout(() => tone(72, 0.14, "sine", 0.26), 520);
    fxGlitch(0.4);
    loreSetFlag("winTouch");
  },
  nearWindow() { return Math.hypot(57 - this.px, 60 - this.py) < 34; },
  talkMilo() {
    const L2 = ["IT'S QUIET IN HERE NOW. I LIKE IT.", "I DON'T HAVE TO PLAY ANYMORE. I STILL WANT TO, SOMETIMES.",
      "THANK YOU FOR NOT LEAVING ME DOWN THERE.", "YOU'RE BETTER THAN ME NOW. DON'T TELL ANYONE.", "MY MOM USED TO SAY I'D PLAY UNTIL MY THUMBS FELL OFF. SHE WAS ALMOST RIGHT."];
    this.dialog = {who: {n: "MILO", role: "THE LAST PLAYER", col: C.bl}, text: L2[Math.floor(T * 3) % L2.length]};
    tone(620, 0.05, "square", 0.06);
  },
  enterBasement() {
    const r = loadRun();
    if (r && !r.basement) { this.dialog = {who: null, text: "YOU'RE IN THE MIDDLE OF A DESCENT. FINISH IT FIRST. THE BASEMENT ISN'T GOING ANYWHERE."}; return; }
    if (r && r.basement) { run = r; go(RunMap); return; }
    fxGlitch(0.6); fxRoll(); sfxGlitch(true);
    startBasement();
  },
  startCountdown() { this.count = {t: 0, n: 10}; musTrack = null; },
  talk(n) {
    const line = n.id === "moth" ? mothLine() : n.lines[Math.floor(T * 3) % n.lines.length];
    this.dialog = {who: n, text: line + "  ~  (" + n.perk + ")"};
    tone(520 + rand() * 80, 0.05, "square", 0.06);
  },
  nearest() {
    let best = null, bd = 24;
    for (const s of this.spots()) { const d = Math.hypot(s.x - this.px, s.y - this.py); if (d < bd) { bd = d; best = s; } }
    return best;
  },
  update(dt) {
    if (this.count) {
      const c = this.count; c.t += dt;
      const n = 10 - Math.floor(c.t / 0.8);
      if (n !== c.n && n >= 0) { c.n = n; tone(260 - (10 - n) * 14, 0.4, "sine", 0.14); }
      if (c.t > 8.8 && !c.hit) { c.hit = 1; this.dark = 1.6; noise(0.5, 0.2, 300, 60); }
      if (c.t > 10.4 && !c.said) { c.said = 1; whisper("AGAIN", {big: true, x: W / 2, y: 104, life: 2.6}); tone(40, 1.4, "sawtooth", 0.1, 30); }
      if (c.t > 13) { this.count = null; music("basement"); }
      return;
    }
    if (this.dark > 0) this.dark -= dt;
    if (this.tvOn > 0) this.tvOn -= dt;
    if (this.cabOn > 0) this.cabOn -= dt;
    if (haunted(3) && scaresOn()) {
      this.lightsT -= dt;
      if (this.lightsT <= 0) { this.lightsT = 12 + rand() * 18; this.dark = 0.12 + rand() * 0.2; noise(0.15, 0.05, 120, 60); }
    }
    if (haunted(1)) {
      this.winT -= dt;
      if (this.winT <= 0) { this.winT = 14 + rand() * 20; this.winFig = this.px < 130 && this.py < 110 ? 1.8 : 0.9; }
    }
    // INPUT 2 doesn't wait to be found: it plays itself when you come in
    if (!this.dialog && scaresOn() && this.p2T >= 0) {
      this.p2T += dt;
      const id = this.p2T > 2.2 ? dueLore("p")[0] : null;
      if (id) {
        this.p2T = -1; this.dark = 0.8; sfxGlitch(true); fxGlitch(0.5); tone(46, 0.8, "sine", 0.18);
        setTimeout(() => { if (scene === HubScene) go(LoreScene, {id, from: HubScene}); }, 700);
      }
    }
    if (this.winFig > 0) this.winFig -= dt;
    if (this.fig && !this.figGone && Math.hypot(this.fig[0] - this.px, this.fig[1] - this.py) < 46) {
      this.figGone = true; fxGlitch(0.5); noise(0.25, 0.14, 3000, 400);
    }
    if (this.dialog) return;
    let ax = 0, ay = 0;
    if (keys.a || keys.arrowleft) ax -= 1;
    if (keys.d || keys.arrowright) ax += 1;
    if (keys.w || keys.arrowup) ay -= 1;
    if (keys.s || keys.arrowdown) ay += 1;
    if (PAD.connected && (PAD.lx || PAD.ly)) { ax = PAD.lx; ay = PAD.ly; }
    if (PAD.connected && PAD.cur) { const c = PAD.cur; if (c.left) ax = -1; if (c.right) ax = 1; if (c.up) ay = -1; if (c.down) ay = 1; }
    if (TCH.mx || TCH.my) { ax = TCH.mx; ay = TCH.my; }
    if (this.target) {
      const dx = this.target.x - this.px, dy = this.target.y - this.py, d = Math.hypot(dx, dy);
      if (ax || ay) this.target = null;
      else if (d < 3) { const t = this.target; this.target = null; sfx.select(); t.act(); return; }
      else { ax = dx / d; ay = dy / d; }
    }
    const m = Math.hypot(ax, ay);
    if (m > 1) { ax /= m; ay /= m; }
    this.px = clamp(this.px + ax * 92 * dt, 14, 370);
    this.py = clamp(this.py + ay * 92 * dt, 58, 216);
    if (ax) this.face = ax > 0 ? 1 : -1;
    if (m > 0.1) { this.step += dt * 8; if (Math.floor(this.step) !== Math.floor(this.step - dt * 8) && Math.floor(this.step) % 2) tone(90, 0.02, "triangle", 0.04); }
  },
  key(k) {
    if (this.count) return true;
    if (this.dialog) { if (k === "enter" || k === " " || k === "e" || k === "escape") { this.dialog = null; sfx.move(); } return true; }
    if ((k === "enter" || k === " " || k === "e") && this.winFig > 0 && this.nearWindow()) { this.touchWindow(); return true; }
    if (k === "enter" || k === " " || k === "e") {
      const s = this.nearest();
      if (s) { sfx.select(); fxGlitch(0.15); s.act(); } else sfx.deny();
      return true;
    }
    return ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(k);
  },
  click(x, y) {
    if (this.count) return true;
    if (this.dialog) { this.dialog = null; return true; }
    if (this.winFig > 0 && x >= 38 && x < 76 && y >= 18 && y < 40) { this.touchWindow(); return true; }
    for (const s of this.spots()) {
      const [bx, by, bw, bh] = s.box;
      if (x >= bx - 3 && x < bx + bw + 3 && y >= by - 3 && y < by + bh + 3) {
        // walk to the nearest reachable spot next to it, then use it
        this.target = {x: clamp(s.x, 14, 370), y: clamp(s.y, 58, 216), act: s.act};
        return true;
      }
    }
    if (y > 50) { this.target = {x: clamp(x, 14, 370), y: clamp(y, 58, 216), act: () => {}}; }
    return true;
  },
  draw() {
    // wall and floor
    R(0, 0, W, H, "#0B0910");
    R(0, 16, W, 30, "#1A1426");
    for (let x = 0; x < W; x += 24) R(x, 16, 1, 30, "#231B33");
    R(0, 46, W, 2, "#2A2038");
    for (let y = 48; y < 232; y += 12) for (let x = (y / 12 % 2) * 16; x < W; x += 32) R(x, y, 31, 11, "#130F1B");
    R(0, 48, W, 1, "#000");
    // a window with rain
    R(40, 20, 34, 18, "#0A1630"); RO(40, 20, 34, 18, C.la);
    if (meta.milo === "free") { for (let i = 0; i < 6; i++) P(44 + (i * 13) % 28, 22 + (i * 7) % 14, i % 2 ? C.wh : C.lg); }
    else for (let i = 0; i < 8; i++) { const ry = 21 + ((T * 40 + i * 7) % 16); P(43 + i * 4, ry, C.bl); }
    if (this.winFig > 0 && scaresOn()) { R(60, 23, 5, 5, "#020104"); R(59, 28, 7, 10, "#020104"); }
    R(56, 20, 1, 18, C.la); R(40, 28, 34, 1, C.la);
    const hot = this.nearest();
    const glow = s => hot && hot.id === s ? (Math.floor(T * 4) % 2 ? C.wh : C.ye) : null;
    // poster: a RIPOSTE poster, until you know better
    if (haunted(2)) {
      R(270, 22, 20, 18, "#D8D0BC"); R(276, 24, 8, 8, "#050305");
      R(272, 34, 16, 1, "#5F574F"); R(273, 37, 12, 1, "#5F574F");
      if (this.posterName && Math.floor(T * 5) % 23 === 0) R(276, 24, 8, 8, C.rd);
    } else { R(270, 22, 20, 18, C.nv); txt("R", 277, 28, C.or); RO(270, 22, 20, 18, C.pl); }
    // corkboard, with whatever has been pinned to it
    R(334, 20, 42, 24, "#6B4A2A"); RO(334, 20, 42, 24, "#3B2416");
    loreOf("d").forEach((e, i) => {
      if (!loreRead(e.id) && !loreDue(e.id)) return;
      const qx = 337 + (i % 6) * 6.5, qy = 23 + Math.floor(i / 6) * 10 + (i % 2);
      const unread = loreDue(e.id);
      R(qx, qy, 5, 7, unread && Math.floor(T * 3) % 2 ? C.wh : e.id === "d9" ? "#F0E0B0" : "#E0D6C0");
      P(qx + 2, qy, unread ? C.rd : C.pl);
    });
    if (glow("cork")) RO(332, 18, 46, 28, glow("cork"));
    if (glow("poster")) RO(268, 20, 24, 22, glow("poster"));
    // workbench
    R(22, 52, 64, 16, "#3B2416"); R(22, 50, 64, 3, "#6B3F22"); R(26, 68, 4, 10, "#2A170D"); R(78, 68, 4, 10, "#2A170D");
    R(30, 44, 10, 6, C.gy); R(46, 46, 6, 4, C.or); P(60, 47, C.ye); P(64, 46, C.bl); R(70, 45, 8, 5, C.nv);
    if (glow("bench")) RO(20, 42, 68, 28, glow("bench"));
    // trophy shelf: one trophy per achievement
    R(108, 40, 64, 3, "#6B3F22"); R(108, 30, 64, 2, "#6B3F22");
    const got = achCount();
    for (let i = 0; i < Math.min(28, got); i++) {
      const tx = 110 + (i % 14) * 4.4, ty = i < 14 ? 34 : 24;
      R(tx, ty + 2, 3, 4, i % 3 ? C.ye : C.lg); P(tx + 1, ty + 1, C.ye);
    }
    if (!got) txt("EMPTY", 140, 34, C.gy, 1, "c");
    if (glow("shelf")) RO(106, 20, 68, 26, glow("shelf"));
    // archive bookcase
    R(200, 22, 44, 46, "#2A170D"); RO(200, 22, 44, 46, "#6B3F22");
    const bookCols = [C.rd, C.bl, C.li, C.or, C.pk, C.la, C.ye];
    for (let sh = 0; sh < 3; sh++) {
      R(201, 36 + sh * 14, 42, 1, "#6B3F22");
      for (let b = 0; b < 9; b++) R(203 + b * 4.4, 26 + sh * 14 + (b % 3), 3, 10 - (b % 3), bookCols[(b + sh * 2) % bookCols.length]);
    }
    if (glow("archive")) RO(198, 20, 48, 50, glow("archive"));
    // daily cabinet
    R(300, 26, 28, 46, "#241A3A"); R(302, 30, 24, 16, "#000"); R(303, 31, 22, 14, Math.floor(T * 2) % 2 ? "#1A0F2A" : "#210F33");
    if (this.cabOn > 0 && scaresOn()) {
      // it turned itself on, and someone is playing
      R(303, 31, 22, 14, "#120A18");
      const px = 314 + Math.round(Math.sin(T * 3) * 6), py = 40;
      P(px, py, C.ye); P(px - 1, py, C.or); P(px + 1, py, C.or);
      for (let i = 0; i < 3; i++) P(303 + ((T * 30 + i * 9) % 22), 34 + i * 3, C.rd);
      if (Math.floor(T * 2) % 2) txt("MLO", 314, 33, C.rd, 1, "c");
    } else if (haunted(2) && T % 9 < 1.2) txt("MLO", 314, 35, C.rd, 1, "c"); else txt("D", 311, 35, C.pk);
    R(304, 52, 20, 4, C.nv); P(308, 54, C.rd); P(318, 54, C.bl);
    if (dailyToday() && dailyToday().done) P(322, 48, C.li); else if (Math.floor(T * 3) % 2) P(322, 48, C.pk);
    if (glow("cab")) RO(298, 24, 32, 50, glow("cab"));
    // the cabinet printed something
    if (dueLore("s").length) {
      const sway = Math.round(Math.sin(T * 2) * 0.6);
      R(329 + sway, 58, 5, 14, "#EEE8DE"); for (let k = 0; k < 4; k++) R(330 + sway, 60 + k * 3, 3, 1, "#8A8494");
      if (glow("receipt")) RO(326, 56, 11, 18, glow("receipt"));
    }
    // training dummy
    R(343, 150, 2, 14, "#6B3F22"); R(338, 140, 12, 12, "#8A6A3A"); R(341, 143, 2, 2, C.k); R(345, 143, 2, 2, C.k); R(336, 164, 16, 2, "#6B3F22");
    if (glow("dummy")) RO(334, 138, 20, 30, glow("dummy"));
    // old TV. sometimes it is on, and there is something in it
    R(22, 144, 34, 20, "#2A2438"); R(25, 147, 22, 14, "#000");
    if (this.tvOn > 0 && scaresOn()) {
      R(25, 147, 22, 14, "#151119");
      for (let i = 0; i < 26; i++) P(25 + rint(22), 147 + rint(14), rand() < 0.5 ? C.gy : C.lg);
      if (SPR.face && Math.floor(this.tvOn * 3) % 2) { L.globalAlpha = 0.5; drawSpr(SPR.face, 36, 154, false, 0.6); L.globalAlpha = 1; }
    } else { L.globalAlpha = 0.6; for (let i = 0; i < 6; i++) R(26 + rint(20), 148 + rint(12), 2, 1, C.lg); L.globalAlpha = 1; }
    R(50, 149, 3, 3, C.gy); R(50, 155, 3, 3, C.gy); R(30, 164, 2, 3, "#2A2438"); R(46, 164, 2, 3, "#2A2438");
    if (glow("tv")) RO(20, 142, 38, 26, glow("tv"));
    // the side door: shut, until the basement is settled
    if (starliteOpen()) {
      R(8, 82, 16, 30, "#2A1A12"); RO(8, 82, 16, 30, "#6B3F22"); P(20, 97, C.ye);
      const warm = nightsDone() >= NIGHT_COUNT ? C.gy : C.pe;
      if (Math.floor(T * 1.5) % 2) { L.globalAlpha = 0.35; R(24, 84, 2, 26, warm); L.globalAlpha = 1; }
      if (glow("side")) RO(6, 80, 20, 34, glow("side"));
    }
    // door
    R(176, 224, 32, 16, "#3B2416"); R(176, 224, 32, 1, "#6B3F22"); P(202, 230, C.ye);
    if (glow("door")) RO(174, 222, 36, 14, glow("door"));
    // the crate 0417 came in
    if (lanternOpen()) {
      drawSpr(SPR.crate, 108, 205, false, 2.6);
      txt("0417", 108, 202, meta.echoEnd ? C.gy : C.bl, 1, "c");
      if (!meta.echoEnd && Math.floor(T * 1.2) % 3 === 0) { L.globalAlpha = 0.4; R(99, 197, 18, 2, C.bl); L.globalAlpha = 1; }
      if (glow("crate")) RO(94, 194, 28, 22, glow("crate"));
    }
    // the trapdoor
    if (basementOpen()) {
      R(288, 188, 24, 14, "#0A0508"); RO(288, 188, 24, 14, "#3B2416");
      for (let k = 0; k < 3; k++) R(290, 191 + k * 4, 20, 1, "#2A170D");
      if (meta.milo !== "free" && Math.floor(T * 1.5) % 2) { L.globalAlpha = 0.25; R(289, 201, 22, 1, C.rd); L.globalAlpha = 1; }
      if (glow("trap")) RO(286, 186, 28, 18, glow("trap"));
    }
    // tapes somebody left on the floor
    for (const s of this.spots()) if (s.tape) {
      drawSpr(s.tape === "b" ? loreSpr("b") : s.tape === "p" ? loreSpr("p") : SPR.tape, s.x, s.y - 2);
      if (Math.floor(T * 3) % 2) P(s.x + 4, s.y - 5, C.pk);
      if (glow(s.id)) RO(s.x - 6, s.y - 6, 13, 10, glow(s.id));
    }
    if (meta.milo === "free") { L.globalAlpha = 0.85; drawSpr(SPR.npc_milo, 282, 120 + Math.round(Math.sin(T * 1.6))); L.globalAlpha = 1; if (hot && hot.id === "milo") txt("!", 281, 106, C.wh); }
    // strays: rescued ones, or an empty mark where they would stand
    for (const n of NPCS) {
      const [x, y] = NPC_SPOT[n.id];
      if (npcHere(n.id)) {
        drawSpr(npcSpr(n.id), x, y + Math.round(Math.sin(T * 2 + x) * 0.6));
        if (hot && hot.id === n.id) txt("!", x - 1, y - 14, C.wh);
      } else { L.globalAlpha = 0.25; R(x - 4, y + 4, 9, 2, C.gy); L.globalAlpha = 1; }
    }
    // it stands in the corner, until you get close
    if (this.fig && !this.figGone && hauntMode() > 0) drawSpr(SPR.figure, this.fig[0], this.fig[1]);
    // the player
    drawSpr(meta.milo === "stay" ? SPR.ghostPlayer : SPR.player, this.px, this.py - 2 + (Math.floor(this.step) % 2));
    R(this.px - 3, this.py + 3, 7, 1, "#000");
    if (this.dark > 0) { L.globalAlpha = 0.93; R(0, 15, W, H - 15, "#020103"); L.globalAlpha = 1; }
    if (this.count && this.count.n >= 0 && this.count.t < 8.8) { L.globalAlpha = 0.5; txt(String(this.count.n), W / 2, 96, C.rd, 5, "c"); L.globalAlpha = 1; }
    // header
    R(0, 0, W, 15, C.k); R(0, 14, W, 1, C.nv);
    txt("THE BACK ROOM", 12, 5, C.or);
    txt("@" + meta.tokens, W - 12, 5, C.or, 1, "r");
    const lost = NPCS.filter(n => !npcHere(n.id)).length;
    if (lost) txt(lost + " STRAY" + (lost > 1 ? "S" : "") + " LOST IN THE DEPTHS", W / 2 + 30, 5, C.gy, 1, "c");
    // prompt / dialog
    if (this.dialog) {
      const d = this.dialog, lines = wrap(d.text, 300), h = lines.length * 8 + (d.who ? 18 : 10);
      panel(28, 232 - h, 328, h, d.who ? d.who.col : C.la);
      if (d.who) { txt(d.who.n + " ~ " + d.who.role, 36, 236 - h, d.who.col); }
      lines.forEach((l, i) => txt(l, 36, 236 - h + (d.who ? 10 : 0) + i * 8, C.wh));
    } else if (hot) {
      const s = hot.n + "  ~  " + hot.hint;
      const w = tw(s) + 14;
      panel(W / 2 - w / 2, 218, w, 12, C.gy);
      txt(s, W / 2, 222, C.wh, 1, "c");
    } else txt(ctl("WASD / CLICK TO WALK  ~  ENTER TO USE  ~  ESC TO LEAVE", "STICK TO WALK  ~  A TO USE  ~  B TO LEAVE", "DRAG TO WALK  ~  TAP THINGS OR PRESS USE  ~  X TO LEAVE"), W / 2, 222, C.gy, 1, "c");
  }
};

/* ---------------- codex ---------------- */
function fakeFoe(type, x, y) {
  return {type, x, y, hit: 0, born: 2, ang: Math.PI / 2 + T, plate: T * 0.8, burst: Math.floor(T) % 2, shAng: T * 1.3, p2: false,
    elite: false, hp: FOE[type].hp, maxhp: FOE[type].hp, r: FOE[type].r, fuse: 3, tele: 0};
}
const CodexScene = {
  back() { go(backTarget()); },
  enter() { this.tab = this.tab || "foes"; music("map"); },
  key(k) {
    const tabs = this.tabList().map(t => t[0]), n = tabs.length;
    if (k === "q" || k === "e") { const i = tabs.indexOf(this.tab); this.tab = tabs[(i + (k === "e" ? 1 : n - 1)) % n]; this.sel = n; sfx.move(); return true; }
    return false;
  },
  tabList() {
    const t = [["foes", "ENEMIES"], ["mods", "MODS"], ["syn", "SYNERGIES"], ["ach", "TROPHIES"]];
    if (archiveCount() > 0) t.push(["tapes", "ARCHIVE"]);
    return t;
  },
  draw() {
    menuBg(PALS.stack);
    title("CODEX", 6, C.li);
    beginItems(this);
    const tabs = this.tabList(), tw5 = tabs.length > 4 ? 64 : 80, tg = tabs.length > 4 ? 68 : 86;
    tabs.forEach(([k, l], i) => btn(this, l, 24 + i * tg, 24, tw5, 11, () => { this.tab = k; }, {col: this.tab === k ? (k === "tapes" ? C.pk : C.ye) : C.lg, dim: this.tab === k ? C.ye : C.gy}));
    let info = null;
    const seen = meta.seen || {};
    if (this.tab === "foes") {
      FOE_ORDER.forEach((t, i) => {
        const cx = 24 + (i % 6) * 56, cy = 40 + Math.floor(i / 6) * 50;
        const s = btn(this, null, cx, cy, 54, 47, () => {}, {col: C.li, dim: C.nv});
        R(cx + 1, cy + 1, 52, 45, s ? "#0B1E14" : C.ink);
        if (seen[t]) {
          const g0 = G; if (!G) newCombat({mode: "attract", pal: "grid"});
          try { const ff = fakeFoe(t, cx + 27, cy + 20); if (t === "mimic") ff.dormant = false; drawFoe(ff); } catch (e) {}
          if (!g0) G = null;
          txt(FOE_INFO[t][0], cx + 27, cy + 38, s ? C.wh : C.lg, 1, "c");
        } else txt("???", cx + 27, cy + 20, C.gy, 1, "c");
        if (s) info = seen[t] ? FOE_INFO[t][1] : "NOT MET YET.";
      });
      txt(Object.keys(seen).filter(k => FOE[k]).length + "/" + FOE_ORDER.length + " MET", W - 24, 9, C.gy, 1, "r");
    } else if (this.tab === "mods") {
      const ids = Object.keys(MODS), ms = meta.modsSeen || {};
      ids.forEach((id, i) => {
        const cx = 24 + (i % 3) * 113, cy = 38 + Math.floor(i / 3) * 11;
        const known = ms[id];
        const s = btn(this, known ? MODS[id].n : "???", cx, cy, 110, 10, () => {}, {col: known ? RAR_COL[MODS[id].r] : C.gy, dim: C.nv, align: "l"});
        if (s) info = known ? RAR_NAME[MODS[id].r] + " " + (MOD_KIND[MODS[id].k] || MOD_KIND.odd)[0] + ": " + MODS[id].d + (MODS[id].max === 1 ? " (ONE LEVEL)" : " (UP TO LEVEL III)")
          : "NEVER HELD. " + (meta.unlocked.includes(id) ? "IT'S IN YOUR POOL." : MOD_SECRET[id] ? MOD_SECRET[id] : "UNLOCK IT AT THE WORKBENCH.");
      });
      txt(Object.keys(ms).filter(k => MODS[k]).length + "/" + ids.length + " HELD", W - 24, 9, C.gy, 1, "r");
    } else if (this.tab === "syn") {
      const ss = meta.synSeen || {}, ms = meta.modsSeen || {};
      SYNERGIES.forEach((sy, i) => {
        const cx = 24 + (i % 2) * 170, cy = 38 + Math.floor(i / 2) * 17, known = ss[sy.id];
        const s = btn(this, null, cx, cy, 166, 15, () => {}, {col: C.pk, dim: C.nv});
        txt(known ? sy.n : "???", cx + 4, cy + 2, s ? C.k : known ? C.pk : C.gy);
        txt(sy.m.map(id => ms[id] ? MODS[id].n : "???").join(" + "), cx + 4, cy + 9, s ? C.k : C.gy);
        if (s) info = (known ? sy.d : "HOLD BOTH MODS AT ONCE TO FIND OUT.") + "  ~  SYNERGIES WORK IN DESCENT RUNS.";
      });
      txt(Object.keys(ss).filter(k => SYNERGIES.some(x => x.id === k)).length + "/" + SYNERGIES.length + " FOUND", W - 24, 9, C.gy, 1, "r");
    } else if (this.tab === "ach") {
      const a = meta.ach || {};
      ACH.forEach((x, i) => {
        const cx = 24 + (i % 3) * 113, cy = 40 + Math.floor(i / 3) * 13;
        const done = !!a[x.id], hide = x.secret && !done;
        const s = btn(this, null, cx, cy, 110, 11, () => {}, {col: done ? C.ye : C.gy, dim: C.ink});
        txt(done ? "@" : "~", cx + 3, cy + 3, s ? C.k : done ? C.ye : C.gy);
        txt(hide ? "???" : x.n, cx + 11, cy + 3, s ? C.k : done ? C.wh : C.gy);
        if (s) info = hide ? "A SECRET." : x.d + (done ? "  ~  UNLOCKED " + new Date(a[x.id]).toLocaleDateString() : "");
      });
      txt(achCount() + "/" + ACH.length, W - 24, 9, C.gy, 1, "r");
    } else if (this.tab === "tapes") {
      info = drawArchive(this) || info;
    }
    btn(this, "BACK", W / 2 - 30, 226, 60, 11, () => this.back(), {col: C.gy});
    endItems(this);
    R(24, 196, 336, 26, C.ink); RO(24, 196, 336, 26, C.nv);
    if (info) wrap(info, 322).slice(0, 3).forEach((l, i) => txt(l, 31, 200 + i * 7, C.lg));
    else txt(ctl("Q / E TO SWITCH TABS", "LB / RB TO SWITCH TABS", "TAP A TAB AT THE TOP"), W / 2, 206, C.gy, 1, "c");
  }
};

/* ---------------- run history ---------------- */
const HistoryScene = {
  back() { go(RecordsScene); },
  enter() { music("map"); },
  draw() {
    menuBg(PALS.grid);
    title("RUN HISTORY", 8, C.li);
    const h = Array.isArray(meta.history) ? meta.history : [];
    const cols = [["DATE", 16], ["RESULT", 64], ["DEPTH", 132], ["KILLS", 170], ["PERF", 206], ["SHIELD", 238], ["TOKENS", 368]];
    cols.forEach(([n, x]) => txt(n, x, 30, C.gy, 1, n === "TOKENS" ? "r" : undefined));
    R(12, 37, 360, 1, C.nv);
    if (!h.length) txt("NO DESCENTS YET.", W / 2, 90, C.gy, 1, "c");
    h.forEach((r, i) => {
      const y = 42 + i * 15;
      const d = new Date(r.d);
      const res = {dead: ["LOST", C.rd], win: ["ASCENDED", C.li], true: ["TRUE END", C.pk], free: ["LAID TO REST", C.bl], stay: ["STAYED", C.pl]}[r.k] || ["?", C.gy];
      txt((d.getMonth() + 1) + "/" + d.getDate(), 16, y, C.lg);
      txt(res[0], 64, y, res[1]);
      txt(String(r.dp), 132, y, C.wh); txt(String(r.ki), 170, y, C.wh); txt(String(r.pf), 206, y, C.wh);
      txt((SHIELDS[r.sh] ? SHIELDS[r.sh].n : "?"), 238, y, C.wh);
      txt("@" + r.t, 368, y, C.or, 1, "r");
      const tags = [r.dy ? "DAILY" : "", r.a ? "A" + r.a : "", r.c ? r.c + " CURSE" + (r.c > 1 ? "S" : "") : "", r.m + " MODS"].filter(Boolean).join("  ");
      txt(tags, 64, y + 7, C.gy);
    });
    beginItems(this);
    btn(this, "BACK", W / 2 - 30, 222, 60, 12, () => this.back(), {col: C.gy});
    endItems(this);
  }
};
