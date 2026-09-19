"use strict";
const VERSION = "4.1.0";
/* ================================================================
   RIPOSTE v3 — core: screen, font, sprites, audio, save
   ================================================================ */
const W = 384, H = 240, TAU = Math.PI * 2;
const AX0 = 4, AY0 = 16, AX1 = 380, AY1 = 236, ACX = 192, ACY = 126;
const STEP = 1 / 120;
const C = {k:"#000000",nv:"#1D2B53",pl:"#7E2553",gr:"#008751",ru:"#AB5236",gy:"#5F574F",lg:"#C2C3C7",
  wh:"#FFF1E8",rd:"#FF004D",or:"#FFA300",ye:"#FFEC27",li:"#00E436",bl:"#29ADFF",la:"#83769C",pk:"#FF77A8",pe:"#FFCCAA",
  ink:"#05060C"};
const PALS = {
  grid:   {name:"THE GRID",    bg:"#0A0E1C", grid:"#1D2B53", wall:"#29ADFF", accent:C.bl},
  foundry:{name:"THE FOUNDRY", bg:"#170C09", grid:"#3B1A12", wall:"#FFA300", accent:C.or},
  stack:  {name:"THE STACK",   bg:"#06130C", grid:"#0F3320", wall:"#00E436", accent:C.li},
  signal: {name:"THE SIGNAL",  bg:"#0E0816", grid:"#2A1640", wall:"#FF77A8", accent:C.pk}
};
const DEPTH_PAL = [null, "grid", "foundry", "stack", "signal"];

const rand = Math.random;
const rint = n => (Math.random() * n) | 0;
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % TAU) - Math.PI);

/* ---------------- screen (WebGL CRT, 2D fallback) ---------------- */
const screenCv = document.getElementById("screen");
const RS = 3;   // internal render scale: art stays chunky, text gets finer pixels
const lo = document.createElement("canvas"); lo.width = W * RS; lo.height = H * RS;
const L = lo.getContext("2d");
L.imageSmoothingEnabled = false;
L.setTransform(RS, 0, 0, RS, 0, 0);
let S_SCALE = 1, S_OX = 0, S_OY = 0, S_DW = W, S_DH = H, DPR = 1, scanPat = null, vign = null, canFilter = false;
let gl = null, glU = {}, glTex = null, sctx = null;
const CURVE_X = 0.085, CURVE_Y = 0.115;   // how hard the glass bends

