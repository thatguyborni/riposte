/* ================================================================
   Descent scenes
   ================================================================ */
function runHeader(label) {
  R(0, 0, W, 15, C.k); R(0, 14, W, 1, PALS[DEPTH_PAL[run.depth]].grid);
  txt(label || ("DEPTH " + run.depth + " ~ " + PALS[DEPTH_PAL[run.depth]].name), 4, 5, PALS[DEPTH_PAL[run.depth]].accent);
  heartRow(W - 4, 5, run.lives, run.maxLives, "r");
  const hx = W - 10 - Math.max(run.lives, run.maxLives) * 6;
  txt("$" + run.coins, hx, 5, C.ye, 1, "r");
  let tx = hx - tw("$" + run.coins) - 8;
  if (run.lens) { txt("EYE", tx, 5, C.pk, 1, "r"); tx -= 22; }
  if (run.curses && run.curses.length) { txt("CURSE X" + run.curses.length, tx, 5, C.pl, 1, "r"); tx -= 50; }
  if (run.asc) { txt("A" + run.asc, tx, 5, C.rd, 1, "r"); tx -= 16; }
  if (run.daily) txt("DAILY", tx, 5, C.pk, 1, "r");
}
function finishNode() {
  const n = nodeById(run.pendingId);
  if (n) { n.visited = true; run.curId = n.id; }
  run.pendingId = null;
  if (run.lives <= 0) return go(RunOver, endRun("dead"));
  if (run.pendingMods && run.pendingMods.length) return go(SwapScene);   // slots full: choose first
  go(RunMap);
}

const ShieldSelect = {
  back() { go(ModesScene); },
  enter() { this.asc = Math.min(meta.asc || 0, this.asc == null ? (meta.asc || 0) : this.asc); },
  key(k) {
    if (!(meta.asc > 0)) return false;
    if (k === "q" || k === "pageup") { this.asc = Math.max(0, this.asc - 1); sfx.move(); return true; }
    if (k === "e" || k === "pagedown") { this.asc = Math.min(meta.asc, this.asc + 1); sfx.move(); return true; }
    return false;
  },
  draw() {
    menuBg();
    title("CHOOSE A SHIELD", 16);
    beginItems(this);
    if (meta.asc > 0) {
      txt("ASCENSION", W / 2, 34, C.gy, 1, "c");
      btn(this, "<", W / 2 - 60, 40, 14, 11, () => { this.asc = Math.max(0, this.asc - 1); }, {col: C.rd, dim: C.nv});
      txt(this.asc ? "A" + this.asc : "OFF", W / 2, 43, this.asc ? C.rd : C.lg, 1, "c");
      btn(this, ">", W / 2 + 46, 40, 14, 11, () => { this.asc = Math.min(meta.asc, this.asc + 1); }, {col: C.rd, dim: C.nv});
    }
    const ks = Object.keys(SHIELDS).filter(k => meta.shields[k]);
    ks.forEach((k, i) => {
      const s = btn(this, SHIELDS[k].n, W / 2 - 70, 58 + i * 15, 140, 12, () => { startRun(k, {asc: this.asc || 0}); go(RunMap); },
        {col: SHIELDS[k].secret ? C.pk : C.wh, align: "l"});
      if (k === meta.shield) txt("LAST", W / 2 + 64, 62 + i * 15, s ? C.k : C.gy, 1, "r");
    });
    btn(this, "BACK", W / 2 - 30, 210, 60, 12, () => go(TitleScene), {col: C.gy});
    endItems(this);
    const it = ks[this.sel - (meta.asc > 0 ? 2 : 0)];
    if (it) wrap(SHIELDS[it].d, 300).forEach((l, i) => txt(l, W / 2, 170 + i * 8, C.lg, 1, "c"));
    if (meta.asc > 0) {
      const lines = ASC.slice(1, (this.asc || 0) + 1);
      if (!this.asc) txt("Q / E  OR  < >  TO RAISE THE STAKES. MORE TOKENS PER LEVEL.", W / 2, 194, C.gy, 1, "c");
      else { txt(lines.map(l => l.split(":")[1].replace("+ ", "").trim()).join(" ~ ").slice(0, 200), W / 2, 188, C.rd, 1, "c"); txt("TOKENS X" + (1 + 0.2 * this.asc).toFixed(1), W / 2, 198, C.or, 1, "c"); }
    }
  }
};

