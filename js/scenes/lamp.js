// A banker's lamp: brass base and stem, emerald glass shade, warm light underneath. Built in code.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

export function createLamp(M) {
  const root = new THREE.Group();
  const brass = M.brass;
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.12, 0.72, 4, 0.05), brass);
  base.position.y = 0.06;
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.12, 32), brass);
  plinth.position.y = 0.18;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 16), brass);
  stem.position.y = 0.76;
  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 10, 40, Math.PI), brass);
  yoke.position.y = 1.28; yoke.rotation.x = 0;

  // the shade: half a cylinder, glass outside, warm white inside
  const len = 1.5, R = 0.33;
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c5a3b, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4, sheenColor: new THREE.Color(0x3fa070) });
  const inner = new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xffd08a, emissiveIntensity: 1.6, side: THREE.BackSide, roughness: 0.6 });
  const shellGeo = new THREE.CylinderGeometry(R, R, len, 48, 1, true, -Math.PI / 2, Math.PI);
  shellGeo.rotateZ(Math.PI / 2);
  const shade = new THREE.Group();
  const outer = new THREE.Mesh(shellGeo, glass);
  const lining = new THREE.Mesh(shellGeo.clone().scale(0.97, 0.97, 0.97), inner);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 32, 0, Math.PI), glass);
    cap.rotation.y = s * Math.PI / 2; cap.position.x = s * len / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 8, 32, Math.PI), brass);
    rim.rotation.y = Math.PI / 2; rim.position.x = s * (len / 2 + 0.005);
    shade.add(cap, rim);
  }
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff1cf }));
  bulb.position.y = -0.08;
  shade.add(outer, lining, bulb);
  shade.position.y = 1.62; shade.rotation.x = 0.18;

  // a pull chain
  const chain = new THREE.Group();
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), brass); b.position.set(0.25, 1.36 - i * 0.045, 0.28); chain.add(b); }

  // warm light under the shade (no shadows: the key light already draws them)
  const light = new THREE.PointLight(0xffc977, 3.2, 4.5, 1.6);
  light.position.set(0, 1.45, 0.15);
  root.add(base, plinth, stem, yoke, shade, chain, light);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o !== bulb && o !== lining; o.receiveShadow = true; } });
  return { group: root, light, setOn(v) { light.intensity = 3.2 * v; inner.emissiveIntensity = 1.6 * v; bulb.visible = v > 0.05; } };
}
