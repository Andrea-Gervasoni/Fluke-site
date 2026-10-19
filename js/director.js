// The director: plays the opening, then turns scroll position into stage state.
import { winnerAt } from './screen-art.js';
import { MAC } from './scenes/mac.js';
import { createInside } from './inside.js';
import { createWhat } from './what.js';
import { createServices } from './services.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);   // zero speed AND zero acceleration at both ends: the camera leaves and arrives like breath
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const bounceOut = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const mix = (a, b, t) => { const o = {}; for (const k of Object.keys(a)) o[k] = typeof a[k] === 'number' ? lerp(a[k], b[k] ?? a[k], t) : a[k]; return o; };

const COLORS = { paper: [229, 225, 213], cobalt: [10, 58, 229], ink: [20, 21, 31] };
const TAN13 = Math.tan((13 * Math.PI) / 180);

export function createDirector({ stage, gsap, lenis, phone, reduced, nav, glass }) {
  const S = stage.state;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const sec = {};
  let vh = stage.world.view.fh || innerHeight, vw = innerWidth, A = vw / vh;
  let keys = [];
  const P = stage.props;
  const rest = { keyboard: P.keyboard.position.clone(), mouse: P.mouse.position.clone(), floppy: P.floppy.position.clone() };
  const draw = { v: 1.2 };
  const cordCounts = P.cords.map((c) => c.geometry.index.count);
  const sc = MAC.screen;
  const screenY = sc.y + 0.05, zLens = stage.ZLENS, zScreen = sc.zFloor + 0.025;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const dom = {
    rail: $('#rail'), caption: $('#winner-caption'), segBtns: $$('.seg-btn'), thumb: $('.seg-thumb'),
    tlines: $$('.tline > *'), methodHead: $('.method-head'), winnerHead: $('.winner-head'), winnerUi: $('.winner-ui'), seg: $('.seg'),
    svcPin: $('#svc-pin'), wipe: $('#wipe'), stageWrap: $('#stage-wrap'),
    fly: $('#fly-dot'), endDot: $('#end-dot'), endLogo: $('#end-logo'), endScroll: $('#end-scroll'), methodTitle: $('.method-head .title'),
  };
  const what = createWhat({ data: stage.data, glass, reduced, phone });
  const goOn = () => {
    const t = sec.method.top;
    if (lenis) lenis.scrollTo(t, { lerp: 0, duration: 2.6, easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2) });
    else window.scrollTo({ top: t, behavior: reduced ? 'auto' : 'smooth' });
  };
  const svc = createServices({ reduced, phone, screen: stage.svcScreen, onDirty: () => { stage.mac.svcDirty(); stage.markDirty(); }, onContinue: goOn });
  const tops = [];
  const cuts = { what: 0, svc: 0, check: 0, faq: 0 };
  const inside = createInside({ canvas: $('#inside'), ui: $('#inside-ui'), data: stage.data, reduced });
  const crt = $('.crt');

  function measure() {
    vh = stage.world.view.fh || innerHeight; vw = innerWidth; A = vw / vh;
    ['top', 'idea', 'winner', 'what', 'services', 'method', 'check', 'notes', 'faq', 'end'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      sec[id] = { el, top: r.top + scrollY, h: r.height };
    });
    const er = dom.endScroll.getBoundingClientRect();
    sec.endScroll = { top: er.top + scrollY, h: er.height };
    // a cut happens while an opaque section covers the whole screen: nothing on the stage can be seen jumping
    const mid = (id) => sec[id].top + Math.max(0, sec[id].h - vh) * 0.5;
    cuts.what = mid('what'); cuts.svc = sec.method.top; cuts.check = mid('check'); cuts.faq = mid('faq');
    tops.length = 0;
    dom.tlines.forEach((el) => { const r = el.parentElement.getBoundingClientRect(); tops.push(r.top + scrollY); });
    placeThumb(true);
  }

  // ───────── camera poses, per viewport shape ─────────
  const portrait = () => A < 0.9;
  const heroCam = () => stage.heroCamera(A);
  // the idea: a macro on the floppy in the drive, 'Trial 17 (the good one)'
  const ideaCam = () => portrait()
    ? { x: 0.9, y: 4.6, z: 3.9, lx: 0.6, ly: 0.75, lz: 1.75, fov: 26, sx: 0, sy: 0.3 }
    : { x: 2.0, y: 1.55, z: 3.9, lx: 0.5, ly: 0.86, lz: 1.6, fov: 26, sx: 0.27, sy: 0 };
  const winnerCam = (close = 0) => {
    const share = portrait() ? 0.9 : 0.56;
    const d = Math.max(3.2, sc.w / share / (2 * TAN13 * A)) - close;
    return portrait()
      ? { x: 0.35, y: 2.25, z: 1.3 + d, lx: 0, ly: 2.05, lz: 1.3, fov: 26, sx: 0, sy: -0.03 }
      : { x: 0.9, y: 2.3, z: 1.3 + d, lx: 0, ly: 2.05, lz: 1.3, fov: 26, sx: 0.25, sy: 0 };
  };
  const methodCam = (lx) => {
    // the printed note is flat: look a little lower so it sits as high as the other two objects
    const flat = clamp01((lx - (stage.METHOD.x0 + stage.METHOD.step)) / stage.METHOD.step);
    return portrait()
      ? { x: lx + 1.6, y: 6.6, z: 24, lx, ly: 0.8 - 0.45 * flat, lz: 0, fov: 26, sx: 0, sy: 0.1 }
      : { x: lx + 1.7, y: 4.4, z: 11.8, lx, ly: 0.7 - 0.4 * flat, lz: 0, fov: 26, sx: 0.28, sy: 0.08 };
  };
  // the services: the computer seen straight on, on the right (above the text on a phone), so the screen is a plain rectangle
  const svcCam = () => {
    const share = portrait() ? 0.86 : 0.37;
    const d = sc.w / (share * 2 * TAN13 * A);
    const sy = portrait() ? (-0.5 + ((phone ? 66 : 74) + 18 + (sc.h / sc.w) * share * vw / 2) / vh) : -0.03;
    return { x: 0, y: screenY, z: zScreen + d, lx: 0, ly: screenY, lz: zScreen, fov: 26, sx: portrait() ? 0 : 0.19, sy };
  };
  const notesCam = () => { const c = heroCam(); return portrait() ? { ...c, z: c.z * 1.3, x: c.x * 1.3, y: c.y * 1.3, sy: 0.56 } : { ...c, z: 13.2, sx: 0.36 }; };
  // the typewriter lives on the far left of the desk
  const typeCam = (push = 0) => { const X = stage.TYPE_X; return portrait()
    ? { x: X + 2.4, y: 5.6, z: 17 - push, lx: X, ly: 1.3, lz: -0.3, fov: 26, sx: 0, sy: 0.3 }
    : { x: X + 3.6, y: 4.3, z: 10.4 - push, lx: X - 0.2, ly: 1.35, lz: -0.3, fov: 26, sx: 0.22, sy: 0.02 }; };
  // at the very end the computer sits high on the right, above the footer, so its last light can fall into the logo
  const endCam = () => { const c = heroCam(); return portrait() ? { ...c, z: c.z * 1.55, x: c.x * 1.55, y: c.y * 1.55, sy: 0.04 } : { ...c, x: 3.6, y: 3.0, z: 17.5, ly: 1.4, sx: 0.25, sy: 0.02 }; };

  // the page can change height (an answer opens): the cuts move with it
  let roT = 0;
  new ResizeObserver(() => { cancelAnimationFrame(roT); roT = requestAnimationFrame(() => { if (sec.top) { measure(); keys = buildKeys(); } }); }).observe(document.body);

  function layout() {
    measure();
    inside.resize();
    what.layout();
    measureLetters();
    if (dom.seg) { glass?.refract(dom.seg, { radius: 27, bevel: 14, strength: 30 }); glass?.light(dom.seg); }
    S.introCam = stage.introCamFor(A);
    keys = buildKeys();
  }

  function buildKeys() {
    const k = [];
    const pin = (id) => (id === 'winner' || id === 'method' || id === 'services' ? vh : 0);
    const at = (id, f, cam) => k.push({ y: sec[id].top + f * Math.max(0, sec[id].h - pin(id)), cam });
    const cut = (y, a, b) => { k.push({ y, cam: a }, { y, cam: b }); };
    const h = heroCam(), M = stage.METHOD;
    at('top', 0, h); at('top', 0.3, h);
    at('idea', 0.1, ideaCam());
    at('idea', 0.6, ideaCam());
    at('winner', 0, ideaCam());
    at('winner', 0.1, stage.introCamFor(A));
    at('winner', 0.9, stage.introCamFor(A));
    at('winner', 1, winnerCam(0.5));
    // behind the opaque sections the camera cuts to the next place
    cut(cuts.what, winnerCam(0.5), svcCam());
    at('services', 0, svcCam()); at('services', 1, svcCam());
    cut(cuts.svc, svcCam(), methodCam(M.x0));
    cut(cuts.check, methodCam(M.x0 + M.step * 2), typeCam());
    at('notes', 0, typeCam());
    k.push({ y: sec.notes.top + Math.max(0, sec.notes.h - vh), cam: typeCam(1.2) });
    cut(cuts.faq, typeCam(1.2), endCam());
    at('end', 1, endCam());
    return k;
  }

  function sample(y) {
    if (!keys.length) return null;
    if (y <= keys[0].y) return keys[0].cam;
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (y >= a.y && y <= b.y) return mix(a.cam, b.cam, smoother(clamp01((y - a.y) / Math.max(1, b.y - a.y))));
    }
    return keys[keys.length - 1].cam;
  }

  // the page colour only changes while an opaque section hides the change
  function bodyColor(y) {
    if (y < cuts.svc) return COLORS.paper;
    if (y < cuts.check) return COLORS.cobalt;
    if (y < cuts.faq) return COLORS.paper;
    return COLORS.ink;
  }
  // what is right under the menu
  function underNav(y) {
    const p = y + 40;
    const inside = (id) => sec[id] && p >= sec[id].top && p < sec[id].top + sec[id].h;
    if (inside('check') || inside('end')) return true;
    if (inside('what') || inside('faq') || inside('notes') || inside('top') || inside('idea')) return false;
    if (inside('method')) return true;
    return y >= cuts.faq;
  }

  // ───────── segmented control ─────────
  let reveal = 0;
  function placeThumb(instant) {
    const b = dom.segBtns[reveal];
    if (!b || !dom.thumb) return;
    dom.thumb.style.width = b.offsetWidth + 'px';
    dom.thumb.style.transform = `translateX(${b.offsetLeft}px)`;
    if (instant) { dom.thumb.style.transition = 'none'; void dom.thumb.offsetWidth; dom.thumb.style.transition = ''; }
  }
  function setReveal(v) {
    if (v === reveal) return;
    reveal = v;
    dom.segBtns.forEach((b, i) => { b.classList.toggle('is-on', i === v); b.setAttribute('aria-pressed', String(i === v)); });
    placeThumb(false);
    if (dom.caption) dom.caption.textContent = v ? 'Same selected result. Different context.' : 'A compelling curve. But how many attempts came before it?';
  }
  dom.segBtns.forEach((b, i) => b.addEventListener('click', () => {
    const w = sec.winner; if (!w) return;
    const target = w.top + (i ? 0.93 : 0.04) * (w.h - vh);
    if (lenis) lenis.scrollTo(target, { lerp: 0, duration: 2.6, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
    else window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
  }));

  // ───────── per-frame ─────────
  let lastBg = '', lastRail = '';
  // the loupe is held so that, from the camera, the lens sits right over the fine print
  function notePose(rz = 0.5) {
    const N = stage.METHOD.x0 + stage.METHOD.step * 2;
    const cam = methodCam(N);
    const k = 0.9;                                  // the note is drawn at 0.9 scale
    const P = { x: N - 0.3 * k, y: 0.1, z: 0.1 + 1.0 * k };
    const h = 0.7, s = (h - cam.y) / (P.y - cam.y);
    return { x: cam.x + (P.x - cam.x) * s, y: h, z: cam.z + (P.z - cam.z) * s, rz, rx: -0.5, scale: 1, reveal: 0 };
  }
  const awayPose = { x: 5.6, y: 6.2, z: 4.4, rz: 0.9, rx: 0, scale: 1.1, reveal: 0 };
  // out of the picture, above the camera's line of sight: the loupe always leaves upwards
  const awayFrom = (c) => ({ x: lerp(c.lx, c.x, 0.4) + 1.2, y: c.y + 3.8, z: lerp(c.lz, c.z, 0.4), rz: 0.9, rx: 0, scale: 1.1, reveal: 0 });
  const lerpPose = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), rz: lerp(a.rz ?? 0.55, b.rz ?? 0.55, t), rx: lerp(a.rx ?? 0, b.rx ?? 0, t), scale: lerp(a.scale ?? 1, b.scale ?? 1, t), reveal: lerp(a.reveal ?? 0, b.reveal ?? 0, t) });

  let lastY = -1, wipeOn = false, moving = false, moveT = 0;
  function update(dt = 1 / 60) {
    const y = scrollY;
    nav?.setVelocity((y - lastY) / Math.max(dt, 1 / 240));
    // crossing a cut: the camera and the loupe jump with it (the screen is covered)
    if (lastY >= 0) for (const c of [cuts.what, cuts.svc, cuts.check, cuts.faq]) if ((lastY < c) !== (y < c)) S.snapCam = true;
    // the page is moving: the big glass panes go light until it stops
    if (Math.abs(y - lastY) > 0.4) { moveT = performance.now(); if (!moving) { moving = true; document.documentElement.classList.add('is-moving'); } }
    else if (moving && performance.now() - moveT > 220) { moving = false; document.documentElement.classList.remove('is-moving'); }
    lastY = y;
    const cam = sample(y);
    if (cam) Object.assign(S.cam, cam);

    const w = sec.winner, m = sec.method, n = sec.notes, M = stage.METHOD;
    S.lensMode = 'pointer'; S.loupeFree = null; S.lensOverride = null; S.noteLens = false;
    const prevShift = S.syRaw || 0;
    S.lensScroll.grow = 0; S.power = S.introMix > 0 ? S.power : 1; S.dot = 0; S.syRaw = 0;

    // titles: lines rise as they come up the screen
    dom.tlines.forEach((el, i) => {
      const p = clamp01((vh * 0.92 - (tops[i] - y)) / (vh * 0.3));
      el.style.transform = `translate3d(0, ${(1 - smooth(p)) * 112}%, 0)`;
    });

    // the idea is a macro on the floppy: the loupe steps out of the frame
    if (y > sec.idea.top - vh * 0.6) S.loupeFree = { ...awayPose };

    // winner: inside the computer
    const pw = clamp01((y - w.top) / (w.h - vh));
    const winnerEnd = w.top + w.h - vh;
    const insideA = y >= w.top - 1 && y <= w.top + w.h ? smooth((pw - 0.08) / 0.05) * (1 - smooth((pw - 0.93) / 0.05)) : 0;
    $('#inside').style.opacity = insideA.toFixed(3); crt.style.opacity = insideA.toFixed(3);
    // nothing of the 3D stage can be seen while an opaque section fills the screen, or the desktop of the computer is full screen: do not draw it
    const covered = ['what', 'check', 'faq'].some((id) => y >= sec[id].top + 2 && y + vh <= sec[id].top + sec[id].h - 2);
    S.skipRender = insideA >= 0.999 || covered;
    if (insideA > 0) inside.render(pw, 1 / 60);
    if (pw > 0.9 || y > winnerEnd) { S.lensMode = 'off'; S.lensOverride = { u: 0.5, v: 0.5, r: 1.25 }; }
    if (y >= cuts.what && y < cuts.svc) S.loupeFree = awayFrom(S.cam);
    nav?.setHidden(insideA > 0.6);

    // the services: the computer comes up with the section, holds while it is pinned, and leaves with it
    const sv = sec.services;
    stage.mac.setSvc(y >= cuts.what && y < cuts.svc ? 1 : 0);
    if (svc && y >= cuts.what && y < cuts.svc) {
      const pinTop = dom.svcPin.getBoundingClientRect().top;
      S.syRaw = pinTop / vh;
      // the view slides with the page: the loupe waits higher, so it never slides into the picture
      if (S.loupeFree) S.loupeFree.y += Math.abs(S.syRaw) * 9;
      // the glass on screen, measured without the shift of the last frame: the frame it sits in moves with the page
      const r = stage.screenRect();
      svc.update({ rect: r && { ...r, y: r.y - prevShift * vh }, top: sv.top - y, vh });
    }
    // the blue of the method rises with its section, under the stage; the computer is cut along the same edge
    const edge = m.top - y;
    const wiping = y < cuts.svc && edge < vh;
    if (wiping !== wipeOn) { dom.wipe.classList.toggle('is-on', wiping); wipeOn = wiping; if (!wiping) dom.stageWrap.style.clipPath = ''; }
    if (wiping) {
      dom.wipe.style.transform = `translate3d(0, ${edge.toFixed(1)}px, 0)`;
      dom.stageWrap.style.clipPath = `inset(0 0 ${Math.max(0, vh - edge).toFixed(1)}px 0)`;
    }

    // what fluke does
    what.update(y, vh);

    // method: three objects on a rail, each one holds still for a while
    const inMethod = y >= cuts.svc && y < cuts.check;
    const pq = clamp01((y - m.top) / (m.h - vh));
    const t2 = pq * 2, i0 = Math.min(1, Math.floor(t2)), f = t2 - i0;
    const eIdx = pq >= 1 ? 2 : i0 + easeIO(clamp01((f - 0.5) / 0.4));
    if (inMethod) {
      Object.assign(S.cam, methodCam(M.x0 + eIdx * M.step));
      S.loupeFree = awayFrom(S.cam);
      // the loupe comes down onto the printed note, and goes back up the same way
      const a = smooth(clamp01((pq - 0.8) / 0.15));
      if (a > 0) S.loupeFree = lerpPose(S.loupeFree, notePose(), a);
      S.noteLens = a > 0.97;
      // the objects come up from below the blue, after the cut, as if they were on the page
      S.syRaw = 1 - smooth(clamp01((y - m.top) / (vh * 0.6)));
      if (a <= 0) S.loupeFree.y += S.syRaw * 9;
    }
    S.method.slide = 0.2 + pq * 1.25;
    // the card file: one card per attempt stands up to be read, then falls forward; it stops on the one that was kept
    const tf = clamp01((pq - 0.1) / 0.15);
    const raw = tf < 0.55 ? (tf / 0.55) * 16 : tf < 0.75 ? 16 : 16 + ((tf - 0.75) / 0.25) * 7;
    const whole = Math.floor(raw), part = raw - whole;
    S.method.flip = whole + smooth(smooth(part));
    S.methodVisible = inMethod;
    S.deskVisible = y < cuts.svc || y >= cuts.faq;
    S.typeVisible = y >= cuts.check && y < cuts.faq;
    S.typeProgress = clamp01((y - (n.top - vh * 0.75)) / Math.max(1, n.h - vh * 0.6));
    if (S.typeVisible) S.loupeFree = awayFrom(S.cam);
    const rs = `translate3d(${(-eIdx * vw).toFixed(1)}px,0,0)`;
    if (rs !== lastRail) { dom.rail.style.transform = rs; lastRail = rs; }
    // the title of the method arrives with the blue and leaves before the rail moves
    const headA = clamp01((y - (m.top - vh * 0.36)) / (vh * 0.2)) * (1 - smooth(clamp01((pq - 0.2) / 0.06)));
    dom.methodHead.style.opacity = headA.toFixed(3);

    // end: the lamp goes out, then the tube, and its last light travels into the logo
    endScene(y);

    const col = bodyColor(y);
    const css = `rgb(${col[0]},${col[1]},${col[2]})`;
    // the page, and the strip Safari tints under its bars, always wear the colour of the section
    if (css !== lastBg) { document.body.style.backgroundColor = css; document.documentElement.style.backgroundColor = css; themeMeta?.setAttribute('content', css); lastBg = css; }
    nav?.setDark(underNav(y));
    const lum = (0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2]) / 255;
    stage.world.floor.material.opacity = lerp(0.09, 0.2, clamp01((lum - 0.1) / 0.25));

    // which section is the reader in (the menu droplet rests there)
    let here = 'top';
    for (const id of ['idea', 'winner', 'what', 'services', 'method', 'check', 'notes', 'faq', 'end']) if (sec[id] && y + vh * 0.45 >= sec[id].top) here = id;
    nav?.setSection(here);

    liftLetters();
    atmosphere(y);
  }

  // ───────── the ending ─────────
  let flyOn = false, landed = null;
  function endScene(y) {
    const es = sec.endScroll;
    const pe = clamp01((y - es.top) / Math.max(1, es.h - vh));
    const atEnd = y >= cuts.faq;
    stage.lamp?.setOn(atEnd ? 1 - smooth(clamp01((pe - 0.04) / 0.14)) : 1);
    if (!atEnd) { hideFly(); setLogo(0); setLanded(false); return; }
    S.loupeFree = awayFrom(S.cam); S.lensMode = 'off'; S.lensOverride = null;
    S.power = 1 - smooth(clamp01((pe - 0.2) / 0.2));
    // the last light shrinks to a dot on the glass, then leaves it
    S.dot = pe < 0.46 ? smooth(clamp01((pe - 0.34) / 0.08)) : 0;
    // once the sequence is over, the computer leaves with the page
    S.syRaw = -Math.max(0, y - (es.top + es.h - vh)) / vh;
    if (S.syRaw < -0.85) S.deskVisible = false;
    setLogo(smooth(clamp01((pe - 0.44) / 0.3)));
    const r = clamp01((pe - 0.46) / 0.34);
    if (r <= 0) { hideFly(); setLanded(false); return; }
    if (r >= 1) { hideFly(); setLanded(true); return; }
    setLanded(false);
    const s0 = stage.projectScreen();
    const er = dom.endDot.getBoundingClientRect();
    const ex = er.left + er.width / 2, ey = er.top + er.height / 2;
    // a hop: up and out of the screen, an arc, a landing with a little squash
    const u = easeIO(r);
    const cx = lerp(s0.x, ex, 0.5), cy = Math.min(s0.y, ey) - vh * 0.22;
    const bx = (1 - u) * (1 - u) * s0.x + 2 * (1 - u) * u * cx + u * u * ex;
    const by = (1 - u) * (1 - u) * s0.y + 2 * (1 - u) * u * cy + u * u * ey;
    const size = lerp(14, er.width, smooth(r)) / 40;
    const land = r > 0.86 ? Math.sin(Math.PI * (r - 0.86) / 0.14) : 0;
    dom.fly.style.opacity = '1'; flyOn = true;
    dom.fly.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0) scale(${(size * (1 + land * 0.22)).toFixed(3)}, ${(size * (1 - land * 0.22)).toFixed(3)})`;
  }
  function hideFly() { if (flyOn) { dom.fly.style.opacity = '0'; flyOn = false; } }
  let logoV = -1;
  function setLogo(v) {
    if (Math.abs(v - logoV) < 0.001) return; logoV = v;
    dom.endLogo.style.clipPath = `inset(0 ${((1 - v) * 100).toFixed(2)}% 0 0)`;
    dom.endLogo.style.transform = `translate3d(${((1 - v) * -3).toFixed(2)}%, 0, 0)`;
  }
  function setLanded(v) {
    if (v === landed) return; landed = v;
    dom.endDot.style.opacity = v ? '1' : '0';
    dom.endDot.classList.toggle('is-landed', v);
  }

  // ───────── light on the paper ─────────
  const blinds = $('#blinds'), glow = $('#lamp-glow');
  let blindsT = 0;
  function atmosphere(y) {
    blindsT += 1 / 60;
    const inPaper = (id, a = 0, b = 1) => sec[id] && y >= sec[id].top - vh * a && y <= sec[id].top + sec[id].h - vh * b;
    const strong = y < sec.winner.top - vh * 0.2 ? 1 : 0;
    // the opaque sections carry no light: it fades before one of them arrives, so no edge shows
    const soft = inPaper('notes', 0.3, 1.45) ? 0.6 : 0;
    const target = reduced ? Math.max(strong, soft) * 0.8 : Math.max(strong, soft);
    const cur = +(blinds.style.opacity || 0);
    // on the dark sections the light from the window goes at once
    blinds.style.opacity = (cur + (target * 0.55 - cur) * (y >= cuts.faq || (y >= cuts.svc && y < cuts.check) ? 0.25 : 0.06)).toFixed(3);
    const drift = reduced ? 0 : Math.sin(blindsT * 0.18) * 30;
    blinds.style.transform = `translate3d(${(drift - y * 0.04).toFixed(1)}px, ${(-y * 0.12 % 150).toFixed(1)}px, 0)`;
    // the warm pool under the lamp follows the lamp on screen
    if (S.deskVisible !== false && stage.lamp) {
      const L = stage.lamp.group.position;
      const p = stage.projectPoint(L.x, 0, L.z + 0.2);
      glow.style.transform = `translate3d(${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px, 0)`;
      glow.style.opacity = String(stage.lamp.light.intensity / 3.2 * (y < sec.winner.top ? 1 : 0.6));
    } else glow.style.opacity = '0';
  }

  // ───────── the giant letters notice the hand ─────────
  const letters = [];
  let hx = -9999, hy = -9999;
  addEventListener('pointermove', (ev) => { hx = ev.clientX; hy = ev.clientY; }, { passive: true });
  function measureLetters() {
    letters.forEach((l) => { const r = l.el.getBoundingClientRect(); l.cx = r.left + r.width / 2; l.cy = r.top + r.height / 2 + scrollY; });
  }
  function liftLetters() {
    if (reduced || !letters.length || scrollY > vh) return;
    for (const l of letters) {
      const d = Math.hypot(hx - l.cx, hy - (l.cy - scrollY));
      const t = Math.pow(Math.max(0, 1 - d / 300), 2);
      l.v += (t - l.v) * 0.12;
      if (Math.abs(l.v - l.last) > 0.001) {
        l.el.style.translate = `0 ${(-l.v * 7).toFixed(2)}%`;
        l.el.style.scale = `1 ${(1 + l.v * 0.07).toFixed(4)}`;
        l.last = l.v;
      }
    }
  }

  // ───────── entrances that fire once ─────────
  function initEntrances() {
    if (reduced) return;
    const once = (sel, fn, th = 0.3, margin = '0px') => {
      const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { fn(en.target); io.unobserve(en.target); } }), { threshold: th, rootMargin: margin });
      $$(sel).forEach((el) => io.observe(el));
    };
    gsap.set('.giant--notes > *', { opacity: 0, yPercent: 40 });
    gsap.set('.notes-body > *', { opacity: 0, y: 28 });
    gsap.set('.giant--end > *', { opacity: 0, scaleY: 0.2, transformOrigin: '50% 100%' });
    gsap.set('.end-top .btn-wrap', { opacity: 0, y: 24 });
    gsap.set('.pane', { opacity: 0, y: 70, rotateX: -8, transformPerspective: 1200, transformOrigin: '50% 0%' });
    gsap.set('.qa', { opacity: 0, y: 26 });
    gsap.set('.foot-brand, .foot-cols > div, .foot-bar', { opacity: 0, y: 26 });
    once('.glassboard', () => gsap.to('.pane', { opacity: 1, y: 0, rotateX: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 }), 0.12);
    once('.faq-list', () => gsap.to('.qa', { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }), 0.15);
    once('.giant--notes', () => { gsap.to('.giant--notes > *', { opacity: 1, yPercent: 0, duration: 0.5, ease: 'steps(6)', stagger: 0.14 }); gsap.to('.notes-body > *', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.7 }); }, 0.2);
    once('.giant--end', () => { gsap.to('.giant--end > *', { opacity: 1, scaleY: 1, duration: 0.55, ease: 'steps(6)', stagger: 0.14 }); gsap.to('.end-top .btn-wrap', { opacity: 1, y: 0, duration: 1, ease: 'expo.out', delay: 0.5 }); }, 0.1);
    once('.foot', () => gsap.to('.foot-brand, .foot-cols > div, .foot-bar', { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }), 0.1);
  }

  // ───────── split the words that animate ─────────
  function splitLetters(el) {
    const t = el.textContent; el.textContent = '';
    for (const ch of t) { const sp = document.createElement('span'); sp.className = 'ch'; sp.textContent = ch; el.append(sp); letters.push({ el: sp, v: 0, last: 0, cx: 0, cy: 0 }); }
  }
  function splitWords(el) {
    const t = el.textContent.trim(); el.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = t; el.append(sr);
    t.split(/\s+/).forEach((w, i, arr) => {
      const o = document.createElement('span'); o.className = 'split-w'; o.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span'); inner.textContent = w; o.append(inner); el.append(o);
      if (i < arr.length - 1) el.append(' ');
    });
  }
  $$('.giant--1 .word, .giant--2 .word').forEach(splitLetters);
  $$('[data-split]').forEach(splitWords);

  // ───────── hidden states before the opening ─────────
  const HERO_CH = '.giant--1 .ch, .giant--2 .ch';
  function prepare(skip) {
    gsap.set(HERO_CH, { yPercent: 118 });
    gsap.set('.acc', { clipPath: 'inset(-30% 100% -30% -10%)', x: -18 });
    gsap.set('.lede--hero .split-w > span', { yPercent: 115 });
    gsap.set('.hero-copy .btn-wrap', { opacity: 0, scale: 0.7, transformOrigin: '0% 50%' });
    gsap.set('.nav', { yPercent: -160 });
    initEntrances();
    if (skip) return;
    S.introMix = 1;
    S.introCam = stage.introCamFor(A);
    S.power = 1;
    draw.v = 0; stage.mac.setDraw(0);
    P.keyboard.position.y = rest.keyboard.y + 7; P.keyboard.rotation.x = 0.5;
    P.mouse.position.y = rest.mouse.y + 8; P.mouse.rotation.z = 0.4;
    P.floppy.position.z = rest.floppy.z + 1.5; P.floppy.position.y = rest.floppy.y + 0.9;
    stage.loupeOffset.set(3.4, 4.6, 2.6);
    P.cords.forEach((c) => c.geometry.setDrawRange(0, 0));
  }

  function showHero() {
    gsap.set(HERO_CH, { yPercent: 0 });
    gsap.set('.acc', { clipPath: 'inset(-30% -10% -30% -10%)', x: 0 });
    gsap.set('.lede--hero .split-w > span', { yPercent: 0 });
    gsap.set('.hero-copy .btn-wrap', { opacity: 1, scale: 1 });
    gsap.set('.nav', { yPercent: 0 });
  }

  function instant() {
    S.introMix = 0; S.power = 1; draw.v = 1.2; stage.mac.setDraw(1.2);
    Object.assign(P.keyboard.position, rest.keyboard); P.keyboard.rotation.x = 0;
    Object.assign(P.mouse.position, rest.mouse); P.mouse.rotation.z = 0;
    Object.assign(P.floppy.position, rest.floppy);
    stage.loupeOffset.set(0, 0, 0);
    P.cords.forEach((c, i) => c.geometry.setDrawRange(0, cordCounts[i]));
    showHero();
    setTimeout(measureLetters, 50);
  }

  // ───────── the opening ─────────
  function playIntro(speed = 1) {
    return new Promise((resolve) => {
      const halfTop = $('.loader-half--top'), halfBottom = $('.loader-half--bottom');
      const dot = $('#loader-dot'), line = $('#loader-line');
      const letters = $('.loader-letters i'), count = $('.loader-count');

      const dr = dot.getBoundingClientRect();
      const dx = innerWidth / 2 - (dr.left + dr.width / 2);
      const dy = innerHeight / 2 - (dr.top + dr.height / 2);
      gsap.set(dot, { y: 0 });

      const drop = (obj, y1, at, tl) => {
        tl.to(obj.position, { y: y1, duration: 0.62, ease: 'power3.in' }, at)
          .to(obj.position, { y: y1 + 0.07, duration: 0.09, ease: 'power2.out' }, at + 0.62)
          .to(obj.position, { y: y1, duration: 0.11, ease: 'power2.in' }, at + 0.71);
      };

      const tl = gsap.timeline({ onComplete: () => { cleanup(); resolve(); } });
      tl.to(count, { yPercent: 115, duration: 0.5, ease: 'power3.in' }, 0)
        .to(letters, { yPercent: -118, duration: 0.55, ease: 'power3.in' }, 0.05)
        .to(dot, { x: dx, y: dy, duration: 0.75, ease: 'power3.inOut' }, 0.3)
        .set(dot, { opacity: 0 }, 1.05)
        .set(line, { opacity: 1, scaleX: 0.01 }, 1.05)
        .to(line, { scaleX: 1, duration: 0.5, ease: 'expo.out' }, 1.05)
        .to(halfTop, { yPercent: -100, duration: 1.1, ease: 'power4.inOut' }, 1.5)
        .to(halfBottom, { yPercent: 100, duration: 1.1, ease: 'power4.inOut' }, 1.5)
        .to(line, { opacity: 0, duration: 0.3 }, 1.65)
        .to(draw, { v: 1.2, duration: 1.6, ease: 'power1.inOut', onUpdate: () => stage.mac.setDraw(draw.v) }, 2.0)
        .to(S, { introMix: 0, duration: 2.3, ease: 'power3.inOut' }, 2.9);

      // they land once the camera has pulled far enough back, never in front of the lens
      drop(P.keyboard, rest.keyboard.y, 3.85, tl);
      tl.to(P.keyboard.rotation, { x: 0, duration: 0.62, ease: 'power3.in' }, 3.85);
      drop(P.mouse, rest.mouse.y, 4.05, tl);
      tl.to(P.mouse.rotation, { z: 0, duration: 0.62, ease: 'power3.in' }, 4.05);
      P.cords.forEach((c, i) => {
        const o = { n: 0 };
        tl.to(o, { n: cordCounts[i], duration: 0.7, ease: 'power2.out', onUpdate: () => c.geometry.setDrawRange(0, Math.floor(o.n / 3) * 3) }, 4.1 + i * 0.12);
      });
      tl.to(P.floppy.position, { z: rest.floppy.z, y: rest.floppy.y, duration: 0.7, ease: 'power3.out' }, 3.95)
        .to(stage.loupeOffset, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'expo.out' }, 3.85)
        .to('.giant--1 .ch', { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.05 }, 4.0)
        .to('.giant--2 .ch', { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.05 }, 4.18)
        .to('.acc', { clipPath: 'inset(-30% -10% -30% -10%)', x: 0, duration: 1.0, ease: 'power3.inOut', stagger: 0.22 }, 4.55)
        .to('.lede--hero .split-w > span', { yPercent: 0, duration: 1.0, ease: 'expo.out', stagger: 0.022 }, 4.75)
        .to('.hero-copy .btn-wrap', { opacity: 1, scale: 1, duration: 1.3, ease: 'elastic.out(1, 0.6)' }, 5.05)
        .to('.nav', { yPercent: 0, duration: 1.2, ease: 'expo.out' }, 5.0)
        .call(measureLetters);

      tl.timeScale(speed);
      const skip = () => { tl.timeScale(5); };
      addEventListener('pointerdown', skip, { once: true });
      addEventListener('keydown', skip, { once: true });
      function cleanup() { removeEventListener('pointerdown', skip); removeEventListener('keydown', skip); }
      api.introTl = tl;
    });
  }

  const api = { layout, update, prepare, instant, playIntro, sec, cuts, introTl: null };
  return api;
}
