/* Concrete Canvas campaign pages: live floor renders in creatives, copy buttons,
   landing-page picker and two-step form. Requires assets/floor-engine.js. */
(function () {
  'use strict';
  var PAL = {
    teal:     { name: 'Gulf Teal',     base: '#178A96', light: '#6FE3EC', dark: '#0B4F5A' },
    navy:     { name: 'Navy Tide',     base: '#1a2f57', light: '#7a96cc', dark: '#0b1830' },
    graphite: { name: 'Graphite',      base: '#44494e', light: '#b3b9bf', dark: '#1d2023' },
    sand:     { name: 'Sandstone',     base: '#b9a68a', light: '#efe3cf', dark: '#7a6a55' },
    copper:   { name: 'Sunset Copper', base: '#9c4f26', light: '#f0a46b', dark: '#4f230c' },
    sunset:   { name: 'Naples Sunset', base: '#D9622B', light: '#FFC27A', dark: '#7E2A10' },
    shell:    { name: 'Sanibel Shell', base: '#E8D6C0', light: '#FFFFFF', dark: '#B39A80' },
    glades:   { name: 'Everglades',    base: '#3E6E4E', light: '#A6D8A8', dark: '#1E3A27' },
    coral:    { name: 'Captiva Coral', base: '#E46E6E', light: '#FFD0C2', dark: '#8A2E3A' },
    pearl:    { name: 'Pearl Gray',    base: '#9aa1a8', light: '#eef1f4', dark: '#4b5157' }
  };
  var FINNAME = { flake: 'Flake', metallic: 'Metallic', quartz: 'Quartz', solid: 'Solid', cementitious: 'Overlay', urethane: 'Urethane cement' };
  function col(k) { var p = PAL[k] || PAL.teal; return { base: p.base, light: p.light, dark: p.dark }; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- live renders: <div data-fe="garage" data-finish="flake" data-color="teal"> ----
  var cyclers = [];
  if (window.FloorEngine) {
    $$('[data-fe]').forEach(function (n) {
      var st = { finish: n.getAttribute('data-finish') || 'flake', color: n.getAttribute('data-color') || 'teal' };
      var cyc = (n.getAttribute('data-cycle') || '').split('|').filter(Boolean).map(function (s) { var p = s.split(':'); return { finish: p[0], color: p[1] }; });
      var lbl = n.closest('.cr') ? n.closest('.cr').querySelector('[data-cycle-label]') : null;
      var rec = { st: st, cyc: cyc, i: 0, lbl: lbl };
      FloorEngine.bind(n, { scene: n.getAttribute('data-fe'), maxWidth: +(n.getAttribute('data-maxw') || 900), lightBg: n.hasAttribute('data-light') },
        function () { return { finish: rec.st.finish, color: rec.st.finish === 'bare' ? undefined : col(rec.st.color) }; });
      if (cyc.length) cyclers.push(rec);
      n.__fe = rec;
    });
    if (cyclers.length && !reduce) {
      setInterval(function () {
        cyclers.forEach(function (r) {
          r.i = (r.i + 1) % r.cyc.length; r.st.finish = r.cyc[r.i].finish; r.st.color = r.cyc[r.i].color;
          if (r.lbl) r.lbl.textContent = FINNAME[r.st.finish] + ' · ' + (PAL[r.st.color] || PAL.teal).name;
        });
        FloorEngine.refresh();
      }, 2600);
    }
  }

  // ---- copy buttons ----
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy');
      var done = function () { var o = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = o; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, done); else done();
    });
  });

  // ---- scaled iframe previews ----
  function fit() { $$('.shot iframe').forEach(function (f) { f.style.transform = 'scale(' + (f.parentNode.clientWidth / 1440) + ')'; }); }
  if ($('.shot iframe')) { fit(); window.addEventListener('resize', fit); }

  // ---- landing page: finish / colour picker on the showcase render ----
  var view = $('#lpView [data-fe]');
  if (view && view.__fe) {
    var rec = view.__fe, tag = $('#lpViewTag');
    var sync = function () {
      $$('[data-pick-finish]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pick-finish') === rec.st.finish); });
      $$('[data-pick-color]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pick-color') === rec.st.color); });
      if (tag) tag.textContent = FINNAME[rec.st.finish] + ' · ' + PAL[rec.st.color].name;
      var hid = $('#lpChoice'); if (hid) hid.value = FINNAME[rec.st.finish] + ' / ' + PAL[rec.st.color].name;
      FloorEngine.refresh();
    };
    $$('[data-pick-finish]').forEach(function (b) { b.addEventListener('click', function () { rec.st.finish = b.getAttribute('data-pick-finish'); sync(); }); });
    $$('[data-pick-color]').forEach(function (b) {
      FloorEngine.bind(b, { flat: true }, function () { return { finish: rec.st.finish, color: col(b.getAttribute('data-pick-color')) }; });
      b.addEventListener('click', function () { rec.st.color = b.getAttribute('data-pick-color'); sync(); });
    });
    sync();
  }

  // ---- landing page: two-step form ----
  var form = $('#lpForm');
  if (form) {
    var s1 = $('#lpStep1'), s2 = $('#lpStep2'), bar = $('#lpBar'), num = $('#lpNum'), err = $('#lpErr');
    var show = function (n) {
      s1.hidden = n !== 1; s2.hidden = n !== 2;
      bar.style.width = n === 1 ? '50%' : '100%'; num.textContent = n;
      err.classList.remove('on');
      var first = (n === 1 ? s1 : s2).querySelector('input,select'); if (first) first.focus({ preventScroll: true });
    };
    $('#lpNext').addEventListener('click', function () {
      if (!s1.querySelector('input:checked')) { err.textContent = 'Pick one option to continue.'; err.classList.add('on'); return; }
      show(2);
    });
    $('#lpBack').addEventListener('click', function () { show(1); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('[required]', s2).filter(function (i) { return !i.value.trim(); });
      if (bad.length) { var nm = bad.map(function (i) { return i.getAttribute('data-label'); }); err.textContent = 'Please add your ' + (nm.length > 1 ? nm.slice(0, -1).join(', ') + ' and ' + nm[nm.length - 1] : nm[0]) + '.'; err.classList.add('on'); bad[0].focus(); return; }
      var name = ($('[name=name]', form) || {}).value || '';
      location.href = form.getAttribute('action') + '?c=' + encodeURIComponent(form.getAttribute('data-campaign')) + '&n=' + encodeURIComponent(name.split(' ')[0]);
    });
    $$('a[href="#start"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); show(1); form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }); });
  }

  window.CCAds = { PAL: PAL, FINNAME: FINNAME, col: col };
})();
