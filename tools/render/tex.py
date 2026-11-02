"""Generate recolorable floor textures.

Band finishes (flake, quartz): index = 16 + 40*k + round(t*24), k = colour class
  0 dark, 1 base, 2 light, 3 gray, 4 white, 5 black; t = tone 0..1. 0..15 = base coat.
Continuous finishes (metallic, solid, overlay, urethane): index 0..255 through a ramp.
bare: full-colour RGB concrete.
"""
import sys, os
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)


def field(n, beta, aniso=(1.0, 1.0), seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    w = r.standard_normal((n, n))
    fx = np.fft.fftfreq(n)[None, :] * aniso[0]
    fy = np.fft.fftfreq(n)[:, None] * aniso[1]
    f = np.sqrt(fx ** 2 + fy ** 2); f[0, 0] = 1
    s = np.fft.fft2(w) / f ** beta; s[0, 0] = 0
    x = np.real(np.fft.ifft2(s))
    return ((x - x.mean()) / x.std()).astype(np.float32)


def nz(a, lo=1, hi=99):
    l, h = np.percentile(a, lo), np.percentile(a, hi)
    return np.clip((a - l) / (h - l), 0, 1)


def band(k, t):
    return 16 + 40 * k + np.round(np.clip(t, 0, 1) * 24)


# ---------------------------------------------------------------- flake
def flake(T=1024, pxmm=2.05, seed=3):
    r = np.random.default_rng(seed)
    img = Image.new('L', (T, T), 8)
    d = ImageDraw.Draw(img)
    weights = np.array([0.30, 0.30, 0.20, 0.10, 0.06, 0.04])
    n = int(T * T / (pxmm * 6.0) ** 2 * 3.2)
    for _ in range(n):
        k = r.choice(6, p=weights)
        t = r.uniform(0.15, 1.0)
        v = int(band(k, t))
        size = r.lognormal(np.log(6.0), 0.35) * pxmm  # ~6 mm chips
        cx, cy = r.uniform(0, T), r.uniform(0, T)
        nv = r.integers(4, 8)
        ang = np.sort(r.uniform(0, 2 * np.pi, nv))
        rad = size * 0.5 * r.uniform(0.45, 1.0, nv)
        rot = r.uniform(0, np.pi)
        sx = r.uniform(0.6, 1.0)
        pts = [(rad[i] * np.cos(ang[i] + rot) * sx, rad[i] * np.sin(ang[i] + rot)) for i in range(nv)]
        for ox in (-T, 0, T):
            for oy in (-T, 0, T):
                x0, y0 = cx + ox, cy + oy
                if -size < x0 < T + size and -size < y0 < T + size:
                    d.polygon([(x0 + px, y0 + py) for px, py in pts], fill=v)
    return img


# ---------------------------------------------------------------- quartz
def quartz(T=1024, pxmm=3.4, seed=5):
    r = np.random.default_rng(seed)
    idx = np.full((T, T), 10.0, np.float32)
    weights = np.array([0.38, 0.32, 0.18, 0.0, 0.08, 0.04])
    n = int(T * T / (pxmm * 1.1) ** 2 * 1.6)
    ks = r.choice(6, n, p=weights)
    xs = r.uniform(0, T, n); ys = r.uniform(0, T, n)
    rads = r.lognormal(np.log(0.55 * pxmm), 0.3, n)
    tones = r.uniform(0.35, 0.9, n)
    # paint grains as shaded domes (lit from top-left), largest first for overlap
    order = np.argsort(-rads)
    for i in order:
        rr = rads[i]; R = int(np.ceil(rr)) + 1
        cx, cy = xs[i], ys[i]
        ix0, iy0 = int(cx) - R, int(cy) - R
        yy, xx = np.mgrid[iy0:iy0 + 2 * R + 1, ix0:ix0 + 2 * R + 1]
        dx = (xx - cx) / rr; dy = (yy - cy) / rr
        d2 = dx * dx + dy * dy
        m = d2 < 1
        if not m.any():
            continue
        h = np.sqrt(np.clip(1 - d2, 0, 1))
        shade = np.clip(0.55 + 0.45 * (h * 0.6 - dx * 0.35 - dy * 0.35), 0, 1)
        t = np.clip(tones[i] * 0.55 + shade * 0.6 - 0.1, 0, 1)
        val = band(ks[i], t)
        idx[yy[m] % T, xx[m] % T] = val[m]
    return Image.fromarray(idx.astype(np.uint8))


# ---------------------------------------------------------------- metallic (continuous)
def metallic(T=2048, seed=21):
    N = 1024
    global rng
    rng = np.random.default_rng(seed)

    def S(fl, y, x):
        return ndimage.map_coordinates(fl, [np.mod(y, N), np.mod(x, N)], order=1, mode='grid-wrap')
    A = field(N, 2.0, (0.6, 1.0)); B = field(N, 2.0, (0.6, 1.0))
    C = field(N, 1.8, (0.5, 1.0)); D = field(N, 1.8, (0.5, 1.0))
    E = field(N, 1.7, (0.45, 1.0)); F = field(N, 1.3, (0.35, 1.0)); G = field(N, 1.0, (0.25, 1.0))
    yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
    # periodic over the tile: one field period per texture so the floor tiles seamlessly
    pv = yy * (N / T); pu = xx * (N / T)
    q1 = S(A, pv, pu); q2 = S(B, pv + 400, pu + 170)
    k1 = 140
    r1 = S(C, pv + k1 * q1, pu + k1 * q2); r2 = S(D, pv + k1 * q1 + 90, pu + k1 * q2 + 510)
    k2 = 120
    wy, wx = pv + k2 * r1, pu + k2 * r2
    f = S(E, wy, wx); fd = S(F, wy * 2, wx * 2); fg = S(G, wy * 3, wx * 3)
    fgs = ndimage.gaussian_filter(fg, 1.4, mode='wrap')
    g = f * 1.15 + 0.35 * r1 + 0.18 * fd
    bandv = 0.5 + 0.5 * np.sin(2 * np.pi * g * 1.6)
    band2 = 0.5 + 0.5 * np.sin(2 * np.pi * (g * 4.2 + 0.08 * fg))
    fn = nz(f + 0.25 * fd)
    # base: black..dark..base
    idx = 40 + 130 * np.clip(fn * 1.25 - 0.1, 0, 1)
    blue = np.clip((bandv - 0.55) * 3, 0, 1) * np.clip(1 - np.abs(fn - 0.55) * 2.2, 0, 1)
    idx += blue * 45
    silver = np.clip((band2 - 0.74) * 7, 0, 1) * np.clip((nz(fd) - 0.35) * 2, 0, 1)
    frost = np.clip((nz(fgs + 0.7 * fd) - 0.6) * 2.6, 0, 1) * np.clip((bandv - 0.25) * 2, 0, 1)
    silver = ndimage.gaussian_filter(np.clip(silver + frost * 0.85, 0, 1), 1.3, mode='wrap') ** 0.9
    idx = idx * (1 - silver * 0.85) + 222 * silver * 0.85
    lace = np.abs(np.sin(2 * np.pi * (g * 3.1 + 0.04 * fgs)))
    lace = ndimage.gaussian_filter(np.clip(1 - lace / 0.06, 0, 1) ** 1.5 * np.clip((nz(fd) - 0.45) * 2.5, 0, 1), 0.7, mode='wrap')
    idx = idx * (1 - lace * 0.8) + 250 * lace * 0.8
    dv = np.abs(np.sin(2 * np.pi * (g * 2.3 + 0.05 * fg)))
    dv = np.clip(1 - dv / 0.09, 0, 1) * np.clip(1 - silver * 2, 0, 1)
    idx *= (1 - 0.55 * dv)
    gr = ndimage.gaussian_filter(np.random.default_rng(2).random((T, T)).astype(np.float32), 0.5, mode='wrap')
    idx += (gr - 0.5) * 10 + np.clip(gr - 0.7, 0, 1) * 60 * silver
    return Image.fromarray(np.clip(idx, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- solid
def solid(T=1024, seed=31):
    global rng
    rng = np.random.default_rng(seed)
    low = field(T, 1.9)            # gentle mottling
    peel = field(T, 0.6)           # orange peel
    roll = field(T, 1.6, (0.08, 1.0))  # faint roller laps (stretched)
    idx = 128 + 4.5 * low + 1.6 * ndimage.gaussian_filter(peel, 1.2) + 2.5 * roll
    return Image.fromarray(np.clip(idx, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- cementitious overlay
def overlay(T=2048, seed=41):
    global rng
    rng = np.random.default_rng(seed)
    r = np.random.default_rng(seed)
    big = field(T, 2.2); mid = field(T, 1.6); fine = field(T, 0.4)
    idx = 138 + 16 * big + 9 * mid + 5 * field(T, 1.1)
    # trowel arcs: burnished darker sweeps
    marks = Image.new('L', (T, T), 0); d = ImageDraw.Draw(marks)
    for _ in range(900):
        R = r.uniform(120, 300); cx, cy = r.uniform(-R, T + R), r.uniform(-R, T + R)
        a0 = r.uniform(0, 360); a1 = a0 + r.uniform(18, 50)
        w = int(r.uniform(40, 110)); v = int(r.uniform(8, 26))
        for ox in (-T, 0, T):
            for oy in (-T, 0, T):
                d.arc([cx + ox - R, cy + oy - R, cx + ox + R, cy + oy + R], a0, a1, fill=v, width=w)
    m = ndimage.gaussian_filter(np.asarray(marks, np.float32), 14, mode='wrap')
    idx -= m * 0.9
    # crisp trowel edges (lighter ridge lines)
    edge = np.abs(ndimage.sobel(ndimage.gaussian_filter(np.asarray(marks, np.float32), 2.5, mode='wrap'), 0, mode='wrap'))
    idx += np.clip(edge / edge.max(), 0, 1) * 3
    idx += 4.5 * fine
    # pinholes
    ph = (r.random((T, T)) > 0.9993).astype(np.float32)
    idx -= ndimage.gaussian_filter(ph, 1.0, mode='wrap') * 260
    return Image.fromarray(np.clip(idx, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- urethane cement
def urethane(T=1024, seed=51):
    global rng
    rng = np.random.default_rng(seed)
    r = np.random.default_rng(seed)
    idx = 128 + 6 * field(T, 1.8) + 3 * field(T, 1.0)
    # broadcast sand under the slurry: rounded bumps
    sand = np.zeros((T, T), np.float32)
    n = 60000
    ys, xs = r.integers(0, T, n), r.integers(0, T, n)
    sand[ys, xs] = r.uniform(0.5, 1.0, n)
    bump = ndimage.gaussian_filter(sand, 1.3, mode='wrap')
    bump /= bump.max()
    shade = ndimage.sobel(bump, 1, mode='wrap') * -0.6 + ndimage.sobel(bump, 0, mode='wrap') * -0.6
    idx += bump * 26 + shade * 30
    # occasional darker aggregate fleck
    fl = (r.random((T, T)) > 0.9985).astype(np.float32)
    idx -= ndimage.gaussian_filter(fl, 0.9, mode='wrap') * 220
    return Image.fromarray(np.clip(idx, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- bare concrete (RGB, covers a whole garage)
def bare(T=2048, seed=61, meters=7.0):
    global rng
    rng = np.random.default_rng(seed)
    r = np.random.default_rng(seed)
    pxm = T / meters
    base = np.array([138, 136, 130], np.float32)
    img = np.ones((T, T, 3), np.float32) * base
    img *= (1 + 0.07 * field(T, 2.2)[..., None] + 0.04 * field(T, 1.4)[..., None])
    # aggregate / sand speckle
    sp = r.random((T, T)).astype(np.float32)
    img *= (0.9 + 0.2 * ndimage.gaussian_filter(sp, 0.55))[..., None]
    dark = (sp > 0.992).astype(np.float32)
    img *= (1 - 0.35 * ndimage.gaussian_filter(dark, 0.7))[..., None]
    # efflorescence / pale blotches
    pale = np.clip(field(T, 2.0) - 1.2, 0, None)
    img += pale[..., None] * np.array([18, 18, 16])
    # oil stains where a car parks (two lanes)
    yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
    stain = np.zeros((T, T), np.float32)
    for cx in (0.30, 0.70):
        for k in range(14):
            sx = cx * T + r.normal(0, 0.05 * T); sy = r.uniform(0.25, 0.75) * T
            rad = r.uniform(0.02, 0.07) * T
            stain += np.exp(-(((xx - sx) / (rad * r.uniform(0.6, 1.4))) ** 2 + ((yy - sy) / rad) ** 2)) * r.uniform(0.3, 0.8)
    stain *= np.clip(0.6 + 0.6 * field(T, 1.2), 0, 1.5)
    stain = np.clip(stain, 0, 1)
    img = img * (1 - 0.55 * stain[..., None]) + np.array([40, 36, 30]) * 0.55 * stain[..., None] * 0.6
    # tire marks: faint dark bands along y
    for cx in (0.22, 0.38, 0.62, 0.78):
        tm = np.exp(-((xx - cx * T) / (0.018 * T)) ** 2) * np.clip(field(T, 1.6, (1, 0.15)) * 0.5 + 0.5, 0, 1)
        img *= (1 - 0.07 * tm[..., None])
    # rust / water marks near the back wall
    rust = np.clip(field(T, 1.9) - 0.6, 0, None) * np.exp(-((yy) / (0.18 * T)) ** 2)
    img = img * (1 - 0.4 * rust[..., None]) + np.array([120, 70, 38]) * 0.4 * rust[..., None]
    # cracks: random walks with branches
    cr = Image.new('L', (T, T), 0); dd = ImageDraw.Draw(cr)

    def walk(x, y, ang, steps, w):
        pts = [(x, y)]
        for _ in range(steps):
            ang += r.normal(0, 0.16)
            L = r.uniform(6, 16)
            x += np.cos(ang) * L; y += np.sin(ang) * L
            pts.append((x, y))
            if r.random() < 0.03 and w > 1:
                walk(x, y, ang + r.choice([-1, 1]) * r.uniform(0.6, 1.2), int(steps * 0.3), w - 1)
        dd.line(pts, fill=255, width=w)
    for _ in range(7):
        walk(r.uniform(0, T), r.uniform(0, T), r.uniform(0, 2 * np.pi), int(r.uniform(60, 160)), 3)
    c = np.asarray(cr, np.float32) / 255
    halo = ndimage.gaussian_filter(c, 3)
    img *= (1 - 0.65 * c[..., None]) * (1 - 0.15 * halo[..., None])
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    which = sys.argv[2:] or ['flake', 'quartz', 'metallic', 'solid', 'overlay', 'urethane', 'bare']
    for w in which:
        im = globals()[w]()
        if w in ('flake', 'quartz'):
            im.save(f'{OUT}/{w}.png', optimize=True)
        elif w == 'bare':
            im.save(f'{OUT}/{w}.jpg', quality=86, optimize=True)
        else:
            im.save(f'{OUT}/{w}.jpg', quality=84 if w in ('metallic', 'overlay') else 88, optimize=True)
        print(w, im.size)
