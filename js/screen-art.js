// What the old computer shows: its own 1984 interface, drawn pixel by pixel.
//   A: the desktop and the window, strictly 1-bit, without the curve
//   C: the winning curve alone (1-bit), so the shader can draw it on
//   B: the same window in colour, with the whole search around the winner (seen through the loupe)
// Logical resolution 512×342, painted at ×2 so every pixel stays sharp when the camera comes close.

const S = 2;
export const SIZE = { w: 512 * S, h: 342 * S };
const LW = 512, LH = 342;

export const FONT_ROWS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
};
const textWidth = (str) => str.length * 6 - 1;

// every drawing call works in logical pixels and paints S×S blocks
function px(ctx, x, y, w = 1, h = 1) { ctx.fillRect(Math.round(x) * S, Math.round(y) * S, Math.round(w) * S, Math.round(h) * S); }
function text(ctx, str, x, y, color) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = FONT_ROWS[ch] || FONT_ROWS['?'];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') px(ctx, cx + c, y + r);
    cx += 6;
  }
}
export const F_GLYPH = ['..####.', '.##...#', '.##....', '#####..', '.##....', '.##....', '.##....', '.##....', '.##....'];
function glyph(ctx, rows, x, y, color) { ctx.fillStyle = color; rows.forEach((row, r) => [...row].forEach((c, i) => { if (c === '#') px(ctx, x + i, y + r); })); }

const WIN = { x: 24, y: 40, w: 400, h: 278 }, TITLE = 18;
const PLOT = { x0: 54, x1: 400, y0: 92, y1: 290 };

