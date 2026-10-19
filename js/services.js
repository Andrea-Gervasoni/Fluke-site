// The services showcase: the computer stays on the desk, its three apps are the choices.
// The apps are drawn on the glass of the 3D computer (svc-screen.js); an invisible layer over the glass takes the clicks.
// Nothing here collects data or pretends to work: it explains each service and shows an example.
import { LW, LH, ICONS, WIN, CLOSE, iconBox, setCompact, isCompact } from './svc-screen.js';
import { createWin } from './svc-win.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const inBox = (p, b) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

export function createServices({ reduced, phone, screen, onDirty, onContinue }) {
  const $ = (s, r = document) => r.querySelector(s);
  const pin = $('#svc-pin'); if (!pin) return null;
  const os = $('#os'), text = $('#svc-text'), go = $('#svc-go'), foot = $('.svc-foot'), count = $('#svc-count b'), next = $('#svc-next');
  const ids = ['check', 'verified', 'bot'];
  const items = Object.fromEntries(ids.map((id) => [id, $(`.svc-item[data-svc="${id}"]`)]));
  const texts = Object.fromEntries(['none', ...ids].map((id) => [id, $(`.svc-p[data-p="${id}"]`)]));
  const say = (id) => Object.entries(texts).forEach(([k, el]) => el.classList.toggle('is-on', k === id));

  const sign = createWin($('#svc-win'), { scale: phone ? 1.7 : 2.1 });
  sign.draw(0);
  const REST = { x: 128, y: 142 };
  const st = { open: null, openT: 1, sel: null, hand: false, phase: 0, seen: new Set(), cursor: { x: REST.x, y: REST.y, down: false, show: true } };
  let dirty = true, openAt = 0, inView = false, lastDraw = -1e9;

  // ───────── choices ─────────
  function open(id) {
    if (st.open === id) return close();
    if (st.open) items[st.open].classList.remove('is-open');
    st.open = id; openAt = performance.now(); st.openT = reduced ? 1 : 0; st.sel = null;
    items[id].classList.add('is-open');
    ids.forEach((k) => items[k].querySelector('.svc-tab').setAttribute('aria-expanded', String(k === id)));
    say(id); unhint();
    st.seen.add(id); items[id].classList.add('is-seen');
    count.textContent = String(st.seen.size); next.hidden = st.seen.size === 3; sign.draw(st.seen.size);
    if (st.seen.size === 3 && !foot.classList.contains('is-done')) { foot.classList.add('is-done'); $('a', go).removeAttribute('tabindex'); }
    dirty = true;
  }
  function close() {
    if (!st.open) return;
    items[st.open].classList.remove('is-open'); items[st.open].querySelector('.svc-tab').setAttribute('aria-expanded', 'false');
    st.open = null; say('none'); dirty = true;
  }
  const unhint = () => ids.forEach((id) => items[id].classList.remove('is-hint'));
  ids.forEach((id) => items[id].querySelector('.svc-tab').addEventListener('click', () => { stopDemo(performance.now()); open(id); }));
  $('a', go).addEventListener('click', (e) => { e.preventDefault(); onContinue && onContinue(); });

  // ───────── your hand on the glass: the pointer becomes the arrow of the time ─────────
  const user = { at: -1e9, x: 0, y: 0, over: false };
  function toScreen(e) {
    const r = os.getBoundingClientRect();
    // the same bulge as the tube (mac.js): glass uv → picture uv
    const cx = ((e.clientX - r.left) / r.width) * 2 - 1, cy = (1 - (e.clientY - r.top) / r.height) * 2 - 1;
    const f = 1 + 0.045 * (cx * cx + cy * 0.82 * cy * 0.82);
    return { x: (cx * f * 0.5 + 0.5) * LW, y: (1 - (cy * f * 0.5 + 0.5)) * LH };
  }
  const closeHit = (p) => st.open && inBox(p, { x: CLOSE.x - 3, y: CLOSE.y - 3, w: CLOSE.w + 6, h: CLOSE.h + 6 });
  if (phone) setCompact(true);
  const hitIcon = (p) => (isCompact() && st.open ? undefined : ids.find((id) => inBox(p, iconBox(id)) && !(st.open && inBox(p, WIN))));
  os.addEventListener('pointermove', (e) => {
    const p = toScreen(e); user.x = p.x; user.y = p.y; user.over = e.pointerType === 'mouse'; user.at = performance.now();
    const id = hitIcon(p) || null, hand = !!(id || closeHit(p));
    if (id !== st.sel || hand !== st.hand) { st.sel = id; st.hand = hand; dirty = true; }
  });
  os.addEventListener('pointerleave', () => { user.over = false; if (st.sel || st.hand) { st.sel = null; st.hand = false; dirty = true; } });
  os.addEventListener('pointerdown', (e) => {
    const p = toScreen(e); user.x = p.x; user.y = p.y; user.at = performance.now();
    stopDemo(user.at);
    if (e.pointerType === 'mouse') { st.cursor.down = true; st.sel = hitIcon(p) || null; dirty = true; }
  });
  addEventListener('pointerup', () => { if (st.cursor.down) { st.cursor.down = false; dirty = true; } });
  os.addEventListener('click', (e) => {
    const p = toScreen(e); user.at = performance.now();
    if (closeHit(p)) return close();
    const id = hitIcon(p);
    if (id) open(id); else if (st.sel) { st.sel = null; dirty = true; }
  });

  // ───────── the demonstration: while nobody touches it, the arrow shows how it is done ─────────
  const demo = { phase: 'idle', t0: 0, from: { ...REST }, to: { ...REST }, id: null, turn: 0 };
  function stopDemo(now) { if (demo.phase !== 'idle') { demo.phase = 'idle'; unhint(); if (st.sel && !st.cursor.down) st.sel = null; dirty = true; } demo.t0 = now; }
  const goTo = (phase, to, now) => { demo.phase = phase; demo.t0 = now; demo.from = { x: st.cursor.x, y: st.cursor.y }; demo.to = to; };
  function runDemo(now) {
    const dt = now - demo.t0;
    const move = (dur) => { const k = easeIO(clamp01(dt / dur)); st.cursor.x = demo.from.x + (demo.to.x - demo.from.x) * k; st.cursor.y = demo.from.y + (demo.to.y - demo.from.y) * k; dirty = true; return k >= 1; };
    if (demo.phase === 'idle') {
      const left = ids.filter((id) => !st.seen.has(id));
      if (dt > 700 && left.length && !st.open) {
        demo.id = left[demo.turn++ % left.length];
        const c = ICONS[demo.id];
        goTo('to', { x: c.x - 3, y: c.y + 9 }, now);
      } else if (dt > 1600 && st.open && ids.some((id) => !st.seen.has(id))) {
        // a window is open and something is still unseen: the arrow shows where the close box is
        goTo('close', { x: CLOSE.x + 3, y: CLOSE.y + 4 }, now);
      }
      return;
    }
    if (demo.phase === 'to') { if (move(1000)) { demo.phase = 'press'; demo.t0 = now; } }
    else if (demo.phase === 'press') {
      // a click: the icon is selected, and its line in the text lights up with it
      const down = dt < 240;
      if (down !== st.cursor.down) { st.cursor.down = down; dirty = true; }
      if (st.sel !== demo.id) { st.sel = demo.id; items[demo.id].classList.add('is-hint'); dirty = true; }
      if (dt > 1400) { st.sel = null; unhint(); goTo('back', { x: REST.x + (demo.turn % 2 ? 12 : -8), y: REST.y }, now); }
    } else if (demo.phase === 'back') { if (move(1100)) { demo.phase = 'idle'; demo.t0 = now; } }
    else if (demo.phase === 'close') { if (move(1000)) { demo.phase = 'rest'; demo.t0 = now; } }
    else if (demo.phase === 'rest') { if (!st.open || dt > 6000) { demo.phase = 'idle'; demo.t0 = now; } }
  }

  // ───────── per frame ─────────
  let lastKey = '';
  function update({ rect, top, vh }) {
    inView = top < vh * 0.9 && top > -vh * 1.8;
    if (!pin.classList.contains('is-in') && top < vh * 0.55) pin.classList.add('is-in');
    if (rect) {
      const key = `${rect.x.toFixed(1)}|${rect.y.toFixed(1)}|${rect.w.toFixed(1)}|${rect.h.toFixed(1)}`;
      if (key !== lastKey) {
        lastKey = key;
        os.style.width = rect.w + 'px'; os.style.height = rect.h + 'px';
        os.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`;
        if (phone) text.style.top = (rect.y + rect.h + 16) + 'px';
      }
    }
    if (!inView) return;
    const now = performance.now();
    if (st.open && st.openT < 1) { st.openT = clamp01((now - openAt) / 1100); dirty = true; }
    // the dotted outline round the apps not yet opened walks, a few steps a second
    if (!st.open && st.seen.size < 3 && !reduced) { const ph = Math.floor(now / 140) % 4; if (ph !== st.phase) { st.phase = ph; dirty = true; } }
    if (user.over && now - user.at < 4000) {
      if (st.cursor.x !== user.x || st.cursor.y !== user.y) { st.cursor.x = user.x; st.cursor.y = user.y; dirty = true; }
      stopDemo(now);
    } else if (!reduced && now - user.at > 2500) runDemo(now);
    // the texture is sent to the graphics card at most 30 times a second
    if (dirty && now - lastDraw > 32) { screen.draw(st); onDirty(); dirty = false; lastDraw = now; }
  }
  return { update, root: os };
}
