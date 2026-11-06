/* Concrete Canvas before/after photo pairs.
   Markup:  <div data-ba data-ba-set="flake,metallic" [data-ba-slider]>
              <div data-ba-tabs></div>
              <div class="…" data-ba-frame>
                <img data-ba-img="before"> <img data-ba-img="after"> <div data-ba-line></div>
              </div>
              <input type="range" data-ba-range>   (optional)
              <span data-ba-cap></span>             (optional)
            </div>
   data-ba-slider: this script also handles dragging. Without it the page runs its own slider.
   <script src="…/assets/ba-photos.js" data-base="../"></script> sets the path to the site root. */
(function () {
  'use strict';
  var me = document.currentScript, base = (me && me.getAttribute('data-base')) || '';
  var P = {
    flake: { tab: 'Flake Garage', label: 'Flake · Large Garage', pos: '50% 62%',
      before: 'Before: bare garage concrete with tire marks and oil stains',
      after: 'After: the same garage with a gray flake epoxy floor' },
    metallic: { tab: 'Metallic Garage', label: 'Metallic Epoxy · Large Garage', pos: '50% 64%',
      before: 'Before: dull, stained concrete in a large showcase garage',
      after: 'After: the same garage with a glossy gray and bronze metallic epoxy floor' },
    quartz: { tab: 'Quartz Kitchen', label: 'Quartz · Commercial Kitchen', pos: '50% 66%',
      before: 'Before: stained, worn concrete in a commercial kitchen',
      after: 'After: the same kitchen with a seamless gray quartz floor' },
    solid: { tab: 'Solid Warehouse', label: 'Solid Epoxy · Warehouse', pos: '50% 62%',
      before: 'Before: a stained warehouse slab with faded safety lines',
      after: 'After: the same warehouse with light gray solid epoxy and fresh safety lines' },
    polished: { tab: 'Polished Showroom', label: 'Polished Concrete · Showroom', pos: '50% 66%',
      before: 'Before: dull, spotted concrete in a bright showroom',
      after: 'After: the same showroom with polished, reflective concrete' }
  };
  var src = function (k, t) { return base + 'assets/ba/' + k + '-' + t + '.jpg'; };
  var preloaded = {};
  function preload(k) {
    if (preloaded[k]) return; preloaded[k] = 1;
    ['before', 'after'].forEach(function (t) { var i = new Image(); i.src = src(k, t); });
  }

  function gallery(g) {
    var set = (g.getAttribute('data-ba-set') || 'flake,metallic,quartz,solid,polished').split(',').filter(function (k) { return P[k]; });
    var tabs = g.querySelector('[data-ba-tabs]'), cap = g.querySelector('[data-ba-cap]');
    var imgB = g.querySelector('[data-ba-img="before"]'), imgA = g.querySelector('[data-ba-img="after"]');
    function show(k) {
      var p = P[k];
      [[imgB, 'before'], [imgA, 'after']].forEach(function (x) {
        x[0].src = src(k, x[1]); x[0].alt = p[x[1]]; x[0].style.objectPosition = p.pos;
      });
      if (cap) cap.textContent = p.label + ' · Illustrative concept';
      if (tabs) Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === k); });
    }
    if (tabs && set.length > 1) {
      set.forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('data-k', k); b.textContent = P[k].tab;
        b.addEventListener('click', function () { show(k); });
        b.addEventListener('pointerenter', function () { preload(k); });
        b.addEventListener('focus', function () { preload(k); });
        tabs.appendChild(b);
      });
    } else if (tabs) tabs.hidden = true;
    show(set[0]);

    if (!g.hasAttribute('data-ba-slider')) return;
    var frame = g.querySelector('[data-ba-frame]'), line = g.querySelector('[data-ba-line]'), range = g.querySelector('[data-ba-range]');
    var v = 55, drag = false;
    function setV(n) {
      v = Math.max(0, Math.min(100, Math.round(n)));
      imgA.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)';
      if (line) line.style.left = v + '%';
      if (range) range.value = v;
    }
    function fromEvent(e) { var r = frame.getBoundingClientRect(); setV((e.clientX - r.left) / r.width * 100); }
    frame.addEventListener('pointerdown', function (e) { drag = true; frame.setPointerCapture(e.pointerId); fromEvent(e); });
    frame.addEventListener('pointermove', function (e) { if (drag) fromEvent(e); });
    frame.addEventListener('pointerup', function () { drag = false; });
    frame.addEventListener('pointercancel', function () { drag = false; });
    if (range) range.addEventListener('input', function () { setV(+range.value); });
    setV(v);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-ba]'), gallery);
  window.BAPhotos = { pairs: P, src: src };
})();