const NODE_INFO = {
  fight:["FIGHT", "TWO WAVES. COINS AND A MOD."], elite:["ELITE", "THREE HARDER WAVES. A BETTER MOD."],
  shop:["SHOP", "SPEND COINS ON MODS AND REPAIRS."], rest:["REST", "REPAIR, OR TUNE A MOD."],
  event:["UNKNOWN", "SOMETHING HAPPENS HERE."], treasure:["TREASURE", "A FREE MOD, NO FIGHT."],
  altar:["CURSED ALTAR", "TRADE A CURSE FOR POWER."],
  boss:["GUARDIAN", "THE WAY DOWN IS BEHIND IT."], vault:["VAULT", "A ROOM THAT ISN'T ON THE MAP."]
};
const NODE_ICON = {altar:"i_altar", fight:"i_fight", elite:"i_elite", shop:"i_shop", rest:"i_rest", event:"i_event", treasure:"i_treasure", boss:"i_boss", vault:"i_vault"};
const NODE_COL = {altar:C.pl, fight:C.rd, elite:C.or, shop:C.ye, rest:C.li, event:C.la, treasure:C.ye, boss:C.rd, vault:C.pk};

const RunMap = {
  twoTap: true,   // on a phone: tap a room to read what it is, tap it again to go
  enter() { music(run.depth === 5 ? "basement" : run.depth === 4 ? "signal" : "map"); this.showMods = false; saveRun(); this.hover = -1; },
  draw() {
    if (!run) return go(TitleScene);
    if (run.pendingMods && run.pendingMods.length) return go(SwapScene);
    const pal = PALS[DEPTH_PAL[run.depth]];
    menuBg(pal);
    const nodes = run.map.nodes, avail = availNodes();
    const cur = run.curId ? nodeById(run.curId) : null;
    const v = vaultNode(), vShown = v && (vaultRevealed() || v.visited);
    // edges
    for (const n of nodes) {
      if (n.secret && !vShown) continue;
      for (const id of n.next) {
        const m = nodeById(id); if (!m) continue;
        const on = (cur && n.id === cur.id) || (!cur && false);
        const walked = n.visited && m.visited;
        line(n.x + 7, n.y, m.x - 7, m.y, walked ? C.wh : on ? pal.accent : pal.grid, walked || on ? 0 : 2);
      }
    }
    if (vShown && v) {
      nodes.filter(n => n.layer === v.layer - 1 && !n.secret).forEach(n => line(n.x + 7, n.y, v.x - 7, v.y, v.visited ? C.wh : C.pl, 3));
    }
    beginItems(this);
    for (const n of nodes) {
      if (n.secret && !vShown) continue;
      const isAvail = avail.includes(n);
      const idx = this.items.length;
      if (isAvail) this.items.push({x: n.x - 8, y: n.y - 8, w: 17, h: 17, act: () => this.enterNode(n)});
      const sel = isAvail && idx === this.sel;
      const col = NODE_COL[n.type];
      const blinkOn = Math.floor(T * 3) % 2;
      R(n.x - 6, n.y - 6, 13, 13, C.k);
      RO(n.x - 6, n.y - 6, 13, 13, n.visited ? C.gy : isAvail ? (blinkOn ? col : C.wh) : pal.grid);
      if (n.secret && !n.visited && Math.floor(T * 8) % 5 === 0) RO(n.x - 7, n.y - 7, 15, 15, C.wh);
      L.globalAlpha = n.visited ? 0.35 : isAvail ? 1 : 0.55;
      drawSpr(SPR[NODE_ICON[n.type]], n.x + 0.5, n.y + 0.5);
      L.globalAlpha = 1;
      if (sel) { for (const [dx, dy] of [[-9, -9], [7, -9], [-9, 7], [7, 7]]) R(n.x + dx, n.y + dy, 3, 1, C.wh), R(n.x + dx + (dx < 0 ? 0 : 2), n.y + dy + (dy < 0 ? 0 : -2), 1, 3, C.wh); }
      if (cur && n.id === cur.id) drawSpr(SPR.player, n.x, n.y - 13 + Math.round(Math.sin(T * 4)));
    }
    endItems(this);
    if (!cur) drawSpr(SPR.player, 14, avail.length ? avail[0].y : 128);
    runHeader();
    // info for selected node
    const it = this.items[this.sel];
    const selNode = it ? avail.find(n => n.x - 8 === it.x && n.y - 8 === it.y) : null;
    R(0, 226, W, 14, C.k); R(0, 226, W, 1, pal.grid);
    if (selNode) {
      const info = NODE_INFO[selNode.type];
      txt(info[0], 4, 231, NODE_COL[selNode.type]);
      txt(info[1], 4 + tw(info[0]) + 8, 231, C.lg);
    } else txt(isTouch() ? "TAP A ROOM TO SEE IT, AGAIN TO GO" : "CHOOSE YOUR PATH", 4, 231, C.lg);
    const nm = ownedMods().length + "/" + MOD_SLOTS;
    if (isTouch() || PAD.connected) btn(this, "MODS " + nm, W - 58, 227, 54, 11, () => { this.showMods = true; }, {col: C.la, oneTap: true});
    else txt("TAB: MODS " + nm, W - 4, 231, C.gy, 1, "r");
    if (this.showMods) drawModsOverlay();
  },
  key(k) {
    if (k === "tab") { this.showMods = !this.showMods; return true; }
    if (k === "escape") { if (this.showMods) { this.showMods = false; return true; } saveRun(); go(TitleScene); return true; }
    if (this.showMods) { this.showMods = false; return true; }
    return false;
  },
  click(x, y) { if (this.showMods) { this.showMods = false; return true; } return false; },
  enterNode(n) {
    run.pendingId = n.id;
    saveRun();
    switch (n.type) {
      case "fight": case "elite": case "boss": return go(RunFight, n);
      case "shop": return go(ShopScene);
      case "rest": return go(RestScene);
      case "event": return go(EventScene, pickEvent());
      case "treasure": run.coins += 20; return go(RewardScene, {kind: "treasure"});
      case "vault": return go(VaultScene);
      case "altar": return go(AltarScene);
    }
  }
};
function drawModsOverlay() {
  panel(40, 30, 304, 180, C.la);
  const ids = ownedMods();
  txt("YOUR MODS " + ids.length + "/" + MOD_SLOTS + "  ~  SHIELD: " + SHIELDS[run.shield].n, W / 2, 38, C.ye, 1, "c");
  const extra = activeSynergies().map(sy => ({n: "SYNERGY: " + sy.n, d: sy.d, c: C.pk}))
    .concat((run.curses || []).map(c => ({n: "CURSE: " + CURSES[c].n, d: CURSES[c].d, c: C.pl})));
  const slots = [];
  for (let i = 0; i < MOD_SLOTS; i++) {
    const id = ids[i];
    slots.push(id ? {n: modName(id) + (modLv(id) >= modMax(id) ? "  (MAX)" : ""), d: MODS[id].d, c: RAR_COL[MODS[id].r]}
      : {n: "EMPTY SLOT", d: "WIN FIGHTS, OPEN CHESTS OR SHOP TO FILL IT.", c: C.gy});
  }
  const rows = slots.concat(extra);
  rows.slice(0, 12).forEach((r, i) => {
    const y = 52 + i * 12;
    txt(r.n, 50, y, r.c);
    txt(r.d, 50, y + 6, C.gy);
  });
  txt("ANY KEY TO CLOSE", W / 2, 200, C.gy, 1, "c");
}

