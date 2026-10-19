// What Fluke does: the whole search is drawn behind three panes of liquid glass,
// and a drop of glass, a loupe without a handle, reads it.
import { spring } from './liquid.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (t) => t * t * (3 - 2 * t);

export function createWhat({ data, glass, reduced, phone }) {
  const sec = document.getElementById('what');
  const cv = document.getElementById('what-curves');
  const lensEl = document.getElementById('what-lens');
  const rowsEl = document.getElementById('log-rows');
  const panes = [...sec.querySelectorAll('.pane')];
  const ctx = cv.getContext('2d');
  const { trials, best, lo, hi, steps } = data;
  const others = trials.map((_, i) => i).filter((i) => i !== best);

  let W = 0, H = 0, dpr = 1, top = 0, h = 0, drawn = -1, visible = false, cvX = 0, cvY = 0, cvW = 0, cvH = 0;

  // ───────── the curves ─────────
  const X = (i) => (i / (steps - 1)) * W;
  const Y = (v) => H * 0.94 - ((v - lo) / (hi - lo)) * H * 0.86;
  function stroke(path, q) {
    const n = q * (steps - 1), last = Math.floor(n);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(path[0]));
    for (let i = 1; i <= last; i++) ctx.lineTo(X(i), Y(path[i]));
    if (last < steps - 1) {
      const f = n - last;
      ctx.lineTo(X(last + f), Y(path[last] + (path[last + 1] - path[last]) * f));
    }
    ctx.stroke();
  }
  function draw(p) {
    drawn = p;
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(10, 58, 229, .26)'; ctx.lineWidth = 1.4 * dpr;
    others.forEach((k, j) => { const q = clamp01(p * 1.35 - j * 0.014); if (q > 0) stroke(trials[k].path, q); });
    const qw = clamp01((p - 0.3) / 0.7);
    if (qw <= 0) return;
    ctx.strokeStyle = '#FC6C3A'; ctx.lineWidth = 4.5 * dpr;
    stroke(trials[best].path, qw);
    const hp = headPoint(qw);
    ctx.fillStyle = '#FC6C3A';
    ctx.beginPath(); ctx.arc(hp.x, hp.y, 8 * dpr, 0, Math.PI * 2); ctx.fill();
  }
  // a point of the winning curve, in canvas pixels
  function headPoint(q) {
    const path = trials[best].path, n = q * (steps - 1), i = Math.min(steps - 2, Math.floor(n)), f = n - i;
    return { x: X(i + f), y: Y(path[i] + (path[i + 1] - path[i]) * f) };
  }

  // ───────── the research log ─────────
  const spark = (path) => {
    let mn = Infinity, mx = -Infinity;
    path.forEach((v) => { mn = Math.min(mn, v); mx = Math.max(mx, v); });
    const pts = path.filter((_, i) => i % 3 === 0);
    return pts.map((v, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * 100).toFixed(1)} ${(21 - ((v - mn) / (mx - mn || 1)) * 20).toFixed(1)}`).join('');
  };
  // trial 17 is the one that was kept, as on the floppy and in the card file
  const pathOf = (no) => trials[no === 17 ? best : others[(no - 1) % others.length]].path;
  function row(no) {
    const li = document.createElement('li');
    if (no === 17) li.className = 'kept';
    li.innerHTML = `<span>Trial ${String(no).padStart(2, '0')}</span><svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><path d="${spark(pathOf(no))}"/></svg><span class="st">${no === 17 ? 'Kept' : 'Dropped'}</span>`;
    return li;
  }
  let next = 12;
  for (; next <= 17; next++) rowsEl.append(row(next));
  // the log keeps writing while it is on screen
  if (!reduced) setInterval(() => {
    if (!visible || document.hidden) return;
    const first = rowsEl.firstElementChild;
    first.classList.add('is-out');
    setTimeout(() => {
      first.remove();
      const li = row(next); next = next >= 24 ? 1 : next + 1;
      li.classList.add('is-new'); rowsEl.append(li);
      requestAnimationFrame(() => requestAnimationFrame(() => li.classList.remove('is-new')));
    }, 380);
  }, 2600);

  // ───────── the drop of glass ─────────
  const lx = spring(0, { stiffness: 70, damping: 14 }), ly = spring(0, { stiffness: 70, damping: 14 });
  let px = -1, py = -1, lastMove = -1e9, size = 200, placed = false, t0 = performance.now();
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX; py = e.clientY + scrollY; lastMove = performance.now();
  }, { passive: true });

  function layout() {
    const r = sec.getBoundingClientRect();
    top = r.top + scrollY; h = r.height;
    cvX = cv.offsetLeft; cvY = cv.offsetTop; cvW = cv.offsetWidth; cvH = cv.offsetHeight;
    dpr = Math.min(devicePixelRatio || 1, phone ? 1.5 : 1.25);
    W = Math.round(cvW * dpr); H = Math.round(cvH * dpr);
    cv.width = W; cv.height = H; drawn = -1;
    size = lensEl.offsetWidth || 200;
    panes.forEach((p) => { glass?.refract(p, { radius: 28, bevel: 30, strength: 64, blur: 2.5 }); glass?.light(p); });
    glass?.refract(lensEl, { shape: 'lens', strength: size * 0.5, blur: 0, saturate: 1.15, disperse: 0.025 });
    glass?.light(lensEl);
  }

  let last = performance.now();
  function update(y, vh) {
    visible = y + vh > top && y < top + h;
    if (!visible || !W) return;
    // the search is drawn as the section comes up
    const p = reduced ? 1 : smooth(clamp01((y + vh - top - vh * 0.1) / (vh * 1.05)));
    if (Math.abs(p - drawn) > 0.002 || (p === 1 && drawn !== 1)) draw(p);

    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    // the hand leads; left alone, the drop reads the winning curve, slowly, back and forth
    let tx, ty;
    const hand = now - lastMove < 2600 && py > top && py < top + h;
    if (hand) { tx = px; ty = py - top; }
    else {
      const s = ((now - t0) / 1000) * 0.045;
      const q = 0.12 + 0.8 * (0.5 - 0.5 * Math.cos(s * Math.PI * 2));
      const hp = headPoint(Math.min(q, Math.max(0.12, (p - 0.3) / 0.7)));
      tx = cvX + hp.x / dpr; ty = cvY + hp.y / dpr;
    }
    if (!placed) { lx.jump(tx); ly.jump(ty); placed = true; }
    lx.set(tx); ly.set(ty);
    const x = lx.step(dt), yy = ly.step(dt);
    // a drop stretches along the way it moves
    const vx = lx.velocity, vy = ly.velocity, sp = Math.hypot(vx, vy);
    const st = reduced ? 0 : Math.min(0.16, sp * 0.00022);
    const ang = Math.atan2(vy, vx);
    lensEl.style.transform = `translate3d(${(x - size / 2).toFixed(1)}px, ${(yy - size / 2).toFixed(1)}px, 0) rotate(${ang.toFixed(3)}rad) scale(${(1 + st).toFixed(3)}, ${(1 - st * 0.8).toFixed(3)}) rotate(${(-ang).toFixed(3)}rad)`;
    lensEl.style.opacity = String(smooth(clamp01((p - 0.25) / 0.2)));
  }

  return { layout, update };
}
