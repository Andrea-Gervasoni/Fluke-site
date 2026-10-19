// A black lacquered portable typewriter, built in code. Scroll types the field note on its paper:
// one key goes down, one typebar strikes, the carriage steps left, the paper rolls up at each new line.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const LINES = ['What if the best', 'wallet was just', 'lucky?', '', 'Look at the', 'whole record.'];
const HEADER = ['FLUKE / FIELD NOTES', 'No. 2'];
const CW = 0.1;          // character width on the paper (exaggerated so it reads on screen)
const LH = 0.19;         // line height
const PAPER_W = 2.5, PAPER_H = 3.2;
const PX = 480;          // texture pixels per unit

export function createTypewriter(M, { aniso = 8 } = {}) {
  const root = new THREE.Group();
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x111216, roughness: 0.22, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9dce2, metalness: 1, roughness: 0.18 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.75 });
  const keyTop = new THREE.MeshPhysicalMaterial({ color: 0x0d0e11, roughness: 0.35, clearcoat: 0.6 });

  // ── body: a side profile that rises from the keyboard to the carriage, extruded across
  const prof = new THREE.Shape();
  prof.moveTo(1.35, 0); prof.lineTo(1.35, 0.2); prof.lineTo(0.15, 0.56); prof.lineTo(-0.55, 0.7); prof.lineTo(-1.25, 0.7); prof.lineTo(-1.25, 0); prof.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: 2.9, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelOffset: -0.08, bevelSegments: 5 });
  bodyGeo.rotateY(-Math.PI / 2);         // profile x → +z (front faces the viewer), extrusion → -x
  bodyGeo.translate(1.45, 0, 0);
  const body = new THREE.Mesh(bodyGeo, lacquer);
  root.add(body);

  // gold wordmark on the front lip
  const lc = document.createElement('canvas'); lc.width = 512; lc.height = 96;
  const lx = lc.getContext('2d');
  lx.fillStyle = '#C9A55A'; lx.font = 'italic 700 72px "Bodoni Moda", Didot, serif'; lx.textBaseline = 'middle'; lx.textAlign = 'center';
  lx.fillText('fluke.', 256, 50);
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = aniso;
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.116), new THREE.MeshStandardMaterial({ map: lt, transparent: true, metalness: 0.6, roughness: 0.3 }));
  badge.position.set(0, 0.12, 1.355); root.add(badge);

  // ── keys: four rows of round caps with chrome rims on the slope, plus the space bar
  const rows = [10, 10, 9, 8];
  const slope = Math.atan2(0.36, 1.2);
  const keyPos = [];
  rows.forEach((n, r) => {
    const z = 1.08 - r * 0.24, y = 0.22 + (1.35 - z) * 0.3 + 0.1;
    for (let i = 0; i < n; i++) keyPos.push(new THREE.Vector3((i - (n - 1) / 2) * 0.24 + (r % 2) * 0.06, y, z));
  });
  const capGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.045, 28);
  const rimGeo = new THREE.TorusGeometry(0.088, 0.012, 8, 28); rimGeo.rotateX(Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6);
  const caps = new THREE.InstancedMesh(capGeo, keyTop, keyPos.length);
  const rims = new THREE.InstancedMesh(rimGeo, chrome, keyPos.length);
  const stems = new THREE.InstancedMesh(stemGeo, chrome, keyPos.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -slope * 0.4), one = new THREE.Vector3(1, 1, 1);
  const setKey = (i, down) => {
    const p = keyPos[i].clone(); p.y -= down * 0.05;
    m4.compose(p, q, one); caps.setMatrixAt(i, m4); rims.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(p.x, p.y - 0.09, p.z), q, one); stems.setMatrixAt(i, m4);
  };
  keyPos.forEach((_, i) => setKey(i, 0));
  [caps, rims, stems].forEach((im) => { im.castShadow = true; im.receiveShadow = true; root.add(im); });
  const space = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.05, 0.1, 2, 0.02), keyTop);
  space.position.set(0, 0.3, 1.27); root.add(space);

  // white letters on the caps (one merged quad per key)
  const atlas = document.createElement('canvas'); atlas.width = atlas.height = 512;
  const ax = atlas.getContext('2d'); ax.fillStyle = '#ECE8DC'; ax.textAlign = 'center'; ax.textBaseline = 'middle'; ax.font = '600 44px "General Sans", Arial, sans-serif';
  const KEYS = 'QWERTYUIOPASDFGHJKLZXCVBNM1234567890'.split('');
  KEYS.forEach((c, i) => ax.fillText(c, (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 34));
  const at = new THREE.CanvasTexture(atlas); at.colorSpace = THREE.SRGBColorSpace; at.anisotropy = aniso;
  const lp = [], lu = [], li = [];
  const order = [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
  keyPos.forEach((p, i) => {
    const c = order[i % order.length], col = c % 8, row = Math.floor(c / 8), h = 0.055;
    const b = lp.length / 3, y = p.y + 0.024;
    lp.push(p.x - h, y, p.z - h, p.x + h, y, p.z - h, p.x + h, y, p.z + h, p.x - h, y, p.z + h);
    const u0 = col / 8, u1 = (col + 1) / 8, v1 = 1 - row / 8, v0 = 1 - (row + 1) / 8;
    lu.push(u0, v1, u1, v1, u1, v0, u0, v0); li.push(b, b + 2, b + 1, b, b + 3, b + 2);
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(lu, 2)); lg.setIndex(li); lg.computeVertexNormals();
  root.add(new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ map: at, transparent: true, alphaTest: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })));

  // ── typebars: a fan in the basket, one rises to strike the paper
  const bars = new THREE.Group(); bars.position.set(0, 0.62, -0.05); root.add(bars);
  const barGeo = new THREE.BoxGeometry(0.018, 0.012, 0.5); barGeo.translate(0, 0, 0.25);
  const barList = [];
  for (let i = 0; i < 22; i++) {
    const pivot = new THREE.Group();
    const a = ((i / 21) - 0.5) * 2.2;
    pivot.position.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5 - 0.5);
    pivot.rotation.y = a;
    const bar = new THREE.Mesh(barGeo, chrome); bar.castShadow = true;
    const holder = new THREE.Group(); holder.add(bar); holder.rotation.x = 0.05;
    pivot.add(holder); bars.add(pivot); barList.push(holder);
  }

  // ── carriage: platen, knobs, rail, paper. It slides along x.
  const carriage = new THREE.Group(); carriage.position.set(0, 0.92, -0.62); root.add(carriage);
  const platen = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.3, 40), rubber); platen.rotation.z = Math.PI / 2; carriage.add(platen);
  for (const s of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.18, 32), lacquer); knob.rotation.z = Math.PI / 2; knob.position.x = s * 1.78; carriage.add(knob);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 20), chrome); cap.rotation.z = Math.PI / 2; cap.position.x = s * 1.9; carriage.add(cap);
  }
  const rail = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.06, 0.08, 2, 0.02), chrome); rail.position.set(0, 0.16, 0.22); carriage.add(rail);
  const lever = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-1.65, 0.12, 0.05), new THREE.Vector3(-1.75, 0.3, 0.35), new THREE.Vector3(-1.95, 0.32, 0.6)]), 20, 0.025, 8), chrome);
  carriage.add(lever);
  // ribbon spools
  for (const s of [-1, 1]) {
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 28), new THREE.MeshStandardMaterial({ color: s < 0 ? 0x9b1c1c : 0x1b1b1f, roughness: 0.6 }));
    spool.position.set(s * 0.95, 0.74, -0.15); root.add(spool);
  }

  // the paper, with its own canvas: what is typed appears here
  const pc = document.createElement('canvas'); pc.width = Math.round(PAPER_W * PX); pc.height = Math.round(PAPER_H * PX);
  const px = pc.getContext('2d');
  const paperTex = new THREE.CanvasTexture(pc); paperTex.colorSpace = THREE.SRGBColorSpace; paperTex.anisotropy = aniso;
  const paperGeo = new THREE.PlaneGeometry(PAPER_W, PAPER_H, 1, 24);
  const pos = paperGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const yy = pos.getY(i) + PAPER_H / 2; pos.setZ(i, -0.04 * yy * yy); } // a gentle curl backwards
  paperGeo.computeVertexNormals();
  const paper = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.9, side: THREE.DoubleSide }));
  paper.castShadow = true; paper.receiveShadow = true;
  const paperHolder = new THREE.Group(); paperHolder.position.set(0, 0.2, -0.05); paperHolder.rotation.x = -0.18;
  paperHolder.add(paper); carriage.add(paperHolder);

  const total = LINES.reduce((a, l) => a + l.length, 0) + LINES.length - 1;
  const jitter = []; let seed = 3;
  for (let i = 0; i < 400; i++) { seed = (seed * 16807) % 2147483647; jitter.push(seed / 2147483647); }
  function drawPaper(count) {
    px.fillStyle = '#F4F0E4'; px.fillRect(0, 0, pc.width, pc.height);
    px.textBaseline = 'alphabetic';
    const mono = (s) => `${s}px "Courier New", Courier, monospace`;
    const left = 0.2 * PX;
    // pre-typed header
    px.fillStyle = 'rgba(20,21,31,.9)'; px.font = mono(Math.round(CW * PX * 1.0));
    HEADER.forEach((h, i) => px.fillText(h, left, (0.32 + i * LH) * PX));
    // typed lines, ink a little uneven like a real ribbon
    let n = 0;
    LINES.forEach((ln, r) => {
      for (let c = 0; c < ln.length; c++) {
        if (n >= count) return;
        const j = jitter[n % jitter.length];
        px.globalAlpha = 0.78 + j * 0.22;
        px.fillStyle = '#14151F'; px.font = mono(Math.round(CW * PX * 1.66));
        px.fillText(ln[c], left + c * CW * PX + (j - 0.5) * 2, (0.95 + r * LH) * PX + (jitter[(n + 7) % jitter.length] - 0.5) * 3);
        n++;
      }
      n++; // the return
    });
    px.globalAlpha = 1;
    paperTex.needsUpdate = true;
  }

  // where on the paper is the next character, so the carriage can bring it under the typebar
  function cursorOf(count) {
    let n = 0;
    for (let r = 0; r < LINES.length; r++) {
      const len = LINES[r].length;
      if (count <= n + len) return { r, c: count - n };
      n += len + 1;
    }
    return { r: LINES.length - 1, c: LINES[LINES.length - 1].length };
  }

  let lastCount = -1, lastKey = -1;
  drawPaper(0);
  const caret = cursorOf(0);
  function setProgress(t) {
    const f = Math.max(0, Math.min(1, t)) * total;
    const count = Math.floor(f), frac = f - count;
    if (count !== lastCount) { drawPaper(count); lastCount = count; }
    const cur = cursorOf(count);
    // carriage: the next character sits at the strike point (x = 0); the paper rolls one line per row
    const left = -PAPER_W / 2 + 0.2;
    carriage.position.x = -(left + (cur.c + 0.5) * CW);
    paperHolder.position.y = 0.2 + (cur.r - caret.r) * LH * 0.96;
    platen.rotation.x = cur.r * 0.9;
    // one key and one typebar, in time with the character
    const strike = count < total ? Math.sin(Math.min(1, frac / 0.5) * Math.PI) : 0;
    const key = (count * 7) % keyPos.length;
    if (key !== lastKey && lastKey >= 0) setKey(lastKey, 0);
    setKey(key, strike); lastKey = key;
    caps.instanceMatrix.needsUpdate = rims.instanceMatrix.needsUpdate = stems.instanceMatrix.needsUpdate = true;
    barList.forEach((b, i) => { b.rotation.x = 0.05 - (i === count % barList.length ? strike * 1.35 : 0); });
  }

  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { o.castShadow = o.castShadow || o.material !== undefined; o.receiveShadow = true; } });
  return { group: root, setProgress, total };
}
