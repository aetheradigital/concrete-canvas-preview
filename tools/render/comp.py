"""Reference compositor (mirrors the browser engine) for previews.
usage: comp.py <scenedir> <finish> <base> <light> <dark> <out.png> [tile] """
import sys, json
import numpy as np
from scipy import ndimage
from PIL import Image
import os; HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, HERE + '/tex')
from lut import lut

FIN = {  # texture file, metres per tile, reflection level, reflection strength, light gain
    'flake': ('flake.png', 0.5, 1, 1.0, 1.0),
    'metallic': ('metallic.jpg', 6.0, 0, 1.5, 1.0),
    'quartz': ('quartz.png', 0.3, 1, 0.6, 1.0),
    'solid': ('solid.jpg', 1.0, 1, 1.2, 1.0),
    'overlay': ('overlay.jpg', 4.0, 2, 0.35, 1.0),
    'urethane': ('urethane.jpg', 0.4, 2, 0.25, 1.0),
    'bare': ('bare.jpg', 7.0, 2, 0.15, 1.0),
}

d, fin, base, lt, dk, outp = sys.argv[1:7]
TEX = HERE + '/tex/out/'
meta = json.load(open(f'{d}/meta.json'))
tf, tile, rl, rs, lg = FIN[fin]
if len(sys.argv) > 7: tile = float(sys.argv[7])
room = np.asarray(Image.open(f'{d}/room.jpg')).astype(np.float32)
refl = np.asarray(Image.open(f'{d}/refl{rl}.jpg')).astype(np.float32)
fa = np.asarray(Image.open(f'{d}/fa.png')).astype(np.float32)
fb = np.asarray(Image.open(f'{d}/fb.png')).astype(np.float32)
L = np.asarray(Image.open(f'{d}/light.jpg').convert('L')).astype(np.float32)
X = (fa[..., 0] * 256 + fa[..., 1] - 1) / 65534 * meta['range'] + meta['x0']
Z = (fb[..., 0] * 256 + fb[..., 1] - 1) / 65534 * meta['range'] + meta['z0']
cov = fa[..., 2] / 255; F = fb[..., 2] / 255

t = np.asarray(Image.open(TEX + tf))
if fin == 'bare':
    col = t.astype(np.float32)
else:
    col = lut(fin, base, lt, dk)[t]
T = col.shape[0]
u = X / tile * T; v = Z / tile * T
# mip level from screen-space derivative
du = np.hypot(np.gradient(u, axis=1), np.gradient(v, axis=1))
dv = np.hypot(np.gradient(u, axis=0), np.gradient(v, axis=0))
lod = np.log2(np.maximum(np.maximum(du, dv), 1))
levels = [col]
for i in range(8):
    c = levels[-1]
    if c.shape[0] < 4: break
    levels.append(c.reshape(c.shape[0] // 2, 2, c.shape[1] // 2, 2, 3).mean((1, 3)))
outc = np.zeros(room.shape, np.float32)
for i, lv in enumerate(levels):
    w = np.clip(1 - np.abs(lod - i), 0, 1)
    if i == 0: w = np.where(lod <= 0, 1, w)
    if i == len(levels) - 1: w = np.where(lod >= i, 1, w)
    if not w.any(): continue
    n = lv.shape[0]; s = n / T
    samp = np.stack([ndimage.map_coordinates(lv[..., c], [np.mod(v * s - 0.5, n), np.mod(u * s - 0.5, n)], order=1, mode='grid-wrap') for c in range(3)], -1)
    outc += samp * w[..., None]
light = L / meta['lightRef'] * lg
r = refl / 255.0
hdr = r + 5.0 * np.clip(r - 0.86, 0, None) / 0.14
rg = meta.get('reflGain', 1.0)
floor = outc * light[..., None] * (1 - F[..., None] * 0.5) + 255 * hdr * (F * rs * rg)[..., None]
res = room + floor * cov[..., None]
Image.fromarray(np.clip(res, 0, 255).astype(np.uint8)).save(outp)
print('saved', outp)
