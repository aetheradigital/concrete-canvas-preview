# Floor render pipeline

The site's realistic floor images are rendered 3D scenes that the browser recolors live
(`assets/floor-engine.js`). Nothing here runs on the live site.

1. **Textures** – `python3 tex.py out/` writes grayscale "index" textures for each finish
   (flake, quartz, metallic, solid, overlay, urethane) plus a full-color bare-concrete
   texture. Copy them to `assets/floor/tex/`.
2. **Scenes** – three.js scenes (`garage.js`, `closeup.js`, `swatch.js`, `lanai.js`, `pool.js`).
   Serve a folder containing this directory as `r3d/` and three.js r160 as `three/`, then
   `node run.js <scene> 2560 1440 raw/<scene>` renders the passes in headless Chromium
   (closeup/swatch: 1600 1200).
3. **Post** – `python3 post.py raw/<scene> out/<scene> 2` downsamples and writes `room.jpg`,
   `refl0-2.jpg`, `light.jpg`, `fa.png`, `fb.png`, `meta.json`. Add `reflGain` and `joints`
   to `meta.json`, then copy the folder to `assets/floor/<scene>/`.

`comp.py` is a Python copy of the browser compositor for previewing a finish/color offline.
