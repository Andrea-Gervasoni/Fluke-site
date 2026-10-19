// The three objects of the "method" section. All generated.
//   Track    → a rotary card file: one card per attempt, flipped one by one
//   Test     → a slide rule (the original sanity check)
//   Question → a printed note under a loupe (read the fine print)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const FONT = (w, s, f = '"General Sans"') => `${w} ${s}px ${f}, Helvetica, Arial, sans-serif`;
const tex = (canvas, aniso = 8) => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };

/* ───────────── Track: rotary card file ───────────── */
export function createCardFile(M, data, aniso) {
  const root = new THREE.Group();
  const wheel = new THREE.Group();
  wheel.position.set(0, 1.05, 0);

  const tray = new THREE.Mesh(new RoundedBoxGeometry(2.7, 0.34, 1.9, 5, 0.12), M.plastic);
  tray.position.y = 0.17;
  const slot = new THREE.Mesh(new RoundedBoxGeometry(2.25, 0.02, 0.14, 2, 0.01), M.dark);
  slot.position.set(0, 0.345, 0);
  root.add(tray, slot);

  for (const s of [-1, 1]) {
    const cheek = new THREE.Mesh(new RoundedBoxGeometry(0.15, 1.55, 1.45, 4, 0.07), M.plastic);
    cheek.position.set(s * 1.3, 0.33 + 0.775, 0);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.2, 40), M.bakelite);
    knob.rotation.z = Math.PI / 2; knob.position.set(s * 1.52, 1.05, 0);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 28), M.brass);
    cap.rotation.z = Math.PI / 2; cap.position.set(s * 1.63, 1.05, 0);
    root.add(cheek, knob, cap);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 16), M.steel);
  axle.rotation.z = Math.PI / 2; axle.position.y = 1.05;
  root.add(axle);

  // 24 cards, one per trial, drawn into one sheet: number, the curve of that attempt, and what happened to it
  const N = 24, CW = 2.0, CL = 0.95, HUB = 0.2, CELL = { w: 512, h: 288 }, COLS = 4, ROWS = 6;
  const sheet = document.createElement('canvas'); sheet.width = CELL.w * COLS; sheet.height = CELL.h * ROWS;
  const x = sheet.getContext('2d');
  const others = data.trials.map((_, i) => i).filter((i) => i !== data.best);
  const pathOf = (no) => data.trials[no === 17 ? data.best : others[(no - 1) % others.length]].path;
  for (let i = 0; i < N; i++) {
    const no = i + 1, kept = no === 17, ox = (i % COLS) * CELL.w, oy = Math.floor(i / COLS) * CELL.h;
    x.save(); x.translate(ox, oy);
    x.fillStyle = '#F5F1E4'; x.fillRect(0, 0, CELL.w, CELL.h);
    x.fillStyle = kept ? '#FC6C3A' : '#0A3AE5'; x.fillRect(0, 0, CELL.w, 12);
    x.fillStyle = '#14151F'; x.font = '400 78px Anton, Impact, sans-serif'; x.textBaseline = 'alphabetic';
    x.fillText(`TRIAL ${String(no).padStart(2, '0')}`, 26, 104);
    x.font = FONT(500, 22); x.fillStyle = 'rgba(20,21,31,.55)'; x.textAlign = 'right';
    x.fillText(`${String(no).padStart(2, '0')} of 24`, CELL.w - 26, 50);
    x.textAlign = 'left';
    // the curve of this attempt
    const path = pathOf(no); let mn = Infinity, mx = -Infinity; path.forEach((v) => { mn = Math.min(mn, v); mx = Math.max(mx, v); });
    x.strokeStyle = 'rgba(20,21,31,.12)'; x.lineWidth = 2; x.beginPath(); x.moveTo(26, 214); x.lineTo(CELL.w - 26, 214); x.stroke();
    x.beginPath();
    path.forEach((v, k) => { const px = 26 + (k / (path.length - 1)) * (CELL.w - 52), py = 210 - ((v - mn) / (mx - mn || 1)) * 80; k ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.strokeStyle = kept ? '#FC6C3A' : '#0A3AE5'; x.lineWidth = 5; x.lineJoin = 'round'; x.stroke();
    // what happened to it
    x.font = FONT(600, 24);
    const label = kept ? 'KEPT' : 'DROPPED', lw = x.measureText(label).width + 28;
    x.save(); x.translate(26, 236);
    if (kept) { x.fillStyle = '#FC6C3A'; x.fillRect(0, 0, lw, 38); x.fillStyle = '#F5F1E4'; }
    else { x.strokeStyle = 'rgba(20,21,31,.55)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, lw - 3, 35); x.fillStyle = 'rgba(20,21,31,.6)'; }
    x.fillText(label, 14, 28); x.restore();
    x.font = FONT(400, 20); x.fillStyle = 'rgba(20,21,31,.55)'; x.textAlign = 'right';
    x.fillText(kept ? 'The one you would show.' : 'Still on file.', CELL.w - 26, 264);
    x.restore();
  }
  const sheetTex = tex(sheet, aniso);
  const front = new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.85 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0xf1ecdc, roughness: 0.9, side: THREE.BackSide });
  const tabGeo = new RoundedBoxGeometry(0.42, 0.14, 0.012, 2, 0.005);
  const tabMats = { kept: new THREE.MeshStandardMaterial({ color: 0xfc6c3a, roughness: 0.6 }), blue: new THREE.MeshStandardMaterial({ color: 0x0a3ae5, roughness: 0.6 }), paper: new THREE.MeshStandardMaterial({ color: 0xede9d8, roughness: 0.6 }) };
  const cards = [];
  for (let i = 0; i < N; i++) {
    const g = new THREE.PlaneGeometry(CW, CL);
    g.translate(0, HUB + CL / 2, 0);
    // this card's cell in the sheet
    const uv = g.attributes.uv, u0 = (i % COLS) / COLS, v0 = 1 - (Math.floor(i / COLS) + 1) / ROWS;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / COLS, v0 + uv.getY(k) / ROWS);
    const card = new THREE.Group();
    const f = new THREE.Mesh(g, front), bk = new THREE.Mesh(g, backMat);
    const tab = new THREE.Mesh(tabGeo, i === 16 ? tabMats.kept : i % 2 ? tabMats.blue : tabMats.paper);
    tab.position.set(((i % 3) - 1) * 0.6, HUB + CL + 0.05, -0.004);
    f.castShadow = true; f.receiveShadow = true; bk.receiveShadow = true; tab.castShadow = true;
    card.add(f, bk, tab);
    wheel.add(card); cards.push(card);
  }
  root.add(wheel);

  // phi: which card stands up to be read (0 = trial 01, 23 = trial 24). The ones read lie forward, the others wait behind.
  function setFlip(phi) {
    cards.forEach((c, i) => {
      const d = i - phi;
      let a;
      // the card being read leans a little towards the reader; the ones behind lean well back, out of the way
      if (d <= -1) a = 1.5 + (-d - 1) * 0.026;
      else if (d < 0) a = 0.28 + -d * 1.22;
      else if (d < 1) a = 0.28 - d * 1.0;
      else a = -0.72 - (d - 1) * 0.025;
      c.rotation.x = a;
    });
  }
  setFlip(0);
  root.traverse((o) => { if (o.isMesh && !cards.some((c) => c.children.includes(o))) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: root, setFlip };
}