const CRT_VS = "attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; v.y = 1.0 - v.y; gl_Position = vec4(p, 0.0, 1.0); }";
const CRT_FS = [
  "#ifdef GL_FRAGMENT_PRECISION_HIGH",
  "precision highp float;",
  "#else",
  "precision mediump float;",
  "#endif",
  "varying vec2 v;",
  "uniform sampler2D t;",
  "uniform vec2 src; uniform vec2 outRes; uniform float time; uniform float crt; uniform float rows;",
  "uniform float glitch; uniform float roll; uniform float wobble; uniform float power; uniform float curveAmt; uniform float tint;",
  "vec2 curve(vec2 uv){ uv = uv * 2.0 - 1.0; uv += uv * (uv.yx * uv.yx) * vec2(" + CURVE_X.toFixed(3) + "," + CURVE_Y.toFixed(3) + ") * curveAmt; return uv * 0.5 + 0.5; }",
  "vec3 tinted(vec3 c){ if (tint < 0.5) return c; float l = dot(c, vec3(0.3, 0.55, 0.15)); if (tint < 1.5) return l * vec3(1.25, 0.72, 0.22); if (tint < 2.5) return l * vec3(0.35, 1.2, 0.45); return vec3(l); }",
  "vec3 px(vec2 uv){ vec2 s = max(outRes / src, vec2(1.0)); vec2 p = uv * src; vec2 c = floor(p) + 0.5;",
  "  vec2 f = clamp((p - c) * s, -0.5, 0.5); return texture2D(t, (c + f) / src).rgb; }",
  "float rnd(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }",
  "void main(){",
  "  vec2 uv = curve(v);",
  "  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }",
  // power-on: the picture grows out of a bright horizontal line
  "  float pw = max(power, 0.004);",
  "  float yy = (uv.y - 0.5) / pw + 0.5;",
  "  if (yy < 0.0 || yy > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }",
  "  float pwx = clamp(power * 6.0, 0.02, 1.0);",
  "  float xx = (uv.x - 0.5) / pwx + 0.5;",
  "  if (xx < 0.0 || xx > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }",
  "  vec2 s = vec2(xx, yy);",
  // vertical hold slipping
  "  s.y = fract(s.y + roll);",
  // horizontal tearing, wobble
  "  float ln = floor(s.y * 90.0), fr = floor(time * 24.0);",
  "  float tear = step(1.0 - glitch * 0.55, rnd(vec2(ln, fr))) * (rnd(vec2(ln * 1.7, fr + 3.0)) - 0.5) * 0.14 * glitch;",
  "  s.x += tear + sin(s.y * 38.0 + time * 45.0) * 0.005 * wobble;",
  "  if (crt < 0.5) { vec3 c0 = px(s); if (glitch > 0.0) c0 = mix(c0, vec3(rnd(uv + fract(time))), glitch * 0.2); gl_FragColor = vec4(tinted(c0 * (1.0 + (1.0 - pw) * 2.0)), 1.0); return; }",
  "  vec2 d = (s - 0.5) * 0.0018 + vec2(glitch * 0.012 + wobble * 0.004, 0.0);",
  "  vec3 col = vec3(px(s + d).r, px(s).g, px(s - d).b);",
  "  vec2 o = 3.0 / src; vec3 b = vec3(0.0);",
  "  b += texture2D(t, s + vec2(o.x, 0.0)).rgb + texture2D(t, s - vec2(o.x, 0.0)).rgb;",
  "  b += texture2D(t, s + vec2(0.0, o.y)).rgb + texture2D(t, s - vec2(0.0, o.y)).rgb;",
  "  b += texture2D(t, s + o).rgb + texture2D(t, s - o).rgb + texture2D(t, s + vec2(o.x, -o.y)).rgb + texture2D(t, s + vec2(-o.x, o.y)).rgb;",
  "  b += texture2D(t, s + vec2(o.x * 2.5, 0.0)).rgb + texture2D(t, s - vec2(o.x * 2.5, 0.0)).rgb;",
  "  b += texture2D(t, s + vec2(0.0, o.y * 2.5)).rgb + texture2D(t, s - vec2(0.0, o.y * 2.5)).rgb;",
  "  col += (b / 12.0) * 0.3; col *= 1.05;",
  "  float sl = 0.5 - 0.5 * cos(fract(s.y * rows) * 6.2831853);",
  "  col *= mix(0.80, 1.07, sl);",
  "  float m = mod(floor(gl_FragCoord.x), 3.0);",
  "  col *= m < 1.0 ? vec3(1.07, 0.94, 0.94) : (m < 2.0 ? vec3(0.94, 1.07, 0.94) : vec3(0.94, 0.94, 1.07));",
  // glitch: snow, dropped lines, the dark seam of a rolling picture
  "  col = mix(col, vec3(rnd(uv * 91.7 + fract(time) * 13.0)), glitch * 0.28);",
  "  if (rnd(vec2(ln + 7.0, fr)) > 1.0 - glitch * 0.16) col *= 0.25;",
  "  if (roll > 0.0) { float seam = abs(yy - (1.0 - roll)); col *= 1.0 - 0.9 * exp(-seam * seam * 1800.0); }",
  "  col *= 1.0 + (1.0 - pw) * 3.0;",
  "  vec2 q = uv * (1.0 - uv); col *= pow(q.x * q.y * 16.0, 0.2);",
  "  vec2 e = smoothstep(vec2(0.0), vec2(0.008), uv) * smoothstep(vec2(0.0), vec2(0.008), 1.0 - uv); col *= e.x * e.y;",
  "  float band = exp(-pow((fract(time * 0.09) * 1.4 - 0.2 - uv.y) * 7.0, 2.0)); col *= 1.0 + 0.06 * band;",
  "  col *= 1.0 + 0.012 * sin(time * 113.0) + glitch * 0.25 * sin(time * 300.0);",
  "  col += (rnd(gl_FragCoord.xy + fract(time) * 100.0) - 0.5) * 0.03;",
  "  gl_FragColor = vec4(tinted(col), 1.0);",
  "}"
].join("\n");
// phosphor persistence: each frame keeps a fading copy of the last one
const PERSIST_VS = "attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }";
const PERSIST_FS = "precision mediump float; varying vec2 v; uniform sampler2D cur; uniform sampler2D hist; uniform float decay;" +
  "void main(){ vec3 c = texture2D(cur, v).rgb; vec3 h = texture2D(hist, v).rgb * decay; gl_FragColor = vec4(max(c, h), 1.0); }";
let glProg = null, glPersist = null, glPU = {}, glHist = [], glFbo = [], glPing = 0, glBuf = null;

