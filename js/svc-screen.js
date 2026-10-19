// The three services, drawn on the glass of the 3D computer itself: the same 1-bit interface as inside it.
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
  check: { label: 'CHECK', x: 286, y: 30 },
  verified: { label: 'VERIFIED', x: 286, y: 88 },
  bot: { label: 'QUANT BOT', x: 286, y: 146 },
};
export const WIN = { x: 8, y: 20, w: 246, h: 186, bar: 13 };
export const CLOSE = { x: WIN.x + 6, y: WIN.y + 3, w: 8, h: 8 };
// on a phone the window opens in the middle and the icons step aside: one thing at a time on a small screen
let compact = false;
export function setCompact(on) { compact = on; WIN.x = on ? Math.round((LW - WIN.w) / 2) : 8; CLOSE.x = WIN.x + 6; }
export const isCompact = () => compact;
const TITLES = { check: 'FLUKE CHECK', verified: 'FLUKE VERIFIED', bot: 'FLUKE QUANT BOT' };

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
    } else if (id === 'verified') {
      // a seal: a toothed rim around a tick
      const R = (u, v) => { const a = Math.atan2(v - 12, u - 12); return 10.6 + 1.3 * Math.cos(a * 16); };
      shape(x, y, 24, 24, (u, v) => Math.hypot(u - 12, v - 12) <= R(u, v), fg);
      shape(x, y, 24, 24, (u, v) => Math.hypot(u - 12, v - 12) <= R(u, v) - 1.4, bg);
      shape(x, y, 24, 24, (u, v) => { const d = Math.hypot(u - 12, v - 12); return d <= 7.4 && d > 6.3; }, fg);
      ctx.fillStyle = fg; line(x + 8, y + 12, x + 10, y + 14, 2); line(x + 10, y + 14, x + 15, y + 9, 2);
    } else {
      // a little monitor with a rising line
      ctx.fillStyle = bg; px(x + 1, y + 2, 22, 16);
      ctx.fillStyle = fg; px(x + 1, y + 2, 22, 1); px(x + 1, y + 17, 22, 1); px(x + 1, y + 2, 1, 16); px(x + 22, y + 2, 1, 16);
      px(x + 10, y + 18, 4, 3); px(x + 6, y + 21, 12, 2);
      line(x + 4, y + 13, x + 8, y + 9); line(x + 8, y + 9, x + 11, y + 12); line(x + 11, y + 12, x + 15, y + 6); line(x + 15, y + 6, x + 19, y + 9);
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
    footer('EXAMPLE. REGISTRATION OPENS SOON.');
  }

  function appVerified(t) {
    const X = WIN.x + 8, Y = WIN.y + 20;
    // the seal
    const cx = X + 40, cy = Y + 56;
    const R = (u, v) => { const a = Math.atan2(v, u); return 36 + 2.4 * Math.cos(a * 30); };
    shape(cx - 40, cy - 40, 80, 80, (u, v) => Math.hypot(u - 40, v - 40) <= R(u - 40, v - 40), INK);
    shape(cx - 40, cy - 40, 80, 80, (u, v) => { const d = Math.hypot(u - 40, v - 40); return d <= 31 && d > 30; }, PAPER);
    center('DSR', cx + 1, cy - 17, PAPER);
    center('0.97', cx + 1, cy - 6, PAPER, 2);
    center('LIVE', cx + 1, cy + 12, PAPER);
    center('SAMPLE BADGE', cx, Y + 100, INK);
    center('14 MONTHS LIVE', cx, Y + 110, INK);
    // the public profile
    const P = X + 86, W = 144;
    box(P, Y, W, 112, PAPER);
    ctx.fillStyle = INK; px(P, Y, W, 11); text('PUBLIC PROFILE', P + 4, Y + 2, PAPER); text('SAMPLE', P + W - 40, Y + 2, PAPER);
    text('SAMPLE STRATEGY', P + 5, Y + 16, INK);
    [['SIGNALS', '1,284', COBALT], ['MONTHS', '14', INK], ['EDITED', 'NEVER', INK]].forEach(([k, v, c], i) => { text(k, P + 5 + i * 47, Y + 30, INK); text(v, P + 5 + i * 47, Y + 40, c); });
    ctx.fillStyle = INK; px(P + 4, Y + 51, W - 8, 1);
    text('#', P + 5, Y + 55, INK); text('TIME', P + 35, Y + 55, INK); text('HASH', P + 71, Y + 55, INK);
    ctx.fillStyle = INK; px(P + 4, Y + 64, W - 8, 1);
    const rows = [['1284', '09:14', '0X9F3A..C21E'], ['1283', '08:02', '0X41BE..07D9'], ['1282', '16:47', '0XD0C8..A5F3']];
    rows.forEach((r, i) => { if (t * 4 > i) { text(r[0], P + 5, Y + 68 + i * 13, INK); text(r[1], P + 35, Y + 68 + i * 13, INK); text(r[2], P + 71, Y + 68 + i * 13, INK); } for (let xx = P + 4; xx < P + W - 4; xx += 2) { ctx.fillStyle = INK; px(xx, Y + 77 + i * 13); } });
    // the order of things: the signal is stamped before the trade
    const steps = ['1 SIGNAL', '2 STAMP', '3 TRADE', '4 PUBLIC'];
    steps.forEach((s, i) => {
      const bx = X + i * 58, on = i === 1;
      box(bx, Y + 120, 56, 14, on ? INK : PAPER);
      center(s, bx + 28, Y + 124, on ? PAPER : INK);
      if (i < 3) { ctx.fillStyle = INK; px(bx + 56, Y + 126, 2, 1); }
    });
    footer('SAMPLE. REGISTRATION OPENS SOON.');
  }

  function appBot(t) {
    const X = WIN.x + 8, Y = WIN.y + 20, Wd = WIN.w - 16;
    box(X + Wd / 2 - 74, Y + 2, 148, 22, PAPER);
    center('COMING SOON', X + Wd / 2, Y + 6, INK, 2);
    // your account, the key, the bot
    const A = { x: X, y: Y + 38, w: 98, h: 66 }, B = { x: X + Wd - 100, y: Y + 38, w: 100, h: 66 };
    box(A.x, A.y, A.w, A.h, PAPER);
    ['YOUR EXCHANGE', 'ACCOUNT'].forEach((s, i) => text(s, A.x + 5, A.y + 6 + i * 10, INK));
    text('YOUR MONEY', A.x + 5, A.y + 30, COBALT); text('STAYS HERE', A.x + 5, A.y + 40, COBALT);
    text('NO WITHDRAWALS', A.x + 5, A.y + 54, INK);
    ctx.fillStyle = COBALT; px(B.x + 3, B.y + 3, B.w, B.h);
    box(B.x, B.y, B.w, B.h, INK);
    ['FLUKE QUANT BOT', '', 'RUNS ON', 'YOUR SIDE', '', 'YOU SET THE RISK'].forEach((s, i) => s && text(s, B.x + 5, B.y + 6 + i * 9, PAPER));
    // the key: a dotted line drawn from the bot to the account
    const x0 = A.x + A.w + 3, x1 = B.x - 4, k = ease(clamp01(t / 0.8));
    ctx.fillStyle = INK;
    for (let xx = x1; xx > x1 - (x1 - x0) * k; xx -= 3) px(xx - 1, A.y + 33, 2, 1);
    if (k > 0.98) { px(x0, A.y + 31, 1, 5); px(x0 + 1, A.y + 32, 1, 3); }
    center('KEY', (x0 + x1) / 2, A.y + 22, INK);
    center('TRADE-ONLY KEY. YOU CAN STOP IT', X + Wd / 2, Y + 118, INK);
    center('AT ANY TIME. FLUKE NEVER HOLDS', X + Wd / 2, Y + 128, INK);
    center('YOUR MONEY.', X + Wd / 2, Y + 138, INK);
    footer('WAITLIST OPENS SOON.');
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
    let mx = 18; for (const m of ['FILE', 'EDIT', 'SERVICES']) { text(m, mx, 3, INK); mx += tw(m) + 10; }
    const cnt = `${st.seen.size}/3 OPENED`; text(cnt, LW - 6 - tw(cnt), 3, INK);
    const showIcons = !(compact && st.open && st.openT >= 0.4);
    if (showIcons) for (const id of Object.keys(ICONS)) { icon(id, st.sel === id || st.open === id, st.seen.has(id)); if (!st.open && !st.seen.has(id) && st.sel !== id) ants(id, st.phase | 0); }
    if (!st.open) {
      const l1 = st.seen.size === 3 ? 'ALL THREE' : 'CLICK THE', l2 = st.seen.size === 3 ? 'OPENED' : 'THREE APPS', w = tw(l2, 2) + 18, cx = 118;
      box(cx - w / 2, 80, w, 40, PAPER);
      center(l1, cx, 86, INK, 2); center(l2, cx, 102, INK, 2);
      if (st.seen.size < 3) center('THEY ARE ON THE RIGHT >', cx, 128, INK);
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
      if (st.open === 'check') appCheck(t); else if (st.open === 'verified') appVerified(t); else appBot(t);
    }
    if (st.cursor.show) cursor(st.cursor.x, st.cursor.y, st.cursor.down, st.hand);
  }

  return { canvas, draw };
}
