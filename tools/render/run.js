// usage: node run.js <scene> <W> <H> <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [scene, W, H, outdir] = process.argv.slice(2);
  fs.mkdirSync(outdir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('[page]', m.text().slice(0, 300)); });
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto('http://localhost:8766/r3d/render.html');
  await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const t0 = Date.now();
  const out = await p.evaluate(([s, w, h]) => window.__go(s, +w, +h), [scene, W, H]);
  if (out.error) { console.log(out.error); process.exit(1); }
  for (const [k, v] of Object.entries(out)) {
    if (k === 'meta') fs.writeFileSync(`${outdir}/meta.json`, JSON.stringify(v));
    else fs.writeFileSync(`${outdir}/${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
  }
  console.log('done', scene, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await b.close();
})();