function initGL() {
  try { gl = screenCv.getContext("webgl", {alpha: false, antialias: false, preserveDrawingBuffer: true}); } catch (e) { gl = null; }
  if (!gl) return false;
  try {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const link = (vs, fs) => {
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      return pr;
    };
    const prog = link(CRT_VS, CRT_FS);
    glProg = prog;
    glBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const mkTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    glTex = mkTex();
    gl.useProgram(prog);
    for (const n of ["t", "src", "outRes", "time", "crt", "rows", "glitch", "roll", "wobble", "power", "curveAmt", "tint"]) glU[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(glU.t, 0);
    gl.uniform2f(glU.src, W * RS, H * RS);
    gl.uniform1f(glU.rows, H);
    try {
      glPersist = link(PERSIST_VS, PERSIST_FS);
      gl.useProgram(glPersist);
      for (const n of ["cur", "hist", "decay"]) glPU[n] = gl.getUniformLocation(glPersist, n);
      gl.uniform1i(glPU.cur, 0); gl.uniform1i(glPU.hist, 1);
      for (let i = 0; i < 2; i++) {
        const t = mkTex();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W * RS, H * RS, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("fbo");
        glHist.push(t); glFbo.push(fb);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } catch (e) { glPersist = null; gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    return true;
  } catch (e) {
    if (window.console) console.warn("[riposte] WebGL CRT unavailable, using flat renderer:", e);
    gl = null;
    return false;
  }
}
if (!initGL()) {
  sctx = screenCv.getContext("2d");
  try { sctx.filter = "blur(1px)"; canFilter = sctx.filter === "blur(1px)"; sctx.filter = "none"; } catch (e) { canFilter = false; }
}

function fit() {
  const r = screenCv.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  screenCv.width = Math.max(1, Math.round(r.width * DPR));
  screenCv.height = Math.max(1, Math.round(r.height * DPR));
  let s = Math.min(screenCv.width / W, screenCv.height / H);
  if (!gl && s >= 2) s = Math.floor(s);
  S_SCALE = Math.max(0.25, s);
  S_DW = Math.round(W * S_SCALE); S_DH = Math.round(H * S_SCALE);
  S_OX = Math.floor((screenCv.width - S_DW) / 2);
  S_OY = Math.floor((screenCv.height - S_DH) / 2);
  if (gl) return;
  scanPat = null;
  const rows = Math.round(S_SCALE);
  if (rows >= 3) {
    const pc = document.createElement("canvas"); pc.width = 1; pc.height = rows;
    const px = pc.getContext("2d");
    px.fillStyle = "rgba(0,0,0,0.34)"; px.fillRect(0, rows - 1, 1, 1);
    scanPat = sctx.createPattern(pc, "repeat");
  }
  const cx = screenCv.width / 2, cy = screenCv.height / 2;
  vign = sctx.createRadialGradient(cx, cy, Math.min(cx, cy) * 0.55, cx, cy, Math.hypot(cx, cy));
  vign.addColorStop(0, "rgba(0,0,0,0)");
  vign.addColorStop(1, "rgba(0,0,0,0.55)");
}
window.addEventListener("resize", fit);
try { new ResizeObserver(fit).observe(screenCv); } catch (e) {}

const CURVE_LEVELS = [0, 0.55, 1, 1.5];
function curveAmt() { return meta.settings.crt ? CURVE_LEVELS[meta.settings.curve == null ? 2 : meta.settings.curve] : 0; }
function bindQuad(prog) {
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, glBuf);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}
function present() {
  if (gl) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lo);
    let srcTex = glTex;
    if (glPersist && meta.settings.phosphor !== false && meta.settings.crt) {
      const dst = glPing, prev = 1 - glPing;
      bindQuad(glPersist);
      gl.bindFramebuffer(gl.FRAMEBUFFER, glFbo[dst]);
      gl.viewport(0, 0, W * RS, H * RS);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, glHist[prev]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.uniform1f(glPU.decay, 0.62);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      srcTex = glHist[dst]; glPing = prev;
    }
    bindQuad(glProg);
    gl.viewport(0, 0, screenCv.width, screenCv.height);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(S_OX, screenCv.height - S_OY - S_DH, S_DW, S_DH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.uniform1f(glU.curveAmt, curveAmt());
    gl.uniform1f(glU.tint, meta.settings.tint || 0);
    gl.uniform2f(glU.outRes, S_DW, S_DH);
    gl.uniform1f(glU.time, (performance.now() / 1000) % 1000);
    gl.uniform1f(glU.crt, meta.settings.crt ? 1 : 0);
    const fxs = fxScale();
    gl.uniform1f(glU.glitch, Math.min(1, FX.glitch * fxs));
    gl.uniform1f(glU.roll, fxs >= 1 ? FX.roll : 0);
    gl.uniform1f(glU.wobble, Math.min(1, FX.wobble * fxs));
    gl.uniform1f(glU.power, FX.power);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return;
  }
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalCompositeOperation = "source-over"; sctx.globalAlpha = 1; sctx.filter = "none";
  sctx.imageSmoothingEnabled = false;
  sctx.fillStyle = "#000"; sctx.fillRect(0, 0, screenCv.width, screenCv.height);
  sctx.drawImage(lo, 0, 0, W * RS, H * RS, S_OX, S_OY, S_DW, S_DH);
  const g2 = FX.glitch * fxScale();
  if (g2 > 0.05) {
    for (let k = 0; k < 6 * g2; k++) {
      const sy = rand() * H * RS, sh = 3 + rand() * 18, off = (rand() - 0.5) * 40 * FX.glitch;
      sctx.drawImage(lo, 0, sy, W * RS, sh, S_OX + off, S_OY + sy / (H * RS) * S_DH, S_DW, sh / (H * RS) * S_DH);
    }
  }
  if (FX.power < 1) {
    const hh = S_DH * Math.max(0.004, FX.power);
    sctx.fillStyle = "#000"; sctx.fillRect(S_OX, S_OY, S_DW, (S_DH - hh) / 2); sctx.fillRect(S_OX, S_OY + (S_DH + hh) / 2, S_DW, (S_DH - hh) / 2);
  }
  if (meta.settings.crt) {
    if (canFilter) {
      sctx.filter = "blur(" + Math.max(2, S_SCALE * 1.7).toFixed(1) + "px)";
      sctx.globalCompositeOperation = "lighter"; sctx.globalAlpha = 0.34;
      sctx.drawImage(lo, 0, 0, W * RS, H * RS, S_OX, S_OY, S_DW, S_DH);
      sctx.filter = "none"; sctx.globalAlpha = 1; sctx.globalCompositeOperation = "source-over";
    }
    if (scanPat) { sctx.save(); sctx.translate(S_OX, S_OY); sctx.fillStyle = scanPat; sctx.fillRect(0, 0, S_DW, S_DH); sctx.restore(); }
    if (vign) { sctx.fillStyle = vign; sctx.fillRect(0, 0, screenCv.width, screenCv.height); }
  }
}
// the same bend the shader applies, so the cursor lands where the picture shows it
function toLo(e) {
  const r = screenCv.getBoundingClientRect();
  let u = ((e.clientX - r.left) * DPR - S_OX) / S_DW;
  let v = ((e.clientY - r.top) * DPR - S_OY) / S_DH;
  if (gl && meta.settings.crt) {
    const k = curveAmt(), x = u * 2 - 1, y = v * 2 - 1;
    u = (x + x * y * y * CURVE_X * k) * 0.5 + 0.5;
    v = (y + y * x * x * CURVE_Y * k) * 0.5 + 0.5;
  }
  return {x: u * W, y: v * H};
}

/* ---------------- bitmap font (3x5) ---------------- */
const FONT = {
"A":"01110100011000111111100011000110001",
"B":"11110100011000111110100011000111110",
"C":"01110100011000010000100001000101110",
"D":"11100100101000110001100011001011100",
"E":"11111100001000011110100001000011111",
"F":"11111100001000011110100001000010000",
"G":"01110100011000010111100011000101111",
"H":"10001100011000111111100011000110001",
"I":"01110001000010000100001000010001110",
"J":"00111000100001000010000101001001100",
"K":"10001100101010011000101001001010001",
"L":"10000100001000010000100001000011111",
"M":"10001110111010110101100011000110001",
"N":"10001100011100110101100111000110001",
"O":"01110100011000110001100011000101110",
"P":"11110100011000111110100001000010000",
"Q":"01110100011000110001101011001001101",
"R":"11110100011000111110101001001010001",
"S":"01111100001000001110000010000111110",
"T":"11111001000010000100001000010000100",
"U":"10001100011000110001100011000101110",
"V":"10001100011000110001100010101000100",
"W":"10001100011000110101101011010101010",
"X":"10001100010101000100010101000110001",
"Y":"10001100011000101010001000010000100",
"Z":"11111000010001000100010001000011111",
"0":"01110100011001110101110011000101110",
"1":"00100011000010000100001000010001110",
"2":"01110100010000100010001000100011111",
"3":"11111000100010000010000011000101110",
"4":"00010001100101010010111110001000010",
"5":"11111100001111000001000011000101110",
"6":"00110010001000011110100011000101110",
"7":"11111000010001000100010000100001000",
"8":"01110100011000101110100011000101110",
"9":"01110100011000101111000010001001100",
" ":"00000000000000000000000000000000000",
".":"00000000000000000000000000110001100",
",":"00000000000000000000011000010001000",
":":"00000011000110000000011000110000000",
"!":"00100001000010000100001000000000100",
"?":"01110100010000100010001000000000100",
"-":"00000000000000011111000000000000000",
"+":"00000001000010011111001000010000000",
"/":"00000000010001000100010001000000000",
"'":"01100001000100000000000000000000000",
"(":"00010001000100001000010000010000010",
")":"01000001000001000010000100010001000",
"%":"11000110010001000100010001001100011",
"#":"01010010101111101010111110101001010",
">":"01000001000001000001000100010001000",
"<":"00010001000100010000010000010000010",
"*":"00000001001010101110101010010000000",
"=":"00000000001111100000111110000000000",
"\"":"01010010100101000000000000000000000",
"$":"00000011101111111011111110111000000",
"@":"00100011101111111111011100010000000",
"&":"00000010101111111111011100010000000",
"[":"01110010000100001000010000100001110",
"]":"01110000100001000010000100001001110",
"_":"00000000000000000000000000000011111",
"^":"00100010101000100000000000000000000",
"|":"00100001000010000100001000010000100",
"~":"00000000000000001100011000000000000"
};
const glyphCache = new Map();
function glyph(ch, col) {
  const k = ch + col;
  let g = glyphCache.get(k);
  if (g) return g;
  const bits = FONT[ch] || FONT["?"];
  g = document.createElement("canvas"); g.width = 5; g.height = 7;
  const x = g.getContext("2d"); x.fillStyle = col;
  for (let i = 0; i < 35; i++) if (bits[i] === "1") x.fillRect(i % 5, (i / 5) | 0, 1, 1);
  glyphCache.set(k, g);
  return g;
}
function normText(s) {
  return String(s).toUpperCase().replace(/◆/g, "@").replace(/♥/g, "&").replace(/×/g, "X")
    .replace(/·/g, "~").replace(/[—–]/g, "-").replace(/[’‘]/g, "'");
}
function tw(s, sc) { sc = sc || 1; s = normText(s); return s.length ? (s.length * 4 - 1) * sc : 0; }
function txt(s, x, y, col, sc, align) {
  sc = sc || 1; s = normText(s);
  const w = tw(s, sc);
  if (align === "c") x -= Math.floor(w / 2); else if (align === "r") x -= w;
  x = Math.round(x); y = Math.round(y);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== " ") L.drawImage(glyph(ch, col), x + i * 4 * sc, y, 10 / RS * sc, 14 / RS * sc);
  }
  return w;
}
function txtS(s, x, y, col, sc, align, sh) {
  sc = sc || 1;
  txt(s, x + sc, y + sc, sh || "#000", sc, align);
  return txt(s, x, y, col, sc, align);
}
function wrap(s, maxw) {
  const words = normText(s).split(" "), lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (tw(t) > maxw && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ---------------- primitives ---------------- */
function R(x, y, w, h, c) { L.fillStyle = c; L.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function RO(x, y, w, h, c) { R(x, y, w, 1, c); R(x, y + h - 1, w, 1, c); R(x, y, 1, h, c); R(x + w - 1, y, 1, h, c); }
function P(x, y, c) { L.fillStyle = c; L.fillRect(Math.round(x), Math.round(y), 1, 1); }
function disc(cx, cy, r, c) {
  L.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    L.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function arcPx(cx, cy, r, a0, a1, c, thick) {
  L.fillStyle = c; thick = thick || 1;
  for (let t = 0; t < thick; t++) {
    const rr = r + t, st = 0.6 / rr;
    for (let a = a0; a <= a1 + 1e-6; a += st)
      L.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 1, 1);
  }
}
function ringDots(cx, cy, r, c, gap) {
  L.fillStyle = c;
  const n = Math.max(8, Math.floor(TAU * r / (gap || 3)));
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    L.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
}
function line(x0, y0, x1, y1, c, dot) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, i = 0, guard = 0;
  L.fillStyle = c;
  while (guard++ < 2000) {
    if (!dot || (i % dot) === 0) L.fillRect(x0, y0, 1, 1);
    i++;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function panel(x, y, w, h, border, fill) {
  R(x, y, w, h, fill || C.ink);
  RO(x, y, w, h, border || C.la);
  RO(x + 1, y + 1, w - 2, h - 2, "#000");
}

/* ---------------- sprites ---------------- */
function mkSprite(rows, map) {
  const h = rows.length, w = rows[0].length;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const cx = cv.getContext("2d");
  const fl = document.createElement("canvas"); fl.width = w; fl.height = h;
  const fx = fl.getContext("2d"); fx.fillStyle = "#FFFFFF";
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (ch !== "." && map[ch]) { cx.fillStyle = map[ch]; cx.fillRect(x, y, 1, 1); fx.fillRect(x, y, 1, 1); }
    }
  });
  return {cv, fl, w, h};
}
function drawSpr(s, x, y, flash, scale) {
  scale = scale || 1;
  const img = flash ? s.fl : s.cv;
  L.drawImage(img, Math.round(x - s.w * scale / 2), Math.round(y - s.h * scale / 2), s.w * scale, s.h * scale);
}
function drawOutline(s, x, y, col) {
  // draw a 1px outline by stamping the flash silhouette around the sprite
  const ox = Math.round(x - s.w / 2), oy = Math.round(y - s.h / 2);
  L.save();
  L.globalAlpha = 1;
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) L.drawImage(s.fl, ox + dx, oy + dy);
  L.restore();
  L.globalCompositeOperation = "source-over";
}
const SPR = {};
function buildSprites() {
  const PLAYER = ["....o....","...oyo...","..oyyyo..",".oyywyyo.","oyywwwyyo",".oyywyyo.","..oyyyo..","...oyo...","....o...."];
  SPR.player = mkSprite(PLAYER, {o:C.or, y:C.ye, w:C.wh});
  SPR.echo = mkSprite(PLAYER, {o:C.pl, y:C.la, w:C.wh});
  SPR.sentry = mkSprite(["..rrrrr..",".rpppppr.","rppwwwppr","rpwwwwwpr","rpwwwwwpr","rpwwwwwpr","rppwwwppr",".rpppppr.","..rrrrr.."],
    {r:C.rd, p:C.pl, w:C.wh});
  SPR.spreader = mkSprite([".....s.....","....sPs....","...sPPPs...","..sPPwPPs..",".sPPwwwPPs.","sPPPPwPPPPs","sssssssssss",".s..s.s..s.","s..s...s..s"],
    {s:C.pk, P:C.pl, w:C.wh});
  SPR.sniper = mkSprite(["....l....","...lnl...","...lnl...","..lnnnl..","..lnpnl..",".lnnpnnl.",".lnnnnnl.","..lnnnl..","...lnl...","..l...l..",".l.....l."],
    {l:C.la, n:C.nv, p:C.pk});
  SPR.armor = mkSprite(["....ooo....","..ooOOOoo..",".oOOOOOOOo.",".oOOyyyOOo.","oOOyywyyOOo","oOOyywyyOOo",".oOOyyyOOo.",".oOOOOOOOo.","..ooOOOoo..","....ooo...."],
    {o:C.ru, O:C.or, y:C.ye, w:C.wh});
  SPR.rusher = mkSprite(["r...r...r",".r.rrr.r.","..rRRRr..",".rRRwRRr.","rrRwwwRrr",".rRRwRRr.","..rRRRr..",".r.rrr.r.","r...r...r"],
    {r:C.ru, R:C.rd, w:C.ye});
  SPR.splitter = mkSprite(["...ppppp...","..pPPPPPp..",".pPPPkPPPp.","pPPPPkPPPPp","pPwPPkPPwPp","pPPPPkPPPPp","pPPPPkPPPPp",".pPPPkPPPp.","..pPPPPPp..","...ppppp..."],
    {p:C.pl, P:C.pk, k:C.pl, w:C.wh});
  SPR.shard = mkSprite(["..P..",".PPP.","PPwPP",".PPP.","..P.."], {P:C.pk, w:C.wh});
  SPR.shielder = mkSprite(["...bbb...","..bBBBb..",".bBwwwBb.","bBwbbbwBb","bBwbwbwBb","bBwbbbwBb",".bBwwwBb.","..bBBBb..","...bbb..."],
    {b:C.nv, B:C.bl, w:C.wh});
  SPR.mirror = mkSprite(["....l....","...lwl...","..lwlwl..",".lwl.lwl.","lwl...lwl",".lwl.lwl.","..lwlwl..","...lwl...","....l...."],
    {l:C.la, w:C.wh});
  SPR.miner = mkSprite(["..ggggggg..",".gGGGGGGGg.","gGGkGGGkGGg","gGGGGGGGGGg","gGGGyyyGGGg","gGGGyryGGGg","gGGGyyyGGGg",".gGGGGGGGg.","..g.g.g.g.."],
    {g:C.gr, G:C.li, k:C.k, y:C.ye, r:C.rd});
  SPR.mine = mkSprite(["..r..",".rkr.","rkykr",".rkr.","..r.."], {r:C.rd, k:C.ru, y:C.ye});
  SPR.coin = mkSprite([".y.","yYy",".y."], {y:C.or, Y:C.ye});
  SPR.coin2 = mkSprite(["y","Y","y"], {y:C.or, Y:C.ye});
  // map icons (7x7)
  SPR.i_fight = mkSprite(["r.....r",".r...r.","..r.r..","...r...","..r.r..",".r...r.","r.....r"], {r:C.rd});
  SPR.i_elite = mkSprite(["o.....o","oo...oo",".oo.oo.","..ooo..",".oo.oo.","oo...oo","o.....o"], {o:C.or});
  SPR.i_rest = mkSprite(["...y...","..yoy..",".yooy..",".yoooy.","yoorooy","yorrroy",".yrrry."], {y:C.ye, o:C.or, r:C.rd});
  SPR.i_treasure = mkSprite([".yyyyy.","yoooooy","yyyyyyy","yoowooy","yoooooy","yyyyyyy","......."], {y:C.ye, o:C.or, w:C.wh});
  SPR.i_boss = mkSprite([".rrrrr.","rrrrrrr","rwwrwwr","rwwrwwr","rrrrrrr",".rwrwr.","..rrr.."], {r:C.rd, w:C.wh});
  SPR.i_shop = mkSprite(["...y...",".yyyyy.","yy.y...",".yyyyy.","...y.yy",".yyyyy.","...y..."], {y:C.ye});
  SPR.i_event = mkSprite([".lllll.","ll...ll",".....ll","...lll.","...l...",".......","...l..."], {l:C.la});
  if (typeof buildHorrorSprites === "function") buildHorrorSprites();
  SPR.i_altar = mkSprite(["...p...","..ppp..","...p...",".lllll.","..lpl..","..lll..",".lllll."], {p:C.pk, l:C.la});
  SPR.i_vault = mkSprite(["...w...","..wpw..",".wpppw.","wpp@ppw",".wpppw.","..wpw..","...w..."], {w:C.wh, p:C.pk, "@":C.wh});
}

