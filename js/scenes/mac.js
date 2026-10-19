// The compact computer. Built in code from rounded extrusions: no downloaded model.
// Units: 1 = 10 cm. Origin on the desk under the middle of the case, front facing +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const rrShape = (w, h, r, cx = 0, cy = 0, Ctor = THREE.Shape) => {
  const hw = w / 2, hh = h / 2, s = new Ctor();
  s.moveTo(cx - hw + r, cy - hh);
  s.lineTo(cx + hw - r, cy - hh); s.quadraticCurveTo(cx + hw, cy - hh, cx + hw, cy - hh + r);
  s.lineTo(cx + hw, cy + hh - r); s.quadraticCurveTo(cx + hw, cy + hh, cx + hw - r, cy + hh);
  s.lineTo(cx - hw + r, cy + hh); s.quadraticCurveTo(cx - hw, cy + hh, cx - hw, cy + hh - r);
  s.lineTo(cx - hw, cy - hh + r); s.quadraticCurveTo(cx - hw, cy - hh, cx - hw + r, cy - hh);
  return s;
};

export const MAC = {
  W: 2.44, H: 3.2, zF: 1.385,
  screen: { w: 1.9, h: 1.27, y: 2.03, zFloor: 1.275 },
};

const SCREEN_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const SCREEN_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform sampler2D tC;
  uniform sampler2D tS;     // the services desktop
  uniform float uSvc;       // 1 = the services desktop is on the screen
  uniform float uDraw;      // how much of the winning curve is drawn (uv.x)
  uniform vec2  uLens;      // lens centre (uv)
  uniform float uLensR;     // lens radius, in units of screen height
  uniform float uMag;       // magnification inside the lens
  uniform float uPower;     // 0 = off, 1 = on
  uniform float uDot;       // 0..1 glowing dot (power-off afterglow)
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }

  void main() {
    vec2 c = vUv * 2.0 - 1.0;
    // rounded glass corners
    vec2 pw = (vUv - 0.5) * vec2(uAspect, 1.0);
    if (sdRoundBox(pw, vec2(uAspect * 0.5, 0.5), 0.07) > 0.0) discard;

    // gentle barrel distortion, like a bulging tube
    float r2 = dot(c * vec2(1.0, 0.82), c * vec2(1.0, 0.82));
    vec2 uv = (c * (1.0 + 0.045 * r2)) * 0.5 + 0.5;

    vec2 d = (uv - uLens) * vec2(uAspect, 1.0);
    float dist = length(d);
    float inLens = 1.0 - smoothstep(uLensR - 0.003, uLensR + 0.003, dist);
    vec2 uvB = uLens + (uv - uLens) / uMag;

    vec3 a = texture2D(tA, uv).rgb;
    vec4 cv = texture2D(tC, uv);
    a = mix(a, cv.rgb, cv.a * (1.0 - smoothstep(uDraw - 0.012, uDraw, uv.x)));
    vec3 b = texture2D(tB, uvB).rgb;
    vec3 col = mix(a, b, inLens);

    // rim of the lens: a thin shadow on the glass
    float rim = smoothstep(uLensR - 0.014, uLensR - 0.002, dist) * (1.0 - smoothstep(uLensR - 0.002, uLensR + 0.006, dist));
    col = mix(col, col * 0.35, rim);
    col = mix(col, texture2D(tS, uv).rgb, uSvc);

    // raster scanlines (at the 342-line grid) and vignette
    float sl = 0.93 + 0.07 * sin(uv.y * 342.0 * 6.2831853 * 0.5);
    col *= sl;
    col = pow(col, vec3(0.92)) * 1.08;
    col *= 1.0 - 0.38 * pow(r2, 1.4);
    col *= 0.988 + 0.012 * sin(uTime * 55.0);
    col = mix(col, col * vec3(0.96, 0.99, 1.02), 0.6);

    // power on: a line, then a screen, then phosphor settling
    float p = uPower;
    float w = smoothstep(0.0, 0.26, p);
    float hgt = mix(0.012, 1.0, smoothstep(0.24, 0.62, p));
    float inside = step(abs(c.x), w) * step(abs(c.y), hgt);
    float flash = 1.0 + 0.9 * smoothstep(0.55, 0.62, p) * (1.0 - smoothstep(0.62, 0.9, p));
    vec3 tube = vec3(0.045, 0.05, 0.055);
    vec3 lit = col * flash;
    // the bright seam of the line while it opens
    float seam = (1.0 - smoothstep(0.0, 0.05, abs(c.y) - hgt + 0.02)) * step(abs(c.x), w) * (1.0 - smoothstep(0.55, 0.7, p));
    vec3 outc = mix(tube, lit, inside);
    outc += vec3(0.92, 0.95, 1.0) * seam * 0.9;

    float dotv = exp(-length(c * vec2(uAspect, 1.0)) * 26.0) * uDot;
    outc += vec3(1.0, 0.55, 0.3) * dotv * 1.6;

    gl_FragColor = vec4(outc, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createMac({ canvases, logoTexture, aniso = 8, grain = null }) {
  const root = new THREE.Group();
  const { W, H, zF } = MAC;
  const sc = MAC.screen;

  const plastic = new THREE.MeshPhysicalMaterial({ color: 0xcdc5ad, roughness: grain ? 0.62 : 0.5, roughnessMap: grain, bumpMap: grain, bumpScale: 0.35, clearcoat: 0.22, clearcoatRoughness: 0.55 });
  const recessMat = new THREE.MeshStandardMaterial({ color: 0xa79f89, roughness: 0.75 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.45 });

  const plateD = 0.08, bt = 0.03;
  // front plate, with real holes for the screen and the drive
  const shape = rrShape(W, H, 0.16);
  shape.holes.push(rrShape(2.14, 1.64, 0.14, 0, sc.y - H / 2, THREE.Path));
  shape.holes.push(rrShape(0.84, 0.17, 0.05, 0.62, 0.64 - H / 2, THREE.Path));
  const plateGeo = new THREE.ExtrudeGeometry(shape, { depth: plateD, bevelEnabled: true, bevelThickness: bt, bevelSize: 0.032, bevelOffset: -0.032, bevelSegments: 4, curveSegments: 22 });
  const plate = new THREE.Mesh(plateGeo, plastic);
  plate.position.set(0, H / 2, zF - plateD - bt);
  const zBack = zF - plateD - 2 * bt; // rear face of the plate = front of the body

  // main body behind the plate
  const bodyD = 1.5;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W - 0.05, H - 0.04, bodyD, 5, 0.12), plastic);
  body.position.set(0, H / 2, zBack + 0.03 - bodyD / 2);

  // rear shell: narrower, lower, tapering to the back
  const rear = (() => {
    const s = new THREE.Shape();
    s.moveTo(-1.13, -0.4); s.lineTo(1.13, -0.4); s.lineTo(0.8, 1.385); s.lineTo(-0.8, 1.385); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 2.55, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelOffset: -0.1, bevelSegments: 5, curveSegments: 8 });
    g.rotateX(-Math.PI / 2);        // shape y → -z, extrusion → +y
    g.translate(0, 0.1, 0);
    return new THREE.Mesh(g, plastic);
  })();

  // recess floors (slightly darker plastic) and the tube mask
  const screenRecess = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(2.2, 1.7, 0.15), 16), recessMat);
  screenRecess.position.set(0, sc.y, zBack + 0.004);
  const mask = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(2.0, 1.36, 0.11), 16), darkMat);
  mask.position.set(0, sc.y, sc.zFloor - 0.012);

  const driveRecess = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(0.9, 0.23, 0.06), 12), recessMat);
  driveRecess.position.set(0.62, 0.64, zBack + 0.004);
  const slot = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(0.64, 0.045, 0.02), 8), darkMat);
  slot.position.set(0.62, 0.645, zBack + 0.008);

  // glass with a slight bulge, drawn by a shader (two textures + lens + power)
  const gGeo = new THREE.PlaneGeometry(sc.w, sc.h, 48, 32);
  const pos = gGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (sc.w / 2), v = pos.getY(i) / (sc.h / 2);
    pos.setZ(i, 0.05 * (1 - (u * u + v * v) / 2));
  }
  gGeo.computeVertexNormals();

  const tex = (canvas, nearest) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
    return t;
  };
  const uniforms = {
    tA: { value: tex(canvases.a, true) },
    tB: { value: tex(canvases.b, false) },
    tC: { value: tex(canvases.c, true) },
    tS: { value: (() => { const t = tex(canvases.s, false); t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t; })() },
    uSvc: { value: 0 },
    uDraw: { value: 1.2 },
    uLens: { value: new THREE.Vector2(0.5, 0.5) },
    uLensR: { value: 0.0 },
    uMag: { value: 1.35 },
    uPower: { value: 1 },
    uDot: { value: 0 },
    uTime: { value: 0 },
    uAspect: { value: sc.w / sc.h },
  };
  const glass = new THREE.Mesh(gGeo, new THREE.ShaderMaterial({ uniforms, vertexShader: SCREEN_VERT, fragmentShader: SCREEN_FRAG }));
  glass.position.set(0, sc.y, sc.zFloor);
  // sheen over the glass: only specular reflections of the studio, added on top
  const sheen = new THREE.Mesh(gGeo, new THREE.MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.08, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 0.28, clearcoat: 1, clearcoatRoughness: 0.04,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  }));
  sheen.position.set(0, sc.y, sc.zFloor + 0.002);
  sheen.renderOrder = 2;

  // brand: the f-and-dot wordmark where a fruit used to be
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78 * 539 / 1581), new THREE.MeshStandardMaterial({ map: logoTexture, transparent: true, roughness: 0.55, alphaTest: 0.02 }));
  decal.position.set(-0.62, 0.65, zF + 0.0015);

  // top handle recess + vents
  const handle = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(0.95, 0.2, 0.08), 12), darkMat);
  handle.rotation.x = -Math.PI / 2; handle.position.set(0, 2.76, -0.55);
  const vents = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const v = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(0.62, 0.018, 0.009, 0, 0), 6), darkMat);
    v.rotation.x = -Math.PI / 2; v.position.set(0, 2.76, -0.95 - i * 0.06); vents.add(v);
  }
  // rubber feet
  const feet = new THREE.Group();
  [[-0.95, 0.5], [0.95, 0.5], [-0.7, -1.0], [0.7, -1.0]].forEach(([x, z]) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.05, 20), darkMat); f.position.set(x, 0.025, z); feet.add(f);
  });
  body.position.y += 0.05; plate.position.y += 0.05; rear.position.y += 0.05;
  [screenRecess, mask, driveRecess, slot, glass, sheen, decal].forEach((m) => { m.position.y += 0.05; });
  handle.position.y += 0.05; vents.position.y += 0.05;

  root.add(body, plate, rear, screenRecess, mask, driveRecess, slot, glass, sheen, decal, handle, vents, feet);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o !== sheen && o !== glass; o.receiveShadow = true; } });
  glass.receiveShadow = false; sheen.receiveShadow = false;

  // screen geometry in world space is needed by the loupe controller
  const screenCenter = new THREE.Vector3(0, sc.y + 0.05, sc.zFloor + 0.05);

  return {
    group: root, uniforms, glass, screenCenter,
    dims: { w: sc.w, h: sc.h },
    setLens(u, v, r, mag) { uniforms.uLens.value.set(u, v); uniforms.uLensR.value = r; if (mag) uniforms.uMag.value = mag; },
    setPower(p) { uniforms.uPower.value = p; },
    setDraw(d) { uniforms.uDraw.value = d; },
    setDot(d) { uniforms.uDot.value = d; },
    setSvc(v) { uniforms.uSvc.value = v; },
    // the wordmark on the case; it steps back during the close-up on the floppy, where it would sit behind the words
    setLogo(v) { decal.material.opacity = v; decal.visible = v > 0.01; this.logo = v; },
    svcDirty() { uniforms.tS.value.needsUpdate = true; },
    update(t) { /* the tube's flicker is far too faint to be worth redrawing the page 60 times a second */ },
  };
}