/* ---------------- fights ---------------- */
const RunFight = {
  enter(n) {
    this.node = n;
    const kind = n.type;
    if (n.layer == null) { const nd = nodeById(run.pendingId); n.layer = nd ? nd.layer : 2; }
    const waves = kind === "boss" ? [[BOSS_FOR[run.depth]]] : runWaves(run.depth, n.layer, kind);
    newCombat({mode: "run", pal: DEPTH_PAL[run.depth], S: runStats(), lives: run.lives, maxLives: run.maxLives,
      waves, diff: depthDiff(run.depth, n.layer), elite: kind === "elite" || run.depth === 4, runPerf: run.runPerf,
      onEnd: res => fightEnd(res, n)});
    G.leechK = run.leechK || 0;
    const cm = combatCurseMuls();
    G.bulletMul = cm.bullet; G.fireMul = cm.fire;
    G.touch = lastPointerTouch;
    G.dark = run.depth === 5;
    music(run.depth === 6 ? (kind === "boss" ? "unit" : "lantern") : run.depth === 5 ? (kind === "boss" ? "milo" : "basement") : kind === "boss" ? "boss" : run.depth === 4 ? "signal" : "fight");
    if (new Date().getHours() === 3) unlockAch("witching");
    if (G.dark && !(meta.flags && meta.flags.darkTip)) { if (!meta.flags) meta.flags = {}; meta.flags.darkTip = 1; setTimeout(() => toast("THE LIGHTS DON'T WORK DOWN HERE. SHOTS STILL GLOW.", C.lg), 600); }
    if (kind === "elite") banner("ELITE", C.or, 1.2);
  },
  update(dt) { combatTick(dt); },
  draw() {
    drawCombat();
    this.items = [];
    if (G.paused) drawPause(this, "ABANDON RUN", () => { run.lives = 0; go(RunOver, endRun("dead")); });
  },
  key(k) { return combatKey(this, k); }
};
function fightEnd(res, n) {
  run.lives = G.lives; run.maxLives = G.maxLives;
  run.kills += G.kills; run.perfects += G.perfects; run.runPerf = G.runPerf;
  run.coins += Math.round(G.coinsGot * G.S.coinMul) + (res.win ? (G.gradeBonus || 0) : 0);
  modsAfterFight(res.win);
  if (res.win && G.grade) { if (!run.grades) run.grades = {S: 0, A: 0, B: 0, C: 0}; run.grades[G.grade]++; }
  if (res.win && n.rescue) rescueNpc(n.rescue);
  meta.stats.kills += G.kills; meta.stats.perfects += G.perfects;
  if (!res.win) return go(RunOver, endRun("dead"));
  run.fights++;
  if (run.lantern) { meta.stats.lanternRooms = (meta.stats.lanternRooms || 0) + 1; checkLore(); }
  if ((G.moved || 0) < 120 && G.kills >= 4 && !(meta.flags && meta.flags.still)) { if (!meta.flags) meta.flags = {}; meta.flags.still = 1; }
  if (G.perfects >= 10 && !meta.shields.mirror) {
    meta.shields.mirror = true; meta.secrets.mirror = true; sfx.secret();
    toast("SECRET SHIELD UNLOCKED: MIRROR", C.pk);
  }
  if (n.type !== "boss" && G.hits === 0 && G.perfects >= 4) {
    const v = vaultNode();
    if (v && !v.visited && !vaultRevealed()) {
      run.revealed[run.depth] = true;
      toast(n.layer < v.layer ? "FLAWLESS. A HIDDEN PATH FLICKERS INTO VIEW." : "FLAWLESS. YOU SENSE A HIDDEN ROOM... BEHIND YOU.", C.pk);
    }
  }
  saveMeta(); checkTapes();
  run.bank += n.type === "elite" ? 20 : n.type === "boss" ? 50 : 10;
  if (n.type === "boss") {
    run.bosses++;
    if (G.hits === 0 && !meta.fragments[3]) grantFragment(3);
    const node = nodeById(run.pendingId); if (node) { node.visited = true; run.curId = node.id; }
    run.pendingId = null;
    checkTapes();
    return go(run.depth === 6 ? LanternEnding : run.depth === 5 ? MiloEnding : DepthClear);
  }
  go(RewardScene, {kind: n.type});
}

