// The two tools, drawn on the glass of the 3D computer itself: the same 1-bit interface as inside it.
// Logical resolution 320×214 (bigger pixels than the 512×342 desktop, so the words can be read), painted at ×3.
import { FONT_ROWS, F_GLYPH } from './screen-art.js';

export const LW = 320, LH = 214, K = 3;
const INK = '#101318', PAPER = '#F2F0E6', COBALT = '#0A3AE5';
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (t) => 1 - Math.pow(1 - t, 3);

// the arrow of the time: ink with a paper rim, hot spot at its tip
export const ARROW = [
  'o.........', 'oo........', 'o#o.......', 'o##o......', 'o###o.....', 'o####o....', 'o#####o...', 'o######o..',
  'o#######o.', 'o#####oooo', 'o##o##o...', 'o#o.o##o..', 'oo..o##o..', '.....o##o.', '.....o##o.', '......oo..',
];

export const HAND = [
  '....##..........',
  '...#oo#.........',
  '...#oo#.........',
  '...#oo#.........',
  '...#oo###.......',
  '...#oo#oo###....',
  '...#oo#oo#oo##..',
  '##.#oo#oo#oo#o#.',
  '#o##ooooooooo#o#',
  '#oo#ooooooooooo#',
  '.#ooooooooooooo#',
  '.#oooooooooooo#.',
  '..#ooooooooooo#.',
  '..#oooooooooo#..',
  '...#ooooooooo#..',
  '...###########..',
];

export const ICONS = {
  index: { label: 'INDEX', x: 286, y: 62 },
  check: { label: 'CHECK', x: 286, y: 120 },
};
const N = Object.keys(ICONS).length;
export const WIN = { x: 8, y: 20, w: 246, h: 186, bar: 13 };
export const CLOSE = { x: WIN.x + 6, y: WIN.y + 3, w: 8, h: 8 };
// on a phone the window opens in the middle and the icons step aside: one thing at a time on a small screen
let compact = false;
export function setCompact(on) { compact = on; WIN.x = on ? Math.round((LW - WIN.w) / 2) : 8; CLOSE.x = WIN.x + 6; }
export const isCompact = () => compact;
const TITLES = { index: 'FLUKE INDEX', check: 'FLUKE CHECK' };

// the box that answers a click on an icon (icon and label)
export const iconBox = (id) => { const c = ICONS[id]; return { x: c.x - 30, y: c.y - 2, w: 60, h: 40 }; };