/* ───────────── Test: slide rule ───────────── */
function scaleCanvas(w, h, { top = true, label = '' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#F0EAD6'; x.fillRect(0, 0, w, h);
  const pad = 36, W = w - pad * 2;
  const X = (v) => pad + Math.log10(v) * W;
  x.strokeStyle = '#14151F'; x.fillStyle = '#14151F'; x.lineCap = 'butt';
  const baseY = top ? h - 10 : 10, dir = top ? -1 : 1;
  const tick = (v, len, lw) => { x.lineWidth = lw; x.beginPath(); x.moveTo(X(v), baseY); x.lineTo(X(v), baseY + dir * len); x.stroke(); };
  x.lineWidth = 3; x.beginPath(); x.moveTo(pad, baseY); x.lineTo(pad + W, baseY); x.stroke();
  for (let v = 1; v < 2; v += 0.02) tick(v, 20, 2);
  for (let v = 2; v < 4; v += 0.05) tick(v, 20, 2);
  for (let v = 4; v < 10; v += 0.1) tick(v, 20, 2);
  for (let v = 1; v <= 10; v += 0.1) { if (v < 2.001 || (v >= 2 && Math.abs(v * 10 % 5) < 0.001)) tick(v, 32, 3); }
  for (let n = 1; n <= 10; n++) {
    tick(n, 46, 4);
    x.font = FONT(600, 44); x.textAlign = 'center'; x.textBaseline = top ? 'bottom' : 'top';
    x.fillText(n === 10 ? '1' : String(n), X(n), baseY + dir * 52);
  }
  x.font = FONT(600, 36); x.textAlign = 'left'; x.fillStyle = label === 'C' ? '#B3261E' : '#14151F';
  x.fillText(label, 8, top ? 52 : h - 52);
  return c;
}

export function createSlideRule(M, aniso) {
  const root = new THREE.Group();
  const L = 3.9, D = 0.68;
  const body = new THREE.Mesh(new RoundedBoxGeometry(L, 0.13, D, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0xe9e1c8, roughness: 0.5 }));
  body.position.y = 0.065;
  root.add(body);

  const stripMat = (canvas) => new THREE.MeshStandardMaterial({ map: tex(canvas, aniso), roughness: 0.45 });
  const upper = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.12, 0.22), stripMat(scaleCanvas(2048, 140, { top: false, label: 'D' })));
  upper.rotation.x = -Math.PI / 2; upper.position.set(0, 0.132, -0.2);
  const lower = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.12, 0.22), stripMat(scaleCanvas(2048, 140, { top: true, label: 'A' })));
  lower.rotation.x = -Math.PI / 2; lower.position.set(0, 0.132, 0.2);
  root.add(upper, lower);

  // the slide
  const slide = new THREE.Group();
  const sBody = new THREE.Mesh(new RoundedBoxGeometry(L - 0.1, 0.1, 0.2, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0xf5efdc, roughness: 0.45 }));
  sBody.position.y = 0.125;
  const sFace = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.16, 0.17), stripMat(scaleCanvas(2048, 110, { top: false, label: 'C' })));
  sFace.rotation.x = -Math.PI / 2; sFace.position.set(0, 0.176, 0);
  slide.add(sBody, sFace);
  root.add(slide);

  // the cursor: glass with a hairline, in a brass frame
  const cursor = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.74), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.4, depthWrite: false }));
  glass.position.y = 0.23;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.72), new THREE.MeshBasicMaterial({ color: 0xb3261e }));
  hair.position.y = 0.238;
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.14, 0.76, 2, 0.01), M.brass);
    bar.position.set(s * 0.18, 0.2, 0);
    cursor.add(bar);
  }
  cursor.add(glass, hair);
  root.add(cursor);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o !== glass && o !== hair && o !== upper && o !== lower && o !== sFace; o.receiveShadow = true; } });
  glass.receiveShadow = false;
  return { group: root, setT(t) { slide.position.x = Math.sin(t * Math.PI * 2) * 0.62; cursor.position.x = Math.sin(t * Math.PI * 2 + 0.7) * 0.9 - 0.2; } };
}

