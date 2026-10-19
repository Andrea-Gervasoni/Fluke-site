// One renderer, one scene, one camera for the whole page.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

export function createWorld(canvas, { phone }) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'high-performance', premultipliedAlpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  // the shadow map is redrawn only when something that casts a shadow has moved (see stage.js)
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  scene.environmentIntensity = 0.62;
  pmrem.dispose();

  // key (soft shadows), fill, rim: the three lights of a product photograph
  const key = new THREE.DirectionalLight(0xfff1de, 2.7);
  key.position.set(-4, 11, 6.5);
  key.castShadow = true;
  const S = phone ? 512 : 1024;
  key.shadow.mapSize.set(S, S);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 10;
  scene.add(key, key.target);

  const fill = new THREE.HemisphereLight(0xfff7ec, 0xb9b09c, 0.55);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xdfe7ff, 1.35);
  rim.position.set(6, 4, -6);
  scene.add(rim);

  // seamless paper floor: only receives shadows, so objects sit on the page itself
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ color: 0x2b2418, opacity: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
  let pixelCap = phone ? 1.25 : 1.4;
  // Phones: the canvas is as tall as the LARGE viewport (the page with the browser bars tucked away), so nothing is ever cut at the bottom; the picture is framed for the SMALL viewport (the bars out), which never changes, so it does not jump when the bars come and go.
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.append(probe);
  const forced = +(new URLSearchParams(location.search).get('svh') || 0);   // testing: pretend the bars take this much
  const smallH = () => forced || Math.round(probe.getBoundingClientRect().height) || window.innerHeight;
  const view = { w: 1, h: 1, fh: 1, shiftX: 0, shiftY: 0 };

  function applyView() {
    if (view.shiftX || view.shiftY || view.h !== view.fh) camera.setViewOffset(view.w, view.fh, -view.shiftX * view.w, -view.shiftY * view.fh, view.w, view.h);
    else camera.clearViewOffset();
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelCap));
    renderer.setSize(w, h, false);
    const fh = Math.min(h, smallH());
    camera.aspect = w / fh;
    view.w = w; view.h = h; view.fh = fh;
    applyView();
    camera.updateProjectionMatrix();
    return { w, h };
  }

  return {
    THREE, renderer, scene, camera, key, floor, view,
    resize,
    setPixelCap(c) { if (c === pixelCap) return; pixelCap = c; resize(); },
    get pixelCap() { return pixelCap; },
    setShift(x, y) { view.shiftX = x; view.shiftY = y; applyView(); camera.updateProjectionMatrix(); },
    render() { renderer.render(scene, camera); },
  };
}
