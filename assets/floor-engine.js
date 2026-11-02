/* Concrete Canvas floor engine
 * Recolors photoreal pre-rendered scenes in the browser.
 * Each scene ships: room.jpg (scene with a black floor), refl0-2.jpg (mirror
 * reflection at three roughness levels), light.jpg (floor lighting), fa.png /
 * fb.png (16-bit world floor coordinates, coverage, fresnel) and meta.json.
 * Finishes ship as grayscale index textures that are mapped through a color
 * ramp built from any base color, so every color choice stays live.
 */
(function () {
  'use strict';
  var BASE = (document.currentScript && document.currentScript.src.replace(/[^/]*$/, '')) || 'assets/';
  var ROOT = BASE + 'floor/';

  var FIN = {
    flake:        { tex: 'flake.png',    band: true, tile: 0.5, rl: 1, rs: 1.0 },
    metallic:     { tex: 'metallic.jpg', tile: 6.0, rl: 0, rs: 1.5 },
    quartz:       { tex: 'quartz.png',   band: true, tile: 0.3, rl: 1, rs: 0.6 },
    solid:        { tex: 'solid.jpg',    tile: 1.0, rl: 1, rs: 1.2 },
    cementitious: { tex: 'overlay.jpg',  tile: 4.0, rl: 2, rs: 0.35 },
    urethane:     { tex: 'urethane.jpg', tile: 0.4, rl: 2, rs: 0.25 },
    bare:         { tex: 'bare.jpg', rgb: true, tile: 7.0, rl: 2, rs: 0.15, off: [3.5, 7.6] }
  };
  var SCENE_TILE = { closeup: { metallic: 2.0, cementitious: 3.0 }, swatch: { metallic: 2.0, cementitious: 3.0 } };

  // ---------------------------------------------------------------- colour
  function hx(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function ramp(stops) {
    var out = new Uint8ClampedArray(768), j = 0;
    for (var i = 0; i < 256; i++) {
      while (j < stops.length - 2 && i > stops[j + 1][0]) j++;
      var a = stops[j], b = stops[j + 1], t = Math.max(0, Math.min(1, (i - a[0]) / Math.max(1, b[0] - a[0])));
      for (var c = 0; c < 3; c++) out[i * 3 + c] = a[1][c] + (b[1][c] - a[1][c]) * t;
    }
    return out;
  }
  function lut(fin, col) {
    var B = hx(col.base), L = hx(col.light), D = hx(col.dark);
    var gray = hx('#8C9198'), white = hx('#E9ECEE'), black = hx('#1B1D20');
    if (FIN[fin].band) {
      var out = new Uint8ClampedArray(768), cls = [D, B, L, gray, white, black];
      for (var i = 0; i < 16; i++) for (var c = 0; c < 3; c++) out[i * 3 + c] = D[c] * 0.7;
      for (var k = 0; k < 6; k++) {
        for (var t = 0; t < 40; t++) {
          var v = 16 + 40 * k + t; if (v > 255) break;
          var col2 = t < 25 ? mul(cls[k], 0.8 + 0.34 * t / 24) : (t < 32 || k === 5 ? mul(cls[k], 1.14) : mul(cls[k + 1], 0.8));
          for (c = 0; c < 3; c++) out[v * 3 + c] = col2[c];
        }
      }
      return out;
    }
    if (fin === 'metallic') {
      var silver = mix(L, hx('#D3DAE3'), 0.65);
      return ramp([[0, mul(D, 0.18)], [60, mul(D, 0.55)], [110, D], [150, B], [185, L], [222, silver], [255, hx('#F4F7FA')]]);
    }
    if (fin === 'solid') return ramp([[0, D], [128, B], [255, L]]);
    if (fin === 'cementitious') {
      var sand = hx('#B9B3A8');
      return ramp([[0, mul(mix(D, sand, 0.35), 0.55)], [100, mul(mix(B, sand, 0.45), 0.9)], [135, mix(B, sand, 0.45)], [200, mix(L, hx('#E6E1D8'), 0.55)], [255, hx('#F2EFE9')]]);
    }
    return ramp([[0, mul(D, 0.6)], [128, B], [255, mix(L, [255, 255, 255], 0.2)]]);
  }
  // derive a light / dark pair from any single colour (for a custom colour picker)
  function derive(base) {
    var c = hx(base), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = 0, h = 0, d = mx - mn;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    function hsl(h, s, l) {
      s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
      var C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = l - C / 2, rgb;
      rgb = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
      return '#' + rgb.map(function (v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }).join('');
    }
    return { base: base, light: hsl(h, s * 0.85, l + (1 - l) * 0.55), dark: hsl(h, s * 1.05, l * 0.42) };
  }

  // ---------------------------------------------------------------- loading
  var cache = {};
  function img(url) {
    if (cache[url]) return cache[url];
    return (cache[url] = new Promise(function (res, rej) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('load ' + url)); };
      im.src = url;
    }));
  }
  function pixels(im, w, h, smooth) {
    var c = document.createElement('canvas'); c.width = w || im.naturalWidth; c.height = h || im.naturalHeight;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = smooth !== false; x.imageSmoothingQuality = 'high';
    x.drawImage(im, 0, 0, c.width, c.height);
    return x.getImageData(0, 0, c.width, c.height).data;
  }
  var sceneCache = {};
  function loadScene(name) {
    if (sceneCache[name]) return sceneCache[name];
    var d = ROOT + name + '/';
    return (sceneCache[name] = fetch(d + 'meta.json').then(function (r) { return r.json(); }).then(function (meta) {
      return Promise.all(['room.jpg', 'refl0.jpg', 'refl1.jpg', 'refl2.jpg', 'light.jpg', 'fa.png', 'fb.png'].map(function (f) { return img(d + f); }))
        .then(function (ims) {
          var W = meta.W, H = meta.H, fa = pixels(ims[5], W, H, false), fb = pixels(ims[6], W, H, false);
          var n = W * H, X = new Float32Array(n), Z = new Float32Array(n), C = new Float32Array(n), F = new Float32Array(n);
          for (var i = 0; i < n; i++) {
            var p = i * 4;
            C[i] = fa[p + 2] / 255;
            X[i] = (fa[p] * 256 + fa[p + 1] - 1) / 65534 * meta.range + meta.x0;
            Z[i] = (fb[p] * 256 + fb[p + 1] - 1) / 65534 * meta.range + meta.z0;
            F[i] = fb[p + 2] / 255;
          }
          return { name: name, meta: meta, ims: ims, X: X, Z: Z, C: C, F: F };
        });
    }));
  }
  var texCache = {}, colCache = [], COLMAX = 8;
  function loadTex(fin) {
    var f = FIN[fin];
    if (texCache[f.tex]) return texCache[f.tex];
    return (texCache[f.tex] = img(ROOT + 'tex/' + f.tex).then(function (im) {
      var T = im.naturalWidth, px = pixels(im, T, T, false);
      return { T: T, px: px };
    }));
  }
  // coloured texture + mip pyramid, cached by finish+colour
  function colored(fin, col) {
    var key = fin + '|' + (FIN[fin].rgb ? '' : col.base + col.light + col.dark);
    for (var i = 0; i < colCache.length; i++) if (colCache[i].key === key) return Promise.resolve(colCache[i].val);
    return loadTex(fin).then(function (t) {
      var T = t.T, n = T * T, lv0 = new Uint8ClampedArray(n * 3), px = t.px, k;
      if (FIN[fin].rgb) { for (k = 0; k < n; k++) { lv0[k * 3] = px[k * 4]; lv0[k * 3 + 1] = px[k * 4 + 1]; lv0[k * 3 + 2] = px[k * 4 + 2]; } }
      else { var L = lut(fin, col); for (k = 0; k < n; k++) { var v = px[k * 4] * 3; lv0[k * 3] = L[v]; lv0[k * 3 + 1] = L[v + 1]; lv0[k * 3 + 2] = L[v + 2]; } }
      var levels = [{ s: T, d: lv0 }];
      while (levels[levels.length - 1].s > 4) {
        var p = levels[levels.length - 1], s = p.s >> 1, d = new Uint8ClampedArray(s * s * 3), a = p.d, S = p.s;
        for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
          var o = (y * s + x) * 3, i0 = ((2 * y) * S + 2 * x) * 3, i1 = i0 + 3, i2 = i0 + S * 3, i3 = i2 + 3;
          d[o] = (a[i0] + a[i1] + a[i2] + a[i3]) >> 2; d[o + 1] = (a[i0 + 1] + a[i1 + 1] + a[i2 + 1] + a[i3 + 1]) >> 2; d[o + 2] = (a[i0 + 2] + a[i1 + 2] + a[i2 + 2] + a[i3 + 2]) >> 2;
        }
        levels.push({ s: s, d: d });
      }
      var val = { T: T, levels: levels };
      colCache.unshift({ key: key, val: val }); if (colCache.length > COLMAX) colCache.pop();
      return val;
    });
  }

  // ---------------------------------------------------------------- view
  function View(canvas, opts) {
    this.canvas = canvas; this.opts = opts || {}; this.state = null; this.ready = null; this.busy = false; this.pending = null;
    this.sceneName = this.opts.scene || 'garage';
  }
  View.prototype._prep = function () {
    var self = this;
    if (this.ready) return this.ready;
    return (this.ready = loadScene(this.sceneName).then(function (sc) {
      var meta = sc.meta, W = meta.W, H = meta.H;
      var scale = Math.min(1, (self.opts.maxWidth || W) / W);
      var w = Math.round(W * scale), h = Math.round(H * scale);
      self.canvas.width = w; self.canvas.height = h;
      var room = pixels(sc.ims[0], w, h), refl = [pixels(sc.ims[1], w, h), pixels(sc.ims[2], w, h), pixels(sc.ims[3], w, h)], light = pixels(sc.ims[4], w, h);
      var n = w * h, X = new Float32Array(n), Z = new Float32Array(n), C = new Float32Array(n), F = new Float32Array(n), FP = new Float32Array(n), Lt = new Float32Array(n);
      var sx = W / w, sy = H / h, idx = [];
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var j = Math.min(H - 1, Math.floor((y + 0.5) * sy)) * W + Math.min(W - 1, Math.floor((x + 0.5) * sx)), i = y * w + x;
        X[i] = sc.X[j]; Z[i] = sc.Z[j]; C[i] = sc.C[j]; F[i] = sc.F[j]; Lt[i] = light[i * 4] / meta.lightRef;
      }
      // pixel footprint on the floor in metres (for texture filtering)
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        i = y * w + x;
        var ir = x < w - 1 ? i + 1 : i - 1, id = y < h - 1 ? i + w : i - w;
        var a = Math.hypot(X[ir] - X[i], Z[ir] - Z[i]), b = Math.hypot(X[id] - X[i], Z[id] - Z[i]);
        FP[i] = Math.min(Math.max(a, b), 0.25);
      }
      // reflection: expand only true highlights back to HDR, pre-multiplied by fresnel x scene gain
      var rg = meta.reflGain || 1, R = [];
      for (var lv = 0; lv < 3; lv++) {
        var src = refl[lv], dst = new Float32Array(n * 3);
        for (i = 0; i < n; i++) {
          if (C[i] <= 0) continue;
          for (var c = 0; c < 3; c++) { var r = src[i * 4 + c] / 255; dst[i * 3 + c] = 255 * (r + 5 * Math.max(0, r - 0.86) / 0.14) * F[i] * rg; }
        }
        R.push(dst);
      }
      for (i = 0; i < n; i++) if (C[i] > 0) idx.push(i);
      self.plate = { w: w, h: h, room: room, X: X, Z: Z, C: C, F: F, FP: FP, L: Lt, R: R, idx: new Uint32Array(idx), joints: meta.joints || 0 };
      self.ctx = self.canvas.getContext('2d');
      self.out = self.ctx.createImageData(w, h);
      return self.plate;
    }));
  };
  View.prototype.set = function (state) {
    this.pending = state;
    if (!this.busy) this._run();
    return this;
  };
  View.prototype._run = function () {
    var self = this, st = this.pending; this.pending = null; this.busy = true;
    var fin = FIN[st.finish] ? st.finish : 'flake';
    var col = st.color && st.color.base ? st.color : derive(st.color || '#178A96');
    Promise.all([this._prep(), colored(fin, col)]).then(function (r) {
      self._draw(r[0], r[1], fin);
      self.canvas.classList.add('fe-ready');
      if (self.opts.onReady) { self.opts.onReady(); self.opts.onReady = null; }
    }).catch(function (e) { if (window.console) console.warn('[floor-engine]', e); })
      .then(function () { self.busy = false; if (self.pending) self._run(); });
  };
  View.prototype._draw = function (P, tex, fin) {
    var f = FIN[fin], tile = (SCENE_TILE[this.sceneName] && SCENE_TILE[this.sceneName][fin]) || f.tile;
    var T = tex.T, levels = tex.levels, nl = levels.length;
    var out = this.out.data, room = P.room, X = P.X, Z = P.Z, C = P.C, F = P.F, FP = P.FP, L = P.L, R = P.R[f.rl], rs = f.rs;
    out.set(room);
    var ox = f.off ? f.off[0] : 0, oz = f.off ? f.off[1] : 0, perM = T / tile;
    var J = P.joints, idx = P.idx;
    for (var q = 0; q < idx.length; q++) {
      var i = idx[q], cov = C[i];
      var u = (X[i] + ox) * perM, v = (Z[i] + oz) * perM;
      var lod = Math.log2(Math.max(FP[i] * perM, 1));
      if (lod > nl - 1) lod = nl - 1;
      var l0 = lod | 0, lt = lod - l0, l1 = Math.min(l0 + 1, nl - 1);
      var cr = 0, cg = 0, cb = 0;
      for (var pass = 0; pass < 2; pass++) {
        var wgt = pass ? lt : 1 - lt; if (wgt <= 0.001) continue;
        var lvl = levels[pass ? l1 : l0], s = lvl.s, d = lvl.d, sc = s / T;
        var uu = u * sc - 0.5, vv = v * sc - 0.5, x0 = Math.floor(uu), y0 = Math.floor(vv), fx = uu - x0, fy = vv - y0;
        x0 = ((x0 % s) + s) % s; y0 = ((y0 % s) + s) % s;
        var x1 = x0 + 1 === s ? 0 : x0 + 1, y1 = y0 + 1 === s ? 0 : y0 + 1;
        var a = (y0 * s + x0) * 3, b = (y0 * s + x1) * 3, c2 = (y1 * s + x0) * 3, e = (y1 * s + x1) * 3;
        var w00 = (1 - fx) * (1 - fy) * wgt, w10 = fx * (1 - fy) * wgt, w01 = (1 - fx) * fy * wgt, w11 = fx * fy * wgt;
        cr += d[a] * w00 + d[b] * w10 + d[c2] * w01 + d[e] * w11;
        cg += d[a + 1] * w00 + d[b + 1] * w10 + d[c2 + 1] * w01 + d[e + 1] * w11;
        cb += d[a + 2] * w00 + d[b + 2] * w10 + d[c2 + 2] * w01 + d[e + 2] * w11;
      }
      var lit = L[i] * (1 - F[i] * 0.5);
      // saw-cut control joints
      if (J) {
        var fp = Math.max(FP[i], 0.002), jx = Math.abs(((X[i] % J) + J * 1.5) % J - J / 2), jz = Math.abs(((Z[i] % J) + J * 1.5) % J - J / 2);
        var dj = Math.min(jx, jz), jw = 0.003;
        var cov2 = Math.max(0, Math.min(1, (jw + fp * 0.5 - dj) / fp));
        lit *= 1 - 0.55 * cov2 * Math.min(1, 0.004 / fp);
      }
      var o = i * 4, r3 = i * 3;
      out[o] = room[o] + (cr * lit + R[r3] * rs) * cov;
      out[o + 1] = room[o + 1] + (cg * lit + R[r3 + 1] * rs) * cov;
      out[o + 2] = room[o + 2] + (cb * lit + R[r3 + 2] * rs) * cov;
    }
    this.ctx.putImageData(this.out, 0, 0);
  };

  // flat texture chip (no scene) for small colour swatches
  function flat(canvas, state) {
    var fin = FIN[state.finish] ? state.finish : 'flake';
    var col = state.color && state.color.base ? state.color : derive(state.color || '#178A96');
    var w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1) || 96, h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1) || 96;
    return colored(fin, col).then(function (t) {
      var mPerPx = Math.min(FIN[fin].tile, 0.25) / Math.max(w, h);
      var perM = t.T / FIN[fin].tile, lod = Math.max(0, Math.log2(mPerPx * perM)), lv = t.levels[Math.min(t.levels.length - 1, Math.round(lod))];
      var x = canvas.getContext('2d'), im = x.createImageData(w, h), o = im.data, s = lv.s, k = s / t.T;
      for (var y = 0; y < h; y++) for (var xx = 0; xx < w; xx++) {
        var uu = Math.floor((xx * mPerPx + 0.37) * perM * k) % s, vv = Math.floor((y * mPerPx + 0.21) * perM * k) % s, p = (vv * s + uu) * 3, q = (y * w + xx) * 4;
        var sh = 1.08 - 0.22 * (y / h) + 0.14 * Math.max(0, 1 - Math.hypot(xx / w - 0.3, y / h - 0.25) * 2.2);
        o[q] = lv.d[p] * sh; o[q + 1] = lv.d[p + 1] * sh; o[q + 2] = lv.d[p + 2] * sh; o[q + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      canvas.classList.add('fe-ready');
    });
  }

  // ---------------------------------------------------------------- binding helpers
  // bind(container, opts, stateFn): put a live canvas in `container` that renders
  // only while on screen and only when stateFn() changes. opts.flat = texture chip.
  var bound = [], io = null;
  (function css() {
    var s = document.createElement('style');
    s.textContent = '.fe-canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .35s ease}' +
      '.fe-canvas.fe-ready{opacity:1}.fe-host{position:relative;overflow:hidden;background:#1b2330}.fe-host.fe-light{background:#d9d4cc}' +
      '@media (prefers-reduced-motion:reduce){.fe-canvas{transition:none}}';
    document.head.appendChild(s);
  })();
  function sync(rec) {
    if (!rec.visible) return;
    var st = rec.fn(); if (!st) return;
    var k = JSON.stringify(st);
    if (k === rec.key) return;
    rec.key = k;
    if (rec.opts.flat) flat(rec.canvas, st); else rec.view.set(st);
  }
  function bind(container, opts, fn) {
    opts = opts || {};
    var c = document.createElement('canvas'); c.className = 'fe-canvas';
    if (opts.label) { c.setAttribute('role', 'img'); c.setAttribute('aria-label', opts.label); } else c.setAttribute('aria-hidden', 'true');
    container.classList.add('fe-host'); if (opts.lightBg) container.classList.add('fe-light');
    container.insertBefore(c, container.firstChild);
    var rec = { canvas: c, opts: opts, fn: fn, key: null, visible: false, view: opts.flat ? null : new View(c, opts) };
    bound.push(rec);
    if (!io && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { for (var i = 0; i < bound.length; i++) if (bound[i].canvas === e.target) { bound[i].visible = e.isIntersecting; sync(bound[i]); } });
      }, { rootMargin: '400px 0px' });
    }
    if (io) io.observe(c); else { rec.visible = true; sync(rec); }
    return rec;
  }
  function refresh() { bound.forEach(sync); }

  window.FloorEngine = {
    view: function (canvas, opts) { return new View(canvas, opts); },
    flat: flat,
    bind: bind,
    refresh: refresh,
    derive: derive,
    finishes: Object.keys(FIN),
    preload: function (names) { (names || []).forEach(loadScene); }
  };
})();
