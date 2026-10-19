// The loupe: brass ring, glass, and a bakelite handle in the logo's cobalt.
// Origin at the centre of the lens; the lens faces +z; the handle hangs along -y.
import * as THREE from 'three';

export const LOUPE_R = 0.46;

export function createLoupe(M) {
  const root = new THREE.Group();
  const R = LOUPE_R;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.015, 0.05, 24, 96), M.brass);
  const bevel = new THREE.Mesh(new THREE.TorusGeometry(R - 0.03, 0.016, 12, 96), M.brass);
  bevel.position.z = 0.012;

  // glass cap (a shallow sphere section) in two layers: faint tint + studio reflections
  const Rs = 1.5, theta = Math.asin((R - 0.02) / Rs);
  const cap = new THREE.SphereGeometry(Rs, 64, 24, 0, Math.PI * 2, 0, theta);
  cap.rotateX(Math.PI / 2);                     // pole now points +z
  cap.translate(0, 0, -Rs * Math.cos(theta) + 0.012); // flat edge sits on the ring plane
  const tint = new THREE.Mesh(cap, new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.1, depthWrite: false }));
  // reflections only: added to what is behind, without touching the canvas alpha (that was the black patch)
  const shine = new THREE.Mesh(cap, new THREE.MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.04, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.02,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  }));
  tint.renderOrder = 3; shine.renderOrder = 4;

  // the orange glint from the logo: a short arc caught in the glass
  const glint = new THREE.Mesh(new THREE.TorusGeometry(R * 0.84, 0.014, 10, 48, Math.PI * 0.42), new THREE.MeshBasicMaterial({ color: 0xfc6c3a, transparent: true, opacity: 0.55, depthWrite: false }));
  glint.rotation.z = Math.PI * 0.68;
  glint.position.z = 0.03;
  glint.renderOrder = 5;

  // ferrule + handle
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.24, 28), M.brass);
  ferrule.position.y = -(R + 0.05 + 0.1);
  const prof = [];
  const L = 1.0;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = 0.085 + 0.045 * Math.sin(Math.PI * Math.pow(t, 0.8)) + (t > 0.9 ? -0.05 * ((t - 0.9) / 0.1) ** 2 : 0);
    prof.push(new THREE.Vector2(Math.max(r, 0.02), -t * L));
  }
  const handleGeo = new THREE.LatheGeometry(prof, 36);
  const handle = new THREE.Mesh(handleGeo, M.bakelite);
  handle.position.y = -(R + 0.05 + 0.2);

  root.add(ring, bevel, tint, shine, glint, ferrule, handle);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o !== tint && o !== shine && o !== glint; o.receiveShadow = false; } });
  const casters = [];
  root.traverse((o) => { if (o.isMesh && o.castShadow) casters.push(o); });
  return { group: root, radius: R, setShadow(on) { casters.forEach((m) => { m.castShadow = on; }); } };
}