/* ---------------- audio ---------------- */
let AC = null, master = null, musGain = null, sfxGain = null, noiseBuf = null;
function applyVolumes() {
  if (!AC) return;
  const s = meta.settings;
  master.gain.value = 0.3 * ((s.vol == null ? 8 : s.vol) / 8);
  musGain.gain.value = 0.55 * ((s.musVol == null ? 8 : s.musVol) / 8);
  sfxGain.gain.value = (s.sfxVol == null ? 8 : s.sfxVol) / 8;
}
function audioInit() {
  if (AC) { if (AC.state === "suspended") AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.3; master.connect(AC.destination);
    musGain = AC.createGain(); musGain.gain.value = 0.55; musGain.connect(master);
    sfxGain = AC.createGain(); sfxGain.gain.value = 1; sfxGain.connect(master);
    applyVolumes();
  } catch (e) { AC = null; }
}
function tone(freq, dur, type, vol, slideTo, when, dest) {
  if (!AC || meta.settings.sound < 1) return;
  try {
    const t = when || AC.currentTime;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(25, slideTo), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol == null ? 0.25 : vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || sfxGain || master); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
function noise(dur, vol, fHz, sweep) {
  if (!AC || meta.settings.sound < 1) return;
  try {
    if (!noiseBuf) {
      noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.5), AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = AC.currentTime;
    const s = AC.createBufferSource(); s.buffer = noiseBuf;
    const f = AC.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.1;
    f.frequency.setValueAtTime(fHz || 900, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), t + dur);
    const g = AC.createGain();
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxGain || master); s.start(t); s.stop(t + dur);
  } catch (e) {}
}
function seq(notes, gap, type, vol, dur) {
  notes.forEach((f, i) => setTimeout(() => tone(f, dur || 0.12, type || "square", vol || 0.14), i * gap));
}
const sfx = {
  move: () => tone(660, 0.03, "square", 0.06),
  select: () => { tone(880, 0.05, "square", 0.1); tone(1320, 0.06, "square", 0.08, null, AC && AC.currentTime + 0.05); },
  deny: () => tone(140, 0.12, "square", 0.12, 90),
  parry: c => { tone(520 + Math.min(c, 18) * 40, 0.08, "square", 0.18); noise(0.05, 0.12, 2600, 5200); },
  perfect: c => { tone(880 + Math.min(c, 14) * 60, 0.12, "square", 0.22, 1760); noise(0.08, 0.16, 3400, 7000); },
  kill: () => { tone(300, 0.18, "triangle", 0.22, 90); noise(0.14, 0.16, 700, 180); },
  chain: n => tone(620 + n * 95, 0.13, "square", 0.16, 1500),
  clank: () => { tone(210, 0.07, "square", 0.14, 150); noise(0.05, 0.12, 1400, 700); },
  shoot: () => tone(150, 0.04, "triangle", 0.07, 95),
  snipe: () => tone(1100, 0.1, "sawtooth", 0.1, 260),
  hurt: () => { tone(150, 0.34, "sawtooth", 0.24, 48); noise(0.28, 0.2, 420, 120); },
  pulse: () => { noise(0.28, 0.22, 320, 2800); tone(200, 0.22, "square", 0.12, 700); },
  coin: () => tone(1320 + rand() * 200, 0.04, "square", 0.07),
  wave: () => seq([392, 523, 659], 80, "square", 0.12),
  boss: () => seq([110, 110, 147, 110], 190, "sawtooth", 0.18, 0.28),
  bossdie: () => { seq([196, 262, 330, 392, 523, 659], 100, "square", 0.16, 0.25); noise(0.9, 0.26, 300, 90); },
  pick: () => seq([660, 880, 1320], 55, "square", 0.13),
  dead: () => seq([440, 330, 247, 165], 130, "sawtooth", 0.16, 0.32),
  toast: () => seq([988, 1319], 70, "square", 0.08, 0.08),
  secret: () => seq([523, 659, 784, 1047, 1319, 1568], 70, "triangle", 0.16, 0.2)
};

