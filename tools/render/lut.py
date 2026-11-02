"""Python mirror of the browser colour ramp, for previewing textures."""
import numpy as np


def hx(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def mix(a, b, t):
    return a * (1 - t) + b * t


def ramp(stops):
    xs = np.array([s[0] for s in stops], np.float32)
    cs = np.array([s[1] for s in stops], np.float32)
    v = np.arange(256, dtype=np.float32)
    return np.stack([np.interp(v, xs, cs[:, c]) for c in range(3)], -1)


def lut(finish, base, light, dark):
    B, L, D = hx(base), hx(light), hx(dark)
    gray, white, black = hx('#8C9198'), hx('#E9ECEE'), hx('#1B1D20')
    if finish in ('flake', 'quartz'):
        out = np.zeros((256, 3), np.float32)
        out[:16] = D * 0.7
        cls = [D, B, L, gray, white, black]
        for k, c in enumerate(cls):
            for t in range(25):
                out[16 + 40 * k + t] = np.clip(c * (0.8 + 0.34 * t / 24), 0, 255)
            # guard values between bands follow the nearer band
            for g in range(25, 40):
                if 16 + 40 * k + g < 256:
                    out[16 + 40 * k + g] = out[16 + 40 * k + 24] if g < 32 else (cls[k + 1] * 0.8 if k + 1 < 6 else out[16 + 40 * k + 24])
        return out
    if finish == 'metallic':
        silver = mix(L, hx('#D3DAE3'), 0.65)
        return ramp([(0, D * 0.18), (60, D * 0.55), (110, D), (150, B), (185, L), (222, silver), (255, hx('#F4F7FA'))])
    if finish == 'solid':
        return ramp([(0, D), (128, B), (255, L)])
    if finish == 'overlay':
        sand = hx('#B9B3A8')
        return ramp([(0, mix(D, sand, 0.35) * 0.55), (100, mix(B, sand, 0.45) * 0.9), (135, mix(B, sand, 0.45)), (200, mix(L, hx('#E6E1D8'), 0.55)), (255, hx('#F2EFE9'))])
    if finish == 'urethane':
        return ramp([(0, D * 0.6), (128, B), (255, mix(L, hx('#FFFFFF'), 0.2))])
    raise ValueError(finish)


def colorize(idx, finish, pal):
    t = lut(finish, *pal)
    return t[idx]
