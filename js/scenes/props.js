// Small objects on the desk: keyboard, mouse, floppy disk. All generated.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

// fine speckle of moulded ABS: drives roughness and a whisper of bump, so nothing looks like smooth CG plastic
export function makeGrain(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * size; i++) {
    const v = 150 + (rnd() + rnd() + rnd() - 1.5) * 70;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.globalAlpha = 0.5; x.filter = 'blur(1px)'; x.drawImage(c, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function createMaterials() {
  const grain = makeGrain();
  const abs = (color, rough, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, roughnessMap: grain, bumpMap: grain, bumpScale: 0.35, clearcoat: 0.2, clearcoatRoughness: 0.55, ...extra });
  return {
    grain,
    plastic: abs(0xcdc5ad, 0.62),
    key: abs(0xd8d1bd, 0.55, { clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    keyDark: abs(0xb6ae98, 0.6),
    dark: new THREE.MeshStandardMaterial({ color: 0x17181d, roughness: 0.5 }),
    cord: new THREE.MeshStandardMaterial({ color: 0x25262b, roughness: 0.7 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.3 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb48a3a, metalness: 1, roughness: 0.28 }),
    bakelite: new THREE.MeshPhysicalMaterial({ color: 0x0a3ae5, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf3efe2, roughness: 0.9 }),
  };
}

export function createKeyboard(M) {
  const g = new THREE.Group();
  const W = 3.34, D = 1.16;
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, 0.2, D, 4, 0.07), M.plastic);
  base.position.set(0, 0.1, -0.02);
  g.add(base);

  const tilt = new THREE.Group();
  tilt.position.set(0, 0.2, 0.02);
  tilt.rotation.x = -0.11;
  g.add(tilt);

  const keyGeo = new RoundedBoxGeometry(0.19, 0.1, 0.19, 3, 0.035);
  const rows = [
    { n: 14, x0: -1.5, z: -0.44 },
    { n: 14, x0: -1.5, z: -0.22 },
    { n: 13, x0: -1.47, z: 0.0 },
    { n: 12, x0: -1.44, z: 0.22 },
  ];
  const pitch = 0.215;
  const mats = [];
  rows.forEach((r) => { for (let i = 0; i < r.n; i++) mats.push([r.x0 + i * pitch, r.z]); });
  const keys = new THREE.InstancedMesh(keyGeo, M.key, mats.length);
  const m4 = new THREE.Matrix4();
  mats.forEach(([x, z], i) => { m4.makeTranslation(x, 0.06, z); keys.setMatrixAt(i, m4); });
  keys.castShadow = true; keys.receiveShadow = true;
  tilt.add(keys);

  // bottom row: two modifiers and the long space bar
  const mod = new RoundedBoxGeometry(0.26, 0.1, 0.19, 3, 0.035);
  [-1.32, -1.04].forEach((x) => { const k = new THREE.Mesh(mod, M.keyDark); k.position.set(x, 0.06, 0.44); k.castShadow = true; tilt.add(k); });
  const space = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.1, 0.19, 3, 0.035), M.key);
  space.position.set(-0.02, 0.06, 0.44); space.castShadow = true; tilt.add(space);
  [1.12, 1.38].forEach((x) => { const k = new THREE.Mesh(mod, M.keyDark); k.position.set(x, 0.06, 0.44); k.castShadow = true; tilt.add(k); });

  tilt.add(keyLegends(rows, pitch));
  base.castShadow = true; base.receiveShadow = true;
  return { group: g };
}

const LABELS = [
  ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete'],
  ['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'return'],
  ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'],
];

function keyLegends(rows, pitch) {
  const cells = 8, cell = 128;
  const c = document.createElement('canvas'); c.width = c.height = cells * cell;
  const x = c.getContext('2d');
  x.fillStyle = '#4a4740'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const flat = LABELS.flat();
  flat.forEach((t, i) => {
    const cx = (i % cells) * cell + cell / 2, cy = Math.floor(i / cells) * cell + cell / 2;
    x.font = t.length > 1 ? '500 26px "General Sans", Arial, sans-serif' : '500 62px "General Sans", Arial, sans-serif';
    x.fillText(t, cx, cy + 2);
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const pos = [], uv = [], idx = [];
  const h = 0.075, y = 0.111;
  let k = 0;
  rows.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const kx = r.x0 + i * pitch, kz = r.z;
      const col = k % cells, row = Math.floor(k / cells);
      const u0 = col / cells, u1 = (col + 1) / cells, v1 = 1 - row / cells, v0 = 1 - (row + 1) / cells;
      const b = pos.length / 3;
      pos.push(kx - h, y, kz - h, kx + h, y, kz - h, kx + h, y, kz + h, kx - h, y, kz + h);
      uv.push(u0, v1, u1, v1, u1, v0, u0, v0);
      idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
      k++;
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.25, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  return m;
}

export function createMouse(M) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.34, 0.98, 5, 0.14), M.plastic);
  body.position.y = 0.17;
  const btn = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.05, 0.27, 3, 0.02), M.keyDark);
  btn.position.set(0, 0.335, -0.2);
  const split = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.012, 0.012), M.dark);
  split.position.set(0, 0.332, -0.06);
  g.add(body, btn, split);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g };
}

export function createCord(M, points, radius = 0.024) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 8, false), M.cord);
  m.castShadow = true;
  return m;
}

export function createFloppy(M) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.034, 0.94, 2, 0.012), M.dark);
  shell.position.y = 0.017;
  const shutter = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.038, 0.4, 2, 0.01), M.steel);
  shutter.position.set(0.1, 0.019, -0.27);
  const window_ = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.2), M.dark);
  window_.position.set(0.2, 0.02, -0.27);

  // paper label with a hand-lettered title
  const c = document.createElement('canvas'); c.width = 512; c.height = 360;
  const x = c.getContext('2d');
  x.fillStyle = '#F3EFE2'; x.fillRect(0, 0, 512, 360);
  x.fillStyle = '#0A3AE5'; x.fillRect(0, 0, 512, 54);
  x.fillStyle = '#F3EFE2'; x.font = '400 34px Anton, Impact, sans-serif'; x.textBaseline = 'middle'; x.fillText('FLUKE', 22, 30);
  x.fillStyle = '#14151F'; x.font = 'italic 600 58px "Bodoni Moda", Didot, serif';
  x.fillText('Trial 17', 28, 140); x.font = 'italic 600 36px "Bodoni Moda", Didot, serif'; x.fillText('(the good one)', 28, 200);
  x.strokeStyle = 'rgba(20,21,31,.35)'; x.lineWidth = 2;
  for (let y = 250; y < 340; y += 34) { x.beginPath(); x.moveTo(24, y); x.lineTo(488, y); x.stroke(); }
  const labelTex = new THREE.CanvasTexture(c); labelTex.colorSpace = THREE.SRGBColorSpace; labelTex.anisotropy = 8;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.48), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.85 }));
  label.rotation.x = -Math.PI / 2; label.position.set(0, 0.0355, 0.2);
  g.add(shell, shutter, window_, label);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, labelTex };
}