/* ---------------- music (tiny sequencer) ---------------- */
const MUSIC = {
  title: {bpm:104, bass:[45,0,0,45,0,0,45,0,45,0,0,45,0,0,43,0,41,0,0,41,0,0,41,0,43,0,0,43,0,0,40,0],
    lead:[69,72,76,72,69,72,76,79,69,72,76,72,67,71,74,71,65,69,72,69,65,69,72,77,67,71,74,71,67,71,74,76]},
  map:   {bpm:84, bass:[48,0,0,0,55,0,0,0,45,0,0,0,52,0,0,0,41,0,0,0,48,0,0,0,43,0,0,0,50,0,0,0],
    lead:[72,0,76,0,79,0,76,0,69,0,72,0,76,0,72,0,65,0,69,0,72,0,69,0,67,0,71,0,74,0,71,0]},
  fight: {bpm:140, bass:[40,40,52,40,40,52,40,40,38,38,50,38,38,50,38,38,36,36,48,36,36,48,36,36,38,38,50,38,43,43,47,50],
    lead:[64,0,67,0,71,0,67,64,62,0,66,0,69,0,66,62,60,0,64,0,67,0,64,60,62,0,66,0,69,71,74,76]},
  boss:  {bpm:158, bass:[38,38,50,38,38,50,38,50,36,36,48,36,36,48,36,48,34,34,46,34,34,46,34,46,33,33,45,33,45,44,43,42],
    lead:[74,0,74,77,0,74,72,0,72,0,72,76,0,72,69,0,70,0,70,74,0,70,69,0,69,0,73,0,76,0,81,0]},
  signal:{bpm:72, bass:[36,0,0,0,0,0,0,0,38,0,0,0,0,0,0,0,40,0,0,0,0,0,0,0,42,0,0,0,0,0,0,0],
    lead:[72,0,0,76,0,0,80,0,0,78,0,0,74,0,0,0,70,0,0,74,0,0,78,0,0,76,0,0,72,0,0,0]}
};
let musTrack = null, musNext = 0, musStep = 0;
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
function music(name) {
  if (name === "title" && typeof haunted === "function" && isNight() && haunted(2)) name = "titleNight";
  if (musTrack === name) return;
  musTrack = name; musStep = 0;
  if (AC) musNext = AC.currentTime + 0.06;
}
function musicTick() {
  if (!AC || !musTrack || meta.settings.sound < 2) return;
  const tr = MUSIC[musTrack]; if (!tr) return;
  const spb = 60 / tr.bpm / 4;
  if (musNext < AC.currentTime - 0.3) musNext = AC.currentTime + 0.02;
  while (musNext < AC.currentTime + 0.12) {
    const b = tr.bass[musStep % tr.bass.length], l = tr.lead[musStep % tr.lead.length];
    if (b) tone(mtof(b), spb * 1.7, "triangle", 0.16, null, musNext, musGain);
    if (l) tone(mtof(l), spb * 0.9, tr.lt || "square", tr.lt ? 0.07 : 0.045, null, musNext, musGain);
    if (l && tr.dt) tone(mtof(l) * tr.dt, spb * 0.9, "triangle", 0.03, null, musNext, musGain);   // slightly sour second voice
    musNext += spb; musStep++;
  }
}

