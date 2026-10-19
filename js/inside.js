// Inside the computer: the whole screen becomes its 1984 desktop.
// Scroll drives the story: a dialog, the 23 other trials opening one by one, then all of them
// melting into the one chart. The visitor can switch between "the winning result" and
// "the whole search" in a little VIEW window, without the page moving.
import { FONT_ROWS, F_GLYPH } from './screen-art.js';

const INK = '#101318', WHITE = '#F2F0E6', COBALT = '#0A3AE5', SIGNAL = '#FC6C3A';
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

const ARROW = [
  '1..........', '11.........', '121........', '1221.......', '12221......', '122221.....', '1222221....', '12222221...',
  '122222221..', '1222222221.', '12222211111', '1221221....', '121.1221...', '11..1221...', '1....1221..', '.....1221..', '......11...',
];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function createInside({ canvas, ui, data, reduced }) {
  const ctx = canvas.getContext('2d');
  const hits = [...ui.querySelectorAll('.pix-hit')];
  let LW = 480, LH = 300, k = 3;
  const L = {};
  let desk = null;
  let view = 1, viewT = 1, lastP = -1, lastView = -1;
  const others = data.trials.map((_, i) => i).filter((i) => i !== data.best);

  // ───────── tiny drawing kit (logical pixels) ─────────
  const fill = (c) => { ctx.fillStyle = c; };
  const rect = (x, y, w, h) => ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  function text(str, x, y, color, s = 1) {
    fill(color);
    let cx = Math.round(x);
    for (const ch of str.toUpperCase()) {
      const g = FONT_ROWS[ch] || FONT_ROWS['?'];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') ctx.fillRect(cx + c * s, Math.round(y) + r * s, s, s);
      cx += 6 * s;
    }
  }
  const tw = (str, s = 1) => (str.length * 6 - 1) * s;
  function wrap(str, width, s = 1) {
    const max = Math.max(4, Math.floor((width + s) / (6 * s)));
    const out = []; let line = '';
    for (const w of str.split(' ')) { if ((line + ' ' + w).trim().length > max) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }
    if (line) out.push(line);
    return out;
  }
  function frame(x, y, w, h, fillc = WHITE) {
    fill(INK); rect(x + 2, y + 2, w, h);
    fill(fillc); rect(x, y, w, h);
    fill(INK); rect(x, y, w, 1); rect(x, y + h - 1, w, 1); rect(x, y, 1, h); rect(x + w - 1, y, 1, h);
  }
  function win(x, y, w, h, title, { stripes = true, accent = INK } = {}) {
    frame(x, y, w, h);
    fill(INK); rect(x, y + 14, w, 1);
    if (stripes) { fill(accent); for (let sy = y + 3; sy < y + 12; sy += 2) rect(x + 2, sy, w - 4, 1); }
    const t = title.length * 6 - 1 > w - 30 ? title.slice(0, Math.max(3, Math.floor((w - 30) / 6))) : title;
    const tx = Math.round(x + w / 2 - tw(t) / 2);
    fill(WHITE); rect(tx - 4, y + 1, tw(t) + 8, 12);
    text(t, tx, y + 4, INK);
    frame(x + 6, y + 3, 9, 9); // close box (no shadow look is fine at this size)
    fill(WHITE); rect(x + 6, y + 3, 9, 9); fill(INK); rect(x + 6, y + 3, 9, 1); rect(x + 6, y + 11, 9, 1); rect(x + 6, y + 3, 1, 9); rect(x + 14, y + 3, 1, 9);
  }
  function dotted(x, y, w, h) {
    fill(INK);
    for (let i = 0; i < w; i += 2) { rect(x + i, y, 1, 1); rect(x + i, y + h - 1, 1, 1); }
    for (let i = 0; i < h; i += 2) { rect(x, y + i, 1, 1); rect(x + w - 1, y + i, 1, 1); }
  }
  // the zoom rectangles of the old Finder, from one box to another
  function zoom(a, b, t) {
    for (const d of [-0.25, 0, 0.25]) {
      const u = clamp01(t + d);
      if (u <= 0 || u >= 1) continue;
      dotted(lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.w, b.w, u), lerp(a.h, b.h, u));
    }
  }
  function line(x0, y0, x1, y1, t = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy; const o = Math.floor(t / 2);
    for (;;) { ctx.fillRect(x0 - o, y0 - o, t, t); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  function curve(k2, box, t = 1) {
    const { x0, x1, y0, y1 } = box;
    const pad = (data.hi - data.lo) * 0.05;
    const P = (i) => [x0 + (i / (data.steps - 1)) * (x1 - x0), y1 - ((data.trials[k2].path[i] - (data.lo - pad)) / (data.hi - data.lo + pad * 2)) * (y1 - y0)];
    let prev = P(0);
    for (let i = 1; i < data.steps; i++) { const cur = P(i); line(prev[0], prev[1], cur[0], cur[1], t); prev = cur; }
    return prev;
  }
  function icon(x, y, kind, label, inverted) {
    const c1 = inverted ? INK : WHITE, c2 = inverted ? WHITE : INK;
    if (kind === 'disk') {
      fill(c1); rect(x, y, 28, 26); fill(c2); rect(x, y, 28, 1); rect(x, y + 25, 28, 1); rect(x, y, 1, 26); rect(x + 27, y, 1, 26);
      fill(inverted ? WHITE : COBALT); rect(x + 7, y, 14, 8); fill(c2); rect(x + 5, y + 14, 18, 1); rect(x + 5, y + 18, 18, 1);
    } else {
      fill(c1); rect(x + 4, y + 5, 20, 21); fill(c2); rect(x + 2, y + 2, 24, 3); rect(x + 9, y, 10, 2); rect(x + 4, y + 5, 1, 21); rect(x + 23, y + 5, 1, 21); rect(x + 4, y + 25, 20, 1);
      for (let sx = x + 9; sx < x + 22; sx += 4) rect(sx, y + 8, 1, 14);
    }
    const lx = Math.round(x + 14 - tw(label) / 2);
    fill(inverted ? INK : WHITE); rect(lx - 2, y + 30, tw(label) + 4, 10); text(label, lx, y + 31, inverted ? WHITE : INK);
  }
  function arrow(x, y) {
    ARROW.forEach((row, r) => [...row].forEach((c, i) => { if (c === '1') { fill(INK); rect(x + i, y + r, 1, 1); } else if (c === '2') { fill(WHITE); rect(x + i, y + r, 1, 1); } }));
  }
  function button(x, y, w, h, label, pressed, isDefault) {
    if (isDefault) { fill(INK); rect(x - 3, y - 3, w + 6, h + 6); fill(WHITE); rect(x - 2, y - 2, w + 4, h + 4); }
    fill(pressed ? INK : WHITE); rect(x, y, w, h); fill(INK); rect(x + 2, y, w - 4, 1); rect(x + 2, y + h - 1, w - 4, 1); rect(x, y + 2, 1, h - 4); rect(x + w - 1, y + 2, 1, h - 4);
    rect(x + 1, y + 1, 1, 1); rect(x + w - 2, y + 1, 1, 1); rect(x + 1, y + h - 2, 1, 1); rect(x + w - 2, y + h - 2, 1, 1);
    text(label, Math.round(x + w / 2 - tw(label) / 2), y + Math.round(h / 2 - 3), pressed ? WHITE : INK);
  }
  function radio(x, y, on) {
    fill(WHITE); rect(x, y, 9, 9); fill(INK);
    rect(x + 2, y, 5, 1); rect(x + 2, y + 8, 5, 1); rect(x, y + 2, 1, 5); rect(x + 8, y + 2, 1, 5); rect(x + 1, y + 1, 1, 1); rect(x + 7, y + 1, 1, 1); rect(x + 1, y + 7, 1, 1); rect(x + 7, y + 7, 1, 1);
    if (on) rect(x + 3, y + 3, 3, 3);
  }

  // ───────── layout ─────────
  function resize() {
    const vw = canvas.clientWidth || innerWidth, vh = canvas.clientHeight || innerHeight;
    k = Math.max(2, Math.min(4, Math.round(Math.min(vw / 480, vh / 300))));
    LW = Math.ceil(vw / k); LH = Math.ceil(vh / k);
    canvas.width = LW; canvas.height = LH;
    const narrow = LW < 320;
    const mw = Math.min(LW - 20, 420), mh = Math.min(LH - (narrow ? 150 : 70), 250);
    L.main = { x: Math.round((LW - mw) / 2) - (narrow ? 0 : 18), y: Math.round(narrow ? 34 : 24 + (LH - 24 - mh) / 2), w: mw, h: mh };
    const m = L.main;
    L.plot = { x0: m.x + 24, x1: m.x + m.w - 14, y0: m.y + 34, y1: m.y + m.h - 24 };
    L.disk = { x: LW - 40, y: 26 }; L.trash = { x: LW - 40, y: LH - 52 };
    L.diskBox = { x: L.disk.x, y: L.disk.y, w: 28, h: 26 };
    const dw = Math.min(LW - 20, 250);
    L.dialog = { x: narrow ? 10 : Math.max(10, m.x - 6), y: narrow ? 40 : 34, w: dw, h: 0 };
    const sw = narrow ? 84 : 116, sh = narrow ? 58 : 76;
    const r = rng(1984);
    L.trials = others.map(() => ({ x: Math.round(6 + r() * (LW - sw - 52)), y: Math.round(24 + r() * (LH - sh - 30)), w: sw, h: sh }));
    const vwid = Math.min(LW - 20, 200);
    L.view = { x: narrow ? Math.round((LW - vwid) / 2) : 10, y: 0, w: vwid, h: 0 };
    // static desktop, painted once
    desk = document.createElement('canvas'); desk.width = LW; desk.height = LH;
    const d = desk.getContext('2d');
    d.fillStyle = WHITE; d.fillRect(0, 0, LW, LH);
    d.fillStyle = INK; for (let y = 16; y < LH; y++) for (let x = (y & 1); x < LW; x += 2) d.fillRect(x, y, 1, 1);
    lastP = -1;
  }

  // the scripted hand of whoever is using the computer
  const POINTER = [
    [0.1, 0.72, 0.78], [0.2, 0.62, 0.6], [0.23, 'ok'], [0.27, 'ok'], [0.3, 'disk'], [0.62, 'disk'], [0.7, 0.55, 0.5], [0.82, 'view'], [1, 'view'],
  ];
  function pointerAt(p, targets) {
    const pt = (e) => (typeof e[1] === 'string' ? targets[e[1]] : { x: e[1] * LW, y: e[2] * LH });
    if (p <= POINTER[0][0]) return pt(POINTER[0]);
    for (let i = 0; i < POINTER.length - 1; i++) {
      const a = POINTER[i], b = POINTER[i + 1];
      if (p >= a[0] && p <= b[0]) { const A = pt(a), B = pt(b), t = smooth((p - a[0]) / (b[0] - a[0])); return { x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) }; }
    }
    return pt(POINTER[POINTER.length - 1]);
  }

  // ───────── the scene at scroll progress p ─────────
  function render(p, dt) {
    view += (viewT - view) * (1 - Math.exp(-dt * 7));
    if (Math.abs(viewT - view) < 0.002) view = viewT;
    if (Math.abs(p - lastP) < 0.0004 && view === lastView) return;
    lastP = p; lastView = view;

    ctx.drawImage(desk, 0, 0);
    // menu bar
    fill(WHITE); rect(0, 0, LW, 15); fill(INK); rect(0, 15, LW, 1);
    ctx.save(); F_GLYPH.forEach((row, r) => [...row].forEach((c, i) => { if (c === '#') { fill(COBALT); rect(7 + i, 3 + r, 1, 1); } })); ctx.restore();
    let mx = 22;
    for (const m of (LW < 320 ? ['File', 'Edit'] : ['File', 'Edit', 'View', 'Trials', 'Special'])) { text(m, mx, 4, INK); mx += tw(m) + 12; }

    const opened = others.map((_, i) => clamp01((p - (0.3 + i * 0.0135)) / 0.012));
    const merge = others.map((_, i) => clamp01((p - (0.64 + i * 0.0035)) / 0.07));
    const cloud = smooth((p - 0.68) / 0.12);
    const shown = cloud * view;
    const count = p < 0.3 ? 1 : 1 + opened.filter((o) => o >= 1).length;
    const cnt = `TRIALS ${count}/24`;
    text(cnt, LW - tw(cnt) - 8, 4, INK);

    icon(L.disk.x, L.disk.y, 'disk', 'RESEARCH', p > 0.285 && p < 0.3);
    icon(L.trash.x, L.trash.y, 'trash', 'TRASH', false);

    // main window: the selected result, later the whole search
    const m = L.main, pl = L.plot;
    win(m.x, m.y, m.w, m.h, shown > 0.5 ? '24 TRIALS: THE WHOLE SEARCH' : 'TRIAL 17: SELECTED RESULT', { accent: shown > 0.5 ? COBALT : INK });
    fill(INK);
    for (let gy = pl.y0; gy <= pl.y1; gy += Math.round((pl.y1 - pl.y0) / 4)) for (let gx = pl.x0; gx <= pl.x1; gx += 3) rect(gx, gy, 1, 1);
    rect(pl.x0 - 1, pl.y0 - 6, 1, pl.y1 - pl.y0 + 7); rect(pl.x0 - 1, pl.y1, pl.x1 - pl.x0 + 4, 1);
    text(shown > 0.5 ? 'EVERY ATTEMPT COUNTS' : 'SELECTED RESULT', pl.x0 + 4, m.y + 20, INK);
    const status = m.w > 240 ? 'ILLUSTRATIVE DEMO - NOT MARKET DATA' : 'NOT MARKET DATA';
    fill(INK); rect(m.x + 1, m.y + m.h - 13, m.w - 2, 1); text(status, m.x + 6, m.y + m.h - 10, INK);
    if (shown > 0.01) {
      ctx.globalAlpha = shown; fill(COBALT);
      others.forEach((k2) => curve(k2, pl, 1));
      ctx.globalAlpha = 1;
    }
    fill(shown > 0.5 ? SIGNAL : INK);
    if (shown > 0.5) { fill(INK); curve(data.best, { ...pl, y0: pl.y0 + 1, y1: pl.y1 + 1 }, 3); fill(SIGNAL); }
    const end = curve(data.best, pl, 2);
    const flag = shown > 0.5 ? 'BEST OF 24' : 'BEST';
    frame(end[0] - tw(flag) - 10, end[1] - 16, tw(flag) + 8, 11);
    text(flag, end[0] - tw(flag) - 6, end[1] - 14, INK);

    // the 23 other trials open from the research disk, then melt into the chart
    others.forEach((k2, i) => {
      const o = opened[i], g = merge[i];
      if (o <= 0 || g >= 1) return;
      const r = L.trials[i];
      if (g > 0) { zoom(r, { x: pl.x0, y: pl.y0, w: pl.x1 - pl.x0, h: pl.y1 - pl.y0 }, g); return; }
      if (o < 1) { zoom(L.diskBox, r, o); return; }
      win(r.x, r.y, r.w, r.h, `TRIAL ${String(k2 + 1).padStart(2, '0')}`, { stripes: false });
      fill(INK); curve(k2, { x0: r.x + 6, x1: r.x + r.w - 6, y0: r.y + 20, y1: r.y + r.h - 6 }, 1);
    });

    // the first dialog: what this is about
    const targets = { ok: { x: 0, y: 0 }, disk: { x: L.disk.x + 14, y: L.disk.y + 12 }, view: { x: 0, y: 0 } };
    const dOpen = clamp01((p - 0.12) / 0.03), dClose = clamp01((p - 0.255) / 0.02);
    const D = L.dialog;
    const body = wrap("It's easy to fall in love with a line. Let's see what sits behind it.", D.w - 20);
    const head = wrap('One winner. A bigger story.', D.w - 20, 2);
    D.h = 14 + head.length * 17 + 8 + body.length * 10 + 30;
    targets.ok = { x: D.x + D.w - 34, y: D.y + D.h - 16 };
    if (dOpen > 0 && dClose < 1) {
      const center = { x: LW / 2, y: LH / 2, w: 2, h: 2 };
      if (dOpen < 1) zoom(center, D, dOpen);
      else if (dClose > 0) zoom(D, { x: targets.ok.x, y: targets.ok.y, w: 2, h: 2 }, dClose);
      else {
        frame(D.x, D.y, D.w, D.h); fill(INK); rect(D.x + 3, D.y + 3, D.w - 6, 1); rect(D.x + 3, D.y + D.h - 4, D.w - 6, 1); rect(D.x + 3, D.y + 3, 1, D.h - 6); rect(D.x + D.w - 4, D.y + 3, 1, D.h - 6);
        head.forEach((l, i) => text(l, D.x + 10, D.y + 12 + i * 17, COBALT, 2));
        body.forEach((l, i) => text(l, D.x + 10, D.y + 14 + head.length * 17 + 6 + i * 10, INK));
        button(D.x + D.w - 54, D.y + D.h - 22, 42, 14, 'OK', p > 0.235 && p < 0.255, true);
      }
    }

    // the VIEW window: the visitor's own switch
    const vOpen = clamp01((p - 0.8) / 0.025);
    const V = L.view;
    const cap = wrap(shown > 0.5 ? 'Same selected result. Different context.' : 'A compelling curve. How many attempts came before it?', V.w - 16);
    // the one line that carries the demo over to the wallets
    const also = wrap('Same logic, now for wallets.', V.w - 16);
    V.h = 18 + 2 * 14 + 6 + cap.length * 10 + 4 + also.length * 10 + 8;
    V.y = LH - V.h - 10;
    targets.view = { x: V.x + 14, y: V.y + 24 + (viewT ? 14 : 0) };
    let hitOn = false;
    if (vOpen > 0) {
      if (vOpen < 1) zoom({ x: V.x + V.w / 2, y: LH, w: 2, h: 2 }, V, vOpen);
      else {
        win(V.x, V.y, V.w, V.h, 'VIEW');
        radio(V.x + 8, V.y + 20, view < 0.5); text('THE WINNING RESULT', V.x + 22, V.y + 21, INK);
        radio(V.x + 8, V.y + 34, view >= 0.5); text('THE WHOLE SEARCH', V.x + 22, V.y + 35, INK);
        cap.forEach((l, i) => text(l, V.x + 8, V.y + 52 + i * 10, INK));
        also.forEach((l, i) => text(l, V.x + 8, V.y + 56 + (cap.length + i) * 10, COBALT));
        hitOn = true;
        placeHits(V);
      }
    }
    hits.forEach((h) => { h.style.display = hitOn ? '' : 'none'; h.tabIndex = hitOn ? 0 : -1; });

    // the hand
    if (!reduced && p > 0.08 && p < 0.97) { const ptr = pointerAt(p, targets); arrow(Math.round(ptr.x), Math.round(ptr.y)); }
  }

  function placeHits(V) {
    const sx = canvas.clientWidth / LW, sy = canvas.clientHeight / LH;
    hits.forEach((h, i) => {
      const y = V.y + 18 + i * 14;
      Object.assign(h.style, { left: `${(V.x + 4) * sx}px`, top: `${y * sy}px`, width: `${(V.w - 8) * sx}px`, height: `${13 * sy}px` });
    });
  }

  function setView(v) {
    viewT = v;
    hits.forEach((h, i) => h.setAttribute('aria-pressed', String(i === v)));
    lastP = -1;
  }
  hits.forEach((h, i) => h.addEventListener('click', () => setView(i)));

  resize();
  return { resize, render, setView };
}
