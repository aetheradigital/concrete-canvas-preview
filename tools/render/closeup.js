import { THREE, std, box } from './lib.js';

// Close-up "sample" view: low camera over a finished floor near a wall, with a
// bright window and soft studio light for a believable gloss highlight.
export function buildCloseup({ root }, mode) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), std(0x777777, 1));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -2); floor.receiveShadow = true; root.add(floor);
  const wall = std(0x6f7377, 0.9);
  box(root, 8, 3, 0.1, 0, 1.5, -3.2, wall);
  box(root, 0.1, 3, 8, -2.6, 1.5, -2, wall);
  box(root, 0.1, 3, 8, 2.6, 1.5, -2, wall);
  box(root, 8, 0.05, 8, 0, 3.0, -2, std(0x55585c, 0.95));
  // window in the back wall (bright, gives the long glossy streak)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 4.5 }));
  win.position.set(0.4, 1.55, -3.14); root.add(win);
  const wx = mode === 'swatch' ? 2.3 : 0.4;
  for (const [w, h, x, y] of [[1.7, 0.06, 0, 2.23], [1.7, 0.06, 0, 0.87], [0.06, 1.42, -0.82, 1.55], [0.06, 1.42, 0.82, 1.55], [0.04, 1.3, 0, 1.55]])
    box(root, w, h, 0.08, wx + x, y, -3.12, std(0xf7f7f5, 0.5));
  const wl = new THREE.RectAreaLight(0xeaf2ff, 5, 1.6, 1.3); wl.position.set(0.4, 1.55, -3.1); wl.lookAt(0.4, 1.0, 0); root.add(wl);
  // baseboard and a cabinet edge for scale at the left
  box(root, 8, 0.1, 0.03, 0, 0.05, -3.135, std(0xf7f7f5, 0.5));
  box(root, 0.9, 0.86, 0.6, -2.05, 0.43 + 0.1, -2.3, std(0x2e3238, 0.42, 0.35));
  box(root, 0.9, 0.1, 0.5, -2.05, 0.05, -2.3, std(0x1d2024, 0.5, 0.3));
  const key = new THREE.SpotLight(0xfff4e6, 22, 0, Math.PI / 3, 1, 2);
  key.position.set(-1.2, 2.8, -0.4); key.target.position.set(0, 0, -1.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 8;
  root.add(key); root.add(key.target);
  const fill = new THREE.RectAreaLight(0xffffff, 1.4, 4, 3); fill.position.set(0, 2.9, -1.2); fill.lookAt(0, 0, -1.2); root.add(fill);
  root.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.25));
  const camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.02, 30);
  if (mode === 'swatch') {
    // steeper, mostly floor; the window highlight grazes the top-right corner
    win.position.x = wx; wl.position.x = wx;
    camera.position.set(-0.3, 1.05, 0.6);
    camera.lookAt(0.1, 0.0, -0.75);
  } else {
    camera.position.set(0.05, 0.78, 0.25);
    camera.lookAt(0.2, 0.0, -1.25);
  }
  return { camera, floor, exposure: 0.78, bloom: 0.45, lightGain: 0.1, aoScale: 0.8, coordX0: -6, coordZ0: -8, coordRange: 12 };
}