/* ---------------- save / meta ---------------- */
const SAVE_KEY = "riposte.v3.meta", RUN_KEY = "riposte.v3.run";
function freshMeta() {
  return {
    v: 3, tokens: 0, earned: 0,
    unlocked: ["wide","quick","ricochet","plating","magnet","capacitor","salvage","split","seeker"],
    shields: {standard:true, buckler:false, tower:false, glass:false, mirror:false, signal:false},
    shield: "standard",
    upg: {plate:0, change:0, coolant:0, lucky:0, carto:0},
    fragments: [false, false, false, false, false],
    secrets: {vault1:false, vault2:false, vault3:false, untouched:false, static:false, mirror:false, signal:false, echo:false},
    stats: {runs:0, wins:0, bestDepth:0, kills:0, perfects:0, trueEnd:0, mines:0, bestWave:0},
    arcade: [], initials: "AAA",
    seen: {}, ach: {}, history: [], npcs: {}, asc: 0, daily: null, dailyBest: 0, dailyFriends: [],
    synSeen: {}, modsSeen: {}, tutorialDone: false, hubSeen: false, gj: null, migr4: false,
    logs: {}, tapesDue: {}, flags: {}, playTime: 0, hauntSeen: false, milo: "",
    settings: {sound: 2, crt: true, fullscreen: false, vol: 8, musVol: 8, sfxVol: 8, curve: 2, tint: 0,
      phosphor: true, shake: true, effects: 2, rumble: true, haunt: 2}
  };
}
function mergeDeep(base, over) {
  if (!over || typeof over !== "object") return base;
  for (const k in base) {
    if (!(k in over)) continue;
    const b = base[k], o = over[k];
    if (Array.isArray(b)) base[k] = Array.isArray(o) ? o : b;
    else if (b && typeof b === "object" && !Object.keys(b).length) base[k] = o && typeof o === "object" && !Array.isArray(o) ? o : b;
    else if (b && typeof b === "object") base[k] = mergeDeep(b, o);
    else if (typeof o === typeof b) base[k] = o;
  }
  return base;
}
function loadMeta() {
  let m = freshMeta();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) m = mergeDeep(freshMeta(), JSON.parse(raw));
    else {
      const old = parseInt(localStorage.getItem("riposte.best") || "0", 10);
      if (old > 0) m.arcade.push({i:"YOU", s:old, w:0});
    }
  } catch (e) {}
  if (!Array.isArray(m.arcade)) m.arcade = [];
  m.arcade = m.arcade.filter(e => e && typeof e.s === "number").slice(0, 10);
  migrate4(m);
  return m;
}
// saves from before 4.0: credit what the player had clearly already done
function migrate4(m) {
  if (m.migr4) return;
  m.migr4 = true;
  const st = m.stats, played = st.kills > 0 || m.arcade.some(e => !e.friend);
  if (!played) return;
  const seen = m.seen, ach = m.ach, now = Date.now();
  for (const k of ["sentry", "spreader", "sniper", "rusher", "armor", "splitter", "shard"]) seen[k] = 1;
  if (st.runs > 0) seen.warden = 1;
  if (st.bestDepth >= 2) { seen.furnace = 1; ach.warden = now; }
  if (st.bestDepth >= 3) { seen.hydra = 1; ach.furnace = now; }
  if (st.wins > 0) { ach.hydra = now; ach.ascend = now; }
  if (m.secrets.echo) { seen.echo = 1; ach.echo = now; ach.true_end = now; }
  if (m.secrets.vault1 || m.secrets.vault2 || m.secrets.vault3) ach.vault = now;
  if (st.kills > 0) ach.first_kill = now;
  const best = Math.max(0, ...m.arcade.filter(e => !e.friend).map(e => e.s));
  if (best >= 50000) ach.score50k = now;
  const bw = Math.max(0, ...m.arcade.filter(e => !e.friend).map(e => e.w || 0));
  if (bw >= 10) ach.wave10 = now;
  if (bw >= 20) ach.wave20 = now;
}
function saveMeta() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch (e) {} }
let meta = loadMeta();

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).toUpperCase();
}

