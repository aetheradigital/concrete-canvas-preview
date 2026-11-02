"""Turn raw 2x pass renders into web assets.

usage: post.py <rawdir> <outdir> <factor> [blur0 blur1 blur2]
Outputs (at 1x):
  room.jpg      scene with a black floor
  refl0/1/2.jpg mirror reflection at three roughness levels
  fa.png        R,G = world x (16 bit), B = floor coverage
  fb.png        R,G = world z (16 bit), B = fresnel
  light.jpg     floor diffuse lighting (gray)
  meta.json
"""
import sys, json, os
import numpy as np
from scipy import ndimage
from PIL import Image

raw, out, k = sys.argv[1], sys.argv[2], int(sys.argv[3])
blurs = [float(v) for v in sys.argv[4:7]] if len(sys.argv) > 4 else [1.2, 4.0, 10.0]
os.makedirs(out, exist_ok=True)
meta = json.load(open(f'{raw}/meta.json'))


def load(n):
    return np.asarray(Image.open(f'{raw}/{n}.png').convert('RGB')).astype(np.float32)


def down(a):
    h, w = a.shape[:2]
    return a.reshape(h // k, k, w // k, k, *a.shape[2:]).mean((1, 3))


room = load('room'); refl = load('refl'); light = load('light')
cx = load('coordX'); cz = load('coordZ')
mask = (cx[..., 2] > 127).astype(np.float32)
qx = cx[..., 0] * 256 + cx[..., 1]
qz = cz[..., 0] * 256 + cz[..., 1]
fres = cz[..., 2] / 255.0
wx = (qx - 1) / 65534.0 * meta['range'] + meta['x0']
wz = (qz - 1) / 65534.0 * meta['range'] + meta['z0']

cov = down(mask)
safe = np.maximum(cov, 1e-6)
X = down(wx * mask) / safe
Z = down(wz * mask) / safe
F = down(fres * mask) / safe
L = down(light[..., 0] * mask) / safe

# fill coordinates a couple of pixels past the floor edge so filtering never reads junk
inside = cov > 0
idx = ndimage.distance_transform_edt(~inside, return_distances=False, return_indices=True)
X = X[idx[0], idx[1]]; Z = Z[idx[0], idx[1]]; F = F[idx[0], idx[1]]; L = L[idx[0], idx[1]]

R = down(room)
# subtle photographic finish on the plate: vignette + grain
h, w = cov.shape
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
vig = 1 - 0.18 * (((xx / w - 0.5) * 2) ** 2 + ((yy / h - 0.5) * 2) ** 2)
vig = np.clip(vig, 0.75, 1)[..., None]
R = R * vig
R += (np.random.default_rng(1).standard_normal(R.shape[:2]) * 2.2)[..., None]
Image.fromarray(np.clip(R, 0, 255).astype(np.uint8)).save(f'{out}/room.jpg', quality=88, optimize=True, progressive=True)

Rf = down(refl) * vig
for i, s in enumerate(blurs):
    b = np.stack([ndimage.gaussian_filter(Rf[..., c], s) for c in range(3)], -1) if s > 0 else Rf
    # keep only what the floor can show (+ margin) to help compression
    m = ndimage.binary_dilation(inside, iterations=4)[..., None]
    Image.fromarray(np.clip(b * m, 0, 255).astype(np.uint8)).save(f'{out}/refl{i}.jpg', quality=82, optimize=True, progressive=True)


def enc16(v, lo, rng):
    q = np.clip(np.round((v - lo) / rng * 65534) + 1, 1, 65535).astype(np.uint32)
    return (q >> 8).astype(np.uint8), (q & 255).astype(np.uint8)

xh, xl = enc16(X, meta['x0'], meta['range'])
zh, zl = enc16(Z, meta['z0'], meta['range'])
Image.fromarray(np.stack([xh, xl, np.clip(cov * 255 + 0.5, 0, 255).astype(np.uint8)], -1)).save(f'{out}/fa.png', optimize=True)
Image.fromarray(np.stack([zh, zl, np.clip(F * 255 + 0.5, 0, 255).astype(np.uint8)], -1)).save(f'{out}/fb.png', optimize=True)
Image.fromarray(np.clip(L * vig[..., 0], 0, 255).astype(np.uint8)).save(f'{out}/light.jpg', quality=92, optimize=True)
meta2 = dict(meta); meta2['W'] = w; meta2['H'] = h
meta2['lightRef'] = float(np.percentile(L[inside], 90))
json.dump(meta2, open(f'{out}/meta.json', 'w'))
print('post', out, w, h, 'lightRef', meta2['lightRef'])
