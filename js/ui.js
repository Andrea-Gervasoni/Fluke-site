// Navigation (glass bar, panels, phone sheet) and the research-note sheet.

import { spring } from './liquid.js';

export function initNav({ scrollTo, lenis, glass, gsap, reduced }) {
  const shell = document.getElementById('lg-nav');
  const bar = shell.querySelector('.nav-bar');
  const linksBox = shell.querySelector('.nav-links');
  const links = [...shell.querySelectorAll('.nav-link')];
  const goo = shell.querySelector('.nav-goo');
  const [gooA, gooB] = goo.querySelectorAll('i');
  const scrim = document.getElementById('nav-scrim');
  const burger = shell.querySelector('.nav-burger');
  const sheet = document.getElementById('nav-sheet');
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const narrow = () => matchMedia('(max-width: 820px)').matches;

  const W = spring(0, { stiffness: 260, damping: 27 }), H = spring(60, { stiffness: 260, damping: 27 });
  // the droplet: a fast head and a lazy tail, melted together by an SVG filter
  const AX = spring(0, { stiffness: 520, damping: 34 }), AW = spring(0, { stiffness: 520, damping: 34 });
  const BX = spring(0, { stiffness: 150, damping: 17 }), BW = spring(0, { stiffness: 150, damping: 17 });
  const DO = spring(0, { stiffness: 220, damping: 26 });
  const JX = spring(1, { stiffness: 240, damping: 13 });   // the whole capsule wobbles a little when the page moves fast
  let velocity = 0, hiddenNow = false;
  let barW = 0, barH = 60, openId = null, hover = null, current = null, wasResting = true, leaveT = 0, enterT = 0;

  const panelOf = (id) => document.getElementById('panel-' + id);

  function measure() {
    shell.style.width = ''; shell.style.height = ''; bar.style.width = '';
    barH = bar.offsetHeight;
    barW = Math.ceil(bar.scrollWidth);
    if (!narrow()) bar.style.width = barW + 'px';
    W.jump(openId ? W.target : barW); H.jump(openId ? H.target : barH);
    apply();
    glass.refract(shell, { radius: 30 });
  }
  const cache = new WeakMap();
  function apply() {
    if (!narrow()) put(shell, 'width', W.value.toFixed(1) + 'px');
    put(shell, 'height', H.value.toFixed(1) + 'px');
  }

  function panelWidth() { return Math.min(innerWidth - 32, Math.max(barW, 760)); }
  function openPanel(id) {
    if (narrow() || openId === id) return;
    clearTimeout(leaveT);
    if (openId) { const p = panelOf(openId); p.hidden = true; }
    openId = id;
    const p = panelOf(id);
    const tw = panelWidth();
    p.hidden = false; p.style.width = tw + 'px'; p.style.margin = '0 auto';
    W.set(tw); H.set(barH + p.offsetHeight);
    links.forEach((l) => l.setAttribute('aria-expanded', String(l.dataset.panel === id)));
    scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add('is-open'));
    shell.classList.add('is-open'); glass.refract(shell, { radius: 30, blur: 18 });
    if (!reduced) gsap.fromTo(p.querySelectorAll('li'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05, overwrite: true });
  }
  function closePanel() {
    if (!openId) return;
    const p = panelOf(openId);
    openId = null;
    W.set(barW); H.set(barH);
    shell.classList.remove('is-open');
    links.forEach((l) => l.setAttribute('aria-expanded', 'false'));
    scrim.classList.remove('is-open');
    setTimeout(() => { if (!openId) { p.hidden = true; scrim.hidden = true; } }, 420);
  }

  links.forEach((l) => {
    l.addEventListener('click', () => (openId === l.dataset.panel ? closePanel() : openPanel(l.dataset.panel)));
    l.addEventListener('keydown', (e) => {
      const into = e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey && openId === l.dataset.panel);
      if (into) { e.preventDefault(); openPanel(l.dataset.panel); panelOf(l.dataset.panel).querySelector('a')?.focus(); }
    });
    l.addEventListener('focus', () => { hover = l; });
    l.addEventListener('blur', () => { if (hover === l) hover = null; });
    if (canHover) {
      l.addEventListener('mouseenter', () => { hover = l; clearTimeout(enterT); enterT = setTimeout(() => openPanel(l.dataset.panel), openId ? 0 : 110); });
      l.addEventListener('mouseleave', () => { if (hover === l) hover = null; clearTimeout(enterT); });
    }
  });
  if (canHover) {
    shell.addEventListener('mouseleave', () => { leaveT = setTimeout(closePanel, 180); });
    shell.addEventListener('mouseenter', () => clearTimeout(leaveT));
  }
  scrim.addEventListener('pointerdown', closePanel);
  // leaving a panel with Tab goes back to the next link and folds the glass
  shell.querySelectorAll('.panel').forEach((p) => {
    const items = [...p.querySelectorAll('a')];
    items[items.length - 1]?.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || e.shiftKey) return;
      const i = links.findIndex((l) => l.dataset.panel === openId);
      const next = links[i + 1] || shell.querySelector('.nav-cta');
      e.preventDefault(); closePanel(); next?.focus();
    });
  });
  shell.addEventListener('focusout', (e) => { if (openId && !shell.contains(e.relatedTarget)) closePanel(); });
  shell.querySelectorAll('.panel a').forEach((a) => a.addEventListener('click', closePanel));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (openId) { const l = links.find((x) => x.dataset.panel === openId); closePanel(); l?.focus(); }
    if (!sheet.hidden) setSheet(false);
  });
  document.addEventListener('pointerdown', (e) => { if (openId && !shell.contains(e.target)) closePanel(); });

  // phone: the capsule grows into a sheet
  function setSheet(on) {
    burger.setAttribute('aria-expanded', String(on));
    burger.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
    if (on) {
      sheet.hidden = false; shell.classList.add('is-open');
      H.set(barH + sheet.offsetHeight);
      lenis?.stop(); document.body.style.overflow = 'hidden';
      if (!reduced) gsap.fromTo(sheet.querySelectorAll('a'), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.05, delay: 0.08 });
      setTimeout(() => sheet.querySelector('a')?.focus({ preventScroll: true }), 60);
    } else {
      burger.focus({ preventScroll: true });
      H.set(barH); shell.classList.remove('is-open');
      lenis?.start(); document.body.style.overflow = '';
      setTimeout(() => { if (burger.getAttribute('aria-expanded') === 'false') sheet.hidden = true; }, 450);
    }
  }
  burger.addEventListener('click', () => setSheet(burger.getAttribute('aria-expanded') !== 'true'));
  sheet.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setSheet(false)));

  // every in-page anchor goes through one scroller
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-open-note')) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : null;
    if (id === 'top' || el) {
      e.preventDefault();
      scrollTo(id === 'top' ? 0 : el);
      // keep keyboard users where the page went (this is what makes the skip link work)
      const target = id === 'top' ? document.getElementById('main') : el;
      if (target) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
  });

  addEventListener('resize', () => { closePanel(); measure(); });
  measure();
  glass.light(shell);

  function put(el, prop, v) { let c = cache.get(el); if (!c) cache.set(el, (c = {})); if (c[prop] !== v) { c[prop] = v; el.style[prop] = v; } }

  return {
    measure,
    setSection(id) {
      const next = links.find((l) => (l.dataset.spy || '').split(' ').includes(id)) || null;
      if (next === current) return;
      current?.classList.remove('is-current');
      current = next;
      current?.classList.add('is-current');
    },
    setDark(on) { shell.classList.toggle('is-dark', on); },
    setVelocity(v) { velocity = v; },
    setHidden(on) { if (on === hiddenNow) return; hiddenNow = on; gsap.to('.nav', { yPercent: on ? -170 : 0, duration: on ? 0.6 : 0.9, ease: on ? 'power3.in' : 'expo.out', overwrite: true }); },
    step(dt) {
      // the droplet follows the hand, or rests under the current section
      const t = hover || (openId && links.find((l) => l.dataset.panel === openId)) || current;
      if (t && !narrow()) {
        AX.set(t.offsetLeft); AW.set(t.offsetWidth); BX.set(t.offsetLeft); BW.set(t.offsetWidth); DO.set(1);
        if (AW.value === 0) { AX.jump(t.offsetLeft); AW.jump(t.offsetWidth); BX.jump(t.offsetLeft); BW.jump(t.offsetWidth); }
      } else DO.set(0);
      const ax = AX.step(dt), aw = AW.step(dt), bx = BX.step(dt), bw = BW.step(dt), o = DO.step(dt);
      // style writes only when a value really changed: an idle menu costs nothing
      put(gooA, 'transform', `translate3d(${ax.toFixed(2)}px,0,0)`); put(gooA, 'width', `${Math.max(0, aw).toFixed(2)}px`);
      put(gooB, 'transform', `translate3d(${bx.toFixed(2)}px,0,0) scaleY(${(1 - Math.min(0.35, Math.abs(BX.velocity) * 0.0009)).toFixed(3)})`); put(gooB, 'width', `${Math.max(0, bw).toFixed(2)}px`);
      put(goo, 'opacity', (o * (shell.classList.contains('is-dark') ? 0.2 : 0.62)).toFixed(3));
      // jelly: fast scrolling squashes the capsule, it springs back
      JX.set(1 + Math.max(-0.05, Math.min(0.05, velocity * 0.00045)));
      const j = JX.step(dt);
      put(shell, 'transform', `scale(${(2 - j).toFixed(4)}, ${j.toFixed(4)})`);
      W.step(dt); H.step(dt); apply();
      const resting = W.resting && H.resting;
      if (resting && !wasResting) glass.refract(shell, { radius: 30, blur: openId ? 18 : 2.5 });
      wasResting = resting;
    },
  };
}

