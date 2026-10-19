import { initNav, initNote, initCheck, initFaq } from './ui.js';
import { createGlass } from './liquid.js';

const phone = matchMedia('(hover: none) and (pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
// ?test = no smooth scroll and no opening (for screenshots); ?test&intro = play the opening
const skipIntro = reduced || (params.has('test') && !params.has('intro'));
let seen = false;
try { seen = sessionStorage.getItem('fluke-seen') === '1'; sessionStorage.setItem('fluke-seen', '1'); } catch { /* private mode */ }

const $ = (s, r = document) => r.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const { gsap } = window;
const loaderEl = $('#loader');
let lenis = null;

let readyAt = 0;   // the quality governor only starts once the opening is over
function release() {
  readyAt = performance.now();
  loaderEl.classList.add('is-gone');
  document.body.classList.remove('is-loading');
  gsap.set('.nav', { clearProps: 'transform' });
  lenis?.start();
}

async function boot() {
  const started = performance.now();

  lenis = (!reduced && !phone && !params.has('test') && window.Lenis) ? new window.Lenis({ lerp: 0.065, smoothWheel: true, wheelMultiplier: 0.8 }) : null;
  if (lenis) {
    lenis.stop();
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, lerp: 0, duration: 2.4, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
    else {
      const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  // the glass and the menu run from the first frame
  const glass = createGlass({ reduced });
  const nav = initNav({ scrollTo, lenis, glass, gsap, reduced });
  initNote({ gsap, lenis, reduced });
  initCheck({ gsap, reduced });
  initFaq({ gsap, reduced });
  let lastUi = performance.now() / 1000;
  gsap.ticker.add(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - lastUi); lastUi = now;
    glass.step(dt); nav.step(dt);
  });

  // ───────── a quality governor: if the frames take too long, the page gives up the costly things, one step at a time ─────────
  {
    let level = 0, ema = 16, bad = 0, t0 = performance.now(), prev = performance.now();
    gsap.ticker.add(() => {
      const now = performance.now(), dt = now - prev; prev = now;
      if (window.__noGov || document.hidden || dt > 250 || !readyAt || now - readyAt < 3500 || !window.__fluke) return;
      ema += (dt - ema) * 0.08;
      bad = ema > 22 ? bad + dt : 0;
      if (bad > 1800 && level < 3) {
        level++; bad = 0; ema = 16;
        const w = window.__fluke.stage.world;
        if (level === 1) w.setPixelCap(1);
        else if (level === 2) { glass.setLite(true); document.documentElement.classList.add('lite'); }
        else w.setPixelCap(0.8);
      }
    });
  }

  // ───────── loader: the counter follows real progress ─────────
  const num = $('#loader-num');
  const shown = { v: 0 };
  let real = 0;
  const setReal = (x, d = 0.7) => {
    real = Math.max(real, x);
    gsap.to(shown, { v: real, duration: d, ease: 'power2.out', overwrite: true, onUpdate: () => { num.textContent = String(Math.round(shown.v * 100)); } });
  };
  let bounce = null;
  if (skipIntro) loaderEl.classList.add('is-gone');
  else bounce = gsap.to('#loader-dot', { y: '-=34', duration: 0.42, ease: 'power2.out', yoyo: true, repeat: -1 });

  setReal(0.08);
  await Promise.race([
    Promise.all([
      document.fonts.load('400 100px Anton'), document.fonts.load('italic 900 50px "Bodoni Moda"'), document.fonts.load('400 30px "Bodoni Moda"'),
      document.fonts.load('400 16px "General Sans"'), document.fonts.load('500 16px "General Sans"'), document.fonts.load('600 16px "General Sans"'),
    ]).catch(() => {}),
    sleep(3000),
  ]);
  nav.measure();
  setReal(0.3);

  if (!webglOK()) { document.documentElement.classList.add('no-webgl'); release(); return; }

  const [{ createStage }, { createDirector }] = await Promise.all([import('./stage.js'), import('./director.js')]);
  setReal(0.55);
  const stage = await createStage({ canvas: $('#stage'), phone, reduced });
  setReal(0.8);
  const director = createDirector({ stage, gsap, lenis, phone, reduced, nav, glass });
  window.__fluke = { stage, director, lenis, glass };

  const onResize = () => { stage.resize(); director.layout(); };
  addEventListener('resize', onResize);
  onResize();
  director.prepare(skipIntro);
  stage.snap();

  // one render loop for the stage
  let last = performance.now() / 1000;
  gsap.ticker.add(() => {
    const now = performance.now() / 1000;
    const dt = now - last; last = now;
    director.update(dt, now);
    stage.frame(dt, now);
  });

  try { await stage.world.renderer.compileAsync(stage.world.scene, stage.world.camera); } catch { /* compiles on first draw */ }

  if (skipIntro) { director.instant(); release(); return; }

  // never faster than the loader deserves (shorter for a second visit)
  const left = Math.max(450, (seen ? 900 : 2100) - (performance.now() - started));
  setReal(1, left / 1000);
  await sleep(left + 150);
  bounce?.kill();
  await director.playIntro(seen ? 1.5 : 1);
  release();
}

boot().catch((err) => {
  // whatever happens, never leave the visitor in front of a loader
  console.error(err);
  release();
});
