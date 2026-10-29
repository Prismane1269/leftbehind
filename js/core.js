/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — core engine
   module registry • scroll driver • pointer • shared math • single RAF loop

   v1.1 — performance pass
     · motion levels (full / balanced / calm), remembered, reduced-motion aware
     · adaptive render scale that keeps stepping down while frames are late
     · every layout read happens in one batch before any DOM write (no thrash)
     · change-detecting DOM writers (no redundant style/text mutations)
     · shader warm-up helper so first paint of a scene never stalls the scroll
     · the loop stops entirely when the tab is hidden
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.LB = window.LB || {});
  T.version = '1.1.0';

  /* QA hook. With `window.__LB_LEGACY = true` set before load, the engine runs
     the way it did before the performance pass — no shader warm-up, no adaptive
     resolution, motion pinned to "full" — so the two behaviours can be measured
     against each other in the same browser. Nothing in the site sets it. */
  const LEGACY = !!window.__LB_LEGACY;
  T.legacy = LEGACY;
  T.warmEnabled = !LEGACY;

  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  T.reduced = mqReduce.matches;
  T.touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------------------------------------------------------------- utils */
  const U = T.util = {
    clamp: (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    damp: (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt)),
    smooth: (t) => t * t * (3 - 2 * t),
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    range: (p, a, b, easing) => { const t = U.clamp((p - a) / (b - a)); return easing ? easing(t) : t; },
    window: (p, a, b, c, d) => U.range(p, a, b) * (1 - U.range(p, c, d)),
    rand: (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); },
    hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); },
    $(s, r) { return (r || document).querySelector(s); },
    $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); },
    /* number formatting for consoles and readouts */
    num(n, d) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
    },
    /* 1234567 -> "1.23 M" style with unit */
    compact(n) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      const a = Math.abs(n);
      if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (a >= 1e3) return U.num(Math.round(n));
      return String(Math.round(n * 100) / 100);
    },
    time(sec) {
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
      if (h) return h + 'h ' + String(m).padStart(2, '0') + 'm';
      if (m) return m + 'm ' + String(s).padStart(2, '0') + 's';
      return s + 's';
    },
    dateUTC(d) {
      const p = (n) => String(n).padStart(2, '0');
      return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + ' UTC';
    }
  };

  /* ======================================================================
     Motion levels — one switch that dials the whole site up or down.
       full      every effect, 2x render scale, full parallax
       balanced  default: 1.5x scale, softer parallax, lighter particles
       calm      no parallax, no auto-spin, no marquee, 1x scale, 30 fps cap
     The level is remembered, and `prefers-reduced-motion` starts you in calm.
     ====================================================================== */
  const STORE = 'lb-motion';
  /* [desktop, touch]. CSS pixels are a little softer than 1:1 on high-DPI
     screens, but cutting the buffer to 0.8× makes it ~64% fewer pixels than a
     2× device-pixel render. This is the important default for a scroll story. */
  const SCALE = { full: [1.25, 1], balanced: [0.8, 0.75], calm: [0.68, 0.68] };
  const LEVELS = {
    full:     { key: 'full',     label: 'Full',     parallax: 1,    spin: 1,    debris: 1,   cap: 30, hint: 'continuous camera and subtle 3D motion' },
    balanced: { key: 'balanced', label: 'Balanced', parallax: 0, spin: 0, debris: 0, cap: 30, hint: 'steady 3D, no scroll spin or parallax' },
    calm:     { key: 'calm',     label: 'Calm',     parallax: 0,    spin: 0,    debris: 0,   cap: 20, hint: 'still frames, no parallax, lightest load' }
  };
  T.levels = LEVELS;

  /* render scale — every scene asks for this, so a weak GPU can be dialled back
     without touching the scenes themselves */
  T.pixelScale = SCALE.balanced[T.touch ? 1 : 0];
  T.dpr = function () { return Math.max(0.65, Math.min(window.devicePixelRatio || 1, T.pixelScale)); };
  T.qualityDrop = false;
  T.modules = [];

  /* every scene renderer registers here so one call can rescale them all */
  T.renderers = [];
  T.scaleRevision = 0;
  T.addRenderer = function (name, renderer) {
    if (!renderer) return renderer;
    if (!T.renderers.some((x) => x.renderer === renderer)) T.renderers.push({ name: name, renderer: renderer });
    try { if (Math.abs(renderer.getPixelRatio() - T.dpr()) > 0.001) renderer.setPixelRatio(T.dpr()); } catch (e) { /* context lost */ }
    return renderer;
  };
  /* Re-pointing a renderer at a new pixel ratio reallocates its drawing buffer,
     which is a genuine hitch — so only touch the canvases whose ratio really
     changes, and when several do, spread them one per frame. */
  T._scaleQueue = [];
  T.applyScale = function (spread) {
    const pr = T.dpr();
    const pending = [];
    for (let i = 0; i < T.renderers.length; i++) {
      const r = T.renderers[i].renderer;
      try { if (Math.abs(r.getPixelRatio() - pr) > 0.001) pending.push(r); } catch (e) { /* context lost */ }
    }
    if (!pending.length) return;
    if (!spread) {
      pending.forEach((r) => { try { r.setPixelRatio(pr); T.scaleRevision++; } catch (e) { /* context lost */ } });
      return;
    }
    T._scaleQueue = pending;
  };
  T._drainScale = function () {
    if (!T._scaleQueue.length) return;
    const r = T._scaleQueue.shift();
    try { r.setPixelRatio(T.dpr()); T.scaleRevision++; } catch (e) { /* context lost */ }
  };
  /* Compile every shader in a scene while the loader is still up. Without this
     the first frame of a scene pays for program linking — a 100–500 ms stall
     that lands exactly when the visitor scrolls into it. */
  T.warm = function (renderer, scene, camera) {
    if (!T.warmEnabled) { try { renderer.render(scene, camera); } catch (e) { /* not fatal */ } return; }
    try { if (renderer.compile) renderer.compile(scene, camera); } catch (e) { /* not fatal */ }
    try { renderer.render(scene, camera); } catch (e) { /* not fatal */ }
  };

  T.motion = {
    level: 'balanced',
    cfg: LEVELS.balanced,
    chosen: false,                       /* true once the visitor picks a level */
    _default() { return LEGACY ? 'full' : (T.reduced ? 'calm' : 'balanced'); },
    init() {
      let saved = null;
      try { saved = localStorage.getItem(STORE); } catch (e) { /* private mode */ }
      /* Full remains an internal QA mode; do not restore an old opt-in into the
         default UI, since Balanced is now the no-jank default. */
      this.set(LEVELS[saved] && saved !== 'full' ? saved : this._default(), true);
      const onChange = (e) => {
        T.reduced = e.matches;
        if (!this.chosen) this.set(e.matches ? 'calm' : 'balanced');
      };
      if (mqReduce.addEventListener) mqReduce.addEventListener('change', onChange);
      else if (mqReduce.addListener) mqReduce.addListener(onChange);
    },
    set(level, quiet) {
      if (!LEVELS[level]) level = 'balanced';
      this.level = level;
      this.cfg = LEVELS[level];
      if (!quiet) { this.chosen = true; try { localStorage.setItem(STORE, level); } catch (e) { /* private mode */ } }
      document.documentElement.setAttribute('data-motion', level);
      T.pixelScale = SCALE[level][T.touch ? 1 : 0];
      T.qualityDrop = false;
      T.applyScale(true);
      try { document.dispatchEvent(new CustomEvent('lb:motion', { detail: { level: level, cfg: this.cfg } })); } catch (e) { /* older browsers */ }
      return level;
    },
    cycle() {
      const order = ['balanced', 'calm'];
      return this.set(order[(order.indexOf(this.level) + 1) % order.length]);
    },
    /* per-frame multiplier helpers the scenes read */
    get parallax() { return this.cfg.parallax; },
    get spin() { return this.cfg.spin; }
  };

  /* ======================================================================
     DOM writers that skip no-op mutations. A scroll-driven page writes the
     same handful of properties every frame; only the changes should reach
     the style engine.
     ====================================================================== */
  const num3 = (v) => String(Math.round(v * 1000) / 1000);
  const px1 = (v) => { const n = Math.round(v * 10) / 10; return (n === 0 ? '0px' : n + 'px'); };
  T.dom = {
    st(el, prop, val) { if (!el) return; const s = el.style; if (s[prop] !== val) s[prop] = val; },
    tx(el, val) { if (!el) return; if (el.textContent !== val) el.textContent = val; },
    html(el, val) { if (!el) return; if (el.innerHTML !== val) el.innerHTML = val; },
    cls(el, name, on) {
      if (!el) return;
      const l = el.classList;
      if (on) { if (!l.contains(name)) l.add(name); }
      else if (l.contains(name)) l.remove(name);
    },
    /* opacity: canonical 3-decimal string so the guard actually matches */
    op(el, v) { if (!el) return; const s = num3(v); if (el.style.opacity !== s) el.style.opacity = s; },
    ty(el, v) { if (!el) return; const s = 'translateY(' + px1(v) + ')'; if (el.style.transform !== s) el.style.transform = s; },
    sy(el, v) { if (!el) return; const s = 'scaleY(' + (Math.round(v * 10000) / 10000) + ')'; if (el.style.transform !== s) el.style.transform = s; },
    vis(el, show) { if (!el) return; const s = show ? 'visible' : 'hidden'; if (el.style.visibility !== s) el.style.visibility = s; }
  };

  /* ---------------------------------------------------------------- scroll */
  const Scroll = T.Scroll = {
    y: 0, prevY: 0, vel: 0, vh: innerHeight, vw: innerWidth, docH: document.body.scrollHeight,
    _cache: new Map(), _rects: new Map(), _watch: [], _resizeFns: [],
    /* Ask for an element's box to be measured in this frame's read phase.
       Scenes then read the cached box instead of forcing their own layout. */
    watch(el) { if (el && this._watch.indexOf(el) < 0) this._watch.push(el); return el; },
    rectOf(el) {
      if (!el) return { top: 0, bottom: 0, height: 0, width: 0 };
      let r = this._rects.get(el);
      if (r) return r;
      const b = el.getBoundingClientRect();
      r = { top: b.top, bottom: b.bottom, height: b.height, width: b.width, left: b.left, right: b.right };
      this._rects.set(el, r);
      return r;
    },
    /* one batch of reads, before any module writes a single style */
    _measure() {
      this._rects.clear();
      for (let i = 0; i < this._watch.length; i++) {
        const el = this._watch[i];
        if (!el.isConnected) continue;
        const b = el.getBoundingClientRect();
        this._rects.set(el, { top: b.top, bottom: b.bottom, height: b.height, width: b.width, left: b.left, right: b.right });
      }
    },
    progress(el) {
      if (!el) return 0;
      let m = this._cache.get(el);
      if (!m || m.w !== this.vw || m.h !== this.docH) {
        const r = this.rectOf(el);
        m = { top: r.top + this.y, height: r.height, w: this.vw, h: this.docH };
        this._cache.set(el, m);
      }
      const span = Math.max(1, m.height - this.vh);
      return U.clamp((this.y - m.top) / span);
    },
    inView(el, pad) { const r = this.rectOf(el); const p = pad || 0; return r.bottom > -p && r.top < this.vh + p; },
    invalidate() { this._cache.clear(); this._rects.clear(); },
    onResize(fn) { this._resizeFns.push(fn); },
    fireResize() { this.invalidate(); this._resizeFns.forEach((f) => { try { f(); } catch (e) { /* one bad handler must not stop the rest */ } }); },
    _tick() {
      this.prevY = this.y;
      this.y = window.pageYOffset || document.documentElement.scrollTop || 0;
      this.vel = this.y - this.prevY;
      this.vh = innerHeight; this.vw = innerWidth;
      this.docH = document.body.scrollHeight;
      this._measure();
    },
    init() {
      let t;
      U.on(window, 'resize', () => { clearTimeout(t); t = setTimeout(() => { this.vh = innerHeight; this.vw = innerWidth; this.fireResize(); }, 120); });
      window.addEventListener('load', () => { this.fireResize(); });
    }
  };

  /* ---------------------------------------------------------------- pointer */
  const P = T.pointer = {
    x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, sx: 0, sy: 0, rx: 0, ry: 0, down: false,
    nxr: 0, nyr: 0, movedAt: 0,
    init() {
      U.on(window, 'pointermove', (e) => {
        this.x = e.clientX; this.y = e.clientY;
        this.nx = (e.clientX / innerWidth) * 2 - 1;
        this.ny = -((e.clientY / innerHeight) * 2 - 1);
        /* raw normalized (canvas-relative consumers use these) */
        this.rx = e.clientX; this.ry = e.clientY;
        this.movedAt = performance.now();
      }, { passive: true });
      U.on(window, 'pointerdown', () => { this.down = true; });
      U.on(window, 'pointerup', () => { this.down = false; });
      U.on(window, 'pointerleave', () => { this.nx = 0; this.ny = 0; });
    },
    update(dt) {
      /* the motion level scales parallax; calm parks the camera where it is */
      const k = T.motion.cfg.parallax;
      this.sx = U.damp(this.sx, this.nx * k, 4, dt);
      this.sy = U.damp(this.sy, this.ny * k, 4, dt);
    }
  };

  /* ---------------------------------------------------------------- lunar / planetary light time */
  T.space = {
    C_KM_S: 299792.458,
    MOON_KM: 384400,             // mean Earth–Moon distance
    AU_KM: 149597870.7,
    /* Simplified Keplerian model from JPL mean orbital elements.
       Good to ~1% for Earth–Mars distance — plenty for a light-time demo. */
    _solve(M, e) {                                    // Kepler's equation, Newton
      let E = M;
      for (let i = 0; i < 6; i++) {
        const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= d;
        if (Math.abs(d) < 1e-9) break;
      }
      return E;
    },
    _planet(el, days) {                               // heliocentric position, AU
      const D = Math.PI / 180;
      const M = (el.L0 - el.varpi + el.n * days) * D;
      const E = this._solve(((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI, el.e);
      const xv = el.a * (Math.cos(E) - el.e);
      const yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
      const v = Math.atan2(yv, xv), r = Math.hypot(xv, yv);
      const lon = v + el.varpi * D;
      return { x: r * Math.cos(lon), y: r * Math.sin(lon), r };
    },
    EARTH: { a: 1.00000011, e: 0.01671022, L0: 100.46435, varpi: 102.94719, n: 0.9856091 },
    MARS:  { a: 1.52371034, e: 0.09339410, L0: -4.55343205, varpi: -23.94362959, n: 0.52402068 },
    marsEarthKm(date) {
      const days = (date.getTime() / 86400000) - 10957.5;   // days since J2000
      const e = this._planet(this.EARTH, days), m = this._planet(this.MARS, days);
      return Math.hypot(m.x - e.x, m.y - e.y) * this.AU_KM;
    },
    lightTime(km) { return km / this.C_KM_S; },
    /* seconds → "12 min 34 s" */
    lightLabel(sec) {
      if (sec < 1) return (sec * 1000).toFixed(0) + ' ms';
      if (sec < 90) return sec.toFixed(sec < 10 ? 2 : 1) + ' s';
      return U.time(sec);
    }
  };

  T.register = (m) => T.modules.push(m);

  /* ---------------------------------------------------------------- loop */
  let last = performance.now(), drawn = last, rafId = 0, running = false;
  let adaptAt = 0, goodStreak = 0, badStreak = 0, stepUps = 0;
  T.adaptive = false;         /* stable quality beats mid-scroll buffer reallocations */
  T.fps = 60;
  T.draws = 0;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const cap = T.motion.cfg.cap;
    /* calm mode renders on a 30 fps budget — half the GPU work, same story */
    if (cap && now - drawn < (1000 / cap) - 2) return;

    const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
    last = now; drawn = now;
    T.fps = T.fps * 0.9 + (1 / Math.max(0.0001, dt)) * 0.1;
    T.draws++;
    Scroll._tick();          /* all layout reads for this frame happen here */
    P.update(dt);
    const t = now / 1000;

    /* Adaptive resolution, evaluated about once a second and only after boot.
       Step down while frames are late; step back up (at most twice) once the
       machine proves it has headroom. */
    T._drainScale();
    const base = SCALE[T.motion.level][T.touch ? 1 : 0];
    const budget = cap || 60;
    if (T.adaptive && now - adaptAt > 1400 && t > 6) {
      adaptAt = now;
      /* judge against the selected frame budget, not a hard-coded 45 fps — a
         30 fps Balanced mode must not automatically lower quality forever */
      if (T.fps < budget * 0.7 && T.pixelScale > 0.65) {
        if (++badStreak >= 2) {
          T.pixelScale = Math.max(0.65, Math.round((T.pixelScale - 0.08) * 100) / 100);
          T.qualityDrop = true; badStreak = 0; goodStreak = 0;
          T.applyScale(true);
        }
      } else if (T.fps > budget * 1.12 && T.pixelScale < base && Math.abs(Scroll.vel) < 1) {
        badStreak = 0;
        if (++goodStreak >= 3 && stepUps < 2) {
          T.pixelScale = Math.min(base, Math.round((T.pixelScale + 0.08) * 100) / 100);
          T.applyScale(true); stepUps++; goodStreak = 0;
          if (T.pixelScale >= base) T.qualityDrop = false;
        }
      } else { goodStreak = 0; badStreak = 0; }
    }

    for (let i = 0; i < T.modules.length; i++) {
      const m = T.modules[i];
      if (!m.update) continue;
      if (m.update.constructor !== Function) continue;
      try { m.update(t, dt, Scroll, P); } catch (e) { console.error('[' + (m.name || i) + '] ' + (e && e.message)); }
    }
  }

  T.start = function () {
    if (running) return;
    running = true;
    last = drawn = performance.now();
    if (!rafId) rafId = requestAnimationFrame(frame);
  };

  /* Nothing should animate in a tab nobody is looking at. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    } else if (running && !rafId) {
      last = drawn = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  });

  Scroll.init();
  P.init();
  T.motion.init();
})();