export function initNote({ gsap, lenis, reduced }) {
  const layer = document.getElementById('note-layer');
  const sheet = document.getElementById('note');
  const scrim = layer.querySelector('.note-scrim');
  let lastFocus = null;

  const open = (trigger) => {
    if (!layer.hidden) return;
    lastFocus = trigger || document.activeElement;
    layer.hidden = false;
    lenis?.stop();
    if (reduced) { sheet.querySelector('.sheet-body').focus({ preventScroll: true }); return; }
    gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' });
    sheet.querySelector('.sheet-body').focus({ preventScroll: true });
    gsap.fromTo(sheet, { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' });
    sheet.querySelector('.sheet-body').scrollTop = 0;
  };
  const close = () => {
    if (layer.hidden) return;
    const done = () => { layer.hidden = true; lenis?.start(); lastFocus?.focus?.({ preventScroll: true }); };
    if (reduced) return done();
    gsap.to(sheet, { opacity: 0, y: 24, scale: 0.98, duration: 0.35, ease: 'power2.in' });
    gsap.to(scrim, { opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: done });
  };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-note]');
    if (t) { e.preventDefault(); open(t); return; }
    if (e.target.closest('[data-close-note]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (layer.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      const f = [...sheet.querySelectorAll('button, a[href]')];
      if (!f.length) { e.preventDefault(); sheet.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  return { open, close };
}

export function initCheck({ gsap, reduced }) {
  const list = document.getElementById('check-list');
  if (!list) return;
  const sw = [...list.querySelectorAll('.switch')];
  const fillEl = document.getElementById('gauge-fill'), needle = document.getElementById('gauge-needle'), verdict = document.getElementById('gauge-verdict');
  const ticks = document.querySelector('.gauge-ticks');
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI - (i / 6) * Math.PI, x1 = 160 + Math.cos(a) * 150, y1 = 170 - Math.sin(a) * 150, x2 = 160 + Math.cos(a) * 162, y2 = 170 - Math.sin(a) * 162;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); ticks.append(l);
  }
  const words = ['Probably a fluke. Ask more questions.', 'Probably a fluke. Ask more questions.', 'Too early to tell.', 'Too early to tell.', 'Getting closer to evidence.', 'Getting closer to evidence.', 'Worth a closer look.'];
  const state = { v: 0 };
  needle.style.transformOrigin = '160px 170px';
  const draw = () => { fillEl.style.strokeDashoffset = String(409 * (1 - state.v / 6)); needle.style.transform = `rotate(${-90 + (state.v / 6) * 180}deg)`; };
  draw();
  const refresh = (soft = false) => {
    const n = sw.filter((x) => x.getAttribute('aria-checked') === 'true').length;
    verdict.textContent = words[n];
    if (reduced) { state.v = n; draw(); } else gsap.to(state, { v: n, duration: soft ? 1.4 : 1.1, ease: 'elastic.out(1, 0.55)', onUpdate: draw, overwrite: true });
  };
  let touched = false;
  sw.forEach((b) => b.addEventListener('click', () => {
    touched = true; demoStop();
    b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true'));
    refresh();
  }));

  // the first time the list comes into view, it shows what it does: two answers on, then off again
  const timers = [];
  const demoStop = () => { timers.forEach(clearTimeout); timers.length = 0; sw.forEach((b) => b.closest('li').classList.remove('is-demo')); };
  const step = (ms, fn) => timers.push(setTimeout(() => { if (!touched) fn(); }, ms));
  const flip = (i, on) => { const b = sw[i]; b.closest('li').classList.toggle('is-demo', on); b.setAttribute('aria-checked', String(on)); refresh(true); };
  if (!reduced) {
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      step(500, () => flip(0, true));
      step(1300, () => flip(3, true));
      step(3400, () => flip(3, false));
      step(4000, () => flip(0, false));
    }, { threshold: 0.6 });
    io.observe(list);
    list.addEventListener('pointerdown', () => { touched = true; demoStop(); }, { once: true });
  }
}