/* ---------------- toasts ---------------- */
const toasts = [];
function toast(msg, col) { toasts.push({msg: normText(msg), col: col || C.ye, t: 3.2}); sfx.toast(); }
function drawToasts(dt) {
  if (!toasts.length) return;
  const t = toasts[0];
  t.t -= dt * (1 + Math.max(0, toasts.length - 1) * 0.6);   // a backlog plays faster
  if (toasts.length > 6) toasts.splice(1, toasts.length - 6);
  if (t.t <= 0) { toasts.shift(); return; }
  const lines = wrap(t.msg, 250);
  const w = Math.max(...lines.map(l => tw(l))) + 14, h = lines.length * 7 + 9;
  const x = Math.round(W / 2 - w / 2), y = 204 - h;
  panel(x, y, w, h, t.col);
  lines.forEach((l, i) => txt(l, W / 2, y + 5 + i * 7, t.col, 1, "c"));
}


/* ---------------- CRT effects state ---------------- */
const FX = {glitch: 0, roll: 0, rollLeft: 0, wobble: 0, power: 1, wipe: 1, press: null, nextAmbient: 20 + Math.random() * 20};
function fxScale() { const e = meta.settings.effects; return e === 0 ? 0 : e === 1 ? 0.35 : 1; }
function fxGlitch(a) { FX.glitch = Math.max(FX.glitch, a); }
function fxRoll() { if (FX.rollLeft <= 0) FX.rollLeft = 1; }
function fxWobble(a) { FX.wobble = Math.max(FX.wobble, a); }
function sfxGlitch(big) {
  noise(big ? 0.22 : 0.09, big ? 0.16 : 0.09, 2400, 300);
  tone(big ? 90 : 180, big ? 0.12 : 0.05, "square", big ? 0.08 : 0.05, 60);
}
function fxTick(dt, calm) {
  FX.glitch = Math.max(0, FX.glitch - dt * 2.4);
  FX.wobble = Math.max(0, FX.wobble - dt * 1.4);
  if (FX.rollLeft > 0) {
    const s = Math.min(FX.rollLeft, dt * 5.5);
    FX.roll = (FX.roll + s) % 1; FX.rollLeft -= s;
    if (FX.rollLeft <= 1e-4) { FX.rollLeft = 0; FX.roll = 0; }
  }
  if (FX.wipe < 1) FX.wipe = Math.min(1, FX.wipe + dt * 4.5);
  if (FX.press) { FX.press.t -= dt; if (FX.press.t <= 0) FX.press = null; }
  // an old set hiccups now and then on its own
  FX.nextAmbient -= dt;
  if (FX.nextAmbient <= 0) {
    FX.nextAmbient = 16 + rand() * 30;
    fxGlitch(calm ? 0.12 : 0.3 + rand() * 0.25);
    if (!calm && rand() < 0.35) fxRoll();
    if (!calm) sfxGlitch(false);
  }
}
// drawn into the low-res frame after the scene: the slow top-to-bottom refresh and the button flash
function drawFxOverlay() {
  if (FX.wipe < 1) {
    const y = Math.floor(FX.wipe * H);
    R(0, y, W, H - y, "#000");
    R(0, y, W, 1, C.wh); L.globalAlpha = 0.4; R(0, y - 2, W, 2, C.bl); L.globalAlpha = 1;
  }
  if (FX.press) {
    const p = FX.press, k = p.t / 0.2, g = Math.round((1 - k) * 5);
    L.globalAlpha = k; R(p.x, p.y, p.w, p.h, C.wh); L.globalAlpha = 1;
    RO(p.x - g, p.y - g, p.w + g * 2, p.h + g * 2, C.wh);
  }
}