function mapPoint(data, k, i) {
  const x = PLOT.x0 + (i / (data.steps - 1)) * (PLOT.x1 - PLOT.x0);
  const y = PLOT.y1 - ((data.trials[k].path[i] - data.lo) / (data.hi - data.lo)) * (PLOT.y1 - PLOT.y0);
  return [x, y];
}
function line1bit(ctx, x0, y0, x1, y1, t) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy; const off = Math.floor(t / 2);
  for (;;) {
    px(ctx, x0 - off, y0 - off, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function box(ctx, x, y, w, h, fill, ink) {
  ctx.fillStyle = fill; px(ctx, x, y, w, h);
  ctx.fillStyle = ink; px(ctx, x, y, w, 1); px(ctx, x, y + h - 1, w, 1); px(ctx, x, y, 1, h); px(ctx, x + w - 1, y, 1, h);
}

function chrome(ctx, { paper, ink, desk, stripes, title, status, accent }) {
  if (desk === 'dither') { ctx.fillStyle = paper; px(ctx, 0, 0, LW, LH); ctx.fillStyle = ink; for (let y = 20; y < LH; y++) for (let x = (y & 1); x < LW; x += 2) px(ctx, x, y); }
  else { ctx.fillStyle = desk; px(ctx, 0, 0, LW, LH); }
  // menu bar
  ctx.fillStyle = paper; px(ctx, 0, 0, LW, 20); ctx.fillStyle = ink; px(ctx, 0, 19, LW, 1);
  glyph(ctx, F_GLYPH, 10, 5, accent || ink);
  let mx = 30;
  for (const m of ['File', 'Edit', 'View', 'Trials', 'Special']) { text(ctx, m, mx, 6, ink); mx += textWidth(m) + 16; }
  // window with shadow
  const { x, y, w, h } = WIN;
  ctx.fillStyle = ink; px(ctx, x + 3, y + 3, w, h);
  box(ctx, x, y, w, h, paper, ink);
  ctx.fillStyle = ink; px(ctx, x, y + TITLE, w, 1);
  ctx.fillStyle = stripes; for (let sy = y + 4; sy < y + TITLE - 3; sy += 2) px(ctx, x + 3, sy, w - 6, 1);
  const tw = textWidth(title), tx = Math.round(x + w / 2 - tw / 2);
  ctx.fillStyle = paper; px(ctx, tx - 6, y + 2, tw + 12, TITLE - 4);
  text(ctx, title, tx, y + 6, ink);
  box(ctx, x + 8, y + 4, 11, 11, paper, ink);
  // scroll bars, arrows, thumb, size box
  ctx.fillStyle = ink;
  px(ctx, x + w - 17, y + TITLE + 1, 1, h - TITLE - 2); px(ctx, x + 1, y + h - 17, w - 2, 1);
  px(ctx, x + w - 16, y + TITLE + 17, 15, 1); px(ctx, x + w - 16, y + h - 34, 15, 1); px(ctx, x + w - 17, y + h - 17, 17, 1);
  const tri = (cx, cy, up) => { for (let i = 0; i < 4; i++) px(ctx, cx - i, cy + (up ? i : -i), 1 + i * 2, 1); };
  tri(x + w - 9, y + TITLE + 6, true); tri(x + w - 9, y + h - 24, false);
  for (let yy = y + TITLE + 18; yy < y + h - 34; yy += 2) for (let xx = x + w - 16 + (yy & 1); xx < x + w - 1; xx += 2) px(ctx, xx, yy);
  box(ctx, x + w - 16, y + TITLE + 30, 15, 54, paper, ink);
  ctx.fillStyle = ink; px(ctx, x + w - 12, y + h - 12, 1, 8); px(ctx, x + w - 12, y + h - 12, 8, 1); px(ctx, x + w - 8, y + h - 8, 5, 1); px(ctx, x + w - 8, y + h - 8, 1, 5);
  text(ctx, status, x + 8, y + h - 13, ink);
  // desktop icons
  const ix = 448;
  box(ctx, ix, 56, 36, 34, paper, ink); ctx.fillStyle = ink; px(ctx, ix + 1, 57, 34, 1); px(ctx, ix + 1, 88, 34, 1); px(ctx, ix + 1, 57, 1, 32); px(ctx, ix + 34, 57, 1, 32);
  ctx.fillStyle = accent || ink; px(ctx, ix + 9, 56, 18, 10); ctx.fillStyle = paper; px(ctx, ix + 21, 58, 4, 6);
  ctx.fillStyle = ink; px(ctx, ix + 6, 72, 24, 1); px(ctx, ix + 6, 77, 24, 1); px(ctx, ix + 6, 82, 24, 1);
  ctx.fillStyle = paper; px(ctx, ix - 6, 96, 48, 12); text(ctx, 'RESEARCH', ix - 4, 99, ink);
  const ty = 262;
  ctx.fillStyle = paper; px(ctx, ix + 4, ty + 6, 28, 28); ctx.fillStyle = ink;
  px(ctx, ix + 2, ty + 2, 32, 4); px(ctx, ix + 12, ty, 12, 3); px(ctx, ix + 4, ty + 6, 2, 28); px(ctx, ix + 30, ty + 6, 2, 28); px(ctx, ix + 4, ty + 32, 28, 2);
  for (let sx = ix + 10; sx < ix + 28; sx += 5) px(ctx, sx, ty + 10, 1, 20);
  ctx.fillStyle = paper; px(ctx, ix - 2, ty + 40, 40, 12); text(ctx, 'TRASH', ix + 3, ty + 43, ink);
}

function grid(ctx, ink) {
  ctx.fillStyle = ink;
  for (let gy = PLOT.y0; gy <= PLOT.y1; gy += 42) for (let gx = PLOT.x0; gx <= PLOT.x1; gx += 4) px(ctx, gx, gy);
  for (let gx = PLOT.x0 + 86; gx <= PLOT.x1; gx += 86) for (let gy = PLOT.y0; gy <= PLOT.y1; gy += 4) px(ctx, gx, gy);
  px(ctx, PLOT.x0 - 1, PLOT.y0 - 10, 2, PLOT.y1 - PLOT.y0 + 11); px(ctx, PLOT.x0 - 1, PLOT.y1, PLOT.x1 - PLOT.x0 + 6, 2);
  for (let gx = PLOT.x0; gx <= PLOT.x1; gx += 43) px(ctx, gx, PLOT.y1 + 2, 1, 4);
}

const INK = '#101318', WHITE = '#F2F0E6';

export function drawFrame(canvas) {
  const ctx = canvas.getContext('2d');
  chrome(ctx, { paper: WHITE, ink: INK, desk: 'dither', stripes: INK, title: 'TRIAL 17: SELECTED RESULT', status: 'ILLUSTRATIVE DEMO - NOT MARKET DATA' });
  grid(ctx, INK);
  text(ctx, 'SELECTED RESULT', PLOT.x0 + 8, PLOT.y0 - 24, INK);
}

export function drawCurve(canvas, data) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, SIZE.w, SIZE.h);
  ctx.fillStyle = INK;
  let prev = mapPoint(data, data.best, 0);
  for (let i = 1; i < data.steps; i++) { const cur = mapPoint(data, data.best, i); line1bit(ctx, prev[0], prev[1], cur[0], cur[1], 3); prev = cur; }
  const [lx, ly] = prev;
  box(ctx, lx - 26, ly - 22, 30, 15, WHITE, INK);
  text(ctx, 'BEST', lx - 22, ly - 19, INK);
}