/* ---------------- reward (pick a mod) ---------------- */
function drawCardFace(id, x, y, w, h, sel) {
  const m = MODS[id], col = RAR_COL[m.r], kind = MOD_KIND[m.k] || MOD_KIND.odd;
  txt(RAR_NAME[m.r], x + w / 2, y + 7, col, 1, "c");
  wrap(m.n, w - 10).slice(0, 2).forEach((l, i) => txt(l, x + w / 2, y + 18 + i * 7, C.wh, 1, "c"));
  txt(kind[0], x + w / 2, y + 35, kind[1], 1, "c");
  wrap(m.d, w - 12).forEach((l, i) => txt(l, x + w / 2, y + 46 + i * 7, C.lg, 1, "c"));
}
// o.slot: a mod you hold (shows its level); otherwise an offer (shows what taking it does)
function drawCard(sc, id, x, y, w, h, act, extra, o) {
  o = o || {};
  const m = MODS[id], col = o.armed ? C.rd : RAR_COL[m.r];
  const sel = btn(sc, null, x, y, w, h, act, {col, dim: col});
  R(x + 2, y + 2, w - 4, h - 4, o.armed ? "#2A0A12" : sel ? "#16131F" : C.ink);
  RO(x + 2, y + 2, w - 4, h - 4, o.armed ? C.rd : sel ? col : C.nv);
  drawCardFace(id, x, y, w, h, sel);
  let foot, fc = C.gy;
  if (o.slot) { foot = o.armed ? "DROP IT?" : "LEVEL " + ROMAN[modLv(id)]; fc = o.armed ? C.rd : C.lg; }
  else {
    const f = modFate(id);
    foot = f === "up" ? "LEVEL UP > " + ROMAN[modLv(id) + 1] : f === "max" ? "ALREADY MAXED" : f === "swap" ? "SLOTS FULL: SWAP" : "EMPTY SLOT";
    fc = f === "up" ? C.li : f === "swap" ? C.or : C.gy;
  }
  txt(foot, x + w / 2, y + h - 12, fc, 1, "c");
  if (extra) txt(extra, x + w / 2, y + h - 20, C.ye, 1, "c");
}
const RewardScene = {
  enter(o) {
    this.kind = o.kind;
    const minR = o.kind === "vault" || o.kind === "altar" ? "r" : (o.kind === "elite" || o.kind === "treasure") ? "u" : null;
    this.cards = rollChoices(3 + meta.upg.lucky, minR);
    music(run.depth === 4 ? "signal" : "map");
  },
  draw() {
    menuBg(PALS[DEPTH_PAL[run.depth]]);
    runHeader();
    title(this.kind === "vault" ? "THE VAULT OPENS" : this.kind === "altar" ? "THE ALTAR PAYS" : this.kind === "treasure" ? "TREASURE" : "CHOOSE A MOD", 20);
    beginItems(this);
    const n = this.cards.length, cw = n > 3 ? 84 : 100, gap = 8;
    const x0 = W / 2 - (n * cw + (n - 1) * gap) / 2;
    this.cards.forEach((id, i) => drawCard(this, id, x0 + i * (cw + gap), 52, cw, 100, () => { gainMod(id); finishNode(); }));
    btn(this, "SKIP (+10 COINS)", W / 2 - 50, 166, 100, 12, () => { run.coins += 10; finishNode(); }, {col: C.gy});
    endItems(this);
    drawSlotStrip(39);
  }
};

