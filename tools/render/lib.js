import * as THREE from 'three';
import { RoomEnvironment } from '/three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from '/three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from '/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '/three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from '/three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from '/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '/three/examples/jsm/postprocessing/OutputPass.js';

export { THREE };
RectAreaLightUniformsLib.init();

// ---------- helpers ----------
export function std(color, rough = 0.8, metal = 0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}
export function box(parent, w, h, d, x, y, z, mat, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== false; m.receiveShadow = true;
  if (opts.ry) m.rotation.y = opts.ry;
  parent.add(m); return m;
}
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
export function noiseFill(ctx, w, h, base, amp, count = 40000, size = 2) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < count; i++) {
    const v = (Math.random() - 0.5) * amp;
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}
export function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------- pass rendering ----------
const black = new THREE.MeshBasicMaterial({ color: 0x000000 });

export async function renderPasses(build, W, H, opts = {}) {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const root = new THREE.Group(); scene.add(root);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const ctx = build({ THREE, scene, root, renderer, pmrem, envTex });
  const { camera, floor, floorY = 0, exposure = 1, bloom = 0.25, aoScale = 1, lightGain = 1 } = ctx;
  scene.environment = ctx.environment || envTex;
  if (ctx.background !== undefined) scene.background = ctx.background;
  camera.aspect = W / H; camera.updateProjectionMatrix();

  const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
  const orig = new Map(meshes.map(m => [m, m.material]));
  const floorBlack = new THREE.MeshBasicMaterial({ color: 0x000000 });

  function composerFor(tone, withBloom, ao) {
    renderer.toneMapping = tone ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = tone ? exposure : 1;
    const comp = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 0 }));
    comp.setPixelRatio(1); comp.setSize(W, H);
    comp.addPass(new RenderPass(scene, camera));
    if (ao) {
      const g = new GTAOPass(scene, camera, W, H);
      g.output = GTAOPass.OUTPUT.Default;
      g.blendIntensity = ao;
      g.updateGtaoMaterial({ radius: 0.45 * aoScale, distanceExponent: 1.4, thickness: 1.0, scale: 1.0, samples: 16 });
      g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      comp.addPass(g);
    }
    if (withBloom) comp.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), bloom, 0.35, ctx.bloomThreshold || 2.5));
    comp.addPass(new OutputPass());
    return comp;
  }
  const grab = () => canvas.toDataURL('image/png');
  const out = {};
  const setAll = fn => meshes.forEach(m => { m.material = fn(m); });
  const restore = () => meshes.forEach(m => { m.material = orig.get(m); m.visible = true; });

  // 1) room beauty, floor black
  restore(); floor.material = floorBlack;
  scene.environment = ctx.environment || envTex;
  composerFor(true, true, 1).render(); out.room = grab();

  // 2) reflection: mirror root about the floor plane, hide floor
  restore(); floor.visible = false;
  root.scale.y = -1; root.position.y = 2 * floorY; root.updateMatrixWorld(true);
  composerFor(true, true, 1).render(); out.refl = grab();
  root.scale.y = 1; root.position.y = 0; root.updateMatrixWorld(true);
  meshes.forEach(m => { m.visible = true; });

  // 3) floor diffuse lighting: floor white, everything else black (still occludes)
  const lightFloor = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 1, metalness: 0, specularIntensity: 0 });
  setAll(m => m === floor ? lightFloor : (ctx.keepInLight && ctx.keepInLight.has(m) ? orig.get(m) : black));
  const savedEnvI = scene.environmentIntensity;
  const comp3 = composerFor(false, false, 1.0);
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = lightGain;
  comp3.render(); out.light = grab();
  // 4) coordinates (16-bit world x / z) + fresnel; no post, no AA
  renderer.toneMapping = THREE.NoToneMapping;
  const range = ctx.coordRange || 16.0, x0 = ctx.coordX0 || -8, z0 = ctx.coordZ0 || -8;
  const coordMat = (which) => new THREE.ShaderMaterial({
    uniforms: { range: { value: range }, o: { value: new THREE.Vector2(x0, z0) }, which: { value: which } },
    vertexShader: `varying vec3 wp; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float range; uniform vec2 o; uniform int which; varying vec3 wp;
      void main(){
        float v = (which==0 ? wp.x - o.x : wp.z - o.y) / range;
        float q = clamp(floor(v*65534.0+0.5)+1.0, 1.0, 65535.0);
        float hi = floor(q/256.0); float lo = q - hi*256.0;
        float b;
        if (which==0) { b = 1.0; } else {
          vec3 V = normalize(cameraPosition - wp);
          float c = clamp(V.y, 0.0, 1.0);
          b = 0.04 + 0.96*pow(1.0-c, 5.0);
        }
        gl_FragColor = vec4(hi/255.0, lo/255.0, b, 1.0);
      }`
  });
  scene.background = new THREE.Color(0x000000);
  for (const [k, w] of [['coordX', 0], ['coordZ', 1]]) {
    setAll(m => m === floor ? coordMat(w) : black);
    renderer.setRenderTarget(null); renderer.render(scene, camera); out[k] = grab();
  }
  out.meta = { W, H, range, x0, z0 };
  return out;
}