/* ───────────── Question: the printed note, read through a lens ───────────── */
export function createNote(M, data, aniso) {
  const root = new THREE.Group();
  const W = 2.5, H = 3.1;
  const c = document.createElement('canvas'); c.width = 1000; c.height = 1240;
  const x = c.getContext('2d');
  x.fillStyle = '#F6F2E6'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#14151F'; x.font = FONT(600, 30); x.textBaseline = 'alphabetic';
  x.fillText('Fluke / Research note', 64, 96);
  x.fillStyle = '#0A3AE5'; x.font = '400 150px Anton, Impact, sans-serif'; x.fillText('AN EDGE.', 64, 270); x.fillText('OR A FLUKE?', 64, 410);
  // the chart: the whole search, with the winner picked out
  const px0 = 64, px1 = 936, py0 = 500, py1 = 800;
  x.strokeStyle = 'rgba(20,21,31,.12)'; x.lineWidth = 2;
  for (let k = 0; k <= 4; k++) { const y = py0 + (k * (py1 - py0)) / 4; x.beginPath(); x.moveTo(px0, y); x.lineTo(px1, y); x.stroke(); }
  const pad = (data.hi - data.lo) * 0.06;
  const map = (k, i) => [px0 + (i / (data.steps - 1)) * (px1 - px0), py1 - ((data.trials[k].path[i] - (data.lo - pad)) / (data.hi - data.lo + pad * 2)) * (py1 - py0)];
  x.lineJoin = 'round';
  data.trials.forEach((_, k) => { if (k === data.best) return; x.beginPath(); for (let i = 0; i < data.steps; i++) { const [a, b] = map(k, i); i ? x.lineTo(a, b) : x.moveTo(a, b); } x.strokeStyle = 'rgba(10,58,229,.45)'; x.lineWidth = 2.2; x.stroke(); });
  x.beginPath(); for (let i = 0; i < data.steps; i++) { const [a, b] = map(data.best, i); i ? x.lineTo(a, b) : x.moveTo(a, b); } x.strokeStyle = '#FC6C3A'; x.lineWidth = 6; x.stroke();
  // the fine print (this is what the loupe is for)
  x.fillStyle = '#14151F'; x.font = FONT(600, 36);
  x.fillText('Look at the search, not just the selection.', 64, 900);
  x.fillStyle = 'rgba(20,21,31,.78)'; x.font = FONT(400, 27);
  const lines = [
    'What was tried before this model? How many alternatives',
    'were discarded? Which decisions changed after someone',
    'saw the results? A strong backtest is the beginning of a',
    'conversation. It should not be the end of one.',
    '',
    'Deflated Sharpe Ratio. Probability of Backtest Overfitting.',
    'Tools for asking sharper questions, not certificates.',
  ];
  lines.forEach((t, i) => x.fillText(t, 64, 960 + i * 40));
  x.fillStyle = 'rgba(20,21,31,.5)'; x.font = FONT(400, 22);
  x.fillText('Illustrative chart, not market data.', 64, 1200);
  const noteTex = tex(c, aniso);

  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92 });
  const stack = [];
  for (let i = 0; i < 4; i++) {
    const sheet = new THREE.Mesh(new RoundedBoxGeometry(W, 0.02, H, 1, 0.004), i === 3 ? new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.9 }) : mat);
    sheet.position.set((i - 1.5) * 0.03, 0.012 + i * 0.022, (i % 2 ? 0.04 : -0.03));
    sheet.rotation.y = (i - 1.5) * 0.035;
    sheet.castShadow = true; sheet.receiveShadow = true;
    root.add(sheet); stack.push(sheet);
  }
  const top = stack[3];

  // magnified disc: shows the same page, enlarged around the point under the lens
  const lensTex = noteTex.clone(); lensTex.needsUpdate = true; lensTex.repeat.set(1 / 2.4, 1 / 2.4);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.43, 64), new THREE.MeshBasicMaterial({ map: lensTex }));
  disc.visible = false; disc.renderOrder = 1; disc.position.z = 0.004;
  return {
    group: root, top, disc, W, H,
    // what the eye sees through the lens: follow the ray from the camera, through the lens centre, to the page
    aim(camPos, lensPos) {
      top.updateWorldMatrix(true, false);
      const planeY = new THREE.Vector3().setFromMatrixPosition(top.matrixWorld).y + 0.011 * top.getWorldScale(new THREE.Vector3()).y;
      const dir = lensPos.clone().sub(camPos);
      const t = (planeY - camPos.y) / dir.y;
      const hit = camPos.clone().addScaledVector(dir, t);
      const local = top.worldToLocal(hit);
      const u = local.x / W + 0.5, v = 0.5 - local.z / H;
      lensTex.offset.set(u - 0.5 / 2.4, v - 0.5 / 2.4);
    },
  };
}