/* ---------------- shop ---------------- */
const ShopScene = {
  enter(o) { if (o && o.keep) return music("map"); this.stock = rollChoices(3, null).map(id => ({id, sold: false})); this.reroll = 15; this.repairs = 0; music("map"); },
  draw() {
    menuBg(PALS[DEPTH_PAL[run.depth]]);
    runHeader();
    title("SHOP", 22);
    beginItems(this);
    this.stock.forEach((s, i) => {
      const x = 22 + i * 92;
      if (s.sold) { RO(x, 42, 84, 108, C.nv); txt("SOLD", x + 42, 94, C.gy, 1, "c"); this.items.push({x, y: 42, w: 84, h: 108, act: () => {}, disabled: true}); return; }
      const price = Math.round(MOD_PRICE[MODS[s.id].r] * (npcHere("wren") ? 0.85 : 1));
      drawCard(this, s.id, x, 42, 84, 108, () => {
        if (run.coins < price) { sfx.deny(); return toast("NOT ENOUGH COINS", C.rd); }
        if (modFate(s.id) === "swap") return go(SwapScene, {id: s.id, price, done: took => { if (took) { run.coins -= price; s.sold = true; } go(ShopScene, {keep: true}); }});
        run.coins -= price; gainMod(s.id); s.sold = true; sfx.pick();
      }, "$" + price);
    });
    const bx = 300;
    const rep = npcHere("wren") ? 30 : 35;
    btn(this, "REPAIR $" + rep, bx, 50, 76, 14, () => {
      if (run.lives >= run.maxLives) return toast("SHIELDS ALREADY FULL", C.gy);
      if (run.coins < rep) { sfx.deny(); return toast("NOT ENOUGH COINS", C.rd); }
      run.coins -= rep; run.lives++; sfx.pick();
    }, {col: C.li});
    btn(this, "REROLL $" + this.reroll, bx, 70, 76, 14, () => {
      if (run.coins < this.reroll) { sfx.deny(); return toast("NOT ENOUGH COINS", C.rd); }
      run.coins -= this.reroll; this.reroll += 10; this.stock = rollChoices(3, null).map(id => ({id, sold: false}));
    }, {col: C.bl});
    btn(this, "LEAVE", bx, 136, 76, 14, finishNode, {col: C.gy});
    endItems(this);
    txt("REPAIR ADDS", bx + 38, 94, C.gy, 1, "c"); txt("ONE SHIELD", bx + 38, 101, C.gy, 1, "c");
    drawSlotStrip(158);
  }
};