// questions: the answers open and close with their real height, never in one jump
export function initFaq({ gsap, reduced }) {
  document.querySelectorAll('.qa').forEach((d) => {
    const sum = d.querySelector('summary'), body = d.querySelector('.qa-a'), p = body.firstElementChild;
    sum.addEventListener('click', (e) => {
      if (reduced) return;
      e.preventDefault();
      gsap.killTweensOf([body, p]);
      if (d.open && !d.classList.contains('is-closing')) {
        d.classList.add('is-closing');
        gsap.to(p, { opacity: 0, y: -6, duration: 0.25, ease: 'power2.in' });
        gsap.fromTo(body, { height: body.offsetHeight }, { height: 0, duration: 0.55, ease: 'power3.inOut', onComplete: () => { d.open = false; d.classList.remove('is-closing'); gsap.set(body, { clearProps: 'height' }); } });
      } else {
        d.classList.remove('is-closing');
        const from = d.open ? body.offsetHeight : 0;
        d.open = true;
        gsap.fromTo(body, { height: from }, { height: body.scrollHeight, duration: 0.75, ease: 'expo.out', onComplete: () => gsap.set(body, { clearProps: 'height' }) });
        gsap.fromTo(p, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.1, ease: 'power3.out' });
      }
    });
  });
}
