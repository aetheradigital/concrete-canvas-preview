import { THREE, std, box, canvasTex, noiseFill, rand } from './lib.js';

// A finished two-car garage: cabinets on the back wall, slatwall on the right,
// entry door on the left, hexagon LED grid on the ceiling. Camera stands at the
// open garage door looking in.
export function buildGarage({ root }) {
  const W = 6.6, D = 7.2, Hc = 3.0;
  const rnd = rand(7);

  const wallTex = canvasTex(512, 512, (c, w, h) => noiseFill(c, w, h, '#ecebe7', 0.025, 30000, 2), [4, 2]);
  const wall = std(0xffffff, 0.93, 0, { map: wallTex });
  const ceil = std(0xf2f2f0, 0.95);
  const cabBody = std(0x2e3238, 0.42, 0.35);
  const cabDoor = std(0x3a3f46, 0.32, 0.45);
  const steel = std(0xc9ced4, 0.28, 1.0);
  const wood = std(0xffffff, 0.55, 0, { map: canvasTex(1024, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#b98a5a'); g.addColorStop(1, '#a87b4f');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { c.strokeStyle = `rgba(${90 + rnd() * 40},${55 + rnd() * 25},${30},${0.12 + rnd() * 0.2})`; c.lineWidth = 0.5 + rnd() * 1.5;
      c.beginPath(); const y = rnd() * h; c.moveTo(0, y); for (let x = 0; x < w; x += 40) c.lineTo(x, y + Math.sin(x * 0.01 + i) * 3); c.stroke(); }
    for (let x = 0; x < w; x += 128) { c.fillStyle = 'rgba(60,35,15,.25)'; c.fillRect(x, 0, 1.5, h); }
  }) });
  const trim = std(0xf6f6f4, 0.5);
  const curb = std(0x9a9a96, 0.85);

  // shell
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D + 1.2), std(0x777777, 1));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -D / 2 + 0.6); floor.receiveShadow = true; root.add(floor);
  box(root, W, 0.02, D + 1.2, 0, Hc + 0.01, -D / 2 + 0.6, ceil);
  box(root, W, Hc, 0.1, 0, Hc / 2, -D - 0.05, wall);
  box(root, 0.1, Hc, D + 1.2, -W / 2 - 0.05, Hc / 2, -D / 2 + 0.6, wall);
  box(root, 0.1, Hc, D + 1.2, W / 2 + 0.05, Hc / 2, -D / 2 + 0.6, wall);
  // front wall around the door opening (behind camera)
  box(root, W, 0.6, 0.12, 0, Hc - 0.3, 0.66, wall);
  // painted concrete curb along the walls
  box(root, W, 0.1, 0.12, 0, 0.05, -D + 0.06, curb, { cast: false });
  box(root, 0.12, 0.1, D, -W / 2 + 0.06, 0.05, -D / 2, curb, { cast: false });
  box(root, 0.12, 0.1, D, W / 2 - 0.06, 0.05, -D / 2, curb, { cast: false });

  // ---- back wall cabinets ----
  const zb = -D + 0.12;
  const run0 = -2.75, bay = 0.76, nb = 6;
  for (let i = 0; i < nb; i++) {
    const x = run0 + bay * (i + 0.5);
    box(root, bay - 0.01, 0.82, 0.58, x, 0.1 + 0.41, zb + 0.29, cabBody);
    // two doors or drawer stack
    if (i % 3 === 1) {
      for (let k = 0; k < 4; k++) {
        const y = 0.16 + k * 0.19 + 0.09;
        box(root, bay - 0.05, 0.175, 0.02, x, y, zb + 0.59, cabDoor);
        box(root, bay * 0.55, 0.012, 0.025, x, y + 0.06, zb + 0.615, steel, { cast: false });
      }
    } else {
      for (const s of [-1, 1]) {
        box(root, bay / 2 - 0.03, 0.76, 0.02, x + s * bay / 4, 0.53, zb + 0.59, cabDoor);
        box(root, 0.012, 0.32, 0.025, x + s * 0.03, 0.62, zb + 0.615, steel, { cast: false });
      }
    }
    // toe-kick
    box(root, bay, 0.1, 0.5, x, 0.05, zb + 0.25, std(0x1d2024, 0.5, 0.3));
    // wall cabinets
    box(root, bay - 0.01, 0.72, 0.36, x, 1.62 + 0.36, zb + 0.18, cabBody);
    for (const s of [-1, 1]) {
      box(root, bay / 2 - 0.03, 0.68, 0.02, x + s * bay / 4, 1.98, zb + 0.37, cabDoor);
      box(root, 0.012, 0.26, 0.025, x + s * 0.03, 1.78, zb + 0.395, steel, { cast: false });
    }
  }
  const runW = bay * nb;
  box(root, runW + 0.04, 0.045, 0.63, run0 + runW / 2, 0.95, zb + 0.31, wood);
  // under-cabinet light strip
  const ledStrip = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 3 });
  box(root, runW - 0.1, 0.012, 0.03, run0 + runW / 2, 1.615, zb + 0.32, ledStrip, { cast: false });
  const uc = new THREE.RectAreaLight(0xfff1dc, 6, runW - 0.1, 0.05);
  uc.position.set(run0 + runW / 2, 1.6, zb + 0.3); uc.lookAt(run0 + runW / 2, 0, zb + 0.3); root.add(uc);
  // tall locker
  const lx = run0 + runW + 0.45;
  box(root, 0.82, 2.2, 0.6, lx, 1.1 + 0.02, zb + 0.3, cabBody);
  for (const s of [-1, 1]) {
    box(root, 0.39, 2.12, 0.02, lx + s * 0.205, 1.12, zb + 0.61, cabDoor);
    box(root, 0.012, 0.4, 0.025, lx + s * 0.03, 1.15, zb + 0.635, steel, { cast: false });
  }
  // a few things on the counter
  box(root, 0.38, 0.28, 0.24, -1.9, 1.11, zb + 0.25, std(0xb3332b, 0.35, 0.3)); // red tool case
  box(root, 0.18, 0.32, 0.18, 0.55, 1.13, zb + 0.22, std(0x22262b, 0.5, 0.2));
  const plant = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 24), std(0xe8e4dc, 0.6)); plant.position.set(1.4, 1.05, zb + 0.25); plant.castShadow = true; root.add(plant);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), std(0x3f6b3b, 0.8)); leaves.position.set(1.4, 1.24, zb + 0.25); leaves.scale.y = 0.9; leaves.castShadow = true; root.add(leaves);

  // ---- right wall: slatwall with shelves and bins ----
  const slat = std(0xffffff, 0.6, 0, { map: canvasTex(64, 512, (c, w, h) => {
    c.fillStyle = '#d9dbde'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { c.fillStyle = '#9da2a8'; c.fillRect(0, y, w, 5); c.fillStyle = '#eef0f2'; c.fillRect(0, y + 5, w, 2); }
  }, [20, 1]) });
  const sx = W / 2 - 0.02;
  const slw = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), slat); slw.rotation.y = -Math.PI / 2; slw.position.set(sx, 1.55, -3.6); slw.receiveShadow = true; root.add(slw);
  for (const [z, y] of [[-4.6, 1.85], [-2.7, 1.85]]) {
    box(root, 0.35, 0.025, 1.1, sx - 0.18, y, z, std(0x2e3238, 0.45, 0.4));
    const cols = [0x3b6fb6, 0xe3a33b, 0x6f777f];
    for (let k = 0; k < 3; k++) box(root, 0.3, 0.24, 0.3, sx - 0.18, y + 0.135, z - 0.36 + k * 0.36, std(cols[k], 0.55, 0));
  }
  // hanging bike-ish rack & hose reel shapes
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 16, 48), std(0x1f2226, 0.45, 0.2)); ring.rotation.y = Math.PI / 2; ring.position.set(sx - 0.08, 1.15, -1.8); ring.castShadow = true; root.add(ring);

  // ---- left wall: entry door to the house with a landing step ----
  const doorZ = -4.8, lxw = -W / 2;
  box(root, 0.06, 2.1, 0.95, lxw + 0.04, 1.05 + 0.2, doorZ, std(0xf4f3f0, 0.45));
  box(root, 0.08, 2.18, 0.08, lxw + 0.05, 1.09 + 0.2, doorZ - 0.52, trim);
  box(root, 0.08, 2.18, 0.08, lxw + 0.05, 1.09 + 0.2, doorZ + 0.52, trim);
  box(root, 0.08, 0.08, 1.12, lxw + 0.05, 2.35, doorZ, trim);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), steel); knob.position.set(lxw + 0.1, 1.15, doorZ + 0.38); root.add(knob);
  box(root, 0.5, 0.2, 1.3, lxw + 0.25, 0.1, doorZ, std(0x8f8f8a, 0.8)); // step
  // light switch
  box(root, 0.02, 0.12, 0.07, lxw + 0.01, 1.2, doorZ + 0.75, trim, { cast: false });

  // ---- hex LED grid on the ceiling ----
  const led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 5.5 });
  const hexR = 0.62, tubeW = 0.05;
  const cx0 = 0, cz0 = -3.6;
  const centers = [];
  for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) {
    const x = cx0 + hexR * 1.5 * q, z = cz0 + hexR * Math.sqrt(3) * (r + q / 2);
    if (Math.abs(x) < 2.4 && Math.abs(z - cz0) < 2.6) centers.push([x, z]);
  }
  const seen = new Set();
  for (const [x, z] of centers) {
    for (let k = 0; k < 6; k++) {
      const a0 = k * Math.PI / 3, a1 = (k + 1) * Math.PI / 3;
      const p0 = [x + hexR * Math.cos(a0), z + hexR * Math.sin(a0)], p1 = [x + hexR * Math.cos(a1), z + hexR * Math.sin(a1)];
      const key = [p0, p1].map(p => p.map(v => v.toFixed(2)).join(',')).sort().join('|');
      if (seen.has(key)) continue; seen.add(key);
      const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len - 0.02, 0.03, tubeW), led);
      m.position.set(mx, Hc - 0.04, mz); m.rotation.y = -Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      root.add(m);
    }
  }
  // lights that actually illuminate (soft, from the LED grid area)
  const grid = new THREE.RectAreaLight(0xffffff, 1.6, 4.6, 5.0);
  grid.position.set(0, Hc - 0.08, cz0); grid.lookAt(0, 0, cz0); root.add(grid);
  for (const [x, z, I, a] of [[-1.4, -2.3, 7, 2.4], [1.4, -2.3, 7, 2.4], [-1.4, -4.9, 7, 2.4], [1.4, -4.9, 7, 2.4],
                              [-2.85, -1.6, 4, 3.2], [-2.85, -3.9, 4, 3.2], [2.85, -2.6, 4, 3.2], [2.85, -5.2, 4, 3.2], [-0.6, -6.6, 4, 3.2], [1.5, -6.6, 4, 3.2]]) {
    const s = new THREE.SpotLight(0xfff6ea, I, 0, Math.PI / a, 0.85, 2);
    s.position.set(x, Hc - 0.1, z); s.target.position.set(x, 0, z);
    s.castShadow = true; s.shadow.mapSize.set(512, 512); s.shadow.radius = 10; s.shadow.blurSamples = 16; s.shadow.bias = -0.0005;
    s.shadow.camera.near = 0.2; s.shadow.camera.far = 6;
    root.add(s); root.add(s.target);
  }
  // daylight through the open garage door behind the camera
  const day = new THREE.RectAreaLight(0xdfeaff, 1.6, 5.6, 2.4);
  day.position.set(0, 1.3, 1.4); day.lookAt(0, 1.0, -4); root.add(day);
  root.add(new THREE.HemisphereLight(0xffffff, 0x8a8a88, 0.12));

  const camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.05, 50);
  camera.position.set(0.35, 1.55, 0.9);
  camera.lookAt(-0.15, 0.55, -5.2);
  return { camera, floor, background: new THREE.Color(0xdfe6ee), aoScale: 1.6, exposure: 0.74, bloom: 0.5, lightGain: 0.1, coordX0: -4, coordZ0: -9, coordRange: 12 };
}