export function drawWhole(canvas, data, { cobalt = '#0A3AE5', signal = '#FC6C3A', ink = '#14151F', cream = '#F6F3EA' } = {}) {
  const ctx = canvas.getContext('2d');
  chrome(ctx, { paper: cream, ink, desk: cobalt, stripes: cobalt, title: '24 TRIALS: THE WHOLE SEARCH', status: 'ILLUSTRATIVE DEMO - NOT MARKET DATA', accent: cobalt });
  ctx.fillStyle = 'rgba(20,21,31,.25)';
  for (let gy = PLOT.y0; gy <= PLOT.y1; gy += 42) for (let gx = PLOT.x0; gx <= PLOT.x1; gx += 4) px(ctx, gx, gy);
  ctx.fillStyle = ink; px(ctx, PLOT.x0 - 1, PLOT.y0 - 10, 2, PLOT.y1 - PLOT.y0 + 11); px(ctx, PLOT.x0 - 1, PLOT.y1, PLOT.x1 - PLOT.x0 + 6, 2);
  text(ctx, 'EVERY ATTEMPT COUNTS', PLOT.x0 + 8, PLOT.y0 - 24, ink);
  // the others, then the winner on top: smooth lines, this is the "now" seen through the lens
  ctx.save(); ctx.scale(S, S);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  data.trials.forEach((_, k) => {
    if (k === data.best) return;
    ctx.beginPath();
    for (let i = 0; i < data.steps; i++) { const [x, y] = mapPoint(data, k, i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = 'rgba(10,58,229,.6)'; ctx.lineWidth = 1.6; ctx.stroke();
  });
  ctx.beginPath();
  for (let i = 0; i < data.steps; i++) { const [x, y] = mapPoint(data, data.best, i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.stroke();
  ctx.strokeStyle = signal; ctx.lineWidth = 3.4; ctx.stroke();
  const [lx, ly] = mapPoint(data, data.best, data.steps - 1);
  ctx.fillStyle = signal; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  box(ctx, lx - 66, ly - 4, 54, 15, cream, ink);
  text(ctx, 'BEST OF 24', lx - 62, ly - 1, ink);
}

export function makeScreenCanvases(data) {
  const mk = () => { const c = document.createElement('canvas'); c.width = SIZE.w; c.height = SIZE.h; return c; };
  const a = mk(), c = mk(), b = mk();
  drawFrame(a); drawCurve(c, data); drawWhole(b, data);
  return { a, c, b };
}

// v (0 bottom … 1 top, screen uv) of the winning curve at horizontal position u
export function winnerAt(data, u) {
  const f = Math.min(1, Math.max(0, (u * LW - PLOT.x0) / (PLOT.x1 - PLOT.x0))) * (data.steps - 1);
  const i = Math.min(data.steps - 2, Math.floor(f)), t = f - i;
  const [, ya] = mapPoint(data, data.best, i), [, yb] = mapPoint(data, data.best, i + 1);
  return 1 - (ya + (yb - ya) * t) / LH;
}