/* ---------------- rest ---------------- */
const RestScene = {
  enter() { music("map"); },
  draw() {
    menuBg(PALS[DEPTH_PAL[run.depth]]);
    runHeader();
    title("REST", 26);
    // a small campfire
    const fx = W / 2, fy = 84;
    R(fx - 12, fy + 8, 24, 3, C.ru);
    for (let i = 0; i < 26; i++) {
      const a = (T * 3 + i * 1.7) % 1;
      const x = fx + Math.sin(i * 12.9 + T * 5) * (6 - a * 5), y = fy + 6 - a * 22;
      P(x, y, a < 0.3 ? C.ye : a < 0.6 ? C.or : C.rd);
    }
    txt(run.depth === 5 ? "SOMEONE LEFT A NIGHT LIGHT ON FOR YOU." : "THE DARK IS QUIET FOR A MOMENT.", W / 2, 110, C.lg, 1, "c");
    beginItems(this);
    const heal = run.asc >= 3 ? 1 : 2;
    btn(this, "REPAIR +" + heal + " SHIELD" + (heal > 1 ? "S" : ""), W / 2 - 70, 130, 140, 14, () => { run.lives = Math.min(run.maxLives, run.lives + heal); finishNode(); }, {col: C.li, disabled: run.lives >= run.maxLives});
    // tune one mod of your choice up a level
    const tun = tuneable();
    tun.forEach((id, i) => btn(this, "TUNE " + MODS[id].n + " > " + ROMAN[modLv(id) + 1], W / 2 - 80, 148 + i * 16, 160, 13,
      () => { equipMod(id); toast(MODS[id].n + " IS NOW LEVEL " + ROMAN[modLv(id)], C.bl); finishNode(); }, {col: C.bl}));
    if (!tun.length) btn(this, ownedMods().length ? "EVERY MOD IS MAXED" : "NO MODS TO TUNE", W / 2 - 80, 148, 160, 13, () => {}, {disabled: true});
    btn(this, "MOVE ON", W / 2 - 80, 152 + Math.max(1, tun.length) * 16, 160, 13, finishNode, {col: C.gy});
    endItems(this);
  }
};

/* ---------------- events ---------------- */
const EventScene = {
  enter(ev) { this.ev = ev; this.result = null; run.usedEvents.push(ev.id); music(run.depth === 4 ? "signal" : "map"); if (ev.id === "missing") loreSetFlag("sawMissing"); },
  draw() {
    menuBg(PALS[DEPTH_PAL[run.depth]]);
    runHeader();
    panel(36, 26, 312, 190, C.la);
    txt(this.ev.t, W / 2, 36, C.ye, 2, "c");
    const body = this.result || this.ev.b;
    wrap(body, 280).forEach((l, i) => txt(l, W / 2, 60 + i * 8, this.result ? C.wh : C.lg, 1, "c"));
    beginItems(this);
    if (!this.result) {
      this.ev.c.forEach((c, i) => {
        const ok = !c.req || c.req();
        btn(this, c.l, W / 2 - 100, 130 + i * 18, 200, 14, () => {
          if (c.fight) { saveRun(); return go(RunFight, c.fight()); }
          this.result = normText(c.go()); saveMeta(); saveRun(); this.sel = 0; checkTapes();
        }, {disabled: !ok, col: c.fight ? C.or : undefined});
      });
    } else btn(this, run.lives <= 0 ? "..." : "CONTINUE", W / 2 - 50, 180, 100, 14, finishNode);
    endItems(this);
  }
};