export function createSvcScreen() {
  const canvas = document.createElement('canvas');
  canvas.width = LW * K; canvas.height = LH * K;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const px = (x, y, w = 1, h = 1) => ctx.fillRect(Math.round(x) * K, Math.round(y) * K, Math.round(w) * K, Math.round(h) * K);
  const tw = (s, sc = 1) => (s.length * 6 - 1) * sc;
  function text(s, x, y, color, sc = 1) {
    ctx.fillStyle = color;
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT_ROWS[ch] || FONT_ROWS['?'];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') px(cx + c * sc, y + r * sc, sc, sc);
      cx += 6 * sc;
    }
  }
  const center = (s, cx, y, color, sc = 1) => text(s, Math.round(cx - tw(s, sc) / 2), y, color, sc);
  function box(x, y, w, h, fill, ink = INK) {
    ctx.fillStyle = fill; px(x, y, w, h);
    ctx.fillStyle = ink; px(x, y, w, 1); px(x, y + h - 1, w, 1); px(x, y, 1, h); px(x + w - 1, y, 1, h);
  }
  // a shape drawn pixel by pixel from a test, so its edges stay 1-bit
  function shape(x0, y0, w, h, inside, color) {
    ctx.fillStyle = color;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x + 0.5, y + 0.5)) px(x0 + x, y0 + y);
  }
  function line(x0, y0, x1, y1, t = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) { px(x0, y0, t, t); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }

  // the desktop pattern, drawn once
  const deskC = document.createElement('canvas'); deskC.width = canvas.width; deskC.height = canvas.height;
  {
    const d = deskC.getContext('2d');
    d.fillStyle = PAPER; d.fillRect(0, 0, deskC.width, deskC.height);
    // a light pattern of the time: a dot every other pixel on every other line, staggered (no stripes against the scanlines)
    d.fillStyle = INK; for (let y = 14; y < LH; y += 2) for (let x = (y & 2) ? 1 : 3; x < LW; x += 4) d.fillRect(x * K, y * K, K, K);
  }

  // ───────── icons (24×24), normal or selected (inverted) ─────────
  function icon(id, sel, seen) {
    const c = ICONS[id], x = c.x - 12, y = c.y;
    const fg = sel ? PAPER : INK, bg = sel ? INK : PAPER;
    if (id === 'check') {
      // a page with a folded corner and a tick
      shape(x + 3, y, 18, 24, (u, v) => !(u > 12 && v < 6 && u - 12 > v), bg);
      ctx.fillStyle = fg; px(x + 3, y, 12, 1); px(x + 3, y, 1, 24); px(x + 3, y + 23, 18, 1); px(x + 20, y + 6, 1, 18);
      for (let i = 0; i < 6; i++) px(x + 15 + i, y + i, 1, 1);
      px(x + 15, y, 1, 6); px(x + 15, y + 6, 6, 1);
      line(x + 7, y + 14, x + 10, y + 17, 2); line(x + 10, y + 17, x + 16, y + 9, 2);
    } else {
      // a ruled table: a filled header row, two dotted rules, the first column marked off
      ctx.fillStyle = bg; px(x + 1, y + 1, 22, 22);
      ctx.fillStyle = fg; px(x + 1, y + 1, 22, 1); px(x + 1, y + 22, 22, 1); px(x + 1, y + 1, 1, 22); px(x + 22, y + 1, 1, 22);
      px(x + 1, y + 1, 22, 6);
      for (const ry of [12, 17]) for (let xx = x + 3; xx < x + 21; xx += 2) px(xx, y + ry);
      px(x + 9, y + 7, 1, 15);
    }
    const lw = tw(c.label) + 4;
    ctx.fillStyle = sel ? INK : PAPER; px(c.x - lw / 2, y + 27, lw, 10);
    center(c.label, c.x, y + 29, sel ? PAPER : INK);
    if (seen) {
      // seen: a small blue check badge
      ctx.fillStyle = PAPER; px(x + 19, y - 3, 9, 9); ctx.fillStyle = COBALT; px(x + 20, y - 2, 7, 7);
      ctx.fillStyle = PAPER; px(x + 21, y + 1, 1, 1); px(x + 22, y + 2, 1, 1); px(x + 23, y + 1, 1, 1); px(x + 24, y, 1, 1); px(x + 25, y - 1, 1, 1);
    }
  }

  // ───────── a window and its contents ─────────
  function windowChrome(title) {
    const { x, y, w, h, bar } = WIN;
    ctx.fillStyle = INK; px(x + 2, y + 2, w, h);
    box(x, y, w, h, PAPER);
    ctx.fillStyle = INK; px(x, y + bar, w, 1);
    for (let sy = y + 3; sy < y + bar - 2; sy += 2) px(x + 2, sy, w - 4, 1);
    const t = tw(title);
    ctx.fillStyle = PAPER; px(x + w / 2 - t / 2 - 4, y + 1, t + 8, bar - 2);
    center(title, x + w / 2, y + 3, INK);
    box(CLOSE.x - 1, CLOSE.y - 1, CLOSE.w + 2, CLOSE.h + 2, PAPER, PAPER); box(CLOSE.x, CLOSE.y, CLOSE.w, CLOSE.h, PAPER);
  }
  function footer(s) { const { x, y, w, h } = WIN; ctx.fillStyle = INK; px(x + 1, y + h - 12, w - 2, 1); text(s, x + 6, y + h - 9, INK); }

  function appCheck(t) {
    const X = WIN.x + 8, Y = WIN.y + 20;
    box(X, Y, 106, 136, PAPER);
    text('EXAMPLE RESULT', X + 6, Y + 6, INK);
    text('34%', X + 6, Y + 22, COBALT, 4);
    // 34 of 100, in 25 blocks
    for (let i = 0; i < 25; i++) { const on = i < 9 && i < t * 30; if (on) { ctx.fillStyle = INK; px(X + 6 + i * 4, Y + 58, 3, 6); } else { ctx.fillStyle = INK; px(X + 6 + i * 4, Y + 58, 3, 1); px(X + 6 + i * 4, Y + 63, 3, 1); } }
    ['THERE IS A 34%', 'CHANCE THIS', 'RESULT IS REAL.'].forEach((s, i) => text(s, X + 6, Y + 74 + i * 10, INK));
    text('DEFLATED SHARPE', X + 6, Y + 112, INK); text('RATIO: 0.34', X + 6, Y + 122, INK);
    // the same Sharpe 2.0, as the best of more and more tries
    const R = X + 116;
    text('SHARPE 2.0', R, Y + 4, INK); text('BEST OF', R, Y + 14, INK);
    const base = Y + 122, vals = [99, 89, 62, 34], labs = ['2', '10', '100', '1000'];
    vals.forEach((v, i) => {
      const bx = R + 2 + i * 28, hgt = Math.round(v * 0.8 * ease(clamp01((t - i * 0.12) / 0.6)));
      if (hgt > 0) {
        ctx.fillStyle = INK; px(bx, base - hgt, 20, 1); px(bx, base - hgt, 1, hgt); px(bx + 19, base - hgt, 1, hgt);
        if (i === 3) px(bx, base - hgt, 20, hgt); else for (let yy = base - hgt + 2; yy < base; yy += 2) for (let xx = bx + 2 + (yy & 1); xx < bx + 19; xx += 2) px(xx, yy);
      }
      if (t > 0.5) center(`${v}%`, bx + 10, base - hgt - 10, i === 3 ? COBALT : INK);
      center(labs[i], bx + 10, base + 4, INK);
    });
    ctx.fillStyle = INK; px(R, base, 116, 1);
    center('TRIES', R + 58, base + 13, INK);
    footer('ILLUSTRATIVE EXAMPLE. FROM ARTICLE 1.');
  }

  // the index: a preview of the open table. Wallets A to F are invented, and the screen says so
  function appIndex(t) {
    const X = WIN.x + 8, Y = WIN.y + 20, Wd = WIN.w - 16;
    ctx.fillStyle = INK; px(X, Y, Wd, 11);
    text('PREVIEW', X + 4, Y + 2, PAPER); const nr = 'NOT REAL WALLETS'; text(nr, X + Wd - 4 - tw(nr), Y + 2, PAPER);
    const col = [X + 5, X + 66, X + 122, X + 172];
    ['WALLET', 'SKILL P', 'LASTS', 'LEAK'].forEach((h, i) => text(h, col[i], Y + 16, INK));
    ctx.fillStyle = INK; px(X, Y + 25, Wd, 1);
    const rows = [['A', '0.001', 'YES', 'LOW'], ['B', '0.004', 'YES', 'HIGH'], ['C', '0.03', 'NO', 'LOW'], ['D', '0.21', '-', 'LOW'], ['E', '0.48', '-', 'LOW'], ['F', '0.83', '-', 'LOW']];
    rows.forEach(([w, p, lasts, leak], i) => {
      const ry = Y + 29 + i * 13;
      if (t * 7 > i) {
        text(`WALLET ${w}`, col[0], ry, INK);
        text(p, col[1], ry, +p < 0.05 ? COBALT : INK);
        text(lasts, col[2], ry, INK);
        // a high leakage score is marked out to be looked at, not to be judged
        if (leak === 'HIGH') { ctx.fillStyle = INK; px(col[3] - 2, ry - 2, tw(leak) + 4, 11); text(leak, col[3], ry, PAPER); } else text(leak, col[3], ry, INK);
      }
      ctx.fillStyle = INK; for (let xx = X; xx < X + Wd; xx += 2) px(xx, ry + 9);
    });
    ['P: HOW OFTEN CHANCE BEATS IT.', 'LASTS: PASSES AGAIN ON NEW EVENTS.', 'HIGH LEAK: A REASON TO LOOK CLOSER.'].forEach((s2, i) => text(s2, X + 2, Y + 110 + i * 11, INK));
    footer('ILLUSTRATIVE, NOT REAL WALLETS.');
  }

  function cursor(cx, cy, pressed, hand) {
    const rows = hand ? HAND : ARROW, ox = hand ? 4 : 0;
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === '#' ? (pressed ? COBALT : INK) : PAPER;
      px(cx - ox + c, cy + r);
    }));
  }
  // marching ants round an app that has not been opened yet: the old way of saying "this one"
  function ants(id, phase) {
    const b = iconBox(id); ctx.fillStyle = INK;
    for (let x = 0; x < b.w; x++) if (((x + phase) & 3) < 2) { px(b.x + x, b.y); px(b.x + x, b.y + b.h - 1); }
    for (let y = 0; y < b.h; y++) if (((y + phase) & 3) < 2) { px(b.x, b.y + y); px(b.x + b.w - 1, b.y + y); }
  }

  // ───────── one frame of the screen ─────────
  // st: { open, openT (0..1 of the opening), zoomFrom, sel, seen:Set, count, hint, cursor:{x,y,down,show} }
  function draw(st) {
    ctx.drawImage(deskC, 0, 0);
    // menu bar
    ctx.fillStyle = PAPER; px(0, 0, LW, 13); ctx.fillStyle = INK; px(0, 13, LW, 1);
    ctx.fillStyle = COBALT; F_GLYPH.forEach((row, r) => [...row].forEach((c, i) => { if (c === '#' && r % 1 === 0) px(5 + i, 2 + r); }));
    let mx = 18; for (const m of ['FILE', 'EDIT', 'TOOLS']) { text(m, mx, 3, INK); mx += tw(m) + 10; }
    const cnt = `${st.seen.size}/${N} OPENED`; text(cnt, LW - 6 - tw(cnt), 3, INK);
    const showIcons = !(compact && st.open && st.openT >= 0.4);
    if (showIcons) for (const id of Object.keys(ICONS)) { icon(id, st.sel === id || st.open === id, st.seen.has(id)); if (!st.open && !st.seen.has(id) && st.sel !== id) ants(id, st.phase | 0); }
    if (!st.open) {
      const all = st.seen.size === N, l1 = all ? 'BOTH' : 'CLICK THE', l2 = all ? 'OPENED' : 'TWO APPS', w = tw(l2, 2) + 18, cx = 118;
      box(cx - w / 2, 80, w, 40, PAPER);
      center(l1, cx, 86, INK, 2); center(l2, cx, 102, INK, 2);
      if (!all) center('THEY ARE ON THE RIGHT >', cx, 128, INK);
    } else if (st.openT < 0.4) {
      // the zoom of the old Macs: outlines grow from the icon to the window
      const a = iconBox(st.open), q = st.openT / 0.4;
      ctx.fillStyle = INK;
      for (let k = 0; k < 4; k++) {
        const f = ease(clamp01(q - k * 0.12));
        if (f <= 0) continue;
        const x = a.x + (WIN.x - a.x) * f, y = a.y + (WIN.y - a.y) * f, w = a.w + (WIN.w - a.w) * f, h = a.h + (WIN.h - a.h) * f;
        for (let xx = x; xx < x + w; xx += 2) { px(xx, y); px(xx, y + h); }
        for (let yy = y; yy < y + h; yy += 2) { px(x, yy); px(x + w, yy); }
      }
    } else {
      windowChrome(TITLES[st.open]);
      const t = clamp01((st.openT - 0.4) / 0.6);
      if (st.open === 'check') appCheck(t); else appIndex(t);
    }
    if (st.cursor.show) cursor(st.cursor.x, st.cursor.y, st.cursor.down, st.hand);
  }

  return { canvas, draw };
}
