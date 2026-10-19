// The stage: composes the desk and runs the loupe. The director (scroll) only writes `state`.
import * as THREE from 'three';
import { createWorld } from './world.js';
import { makeTrials } from './data.js';
import { makeScreenCanvases } from './screen-art.js';
import { createSvcScreen } from './svc-screen.js';
import { createMac, MAC } from './scenes/mac.js';
import { createMaterials, createKeyboard, createMouse, createCord, createFloppy } from './scenes/props.js';
import { createLoupe, LOUPE_R } from './scenes/loupe.js';
import { createCardFile, createSlideRule, createNote } from './scenes/method-objects.js';
import { createTypewriter } from './scenes/typewriter.js';
import { createLamp } from './scenes/lamp.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function createStage({ canvas, phone, reduced }) {
  const world = createWorld(canvas, { phone });
  const { scene, camera } = world;
  const data = makeTrials();
  const canvases = makeScreenCanvases(data);
  const svcScreen = createSvcScreen();
  canvases.s = svcScreen.canvas;

  const loader = new THREE.TextureLoader();
  const logoTexture = await loader.loadAsync('assets/logo-trim.png');
  logoTexture.colorSpace = THREE.SRGBColorSpace;
  logoTexture.anisotropy = 8;

  const M = createMaterials();
  const mac = createMac({ canvases, logoTexture, aniso: phone ? 4 : 8, grain: M.grain });
  const keyboard = createKeyboard(M);
  const mouse = createMouse(M);
  const floppy = createFloppy(M);
  const loupe = createLoupe(M);
  const cardFile = createCardFile(M, data, phone ? 4 : 8);
  const slideRule = createSlideRule(M, phone ? 4 : 8);
  const note = createNote(M, data, phone ? 4 : 8);
  const METHOD = { x0: 10, step: 11 };
  cardFile.group.position.set(METHOD.x0 + 0.2, 0, 0); cardFile.group.rotation.y = -0.3; cardFile.group.scale.setScalar(1.15);
  slideRule.group.position.set(METHOD.x0 + METHOD.step, 0, 0.3); slideRule.group.rotation.y = -0.4; slideRule.group.scale.setScalar(1.3);
  note.group.position.set(METHOD.x0 + METHOD.step * 2, 0, 0.1); note.group.rotation.y = 0.12; note.group.scale.setScalar(0.9);
  const methodObjs = [cardFile.group, slideRule.group, note.group];
  const TYPE_X = -14;
  const typewriter = createTypewriter(M, { aniso: phone ? 4 : 8 });
  typewriter.group.position.set(TYPE_X, 0, 0); typewriter.group.rotation.y = 0.32;
  scene.add(typewriter.group);
  scene.add(...methodObjs);
  loupe.group.add(note.disc);

  const desk = new THREE.Group();
  mac.group.position.set(0, 0, 0);
  keyboard.group.position.set(0.12, 0, 2.78); keyboard.group.rotation.y = -0.03;
  mouse.group.position.set(2.16, 0, 2.62); mouse.group.rotation.y = -0.16;
  floppy.group.position.set(0.62, 0.74, 1.47); floppy.group.scale.setScalar(0.86);
  const cordKb = createCord(M, [[-0.95, 0.07, 2.12], [-1.35, 0.03, 1.95], [-1.5, 0.03, 1.7], [-1.1, 0.03, 1.5], [-0.7, 0.05, 1.42], [-0.55, 0.12, 1.36]]);
  const cordMs = createCord(M, [[2.12, 0.08, 2.12], [2.4, 0.03, 1.85], [2.15, 0.03, 1.58], [1.7, 0.03, 1.48], [1.25, 0.05, 1.42], [1.0, 0.12, 1.36]]);
  const lamp = createLamp(M);
  lamp.group.position.set(2.1, 0, -1.45); lamp.group.rotation.y = -0.5;
  desk.add(mac.group, keyboard.group, mouse.group, floppy.group, cordKb, cordMs, lamp.group);
  scene.add(desk, loupe.group);

  // ───────── state written by the director, smoothed here ─────────
  const state = {
    cam: { x: 3.4, y: 2.7, z: 11.6, lx: 0.2, ly: 1.5, lz: 0.2, fov: 26, sx: 0.268, sy: 0 },
    power: 1,
    lensMode: 'pointer',   // 'pointer' | 'scroll' | 'off'
    lensScroll: { u: 0.5, v: 0.5, lift: 0.5, grow: 0 },
    loupeFree: null,       // when set, the director places the loupe directly {x,y,z,rz,scale}
    introCam: { x: 0, y: 2.1, z: 5.2, lx: 0, ly: 2.08, lz: 1.3, fov: 26, sx: 0, sy: 0 },
    introMix: 0,           // 1 = close-up on the glass, 0 = scroll-driven camera
    lensOverride: null,    // {u, v, r}: reveal circle independent of the loupe
    noteLens: false,       // the loupe is reading the printed note
    dot: 0,                // afterglow of the tube switching off
    method: { wheel: 0, slide: 0 },
  };
  const cur = JSON.parse(JSON.stringify(state.cam));
  const tgt = JSON.parse(JSON.stringify(state.cam));
  const loupeOffset = new THREE.Vector3();

  // ───────── pointer ─────────
  const pointer = { x: 0, y: 0, active: false, last: -1, moved: false };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    pointer.active = true; pointer.last = performance.now(); pointer.moved = true;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });

  const stage = { lens: { u: 0.5, v: 0.5, r: 0.3 }, ZLENS: MAC.screen.zFloor + 0.78 };
  const box = new THREE.Box3(), v3 = new THREE.Vector3();
  // ───────── loupe controller ─────────
  const L = { pos: new THREE.Vector3(1.2, 1.5, 2.0), vel: new THREE.Vector3(), tiltX: 0, tiltY: 0, rx: 0, rz: 0.55, scale: 1, follow: 0 };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), ray = new THREE.Raycaster();
  const sc = MAC.screen;
  const zLens = sc.zFloor + 0.78;   // always in front of the floppy and the chin
  const screenY = sc.y + 0.05;
  const screenZ = sc.zFloor + 0.025;
  const restPos = new THREE.Vector3(0.62, screenY - 0.2, zLens);
  const lensPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -zLens);

  function pointerOnLensPlane(out) {
    ray.setFromCamera({ x: pointer.x, y: pointer.y }, camera);
    return ray.ray.intersectPlane(lensPlane, out);
  }

  function screenNDC() {
    tmp2.set(0, screenY, screenZ).project(camera);
    return { x: tmp2.x, y: tmp2.y };
  }

  function updateLoupe(dt, t, cut = false) {
    let tx, ty, tz, reveal = 1, follow = 0;
    const idle = !pointer.moved || performance.now() - pointer.last > 9000;

    if (state.loupeFree) {
      const f = state.loupeFree;
      tx = f.x; ty = f.y; tz = f.z; L.rz = damp(L.rz, f.rz ?? 0.55, 6, dt); L.scale = damp(L.scale, f.scale ?? 1, 6, dt);
      L.rx = damp(L.rx, f.rx ?? 0, 6, dt);
      reveal = f.reveal ?? 0;
    } else if (state.lensMode === 'scroll') {
      L.rx = damp(L.rx, 0, 6, dt);
      const s = state.lensScroll;
      tx = (s.u - 0.5) * sc.w; ty = screenY + (s.v - 0.5) * sc.h; tz = zLens + s.lift;
      L.rz = damp(L.rz, 0.55, 6, dt); L.scale = damp(L.scale, 0.82, 6, dt);
    } else {
      L.rx = damp(L.rx, 0, 6, dt);
      L.scale = damp(L.scale, 1, 6, dt); L.rz = damp(L.rz, 0.55, 6, dt);
      if (!reduced && idle) {
        // gentle self-guided tour of the screen until the visitor takes over
        const a = t * 0.42;
        tx = Math.sin(a) * 0.62 + 0.05; ty = screenY + Math.sin(a * 1.7 + 1.2) * 0.22 - 0.02; tz = zLens;
      } else if (pointer.active && pointerOnLensPlane(tmp)) {
        const c = screenNDC();
        const aspect = camera.aspect;
        const d = Math.hypot((pointer.x - c.x) * aspect, pointer.y - c.y) / 2;
        follow = 1 - smooth(0.5, 1.05, d);
        tx = restPos.x + (tmp.x - restPos.x) * follow;
        ty = restPos.y + (tmp.y - restPos.y) * follow;
        tz = zLens;
        const cl = (v, a, b) => Math.min(b, Math.max(a, v));
        // the lens stays over the glass: never down on the drive, never past the bezel
        tx = cl(tx, -sc.w * 0.42, sc.w * 0.42); ty = cl(ty, screenY - sc.h * 0.36, screenY + sc.h * 0.38);
      } else { tx = restPos.x; ty = restPos.y; tz = zLens; }
    }

    const px = L.pos.x, py = L.pos.y;
    const k = state.loupeFree ? 5 : 9;
    if (cut) L.pos.set(tx, ty, tz);
    L.pos.x = damp(L.pos.x, tx, k, dt); L.pos.y = damp(L.pos.y, ty, k, dt); L.pos.z = damp(L.pos.z, tz, k, dt);
    L.vel.set((L.pos.x - px) / Math.max(dt, 1e-3), (L.pos.y - py) / Math.max(dt, 1e-3), 0);
    L.tiltY = damp(L.tiltY, THREE.MathUtils.clamp(L.vel.x * 0.07, -0.3, 0.3), 8, dt);
    L.tiltX = damp(L.tiltX, THREE.MathUtils.clamp(-L.vel.y * 0.07, -0.3, 0.3), 8, dt);
    L.follow = damp(L.follow, follow, 6, dt);

    const bob = reduced ? 0 : Math.sin(t * 1.6) * 0.012;
    loupe.group.position.set(L.pos.x + loupeOffset.x, L.pos.y + bob + loupeOffset.y, L.pos.z + loupeOffset.z);
    loupe.group.rotation.set(L.tiltX + L.rx, L.tiltY, L.rz);
    loupe.group.scale.setScalar(L.scale);
    loupeKey = [L.pos.x + loupeOffset.x, L.pos.y + loupeOffset.y, L.pos.z + loupeOffset.z, L.tiltX + L.rx, L.tiltY, L.rz, L.scale].map((n) => n.toFixed(3)).join(',');
    loupe.setShadow(loupe.group.position.y < 4.5);

    // where does the lens land on the glass, as seen from the camera?
    const cam = camera.position;
    const dz = loupe.group.position.z - cam.z;
    const tt = (screenZ - cam.z) / dz;
    const sx = cam.x + (loupe.group.position.x - cam.x) * tt;
    const sy = cam.y + (loupe.group.position.y - bob - cam.y) * tt;   // the floating of the loupe does not move the reveal
    const u = sx / sc.w + 0.5, v = (sy - screenY) / sc.h + 0.5;
    const r = ((LOUPE_R - 0.03) * L.scale * tt) / sc.h;
    // the reveal can exceed the physical lens (scroll story): grow it
    stage.lens.u = u; stage.lens.v = v; stage.lens.r = r;
    const grow = state.lensScroll.grow;
    if (state.lensOverride) { const o = state.lensOverride; mac.setLens(o.u, o.v, o.r, 1.2); }
    else mac.setLens(u, v, state.lensMode === 'off' ? 0 : (r + grow * 1.4) * reveal, 1.35 - grow * 0.2);

    // reading the printed note: a magnified disc under the glass
    note.disc.visible = state.noteLens;
    if (state.noteLens) {
      note.disc.rotation.z = -L.rz;
      note.aim(camera.position, loupe.group.position);
    }
  }

  // ───────── frame ─────────
  let loupeKey = '', shadowSig = '', lastFrameSig = '', lastDraw = -1, texDirty = true;
  function frame(dt, t) {
    dt = Math.min(dt, 0.05);
    const m = state.introMix;
    for (const key of Object.keys(tgt)) tgt[key] = state.cam[key] + (state.introCam[key] - state.cam[key]) * m;
    const k = m > 0 ? 80 : 3.8;   // during the opening the director is in full control
    // a cut (an opaque section covers the screen): no travelling, just be there
    const cut = !!state.snapCam; state.snapCam = false;
    for (const key of Object.keys(tgt)) cur[key] = cut ? tgt[key] : damp(cur[key], tgt[key], k, dt);
    camera.position.set(cur.x, cur.y, cur.z);
    camera.lookAt(cur.lx, cur.ly, cur.lz);
    camera.updateMatrixWorld();
    if (Math.abs(camera.fov - cur.fov) > 1e-3) { camera.fov = cur.fov; }
    world.setShift(cur.sx, cur.sy + (state.syRaw || 0));
    mac.update(t);
    mac.setPower(state.power);
    mac.setDot(state.dot);
    world.key.position.set(cur.lx - 4, 11, 6.5);
    world.key.target.position.set(cur.lx, 0, 0);
    world.key.target.updateMatrixWorld();
    methodObjs.forEach((o) => { o.visible = state.methodVisible !== false && Math.abs(cur.lx - o.position.x) < 13; });
    desk.visible = state.deskVisible !== false;
    typewriter.group.visible = !!state.typeVisible;
    if (state.typeVisible) typewriter.setProgress(state.typeProgress || 0);
    cardFile.setFlip(state.method.flip || 0);
    slideRule.setT(state.method.slide);
    updateLoupe(dt, t, cut);
    // shadows are costly: redraw them only when a caster moved
    const sig = [cur.lx.toFixed(2), loupeKey, (state.method.flip || 0).toFixed(2), (state.method.slide || 0).toFixed(2), (state.typeProgress || 0).toFixed(3), +!!state.typeVisible, +!!state.methodVisible, +(state.deskVisible !== false), state.power.toFixed(2)].join('|');
    if (sig !== shadowSig) { shadowSig = sig; world.renderer.shadowMap.needsUpdate = true; }
    // draw only when something that can be seen has changed (a still scene costs the graphics card nothing); ambient motion, like the loupe floating, is allowed 15 frames a second
    const u = mac.uniforms;
    const view = [cur.x, cur.y, cur.z, cur.lx, cur.ly, cur.lz, cur.fov, cur.sx, cur.sy + (state.syRaw || 0)].map((n) => n.toFixed(3)).join(',');
    const look = [u.uDraw.value, u.uLensR.value, u.uLens.value.x, u.uLens.value.y, u.uPower.value, u.uDot.value, u.uSvc.value, u.uMag.value].map((n) => (+n).toFixed(3)).join(',');
    const frameSig = `${view}|${look}|${sig}|${state.introMix}|${lamp.light.intensity.toFixed(2)}|${world.view.w}x${world.view.h}|${world.pixelCap}`;
    const changed = frameSig !== lastFrameSig || texDirty;
    if (!state.skipRender && (changed || t - lastDraw > 0.066)) {
      world.render(); lastDraw = t; lastFrameSig = frameSig; texDirty = false;
    }
  }

  // composition per viewport shape
  function heroCamera(aspect) {
    const portrait = aspect < 0.9;
    const base = { x: 3.4, y: 2.7, z: 11.6, lx: 0.2, ly: 1.5, lz: 0.2, fov: 26, sx: 0.268, sy: 0 };
    if (!portrait) return base;
    const tanH = Math.tan(THREE.MathUtils.degToRad(26 / 2));
    const tablet = aspect > 0.6;               // tall tablets: the words take the top, the desk the bottom
    const need = tablet ? 7.4 : 5.2;
    const d = Math.max(9.7, need / (2 * tanH * aspect));
    return { x: 2.2 * d / 9.7, y: 2.7 * d / 9.7, z: d, lx: 0.05, ly: 1.45, lz: 0.2, fov: 26, sx: 0, sy: tablet ? 0.16 : 0.04 };
  }

  return Object.assign(stage, { world, state, mac, loupe, desk, data, frame, heroCamera, resize: world.resize, METHOD, note, cardFile, slideRule, svcScreen, markDirty() { texDirty = true; }, snap() { Object.assign(cur, JSON.parse(JSON.stringify(tgt))); }, TYPE_X, typewriter,
    pointer, loupeOffset,
    props: { keyboard: keyboard.group, mouse: mouse.group, floppy: floppy.group, cords: [cordKb, cordMs] },
    lamp,
    projectPoint(x, y, z) {
      const v = new THREE.Vector3(x, y, z).project(camera);
      return { x: (v.x * 0.5 + 0.5) * world.view.w, y: (-v.y * 0.5 + 0.5) * world.view.h, z: v.z };
    },
    // where the middle of the glass is, in CSS pixels
    projectScreen() {
      const v = new THREE.Vector3(0, screenY, screenZ).project(camera);
      return { x: (v.x * 0.5 + 0.5) * world.view.w, y: (-v.y * 0.5 + 0.5) * world.view.h };
    },
    // the glass of the screen, as a rectangle in CSS pixels (the camera faces it straight on)
    screenRect() {
      const hw = sc.w / 2, hh = sc.h / 2;
      const a = new THREE.Vector3(-hw, screenY + hh, screenZ).project(camera), b = new THREE.Vector3(hw, screenY - hh, screenZ).project(camera);
      const W = world.view.w, H = world.view.h;
      const x0 = (a.x * 0.5 + 0.5) * W, y0 = (-a.y * 0.5 + 0.5) * H, x1 = (b.x * 0.5 + 0.5) * W, y1 = (-b.y * 0.5 + 0.5) * H;
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    },
    introCamFor(aspect) {
      const tan = Math.tan(THREE.MathUtils.degToRad(13));
      const d = Math.max(1.6 / (2 * tan), 2.15 / (2 * tan * aspect));
      return { x: 0.08, y: 2.1, z: 1.3 + d, lx: 0.0, ly: 2.08, lz: 1.3, fov: 26, sx: 0, sy: 0 };
    },
  });
}