/* ---------------- vault ---------------- */
const VaultScene = {
  enter() {
    const i = run.depth - 1;
    this.found = grantFragment(i);
    meta.secrets["vault" + run.depth] = true;
    unlockAch("vault"); checkTapes();
    run.bank += 30;
    saveMeta();
    music("signal");
  },
  draw() {
    menuBg(PALS.signal);
    runHeader();
    title("A SEALED ROOM", 40, C.pk);
    const lines = this.found
      ? "THE AIR HUMS. IN THE MIDDLE OF THE ROOM, SOMETHING IS BROADCASTING. IT FITS IN YOUR HAND."
      : "THE AIR HUMS. YOU HAVE BEEN HERE BEFORE. SOMEONE LEFT SOMETHING BEHIND ANYWAY.";
    wrap(lines, 280).forEach((l, i) => txt(l, W / 2, 72 + i * 8, C.lg, 1, "c"));
    for (let i = 0; i < 5; i++) txt(meta.fragments[i] ? "@" : "~", W / 2 - 12 + i * 6, 110, meta.fragments[i] ? C.pk : C.gy);
    txt("+30 TOKENS", W / 2, 124, C.or, 1, "c");
    beginItems(this);
    btn(this, "TAKE A RARE MOD", W / 2 - 60, 150, 120, 14, () => go(RewardScene, {kind: "vault"}), {col: C.pk});
    endItems(this);
  }
};

