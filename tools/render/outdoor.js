import { THREE, std, box, canvasTex, noiseFill, rand } from './lib.js';

// Southwest Florida backyard: covered lanai, screened pool cage, pool, palms.
// mode 'lanai' (daytime, from under the covered lanai) or 'pool' (golden hour, at the pool).
export function buildOutdoor({ root, pmrem }, mode) {
  const R = rand(mode === 'pool' ? 17 : 9);
  const golden = mode === 'pool';

  // ---------- sky (equirect) ----------
  const sky = document.createElement('canvas'); sky.width = 2048; sky.height = 1024;
  {
    const c = sky.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 512);
    if (golden) { g.addColorStop(0, '#3d5d93'); g.addColorStop(0.45, '#9a8fb2'); g.addColorStop(0.75, '#f3a77a'); g.addColorStop(1, '#ffd9a0'); }
    else { g.addColorStop(0, '#2f78c8'); g.addColorStop(0.55, '#79b4e6'); g.addColorStop(1, '#d9ecf8'); }
    c.fillStyle = g; c.fillRect(0, 0, 2048, 512);
    c.fillStyle = golden ? '#7d6a5a' : '#8fa7a0'; c.fillRect(0, 512, 2048, 512);
    // clouds
    for (let i = 0; i < 70; i++) {
      const x = R() * 2048, y = 180 + R() * 300, w = 80 + R() * 260, h = 14 + R() * 40;
      const cg = c.createRadialGradient(x, y, 0, x, y, w);
      const a = 0.18 + R() * 0.35;
      cg.addColorStop(0, golden ? `rgba(255,214,190,${a})` : `rgba(255,255,255,${a})`); cg.addColorStop(1, 'rgba(255,255,255,0)');
      c.save(); c.translate(x, y); c.scale(1, h / w); c.translate(-x, -y); c.fillStyle = cg; c.beginPath(); c.arc(x, y, w, 0, Math.PI * 2); c.fill(); c.restore();
    }
    // sun glow
    const sx = golden ? 1024 * 1.25 : 1024 * 1.1, sy = golden ? 470 : 140;
    const sg = c.createRadialGradient(sx, sy, 0, sx, sy, golden ? 420 : 260);
    sg.addColorStop(0, golden ? 'rgba(255,240,200,1)' : 'rgba(255,255,245,1)'); sg.addColorStop(0.06, golden ? 'rgba(255,200,120,.9)' : 'rgba(255,255,240,.8)'); sg.addColorStop(1, 'rgba(255,220,160,0)');
    c.fillStyle = sg; c.fillRect(0, 0, 2048, 1024);
    // distant tree line along the horizon
    for (let layer = 0; layer < 2; layer++) {
      c.fillStyle = layer ? (golden ? '#2e2b2a' : '#355232') : (golden ? '#4a4140' : '#5b7a58');
      for (let x = -20; x < 2068; x += 6 + R() * 10) { const r = 6 + R() * (layer ? 14 : 10); const y = 512 - (layer ? 8 : 16) - R() * 10; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      c.fillRect(0, 505 - (layer ? 4 : 10), 2048, 20);
    }
  }
  const skyTex = new THREE.CanvasTexture(sky); skyTex.mapping = THREE.EquirectangularReflectionMapping; skyTex.colorSpace = THREE.SRGBColorSpace;
  const env = pmrem.fromEquirectangular(skyTex).texture;

  // ---------- materials ----------
  const stucco = std(0xffffff, 0.95, 0, { map: canvasTex(512, 512, (c, w, h) => noiseFill(c, w, h, '#efe6d8', 0.05, 60000, 2), [6, 3]) });
  const white = std(0xf6f5f1, 0.55);
  const frameMat = std(0xf3f3f0, 0.35, 0.4);
  const screen = new THREE.MeshStandardMaterial({ color: 0x2a2d30, roughness: 0.9, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const planks = std(0xffffff, 0.7, 0, { map: canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = golden ? '#e6d2b5' : '#f3efe8'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x, 0, 2, h); }
  }, [10, 6]) });
  const coping = std(0xffffff, 0.75, 0, { map: canvasTex(512, 512, (c, w, h) => {
    noiseFill(c, w, h, '#e3d6c0', 0.08, 50000, 2);
    c.strokeStyle = 'rgba(120,100,80,.35)'; c.lineWidth = 3; for (let x = 0; x <= w; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  }, [8, 1]) });
  const grass = std(0xffffff, 0.95, 0, { map: canvasTex(512, 512, (c, w, h) => noiseFill(c, w, h, golden ? '#4d6a35' : '#5b8a3d', 0.18, 120000, 2), [30, 30]) });
  const hedge = std(0xffffff, 0.9, 0, { map: canvasTex(512, 256, (c, w, h) => noiseFill(c, w, h, '#2f5a2c', 0.35, 90000, 4), [6, 1]) });

  // ---------- layout ----------
  // cage: x -6..6, z +0.6 (house) .. -13 ; covered lanai: z 0.6 .. -3.6
  const X0 = -6, X1 = 6, Z0 = 0.6, Z1 = -13;
  const pool = { x0: -0.8, x1: 3.4, z0: -5.4, z1: -11.8 };

  // coated deck with pool cut-out
  const shape = new THREE.Shape();
  shape.moveTo(X0, -Z0); shape.lineTo(X1, -Z0); shape.lineTo(X1, -Z1); shape.lineTo(X0, -Z1); shape.lineTo(X0, -Z0);
  const hole = new THREE.Path();
  const pc = 0.35; // coping width (separate material)
  hole.moveTo(pool.x0 - pc, -(pool.z0 + pc)); hole.lineTo(pool.x0 - pc, -(pool.z1 - pc)); hole.lineTo(pool.x1 + pc, -(pool.z1 - pc)); hole.lineTo(pool.x1 + pc, -(pool.z0 + pc));
  shape.holes.push(hole);
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), std(0x777777, 1));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  // coping ring (raised 2 cm)
  const cw = pool.x1 - pool.x0, cd = pool.z0 - pool.z1;
  box(root, cw + 2 * pc, 0.04, pc, (pool.x0 + pool.x1) / 2, 0.02, pool.z0 + pc / 2, coping);
  box(root, cw + 2 * pc, 0.04, pc, (pool.x0 + pool.x1) / 2, 0.02, pool.z1 - pc / 2, coping);
  box(root, pc, 0.04, cd, pool.x0 - pc / 2, 0.02, (pool.z0 + pool.z1) / 2, coping);
  box(root, pc, 0.04, cd, pool.x1 + pc / 2, 0.02, (pool.z0 + pool.z1) / 2, coping);
  // pool shell + water
  const plaster = std(0x5cc9da, 0.85);
  const depth = 1.4;
  box(root, cw, 0.05, cd, (pool.x0 + pool.x1) / 2, -depth, (pool.z0 + pool.z1) / 2, plaster, { cast: false });
  box(root, cw, depth, 0.05, (pool.x0 + pool.x1) / 2, -depth / 2, pool.z0, plaster, { cast: false });
  box(root, cw, depth, 0.05, (pool.x0 + pool.x1) / 2, -depth / 2, pool.z1, plaster, { cast: false });
  box(root, 0.05, depth, cd, pool.x0, -depth / 2, (pool.z0 + pool.z1) / 2, plaster, { cast: false });
  box(root, 0.05, depth, cd, pool.x1, -depth / 2, (pool.z0 + pool.z1) / 2, plaster, { cast: false });
  // tile band at the waterline
  const tile = std(0x1f5f8a, 0.25, 0.1);
  box(root, cw, 0.15, 0.06, (pool.x0 + pool.x1) / 2, -0.12, pool.z0 - 0.01, tile, { cast: false });
  box(root, 0.06, 0.15, cd, pool.x0 + 0.01, -0.12, (pool.z0 + pool.z1) / 2, tile, { cast: false });
  const nC = document.createElement('canvas'); nC.width = nC.height = 512;
  {
    const c = nC.getContext('2d'); const img = c.createImageData(512, 512);
    const hgt = (x, y) => Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) * 0.5 + Math.sin(y * 0.09 + Math.sin(x * 0.04) * 3) * 0.5 + Math.sin((x + y) * 0.13) * 0.25;
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
      const n = new THREE.Vector3(-dx, -dy, 2).normalize(); const i = (y * 512 + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }
  const nTex = new THREE.CanvasTexture(nC); nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping; nTex.repeat.set(3, 5);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(cw, cd), new THREE.MeshPhysicalMaterial({
    color: 0x22b8cc, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.88,
    emissive: 0x0b8fa3, emissiveIntensity: golden ? 0.35 : 0.55, clearcoat: 1, clearcoatRoughness: 0.03,
    normalMap: nTex, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 0.6 }));
  water.rotation.x = -Math.PI / 2; water.position.set((pool.x0 + pool.x1) / 2, -0.09, (pool.z0 + pool.z1) / 2); root.add(water);

  // house wall behind the lanai (seen in reflections) with sliding doors
  box(root, 14, 3.2, 0.2, 0, 1.6, Z0 + 0.1, stucco);
  const glass = std(0x2b3a44, 0.05, 0.1);
  for (const x of [-3.2, -1.1, 1.0, 3.1]) box(root, 2.0, 2.3, 0.04, x, 1.15, Z0 - 0.02, glass, { cast: false });
  // covered lanai roof + ceiling + columns + fascia
  const roofZ = -3.6;
  box(root, X1 - X0, 0.06, Z0 - roofZ, 0, 2.95, (Z0 + roofZ) / 2, planks);
  box(root, X1 - X0, 0.35, 0.25, 0, 2.8, roofZ, white);
  for (const x of [-5.85, 5.85]) box(root, 0.3, 2.65, 0.3, x, 1.33, roofZ, white);
  box(root, X1 - X0, 0.45, 0.3, 0, 2.72, roofZ, white);
  // ceiling fan
  const fan = new THREE.Group(); fan.position.set(-1.0, 2.55, -1.6);
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.14, 24), std(0x2a2a2a, 0.4, 0.6)));
  for (let i = 0; i < 5; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.13), std(0x6b4a2e, 0.6)); bl.position.set(Math.cos(i * 1.2566) * 0.42, 0, Math.sin(i * 1.2566) * 0.42); bl.rotation.y = -i * 1.2566; fan.add(bl); }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), std(0x2a2a2a, 0.4, 0.6)); rod.position.y = 0.2; fan.add(rod);
  fan.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(fan);
  // recessed cans
  const can = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2dc, emissiveIntensity: golden ? 3 : 1.2 });
  for (const x of [-4, -1, 2, 4.8]) for (const z of [-0.6, -2.6]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 24), can); d.position.set(x, 2.92, z); root.add(d); }

  // screen cage: posts, rails, roof beams + screen panels
  const postH = 3.6, peak = 5.4;
  const posts = [];
  for (let z = roofZ; z >= Z1 - 0.01; z -= 1.88) { posts.push([X0, z]); posts.push([X1, z]); }
  for (let x = X0 + 2; x < X1 - 0.5; x += 2) posts.push([x, Z1]);
  for (const [x, z] of posts) box(root, 0.08, postH, 0.08, x, postH / 2, z, frameMat);
  // chair rail and top rail on sides and back
  for (const y of [0.9, postH]) {
    box(root, 0.06, 0.07, roofZ - Z1, X0, y, (roofZ + Z1) / 2, frameMat);
    box(root, 0.06, 0.07, roofZ - Z1, X1, y, (roofZ + Z1) / 2, frameMat);
    box(root, X1 - X0, 0.07, 0.06, 0, y, Z1, frameMat);
  }
  // roof beams (mansard style)
  for (let z = roofZ; z >= Z1 - 0.01; z -= 1.88) {
    for (const s of [-1, 1]) {
      const a = new THREE.Vector3(s * 6, postH, z), b = new THREE.Vector3(s * 2.2, peak, z);
      const len = a.distanceTo(b); const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.06), frameMat);
      m.position.copy(a).add(b).multiplyScalar(0.5); m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x); m.castShadow = true; root.add(m);
    }
    box(root, 4.4, 0.08, 0.06, 0, peak, z, frameMat);
  }
  for (const x of [-2.2, 2.2]) box(root, 0.06, 0.08, roofZ - Z1, x, peak, (roofZ + Z1) / 2, frameMat);
  // screens
  const scr = (w, h, x, y, z, ry = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screen); m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = rz; m.castShadow = false; root.add(m); };
  scr(roofZ - Z1, postH, X0, postH / 2, (roofZ + Z1) / 2, Math.PI / 2);
  scr(roofZ - Z1, postH, X1, postH / 2, (roofZ + Z1) / 2, -Math.PI / 2);
  scr(X1 - X0, postH, 0, postH / 2, Z1);
  // kick plate along the bottom of the cage
  box(root, 0.03, 0.5, roofZ - Z1, X0, 0.25, (roofZ + Z1) / 2, std(0xd8d4cc, 0.6));
  box(root, 0.03, 0.5, roofZ - Z1, X1, 0.25, (roofZ + Z1) / 2, std(0xd8d4cc, 0.6));
  box(root, X1 - X0, 0.5, 0.03, 0, 0.25, Z1, std(0xd8d4cc, 0.6));

  // ---------- furniture ----------
  const wicker = std(0x3a3430, 0.7);
  const cushion = std(golden ? 0xe9e1d3 : 0xdcd8d0, 0.95);
  const pillowA = std(0x1f7f8c, 0.9), pillowB = std(0xf08a5d, 0.9);
  // sectional under the lanai, left
  const sofa = (x, z, w, d, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const add = (m) => { m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, d), wicker)).position.y = 0.2;
    add(new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.14, d - 0.12), cushion)).position.set(0, 0.43, 0.04);
    add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, 0.16), wicker)).position.set(0, 0.55, -d / 2 + 0.08);
    add(new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.36, 0.14), cushion)).position.set(0, 0.68, -d / 2 + 0.2);
    for (let i = 0; i < Math.round(w / 0.9); i++) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.12), i % 2 ? pillowA : pillowB)); p.position.set(-w / 2 + 0.45 + i * 0.9, 0.66, -d / 2 + 0.33); p.rotation.x = -0.25; }
    root.add(g);
  };
  sofa(-3.6, -0.7, 2.6, 0.9, 0);
  sofa(-5.1, -2.3, 2.0, 0.9, Math.PI / 2);
  box(root, 1.1, 0.4, 0.7, -3.4, 0.2, -2.0, std(0x6b4a2e, 0.55));
  // lounge chairs by the pool
  const lounger = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 1.4), std(0xf5f3ee, 0.5)); m1.position.set(0, 0.32, 0.25); g.add(m1);
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.75), std(0xf5f3ee, 0.5)); m2.position.set(0, 0.55, -0.7); m2.rotation.x = 0.75; g.add(m2);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.07, 1.36), std(0x1f7f8c, 0.9)); c1.position.set(0, 0.39, 0.25); g.add(c1);
    for (const sx of [-0.3, 0.3]) for (const sz of [-0.85, 0.85]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), std(0xf5f3ee, 0.5)); l.position.set(sx, 0.15, sz); g.add(l); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); root.add(g);
  };
  lounger(-2.4, -7.6, 0.1); lounger(-3.5, -7.8, 0.1); lounger(-2.6, -10.6, 0.05);
  // potted plants
  const potM = std(0xe7e1d6, 0.7), leafM = std(0x3d6e3a, 0.85);
  for (const [x, z, s] of [[5.2, -3.2, 1.2], [-5.3, -12.6, 1], [5.3, -12.2, 1.1], [-5.3, -12.2, 0.9]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.22 * s, 0.55 * s, 24), potM); p.position.set(x, 0.275 * s, z); p.castShadow = true; root.add(p);
    for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 16, 12), leafM); l.position.set(x + (R() - 0.5) * 0.4 * s, 0.75 * s + R() * 0.5 * s, z + (R() - 0.5) * 0.4 * s); l.scale.set(1, 1.4, 0.6); l.rotation.set(R(), R(), R()); l.castShadow = true; root.add(l); }
  }

  // ---------- outside the cage ----------
  for (const [w, d, x, z] of [[120, 80, 0, -53.2], [54, 40, -33.1, 0], [54, 40, 33.1, 0]]) {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(w, d), grass); lawn.rotation.x = -Math.PI / 2; lawn.position.set(x, -0.03, z); lawn.receiveShadow = true; root.add(lawn);
  }
  box(root, 34, 1.6, 1.2, 0, 0.8, -19, hedge);
  box(root, 1.2, 1.6, 20, -14, 0.8, -9, hedge);
  box(root, 1.2, 1.6, 20, 14, 0.8, -9, hedge);
  // palms
  const frondTex = canvasTex(256, 1024, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#4c7a2e'; c.lineWidth = 6; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
    for (let y = 30; y < h - 10; y += 14) {
      const len = (w / 2 - 8) * Math.sin(Math.PI * (y / h)) * 0.95 + 10;
      for (const s of [-1, 1]) {
        const gg = c.createLinearGradient(w / 2, y, w / 2 + s * len, y + 50); gg.addColorStop(0, '#3e6f2a'); gg.addColorStop(1, '#6f9a3c');
        c.strokeStyle = gg; c.lineWidth = 7; c.beginPath(); c.moveTo(w / 2, y); c.quadraticCurveTo(w / 2 + s * len * 0.5, y + 10, w / 2 + s * len, y + 60); c.stroke();
      }
    }
  });
  const frondMat = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75, color: golden ? 0xc8c0a0 : 0xffffff });
  const trunkMat = std(0xffffff, 0.95, 0, { map: canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#8b7d6b'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 12) { c.fillStyle = 'rgba(60,50,40,.45)'; c.fillRect(0, y, w, 3); } }, [1, 8]) });
  const palm = (x, z, H, lean, rot) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const n = 14; let px = 0, py = 0;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const x0 = lean * t0 * t0 * H, x1 = lean * t1 * t1 * H, y0 = t0 * H, y1 = t1 * H;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - 0.04 * t1, 0.17 - 0.04 * t0, len, 16), trunkMat);
      seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); seg.rotation.z = -Math.atan2(x1 - x0, y1 - y0); seg.castShadow = true; g.add(seg);
      px = x1; py = y1;
    }
    for (let k = 0; k < 14; k++) {
      const L = 2.4 + R() * 0.8;
      const geo = new THREE.PlaneGeometry(0.9, L, 1, 12); geo.translate(0, L / 2, 0);
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) { const yy = pos.getY(v); pos.setZ(v, -0.35 * yy * yy / L * (1.2 + R() * 0.2)); }
      geo.computeVertexNormals();
      const f = new THREE.Mesh(geo, frondMat); f.castShadow = true;
      const holder = new THREE.Group(); holder.position.set(px, py, 0);
      holder.rotation.y = k / 14 * Math.PI * 2 + R() * 0.3;
      f.rotation.x = -(0.5 + R() * 0.9);
      holder.add(f); g.add(holder);
    }
    root.add(g);
  };
  palm(-8.5, -15.5, 6.2, 0.12, 0.3); palm(-4.6, -17.5, 7.2, -0.06, 1.2); palm(7.8, -15.8, 5.8, -0.1, 2.0); palm(10.5, -19, 6.8, 0.1, 0.4); palm(2.0, -20.5, 7.4, 0.05, 2.6);
  palm(-11, -6, 6.0, 0.15, 1.7); palm(11.5, -8, 6.4, -0.12, 0.9);

  // ---------- lighting ----------
  const sun = new THREE.DirectionalLight(golden ? 0xffb877 : 0xfff4e2, golden ? 3.2 : 3.4);
  if (golden) sun.position.set(-9, 5.5, -18); else sun.position.set(-8, 14, -7);
  sun.target.position.set(0, 0, -6);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 2;
  root.add(sun); root.add(sun.target);
  root.add(new THREE.HemisphereLight(golden ? 0xbfb0d0 : 0xcfe6ff, 0x7c8a66, golden ? 0.35 : 0.55));
  const ceilFill = new THREE.RectAreaLight(0xfff0dc, golden ? 1.2 : 0.6, 11, 3.6); ceilFill.position.set(0, 2.9, -1.5); ceilFill.lookAt(0, 0, -1.5); root.add(ceilFill);

  let camera;
  if (mode === 'pool') {
    camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 200);
    camera.position.set(-5.2, 1.65, -4.4); camera.lookAt(1.2, 0.2, -12.0);
  } else {
    camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.05, 200);
    camera.position.set(1.8, 1.55, 0.25); camera.lookAt(-0.6, 0.45, -8.5);
  }
  return { camera, floor, background: skyTex, environment: env, exposure: golden ? 0.82 : 0.78, bloom: 0.4, bloomThreshold: 3.0, lightGain: golden ? 0.16 : 0.13, aoScale: 1.4,
    coordX0: -7, coordZ0: -14, coordRange: 16 };
}
