// Liquid glass: refraction at the rim (Chromium only, elsewhere a clean frosted glass),
// a highlight that follows the hand, and springs for every change of shape.

export function spring(value, { stiffness = 260, damping = 26 } = {}) {
  let x = value, v = 0, target = value;
  return {
    get value() { return x; }, get velocity() { return v; }, get target() { return target; },
    set(t) { target = t; },
    jump(t) { x = target = t; v = 0; },
    step(dt) {
      // semi-implicit Euler in small slices: stable at any frame rate
      const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
      for (let i = 0; i < n; i++) { v += (-stiffness * (x - target) - damping * v) * h; x += v * h; }
      if (Math.abs(x - target) < 0.02 && Math.abs(v) < 0.02) { x = target; v = 0; }
      return x;
    },
    get resting() { return x === target && v === 0; },
  };
}

const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand)));

// a displacement map for a rounded rectangle: the rim bends what is behind it, the centre stays still
function rimMap(w, h, radius, bevel) {
  const k = 0.5; // half resolution is plenty: the filter stretches it
  const W = Math.max(2, Math.round(w * k)), H = Math.max(2, Math.round(h * k));
  const r = Math.min(radius * k, W / 2, H / 2), b = Math.max(1, bevel * k);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5 - W / 2, py = y + 0.5 - H / 2;
      const qx = Math.abs(px) - (W / 2 - r), qy = Math.abs(py) - (H / 2 - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const sd = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
      const d = -sd;
      let nx = 0, ny = 0, s = 0;
      if (d >= 0 && d < b) {
        const t = 1 - d / b; s = t * t;
        if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = (qx / l) * Math.sign(px); ny = (qy / l) * Math.sign(py); }
        else if (qx > qy) nx = Math.sign(px); else ny = Math.sign(py);
      }
      const i = (y * W + x) * 4;
      img.data[i] = 128 + nx * s * 127; img.data[i + 1] = 128 + ny * s * 127; img.data[i + 2] = 128; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

// a round lens: the middle magnifies evenly, the rim bends harder (like the loupe on the desk)
function lensMap(w, h) {
  const k = 0.5;
  const W = Math.max(2, Math.round(w * k)), H = Math.max(2, Math.round(h * k));
  const R = Math.min(W, H) / 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const vx = (x + 0.5 - W / 2) / R, vy = (y + 0.5 - H / 2) / R;
      const d = Math.hypot(vx, vy);
      let nx = 0, ny = 0;
      if (d < 1) {
        const e = Math.min(1, Math.max(0, (d - 0.72) / 0.28));
        const g = 0.6 + 0.4 * e * e * (3 - 2 * e);
        nx = vx * g; ny = vy * g;
      }
      const i = (y * W + x) * 4;
      img.data[i] = 128 + nx * 127; img.data[i + 1] = 128 + ny * 127; img.data[i + 2] = 128; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function createGlass({ reduced }) {
  const defs = document.getElementById('lg-defs');
  const NS = 'http://www.w3.org/2000/svg';
  const items = new Map();
  let n = 0, lite = false;

  // refraction for one element; call again when its size changes for good
  function refract(el, { radius = 30, bevel = 24, strength = 78, blur = 1.5, shape = 'rim', saturate = 1.9, disperse = 0.07 } = {}) {
    // An SVG filter inside backdrop-filter is run again on every frame that anything behind it changes, and it was the costliest thing on the page (about 12 ms a frame for the menu alone, measured). The rim glass keeps the plain frosted blur and the lit rim; only the lens, which is small and shown for a short time, is refracted.
    if (shape !== 'lens') { el.style.backdropFilter = `blur(${Math.max(blur, 4)}px) saturate(${Math.min(saturate, 1.6)}) brightness(1.04)`; return; }
    if (!chromium || reduced || !defs) return;
    let it = items.get(el);
    if (!it) {
      const id = `lg-f-${n++}`;
      const f = document.createElementNS(NS, 'filter');
      f.setAttribute('id', id); f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', '100%'); f.setAttribute('height', '100%');
      f.setAttribute('color-interpolation-filters', 'sRGB');
      const img = document.createElementNS(NS, 'feImage');
      img.setAttribute('x', '0'); img.setAttribute('y', '0'); img.setAttribute('preserveAspectRatio', 'none'); img.setAttribute('result', 'map');
      // one displacement per colour channel, each a little stronger: the rim splits light like real glass
      const dms = [], mats = [
        '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
        '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
        '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
      ];
      f.append(img);
      // one displacement for the whole rim, not one per colour: three displacement maps plus blends were the single most expensive thing on the page (11 ms a frame for the menu alone). The split of colours is kept only on the big lens, where it can be seen.
      (shape === 'lens' ? mats : mats.slice(0, 1)).forEach((m, i) => {
        const dm = document.createElementNS(NS, 'feDisplacementMap');
        dm.setAttribute('in', 'SourceGraphic'); dm.setAttribute('in2', 'map'); dm.setAttribute('xChannelSelector', 'R'); dm.setAttribute('yChannelSelector', 'G'); dm.setAttribute('result', 'd' + i);
        if (shape !== 'lens') { dms.push(dm); f.append(dm); return; }
        const cm = document.createElementNS(NS, 'feColorMatrix');
        cm.setAttribute('in', 'd' + i); cm.setAttribute('type', 'matrix'); cm.setAttribute('values', m); cm.setAttribute('result', 'c' + i);
        f.append(dm, cm); dms.push(dm);
      });
      if (shape === 'lens') {
        const b1 = document.createElementNS(NS, 'feBlend'); b1.setAttribute('in', 'c0'); b1.setAttribute('in2', 'c1'); b1.setAttribute('mode', 'screen'); b1.setAttribute('result', 'rg');
        const b2 = document.createElementNS(NS, 'feBlend'); b2.setAttribute('in', 'rg'); b2.setAttribute('in2', 'c2'); b2.setAttribute('mode', 'screen');
        f.append(b1, b2);
      }
      defs.append(f);
      it = { id, img, dms, w: 0, h: 0 };
      items.set(el, it);
    }
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w < 4 || h < 4) return;
    if (w !== it.w || h !== it.h) {
      it.w = w; it.h = h;
      it.img.setAttribute('width', w); it.img.setAttribute('height', h);
      it.img.setAttribute('href', shape === 'lens' ? lensMap(w, h) : rimMap(w, h, Math.min(radius, h / 2), bevel));
    }
    it.dms.forEach((dm, i) => dm.setAttribute('scale', String(-strength * (1 + i * disperse))));
    it.css = `url(#${it.id}) blur(${blur}px) saturate(${saturate}) brightness(1.05)`;
    el.style.backdropFilter = lite ? '' : it.css;
  }
  // when the machine cannot keep up: the plain frosted glass of the stylesheet instead of the refraction
  function setLite(v) { lite = v; for (const [el, it] of items) if (it.css) el.style.backdropFilter = v ? '' : it.css; }

  // the light: the bright part of every glass rim turns towards the pointer, smoothly
  const lit = [];
  let px = innerWidth * 0.3, py = -400;
  let awake = performance.now();   // the rims only need to follow while the pointer or the page is moving
  const wake = () => { awake = performance.now(); };
  addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; wake(); }, { passive: true });
  function light(el) { if (!lit.find((l) => l.el === el)) lit.push({ el, a: spring(220, { stiffness: 90, damping: 18 }), init: false }); }
  function frame(dt) {
    if (performance.now() - awake > 1500) return;
    for (const l of lit) {
      const r = l.el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > innerHeight + 50) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let ang = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90; // 0deg = up, like conic-gradient
      // unwrap so the spring never spins the long way round
      const cur = l.a.value;
      while (ang - cur > 180) ang -= 360;
      while (ang - cur < -180) ang += 360;
      if (!l.init) { l.a.jump(ang); l.init = true; } else l.a.set(ang);
      l.a.step(dt);
      // the rim is a masked gradient: repaint it only when the angle really moved
      const deg = Math.round(l.a.value * 2) / 2;
      if (deg !== l.last) { l.last = deg; l.el.style.setProperty('--rim', `${deg}deg`); }
    }
  }

  // magnetic, squashy buttons
  const mags = [...document.querySelectorAll('[data-magnetic]')].map((el) => ({ el, x: spring(0, { stiffness: 240, damping: 18 }), y: spring(0, { stiffness: 240, damping: 18 }), s: spring(1, { stiffness: 420, damping: 22 }) }));
  if (!reduced) {
    addEventListener('pointermove', (e) => {
      for (const m of mags) {
        const r = m.el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const near = Math.abs(dx) < r.width / 2 + 60 && Math.abs(dy) < r.height / 2 + 50;
        m.x.set(near ? dx * 0.16 : 0); m.y.set(near ? dy * 0.22 : 0);
        if (near) { m.el.style.setProperty('--bx', `${e.clientX - r.left}px`); m.el.style.setProperty('--by', `${e.clientY - r.top}px`); }
      }
    }, { passive: true });
    mags.forEach((m) => {
      m.el.addEventListener('pointerdown', () => m.s.set(0.94));
      addEventListener('pointerup', () => m.s.set(1));
      m.el.addEventListener('pointerleave', () => { m.x.set(0); m.y.set(0); m.s.set(1); });
      light(m.el);
    });
  }
  function step(dt) {
    frame(dt);
    for (const m of mags) {
      const x = m.x.step(dt), y = m.y.step(dt), s = m.s.step(dt);
      // a little stretch along the direction of travel: the liquid part
      const sx = s * (1 + Math.min(0.06, Math.abs(m.x.velocity) * 0.0006));
      const sy = s * (1 - Math.min(0.04, Math.abs(m.x.velocity) * 0.0004));
      const tf = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      if (tf !== m.last) { m.last = tf; m.el.style.transform = tf; }
    }
  }
  return { refract, light, step, chromium, setLite };
}