/* ---------------- depth transitions ---------------- */
const DepthClear = {
  enter() { music("title"); },
  draw() {
    menuBg(PALS[DEPTH_PAL[run.depth]]);
    runHeader();
    title(run.depth === 4 ? "ECHO FADES" : "DEPTH " + run.depth + " CLEARED", 50, C.li);
    txt("TOKENS BANKED SO FAR: @" + run.bank, W / 2, 86, C.or, 1, "c");
    if (run.depth < 3) txt("YOU REPAIR ONE SHIELD ON THE WAY DOWN.", W / 2, 100, C.lg, 1, "c");
    beginItems(this);
    const label = run.depth < 3 ? "DESCEND" : run.depth === 3 ? (allFragments() ? "..." : "ASCEND") : "WAKE UP";
    btn(this, label, W / 2 - 50, 140, 100, 14, () => {
      if (run.depth < 3) {
        run.depth++; run.lives = Math.min(run.maxLives, run.lives + 1);
        run.map = genMap(run.depth); run.curId = null; run.pendingId = null;
        go(RunMap);
      } else if (run.depth === 3) {
        if (allFragments()) go(SignalChoice); else go(RunOver, endRun("win"));
      } else go(RunOver, endRun("true"));
    }, {col: C.li});
    endItems(this);
  }
};
const SignalChoice = {
  enter() { music("signal"); sfx.secret(); },
  draw() {
    menuBg(PALS.signal);
    if (rand() < 0.08) { L.globalAlpha = 0.25; R(0, rint(H), W, 2 + rint(6), C.pk); L.globalAlpha = 1; }
    title("THE SIGNAL", 40, C.pk);
    wrap("ALL FIVE FRAGMENTS START TO RESONATE AT ONCE. A DOOR OPENS THAT WAS NOT THERE BEFORE. BEHIND IT, SOMETHING IS MOVING EXACTLY THE WAY YOU DO.", 290)
      .forEach((l, i) => txt(l, W / 2, 70 + i * 8, C.lg, 1, "c"));
    beginItems(this);
    btn(this, "FOLLOW THE SIGNAL", W / 2 - 70, 140, 140, 14, () => {
      meta.secrets.signal = true; saveMeta();
      run.depth = 4; run.map = genSignalMap(); run.curId = null; run.pendingId = null;
      run.lives = Math.min(run.maxLives, run.lives + 1);
      go(RunMap);
    }, {col: C.pk});
    btn(this, "ASCEND AND END THE RUN", W / 2 - 70, 160, 140, 14, () => go(RunOver, endRun("win")), {col: C.gy});
    endItems(this);
  }
};
const RunOver = {
  back() { go(TitleScene); },
  enter(s) { this.s = s; this.shown = 0; music(s.kind === "dead" ? "map" : "title"); if (s.kind !== "dead") sfx.bossdie(); },
  update(dt) { this.shown = Math.min(this.s.tokens, this.shown + Math.max(1, this.s.tokens * dt * 1.2)); },
  draw() {
    const s = this.s;
    menuBg(s.kind === "true" ? PALS.signal : PALS.grid);
    const head = {dead: ["SIGNAL LOST", C.rd], win: ["ASCENDED", C.li], true: ["TRUE ENDING", C.pk], free: ["LAID TO REST", C.bl], stay: ["HIGH SCORE", C.rd],
      chip: ["UNPLUGGED", C.bl], kept: ["STILL COUNTING", C.rd]}[s.kind];
    title(head[0], 22, head[1]);
    if (s.kind === "free") wrap("HE WENT HOME. THE CABINET IS QUIET NOW. SOMETIMES, IF YOU PLAY LATE, YOU CAN STILL HEAR SOMEONE CHEERING.", 300).forEach((l, i) => txt(l, W / 2, 44 + i * 8, C.lg, 1, "c"));
    if (s.kind === "stay") wrap("THE TABLE WILL ALWAYS SAY " + (meta.initials || "YOU") + ". SOMEONE NEW WILL COME ALONG. THEY ALWAYS DO.", 300).forEach((l, i) => txt(l, W / 2, 44 + i * 8, C.pl, 1, "c"));
    if (s.kind === "chip") wrap("THE CHIP IS IN YOUR POCKET. THE CABINET STILL PLAYS. IT JUST DOESN'T WATCH ANY MORE.", 300).forEach((l, i) => txt(l, W / 2, 44 + i * 8, C.bl, 1, "c"));
    if (s.kind === "kept") wrap("YOU LEFT IT IN. IT WILL BE VERY GOOD TO YOU FROM NOW ON.", 300).forEach((l, i) => txt(l, W / 2, 44 + i * 8, C.rd, 1, "c"));
    if (s.kind === "true") wrap("ECHO WAS NEVER AN ENEMY. IT WAS EVERY SHOT YOU EVER SENT BACK, FINALLY ANSWERING.", 300).forEach((l, i) => txt(l, W / 2, 44 + i * 8, C.lg, 1, "c"));
    const rows = [["DEPTH REACHED", s.depth], ["FOES DOWN", s.kills], ["PERFECTS", s.perfects], ["GUARDIANS", s.bosses]];
    rows.forEach((r, i) => { txt(r[0], 70, 66 + i * 10, C.gy); txt(String(r[1]), 170, 66 + i * 10, C.wh, 1, "r"); });
    txt("MODS", 200, 66, C.gy);
    if (!s.mods.length) txt("NONE", 200, 74, C.gy);
    s.mods.slice(0, 8).forEach((m, i) => txt(m, 200, 74 + i * 7, C.lg));
    const bonus = [s.glass ? "GLASS X2" : "", s.asc ? "A" + s.asc : "", s.curses ? s.curses + " CURSE" + (s.curses > 1 ? "S" : "") : ""].filter(Boolean).join(", ");
    txt("TOKENS EARNED" + (bonus ? " (" + bonus + ")" : ""), W / 2, 142, C.gy, 1, "c");
    if (s.grades) txt("GRADES  S" + s.grades.S + "  A" + s.grades.A + "  B" + s.grades.B + "  C" + s.grades.C, 70, 108, C.gy);
    if (s.daily) { txt("DAILY SCORE", 70, 118, C.pk); txt(String(s.dailyScore), 170, 118, C.ye, 1, "r"); }
    txt("@" + Math.floor(this.shown), W / 2, 152, C.or, 2, "c");
    s.unlocks.forEach((u, i) => txt(u, W / 2, 170 + i * 8, C.pk, 1, "c"));
    beginItems(this);
    if (s.daily) btn(this, "DAILY BOARD", W / 2 - 104, 200, 100, 14, () => go(DailyScene), {col: C.pk});
    else btn(this, "WORKSHOP", W / 2 - 104, 200, 100, 14, () => go(WorkshopScene), {col: C.or});
    btn(this, "TITLE", W / 2 + 4, 200, 100, 14, () => go(TitleScene));
    endItems(this);
  }
};
