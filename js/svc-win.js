// A small window of the old interface that says what to do. It is a sign, not a button: 1-bit, a striped title bar,
// a hard shadow and one box per app that fills in as it is opened. Drawn pixel by pixel with the same font as the computer's screen.
import { FONT_ROWS } from './screen-art.js';

const INK = '#101318', PAPER = '#F2F0E6', COBALT = '#0A3AE5';
const LW = 160, LH = 62;   // logical pixels

export function createWin(canvas, { scale = 2 } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const K = Math.max(2, Math.round(scale * dpr));          // canvas pixels per logical pixel
  canvas.width = LW * K; canvas.height = LH * K;
  canvas.style.width = `${LW * K / dpr}px`; canvas.style.height = `${LH * K / dpr}px`;
  const ctx = canvas.getContext('2d');
  const px = (x, y, w = 1, h = 1) => ctx.fillRect(x * K, y * K, w * K, h * K);
  const tw = (s) => s.length * 6 - 1;
  function text(s, x, y, color = INK) {
    ctx.fillStyle = color;
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT_ROWS[ch] || FONT_ROWS['?'];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') px(cx + c, y + r);
      cx += 6;
    }
  }
  const frame = (x, y, w, h, fill) => { ctx.fillStyle = INK; px(x, y, w, h); ctx.fillStyle = fill; px(x + 1, y + 1, w - 2, h - 2); };

  const COUNT = { 2: 'TWO', 3: 'THREE' };
  function draw(seen, total = 2) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    const W = LW - 4, H = LH - 4;
    ctx.fillStyle = INK; px(4, 4, W, H);                          // the hard shadow
    frame(0, 0, W, H, PAPER);
    // title bar: stripes, a close box on the left, the name on a clear patch
    ctx.fillStyle = INK; px(0, 11, W, 1);
    for (let y = 3; y < 9; y += 2) px(2, y, W - 4, 1);
    const t = 'HOW TO', tx = Math.round(W / 2 - tw(t) / 2);
    ctx.fillStyle = PAPER; px(tx - 4, 2, tw(t) + 8, 8); text(t, tx, 2);
    ctx.fillStyle = PAPER; px(4, 2, 7, 7); ctx.fillStyle = INK; px(4, 2, 7, 1); px(4, 8, 7, 1); px(4, 2, 1, 7); px(10, 2, 1, 7);
    const done = seen >= total;
    text(done ? (total === 2 ? 'BOTH OPENED' : `ALL ${COUNT[total]} OPENED`) : `CLICK THE ${COUNT[total]} ICONS`, 10, 17);
    text(done ? 'NOW PRESS CONTINUE' : 'ON THE COMPUTER', 10, 27);
    // an arrow: to the right while there is something to open, down once it is time to continue
    ctx.fillStyle = INK;
    if (!done) { const ax = 10 + tw('ON THE COMPUTER') + 6; px(ax, 30, 9, 1); px(ax + 6, 28, 1, 5); px(ax + 7, 29, 1, 3); px(ax + 8, 30, 1, 1); }
    else { const ax = 10 + tw('NOW PRESS CONTINUE') + 6; px(ax + 3, 26, 1, 9); px(ax + 1, 32, 5, 1); px(ax + 2, 33, 3, 1); px(ax + 3, 34, 1, 1); }
    // one box per tool, filled in blue as it is opened
    for (let i = 0; i < total; i++) {
      const x = 10 + i * 13, y = 41;
      frame(x, y, 9, 9, PAPER);
      if (i < seen) { ctx.fillStyle = COBALT; px(x + 2, y + 2, 5, 5); }
    }
    text(`${Math.min(seen, total)}/${total}`, 10 + total * 13 + 3, 42);
  }
  return { draw };
}
