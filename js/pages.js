/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — app layer
   Readiness contract (LB.assets), the loader, reveals, the hardware strip,
   the catalogue page (search + filters), the story modal with its own 3D
   viewer, the mobile sheet, and the small live counters.
   ========================================================================== */
(function () {
  'use strict';
  const LB = (window.LB = window.LB || {});
  const U = LB.util;

  /* one flat list, kept in data.js order */
  if (LB.data && !LB.data.all) LB.data.all = LB.data.objects;

  /* WebGL capability probe (used by the loader + fallbacks) */
  LB.hasWebGL = function () {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  };

  /* ======================================================================
     1. Readiness contract — every async module registers and reports in
     ====================================================================== */
  const A = (LB.assets = {
    items: {}, texProgress: {}, _hd: [],
    expect(name) { if (!this.items[name]) this.items[name] = { ready: false, needsTex: false, texReady: true }; this._emit(); },
    requireTextures(name) {
      if (!this.items[name]) this.items[name] = { ready: false, needsTex: false, texReady: true };
      this.items[name].needsTex = true; this.items[name].texReady = false;
      this._emit();
    },
    texturesDone(name) {
      if (!this.items[name]) this.items[name] = { ready: false, needsTex: false, texReady: true };
      this.items[name].texReady = true;
      this._emit();
    },
    progress(f) { this._frac = Math.max(this._frac || 0, f || 0); this._emit(); },
    done(name) {
      if (!this.items[name]) this.items[name] = { needsTex: false, texReady: true };
      this.items[name].ready = true;
      this._emit();
    },
    counts() {
      const keys = Object.keys(this.items);
      let ok = 0;
      keys.forEach((k) => { const it = this.items[k]; if (it.ready && it.texReady) ok++; });
      return { total: keys.length, ok: ok };
    },
    ratio() {
      const c = this.counts();
      if (!c.total) return 1;
      const base = c.ok / c.total;
      const within = this._frac || 0;
      return U.clamp(base * 0.86 + within * 0.14, 0, 1);
    },
    onChange(fn) { this._hd.push(fn); return fn; },
    _emit() { const r = this.ratio(); this._hd.forEach((fn) => { try { fn(r, this.counts()); } catch (e) { /* ignore */ } }); }
  });

  /* ======================================================================
     2. Catalog cards + story modal
     ====================================================================== */
  const STATUS_ORDER = ['silent', 'retired', 'travelling', 'active'];

  function tagHTML(o) {
    const st = LB.data.STATUS[o.status];
    const detail = o.status === 'active' ? 'still talking to Earth'
      : o.status === 'travelling' ? 'still travelling'
        : (o.lastContact ? 'last heard ' + o.lastContact : '');
    return '<span class="tag ' + st.tag + '">' + st.label + '</span>' + (detail ? '<span class="card-sub">' + detail + '</span>' : '');
  }

  function cardHTML(o) {
    return '<article class="card console" data-card="' + o.id + '" data-body="' + o.body + '" data-status="' + o.status + '" data-reveal>' +
      '<div class="card-top">' +
      '<span class="card-body">' + LB.data.BODY[o.body].label + '</span>' +
      tagHTML(o) +
      '</div>' +
      '<h3 class="card-name">' + o.short + '</h3>' +
      '<p class="card-head">' + o.headline + '</p>' +
      '<div class="card-meta">' +
      '<span>' + o.type + '</span><span>' + (o.site || '—') + '</span>' +
      (o.mass ? '<span>' + o.mass + '</span>' : '') +
      '</div>' +
      '<button class="card-open" data-object="' + o.id + '">Read the story<span class="arr">→</span></button>' +
      '</article>';
  }

  function buildCards(container, list) {
    if (!container) return;
    container.innerHTML = list.map(cardHTML).join('');
    const cards = U.$$('[data-reveal]', container);
    /* the default is deliberately still: cards are just there when you arrive.
       Full motion opts back into the staggered reveal. */
    if (LB.motion.level !== 'full' || !('IntersectionObserver' in window)) {
      cards.forEach((el) => el.classList.add('is-in'));
    } else {
      cards.forEach((el, i) => {
        el.style.transitionDelay = ((i % 4) * 60) + 'ms';
        revealIO.observe(el);
      });
    }
  }

  const revealIO = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }) : null;

  /* ---- modal ---- */
  const modal = () => document.getElementById('object-modal');
  let modalIndex = -1, modalList = [];

  function modalHTML(o) {
    const st = LB.data.STATUS[o.status];
    const coords = (o.lat === null) ? '—'
      : Math.abs(o.lat).toFixed(3) + '° ' + (o.lat >= 0 ? 'N' : 'S') + ' / ' + Math.abs(o.lon).toFixed(3) + '° ' + (o.lon >= 0 ? 'E' : 'W');
    return '' +
      '<div class="modal-grid">' +
      '<div class="modal-visual">' +
      '<canvas id="modal-canvas"></canvas>' +
      '<div class="modal-visual-foot"><span class="mono">drag to turn it</span><span class="tag ' + st.tag + '">' + st.label + '</span></div>' +
      '</div>' +
      '<div class="modal-info">' +
      '<p class="kicker">' + LB.data.BODY[o.body].label + ' · ' + o.type + '</p>' +
      '<h2 id="modal-title">' + o.name + '</h2>' +
      '<p class="modal-lede">' + o.headline + '</p>' +
      '<dl class="spec">' +
      '<div><dt>Where it sits</dt><dd>' + (o.site || '—') + '</dd></div>' +
      '<div><dt>Coordinates</dt><dd class="mono">' + coords + '</dd></div>' +
      (o.landed ? '<div><dt>Arrived</dt><dd>' + o.landed + '</dd></div>' : '') +
      (o.lastContact ? '<div><dt>' + (o.status === 'active' ? 'Still' : 'Last heard') + '</dt><dd>' + o.lastContact + '</dd></div>' : '') +
      (o.mass ? '<div><dt>Mass</dt><dd>' + o.mass + '</dd></div>' : '') +
      (o.power ? '<div><dt>Power</dt><dd>' + o.power + '</dd></div>' : '') +
      '</dl>' +
      '<h3 class="modal-h">The story</h3>' +
      '<p>' + o.story + '</p>' +
      '<h3 class="modal-h">The science it made possible</h3>' +
      '<ul class="dots">' + (o.science || []).map((s) => '<li>' + s + '</li>').join('') + '</ul>' +
      (o.leftBehind && o.leftBehind.length ? '<h3 class="modal-h">What it left behind</h3><ul class="dots dots--amber">' + o.leftBehind.map((s) => '<li>' + s + '</li>').join('') + '</ul>' : '') +
      '<h3 class="modal-h">Why it still matters</h3>' +
      '<p class="legacy">' + o.legacy + '</p>' +
      '<div class="modal-stats">' + (o.stats || []).map((s) => '<div class="ms"><b>' + s[1] + '</b><span>' + s[0] + '</span></div>').join('') + '</div>' +
      '<div class="modal-sources"><span class="mono">Read the real thing</span>' +
      (o.sources || []).map((s) => '<a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + '<span class="arr">↗</span></a>').join('') +
      '</div>' +
      '</div></div>' +
      '<div class="modal-nav">' +
      '<button class="mnav" data-modal-prev>← Previous machine</button>' +
      '<span class="mono" data-modal-pos></span>' +
      '<button class="mnav" data-modal-next>Next machine →</button>' +
      '</div>';
  }

  function openObject(id, list) {
    const m = modal();
    if (!m) return;
    const o = LB.data.byId(id);
    if (!o) return;
    modalList = list && list.length ? list.slice() : LB.data.all.slice();
    modalIndex = Math.max(0, modalList.indexOf(o));
    renderModal();
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('is-locked');
    LB.modalOpen = true;            /* the scenes behind the modal stop drawing */
    const close = m.querySelector('[data-modal-close]');
    if (close) close.focus();
    history.replaceState(null, '', '#machine-' + id);
  }
  LB.openObject = openObject;

  function renderModal() {
    const m = modal();
    if (!m) return;
    const o = modalList[modalIndex];
    if (!o) return;
    const body = m.querySelector('[data-modal-body]');
    body.innerHTML = modalHTML(o);
    const pos = m.querySelector('[data-modal-pos]');
    if (pos) pos.textContent = (modalIndex + 1) + ' / ' + modalList.length;
    /* spin up a dedicated mini viewer for this machine */
    const canvas = body.querySelector('#modal-canvas');
    if (canvas && LB.viewer) {
      const accent = o.status === 'active' ? '#5af0b4' : (o.body === 'moon' ? '#8cbeff' : (o.body === 'deep' ? '#c4b5fd' : '#ff8a5c'));
      LB.viewer.active = true;
      LB.viewer.mount(canvas, o.model, accent);
    }
    const scroller = m.querySelector('[data-modal-scroll]');
    if (scroller) scroller.scrollTop = 0;
  }

  function closeModal() {
    const m = modal();
    if (!m) return;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('is-locked');
    LB.modalOpen = false;
    if (LB.viewer) LB.viewer.active = false;
    if (location.hash.indexOf('#machine-') === 0) history.replaceState(null, '', location.pathname + location.search);
  }
  LB.closeObject = closeModal;

  function stepModal(dir) {
    modalIndex = (modalIndex + dir + modalList.length) % modalList.length;
    const o = modalList[modalIndex];
    renderModal();
    history.replaceState(null, '', '#machine-' + o.id);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const open = e.target.closest('[data-object]');
      if (open) {
        const inCatalog = e.target.closest('#catalog-grid');
        e.preventDefault();
        openObject(open.dataset.object, inCatalog && LB.catalogList ? LB.catalogList : null);
        return;
      }
      if (e.target.closest('[data-modal-close]')) { closeModal(); return; }
      const m = modal();
      if (m && m.classList.contains('is-open') && e.target.classList.contains('modal-backdrop')) closeModal();
      if (e.target.closest('[data-modal-prev]')) stepModal(-1);
      if (e.target.closest('[data-modal-next]')) stepModal(1);
    });
    document.addEventListener('keydown', (e) => {
      const m = modal();
      if (!m || !m.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight') stepModal(1);
      if (e.key === 'ArrowLeft') stepModal(-1);
    });
  }

  /* ======================================================================
     3. Pages
     ====================================================================== */
  function initLoader() {
    const loader = document.getElementById('loader');
    const fill = document.getElementById('loader-fill');
    const pct = document.getElementById('loader-pct');
    const status = document.getElementById('loader-status');
    const steps = ['spinning up the renderer', 'loading surface maps', 'modelling the hardware', 'waking the landers', 'ready'];
    let lifted = false;
    function lift() {
      if (lifted) return;
      lifted = true;
      if (fill) fill.style.width = '100%';
      if (pct) pct.textContent = '100';
      if (loader) {
        loader.classList.add('is-done');
        setTimeout(() => loader.setAttribute('hidden', ''), 900);
      }
      document.body.classList.add('is-ready');
    }
    LB.liftLoader = lift;
    A.onChange((r) => {
      const shown = U.clamp(r, 0, 1);
      if (fill) fill.style.width = (shown * 100).toFixed(1) + '%';
      if (pct) pct.textContent = String(Math.round(shown * 100)).padStart(2, '0');
      if (status) status.textContent = steps[Math.min(steps.length - 1, Math.floor(shown * (steps.length - 1) + 0.0001))];
    });
    /* safety net: never trap the visitor behind the loader */
    if (A.counts().total === 0 || A.counts().ok === A.counts().total) setTimeout(lift, 240);
    setTimeout(() => { if (!lifted && A.counts().ok >= Math.max(1, A.counts().total - 1)) lift(); }, 3000);
    setTimeout(lift, 11000);
    A.lift = lift;
  }

  function initReveals() {
    const els = U.$$('[data-reveal]');
    /* no scroll-triggered opacity/transform work in the default mode */
    if (LB.motion.level !== 'full' || !revealIO) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const groups = {};
    els.forEach((el) => {
      const p = el.parentNode;
      groups[p] = (groups[p] || 0);
      el.style.transitionDelay = Math.min(360, groups[p] * 60) + 'ms';
      groups[p]++;
      revealIO.observe(el);
    });
  }

  function initStrip() {
    const track = document.getElementById('strip-track');
    if (!track) return;
    const facts = LB.data.strip || [];
    const one = facts.map((f) => '<span class="strip-item"><b>' + f[0] + '</b><i>' + f[1] + '</i></span><span class="strip-sep" aria-hidden="true">◆</span>').join('');
    const paint = () => { track.innerHTML = LB.motion.level === 'full' ? one + one : one; };
    paint();
    document.addEventListener('lb:motion', paint);
  }

  function initNav() {
    const head = document.getElementById('site-head');
    const toggle = document.querySelector('[data-nav-toggle]');
    const sheet = document.getElementById('nav-sheet');
    if (toggle && sheet) {
      toggle.addEventListener('click', () => {
        const open = sheet.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        document.documentElement.classList.toggle('is-locked', open);
      });
      U.$$('a', sheet).forEach((a) => a.addEventListener('click', () => {
        sheet.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.documentElement.classList.remove('is-locked');
      }));
    }
    let last = 0;
    function onScroll() {
      const y = window.scrollY;
      if (head) head.classList.toggle('is-stuck', y > 24);
      if (head && y > 200 && y > last + 6) head.classList.add('is-hidden');
      else if (y < last - 6) head.classList.remove('is-hidden');
      last = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* scrollspy */
    const links = U.$$('[data-spy]');
    if (links.length && 'IntersectionObserver' in window) {
      const map = {};
      links.forEach((a) => { map[a.dataset.spy] = a; });
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const a = map[e.target.id];
          if (!a) return;
          if (e.isIntersecting) { links.forEach((l) => l.classList.remove('is-on')); a.classList.add('is-on'); }
        });
      }, { rootMargin: '-30% 0px -55% 0px' });
      Object.keys(map).forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    }
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const head = document.getElementById('site-head');
      const off = (head ? head.offsetHeight : 0) + 12;
      const top = el.getBoundingClientRect().top + window.scrollY - off;
      const prev = document.documentElement.style.scrollBehavior;
      const behavior = LB.motion.level === 'full' ? 'smooth' : 'auto';
      document.documentElement.style.scrollBehavior = behavior;
      window.scrollTo(0, top);
      setTimeout(() => { document.documentElement.style.scrollBehavior = prev; }, behavior === 'smooth' ? 900 : 0);
    });
  }

  function initCounters() {
    const els = U.$$('[data-count]');
    if (!els.length) return;
    const run = (el) => {
      const to = parseFloat(el.dataset.count);
      const dec = (el.dataset.count.indexOf('.') > -1) ? 1 : 0;
      if (LB.motion.level !== 'full') {           /* no counting animation in the default modes */
        el.textContent = to.toFixed(dec) + (el.dataset.suffix || '');
        return;
      }
      const from = 0, dur = 1.2;
      const t0 = performance.now();
      (function step(now) {
        const f = U.clamp((now - t0) / (dur * 1000));
        el.textContent = (from + (to - from) * U.easeOut(f)).toFixed(dec) + (el.dataset.suffix || '');
        if (f < 1) requestAnimationFrame(step);
      })(t0);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    els.forEach((el) => io.observe(el));
  }

  function initCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    const search = document.getElementById('catalog-search');
    const chipsBody = U.$$('[data-filter-body]');
    const chipsStatus = U.$$('[data-filter-status]');
    const count = document.getElementById('catalog-count');
    const empty = document.getElementById('catalog-empty');
    let fBody = 'all', fStatus = 'all', q = '';

    function apply() {
      const list = LB.data.all.filter((o) => {
        if (fBody !== 'all' && o.body !== fBody) return false;
        if (fStatus === 'active' && !(o.status === 'active' || o.status === 'travelling')) return false;
        if (fStatus === 'quiet' && !(o.status === 'silent' || o.status === 'retired')) return false;
        if (q) {
          const hay = (o.name + ' ' + o.short + ' ' + o.type + ' ' + o.site + ' ' + o.headline + ' ' + o.story + ' ' + (o.landedYear || '')).toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        return true;
      });
      LB.catalogList = list;
      buildCards(grid, list);
      if (count) count.textContent = list.length + (list.length === 1 ? ' machine' : ' machines');
      if (empty) empty.hidden = list.length > 0;
    }
    chipsBody.forEach((c) => c.addEventListener('click', () => {
      chipsBody.forEach((x) => x.classList.remove('is-on'));
      c.classList.add('is-on'); fBody = c.dataset.filterBody; apply();
    }));
    chipsStatus.forEach((c) => c.addEventListener('click', () => {
      chipsStatus.forEach((x) => x.classList.remove('is-on'));
      c.classList.add('is-on'); fStatus = c.dataset.filterStatus; apply();
    }));
    if (search) {
      let deb = null;
      search.addEventListener('input', () => {
        clearTimeout(deb);
        deb = setTimeout(() => { q = search.value.trim().toLowerCase(); apply(); }, 110);
      });
    }
    apply();
    /* deep-link support: catalog.html#machine-insight */
    if (location.hash.indexOf('#machine-') === 0) {
      const id = location.hash.replace('#machine-', '');
      if (LB.data.byId(id)) openObject(id);
    }
  }

  function initGlossary() {
    const list = document.getElementById('glossary-list');
    if (list) {
      list.innerHTML = (LB.data.glossary || []).map((g, i) =>
        '<details class="gloss" data-reveal><summary><span class="gloss-term">' + g[0] + '</span><span class="gloss-plus" aria-hidden="true"></span></summary><p>' + g[1] + '</p></details>'
      ).join('');
    }
    const all = document.querySelector('[data-glossary-toggle]');
    if (!all) return;
    const items = U.$$('details.gloss');
    all.addEventListener('click', () => {
      const open = items.some((d) => !d.open);
      items.forEach((d) => { d.open = open; });
      all.textContent = open ? 'Close all terms' : 'Open all terms';
    });
  }

  function initLive() {
    /* footer / hero live numbers */
    const now = new Date();
    const km = LB.space.marsEarthKm(now);
    U.$$('[data-live-mars]').forEach((el) => { el.textContent = U.compact(km) + ' km'; });
    U.$$('[data-live-mars-light]').forEach((el) => { el.textContent = LB.space.lightLabel(LB.space.lightTime(km)); });
    U.$$('[data-live-moon-light]').forEach((el) => { el.textContent = '1.28 s'; });
    U.$$('[data-year]').forEach((el) => { el.textContent = String(now.getFullYear()); });
    U.$$('[data-age]').forEach((el) => {
      /* e.g. Apollo 11's footprint has been on the Moon since 1969 */
      const y = parseFloat(el.dataset.age);
      el.textContent = Math.max(0, Math.round((now - new Date(Date.UTC(y, 6, 20))) / 31557600000)) + ' years';
    });
  }

  function initSources() {
    const list = document.getElementById('source-list');
    if (!list) return;
    const seen = {}, out = [];
    (LB.data.objects || []).forEach((o) => {
      (o.sources || []).forEach((s) => {
        if (seen[s.url]) return;
        seen[s.url] = 1;
        out.push(s);
      });
    });
    out.push({
      label: 'NASA Space Apps Challenge 2026 — challenge list',
      url: 'https://www.spaceappschallenge.org/2026/challenges/abandoned-but-not-forgotten-storytelling-about-nasas-discarded-equipment-on-the-moon-and-mars/'
    });
    list.innerHTML = out.map((s) => '<li>· <a href="' + s.url + '" target="_blank" rel="noopener">' + s.label + '</a></li>').join('');
  }

  /* ------------------------------------------------------------------ motion
     One control, three levels, remembered between visits. It is the visitor's
     answer to "this is too much" — and it is on every page, in the nav and in
     the mobile sheet. */
  function initMotion() {
    const btns = U.$$('[data-motion-toggle]');
    const labels = U.$$('[data-motion-label]');
    function paint() {
      const cfg = LB.motion.cfg;
      labels.forEach((l) => { l.textContent = cfg.label; });
      btns.forEach((b) => {
        b.dataset.motionLevel = cfg.key;
        b.setAttribute('title', 'Motion: ' + cfg.label + ' — ' + cfg.hint + '. Click to change.');
        b.setAttribute('aria-label', 'Motion level: ' + cfg.label + '. Click to change.');
      });
    }
    btns.forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); LB.motion.cycle(); }));
    document.addEventListener('lb:motion', paint);
    paint();
  }

  function initFAQ() {
    U.$$('.qa-item').forEach((item) => {
      const btn = item.querySelector('.qa-q');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ======================================================================
     4. Boot
     ====================================================================== */
  LB.register({
    name: 'viewer',
    update(t, dt) { if (LB.viewer && LB.viewer.active) LB.viewer.update(t, dt); }
  });

  /* every registered module gets its init() once, before the loop starts */
  function initModules() {
    (LB.modules || []).forEach((m) => {
      if (!m || typeof m.init !== 'function' || m._inited) return;
      m._inited = true;
      try {
        m.init();
      } catch (e) {
        console.error('[' + (m.name || 'module') + '] init: ' + (e && e.message));
        if (LB.assets) { LB.assets.expect(m.name || 'module'); LB.assets.done(m.name || 'module'); }
      }
    });
  }

  function boot() {
    initModules();
    initLoader();
    initNav();
    initMotion();
    initGlossary();
    initFAQ();
    initReveals();
    initStrip();
    initAnchors();
    initCounters();
    initLive();
    initSources();
    initCatalog();
    /* deep link straight into a story */
    if (location.hash.indexOf('#machine-') === 0) {
      const id = location.hash.replace('#machine-', '');
      if (LB.data.byId(id)) setTimeout(() => openObject(id), 260);
    }
    /* The story modal's WebGL viewer is intentionally lazy: the fifth context
       is created only if somebody asks to see a machine in 3D. */

    if (!LB.hasWebGL || !LB.hasWebGL()) {
      document.documentElement.classList.add('no-webgl');
      A.expect('webgl'); A.done('webgl');
      A.lift && A.lift();
    }
    LB.start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
