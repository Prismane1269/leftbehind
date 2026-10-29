/* ==========================================================================
   Abandoned but not Forgotten — acceptance suite
   Run:  cd qa && npm i puppeteer && node e2e.js
         (serve the project root first:  python3 ../serve.py)
   ========================================================================== */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const path0 = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const SHOTS = process.env.SHOTS || path0.join(__dirname, 'shots');
/* use the browser puppeteer downloaded, or set CHROME to your own */
const CHROME = process.env.CHROME || (() => { try { return puppeteer.executablePath(); } catch (e) { return undefined; } })();

let pass = 0, fail = 0, warn = 0;
const results = [];
function check(name, ok, extra) {
  if (ok) { pass++; results.push(['PASS', name, extra || '']); console.log('  ✅ ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; results.push(['FAIL', name, extra || '']); console.log('  ❌ ' + name + (extra ? '  ' + extra : '')); }
}
function note(msg) { console.log('  · ' + msg); }
function warnCheck(msg) { warn++; console.log('  ⚠ ' + msg); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'shell',
    protocolTimeout: 300000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-dev-shm-usage', '--window-size=1600,900', '--hide-scrollbars']
  });

  /* helpers ------------------------------------------------------------- */
  async function waitReady(pg, timeout) {
    try {
      await pg.waitForFunction(() => {
        const l = document.getElementById('loader');
        if (!l) return true;
        const cs = getComputedStyle(l);
        return l.hasAttribute('hidden') || cs.visibility === 'hidden' || cs.opacity === '0';
      }, { timeout: timeout || 15000, polling: 100 });
    } catch (e) { return false; }
    return true;
  }
  async function gather(page) {
    const reqs = [], errors = [], failed = [];
    page.on('request', (r) => reqs.push(r.url()));
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push('console: ' + m.text());
      if (m.type() === 'warning' && /WebGL|THREE/i.test(m.text())) errors.push('warn: ' + m.text());
    });
    page.on('requestfailed', (r) => failed.push(r.url() + ' ' + (r.failure() ? r.failure().errorText : '')));
    page.on('response', (r) => { if (r.status() >= 400) failed.push('HTTP ' + r.status() + ' ' + r.url()); });
    return { reqs, errors, failed };
  }
  async function settle(page, n = 3) {
    for (let i = 0; i < n; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  async function scrollTo(page, y) {
    await page.evaluate((yy) => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, yy);
    }, y);
    await settle(page, 2);
  }
  async function sectionY(page, sel, frac) {
    return page.evaluate((s, f) => {
      const el = document.querySelector(s);
      if (!el) return -1;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const span = Math.max(1, el.offsetHeight - window.innerHeight);
      return Math.round(top + span * f);
    }, sel, frac);
  }

  /* ======================================================================
     A · index.html — boot, network isolation, readiness
     ====================================================================== */
  console.log('\n── A · boot ─────────────────────────────────────────────');
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const net = await gather(page);
  const t0 = Date.now();
  await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 60000 });

  let loaderGone = false;
  try {
    await page.waitForFunction(() => {
      const l = document.getElementById('loader');
      return l && (l.hasAttribute('hidden') || getComputedStyle(l).visibility === 'hidden' || getComputedStyle(l).opacity === '0');
    }, { timeout: 20000, polling: 120 });
    loaderGone = true;
  } catch (e) { loaderGone = false; }
  const bootMs = Date.now() - t0;
  await waitReady(page);
  check('loader lifts (does not trap the visitor)', loaderGone, bootMs + ' ms');
  check('boot is brisk', bootMs < 9000, bootMs + ' ms');

  const ext = net.reqs.filter((u) => !u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:'));
  check('no requests leave the machine (fully offline-capable)', ext.length === 0, ext.slice(0, 4).join(' , ') || net.reqs.length + ' requests, all local');

  const texReqs = net.reqs.filter((u) => /assets\/textures\/.+\.jpg/.test(u));
  check('all five surface maps were loaded', texReqs.length >= 5, texReqs.length + ' textures');

  const engine = await page.evaluate(() => ({
    lb: typeof window.LB === 'object',
    three: window.THREE && window.THREE.REVISION,
    modules: (window.LB && window.LB.modules || []).map((m) => m.name),
    scenes: Object.keys((window.LB && window.LB.scenes) || {}),
    fps: window.LB ? Math.round(window.LB.fps) : 0,
    motion: window.LB && window.LB.motion ? window.LB.motion.level : null,
    cap: window.LB && window.LB.motion ? window.LB.motion.cfg.cap : 0,
    pixelScale: window.LB ? window.LB.pixelScale : 0,
    assets: window.LB && window.LB.assets ? window.LB.assets.counts() : null,
    webgl: window.LB && window.LB.hasWebGL ? window.LB.hasWebGL() : null
  }));
  check('Three.js loaded', engine.three === '128', 'r' + engine.three);
  check('all six modules registered', engine.modules.length === 6, engine.modules.join(', '));
  check('Balanced is the light default (30 fps cap, sub-1x render)', engine.motion === 'balanced' && engine.cap === 30 && engine.pixelScale <= 1,
    engine.motion + ' · cap ' + engine.cap + ' fps · scale ' + engine.pixelScale);
  check('every 3D scene built', engine.scenes.length === 4, engine.scenes.join(', '));
  check('readiness contract satisfied', engine.assets && engine.assets.total === 4 && engine.assets.ok === 4, JSON.stringify(engine.assets));
  if (engine.fps >= 20) check('rendering at a usable frame rate', true, engine.fps + ' fps'); else warnCheck('low fps in headless swiftshader: ' + engine.fps);

  const calls = await page.evaluate(() => {
    const s = window.LB.scenes.flight;
    return { tris: s.renderer.info.render.triangles, calls: s.renderer.info.render.calls, stars: !!s.scene.getObjectByProperty('type', 'Points') };
  });
  check('flight scene is actually drawing geometry', calls.tris > 1000 && calls.calls > 3, calls.tris + ' triangles, ' + calls.calls + ' draw calls');
  check('zero page errors on load', net.errors.length === 0, net.errors.slice(0, 3).join(' | '));
  check('no failed requests', net.failed.length === 0, net.failed.slice(0, 3).join(' | '));

  await page.screenshot({ path: path.join(SHOTS, '01-hero.png') });
  await sleep(3600);   // let the loader fade + words settle
  await page.screenshot({ path: path.join(SHOTS, '01b-hero-clean.png') });

  /* ======================================================================
     B · the flight
     ====================================================================== */
  console.log('\n── B · the scroll-scrubbed flight ───────────────────────');
  await scrollTo(page, 0);
  await sleep(1200);
  const heroTop = await page.evaluate(() => ({
    a: parseFloat(getComputedStyle(document.querySelector('.hero-copy')).opacity),
    beats: [...document.querySelectorAll('.beat')].filter((b) => parseFloat(getComputedStyle(b).opacity) > 0.04).length,
    readout: [...document.querySelectorAll('.journey-readout b')].map((b) => b.textContent)
  }));
  check('hero copy is readable at the top', heroTop.a > 0.9, 'opacity ' + heroTop.a.toFixed(3));
  check('no story beat intrudes on the hero', heroTop.beats === 0, heroTop.beats + ' visible');
  check('live readout is populated', heroTop.readout.every((v) => v && v !== '—'), heroTop.readout.join(' · '));

  const balancedDraws0 = await page.evaluate(() => window.LB.scenes.flight.renderer.info.render.frame);
  await scrollTo(page, await sectionY(page, '#flight', 0.19));
  const balancedDraws1 = await page.evaluate(() => window.LB.scenes.flight.renderer.info.render.frame);
  check('Balanced keyframes the flight instead of repainting every scroll tick', balancedDraws1 - balancedDraws0 <= 3,
    (balancedDraws1 - balancedDraws0) + ' WebGL frames for the scroll step');

  /* Full motion remains available, but is opt-in; test the original continuous
     fly-through there, then put the page back into its light default. */
  await page.evaluate(() => window.LB.motion.set('full'));
  await sleep(600);                       // let the render-scale queue settle
  await scrollTo(page, 0);
  const camA = await page.evaluate(() => window.LB.scenes.flight.camera.position.toArray().map((n) => +n.toFixed(2)));
  await scrollTo(page, await sectionY(page, '#flight', 0.19));
  const s30 = await page.evaluate(() => ({
    cam: window.LB.scenes.flight.camera.position.toArray().map((n) => +n.toFixed(2)),
    hero: parseFloat(getComputedStyle(document.querySelector('.hero-copy')).opacity),
    beats: [...document.querySelectorAll('.beat')].map((b) => parseFloat(getComputedStyle(b).opacity).toFixed(2))
  }));
  check('Full motion restores the camera fly-through', Math.abs(s30.cam[2] - camA[2]) > 30, 'z ' + camA[2] + ' → ' + s30.cam[2]);
  check('hero copy has scrolled away', s30.hero < 0.2, 'opacity ' + s30.hero.toFixed(3));
  check('exactly one story beat is visible mid-flight', s30.beats.filter((o) => parseFloat(o) > 0.5).length === 1, s30.beats.join(', '));
  await page.screenshot({ path: path.join(SHOTS, '02-flight-moon.png') });

  /* every beat appears on cue as the journey passes its stage */
  const cue = [];
  for (const f of [0.19, 0.43, 0.66, 0.88]) {
    await scrollTo(page, await sectionY(page, '#flight', f));
    await sleep(500);
    const st = await page.evaluate(() => [...document.querySelectorAll('.beat')].map((b) => +parseFloat(getComputedStyle(b).opacity).toFixed(2)));
    const on = st.findIndex((o) => o > 0.5);
    cue.push({ f: f, on: on, visible: st.filter((o) => o > 0.5).length });
  }
  note('beat cue: ' + cue.map((c) => 'f=' + c.f + '→beat' + c.on).join('  '));
  check('each of the four beats takes its turn', cue.map((c) => c.on).join(',') === '0,1,2,3' && cue.every((c) => c.visible === 1),
    cue.map((c) => c.on).join(',') + ' (one at a time)');
  check('the four beats are all reachable', cue.filter((c) => c.on >= 0).length === 4, '4/4 cues');

  await scrollTo(page, await sectionY(page, '#flight', 0.9));
  await sleep(500);
  const s82 = await page.evaluate(() => ({
    cam: window.LB.scenes.flight.camera.position.toArray().map((n) => +n.toFixed(2)),
    hud: [...document.querySelectorAll('.hud i')].filter((i) => i.classList.contains('is-on')).length
  }));
  check('the journey reaches the Mars leg', Math.abs(s82.cam[2] - s30.cam[2]) > 100, 'z ' + s30.cam[2] + ' → ' + s82.cam[2]);
  check('progress HUD advances', s82.hud >= 3, s82.hud + ' of 4 lit');
  await page.screenshot({ path: path.join(SHOTS, '03-flight-mars.png') });
  await page.evaluate(() => window.LB.motion.set('balanced'));
  await sleep(500);                       // keep the rest of the suite on the light default

  /* ======================================================================
     C · the artifact hall
     ====================================================================== */
  console.log('\n── C · the artifact hall (3D museum) ────────────────────');
  const hallInfo = await page.evaluate(() => ({
    plinths: window.LB.scenes.hall.plinths.length,
    models: window.LB.scenes.hall.plinths.map((p) => p.obj.id)
  }));
  check('six machines stand on six plinths', hallInfo.plinths === 6, hallInfo.models.join(', '));

  const names = [];
  for (const f of [0.05, 0.42, 0.95]) {
    await scrollTo(page, await sectionY(page, '#hall', f));
    await sleep(900);
    const st = await page.evaluate(() => ({
      idx: document.querySelector('[data-hall-idx]').textContent,
      name: document.querySelector('[data-hall-name]').textContent,
      site: document.querySelector('[data-hall-site]').textContent,
      tag: document.querySelector('[data-hall-tag]').textContent,
      stats: document.querySelectorAll('[data-hall-specs] div').length,
      active: window.LB.scenes.hall.state().active,
      pos: +window.LB.scenes.hall.state().pos.toFixed(2)
    }));
    names.push(st);
    note('f=' + f + ' → ' + st.idx + ' ' + st.name + ' (' + st.site + ') active=' + st.active + ' pos=' + st.pos);
  }
  check('the hall walks from the first machine', /Apollo 11/.test(names[0].name), names[0].idx + ' ' + names[0].name);
  check('the hall walks forward with scroll', names[2].active > names[0].active, names[0].active + ' → ' + names[2].active);
  check('each machine shows its own specs', names.every((n) => n.stats >= 2), names.map((n) => n.stats).join('/'));
  check('status tag is rendered per machine', names.every((n) => n.tag && n.tag.length > 2), names.map((n) => n.tag).join(' · '));
  await page.screenshot({ path: path.join(SHOTS, '04-hall.png') });

  /* drag spins the machine in front of you */
  await scrollTo(page, await sectionY(page, '#hall', 0.42));
  await sleep(600);
  const spinBefore = await page.evaluate(() => window.LB.scenes.hall.plinths[window.LB.scenes.hall.state().active].holder.rotation.y);
  await page.mouse.move(1120, 470);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(1120 + i * 22, 470); await sleep(20); }
  await page.mouse.up();
  await sleep(500);
  const spinAfter = await page.evaluate(() => window.LB.scenes.hall.plinths[window.LB.scenes.hall.state().active].holder.rotation.y);
  check('dragging turns the machine in front of you', Math.abs(spinAfter - spinBefore) > 0.12, 'Δ' + (spinAfter - spinBefore).toFixed(3) + ' rad');
  const hallRendered = await page.evaluate(() => window.LB.scenes.hall.renderer.info.render.triangles);
  check('the hall is drawing its six models', hallRendered > 2000, hallRendered + ' triangles/frame');

  /* ======================================================================
     D · the globes explorer
     ====================================================================== */
  console.log('\n── D · ground truth (globes) ────────────────────────────');
  await scrollTo(page, await sectionY(page, '#explorer', 0.25));
  await sleep(700);
  const moonRows = await page.evaluate(() => document.querySelectorAll('[data-object-list] .obj-row').length);
  check('the Moon list shows its six machines', moonRows === 6, moonRows + ' rows');

  await page.evaluate(() => {
    const rows = document.querySelectorAll('[data-object-list] .obj-row');
    for (const r of rows) if (r.textContent.indexOf('Apollo 11') >= 0) { r.click(); return; }
  });
  await sleep(1900);
  const pick = await page.evaluate(() => ({
    name: document.querySelector('[data-explorer-name]').textContent,
    meta: document.querySelector('[data-explorer-meta]').textContent.replace(/\s+/g, ' ').trim(),
    dist: document.querySelector('[data-explorer-distance]').textContent,
    light: document.querySelector('[data-explorer-light]').textContent.replace(/\s+/g, ' ').trim(),
    coords: document.querySelector('[data-explorer-coords]').textContent.replace(/\s+/g, ' ').trim(),
    cam: window.LB.scenes.globes.camera.position.toArray().map((n) => +n.toFixed(2))
  }));
  check('choosing a machine updates its story card', /Apollo 11/.test(pick.name), pick.name);
  check('coordinates are shown to three decimals', /0\.674/.test(pick.coords), pick.coords);
  check('distance-to-Earth readout is live', /\d[\d,\.]*\s*km/.test(pick.dist), pick.dist);
  check('radio light-time readout is live', /1\.28\s*s|min/.test(pick.light), pick.light.slice(0, 90));
  const camAfter = await page.evaluate(() => window.LB.scenes.globes.camera.position.toArray().map((n) => +n.toFixed(2)));
  check('the camera has flown toward that spot', Math.hypot(camAfter[0] - pick.cam[0], camAfter[1] - pick.cam[1]) >= 0, 'cam ' + camAfter.join(','));
  await page.screenshot({ path: path.join(SHOTS, '05-explorer-moon.png') });

  /* click a marker on Mars with a real raycast-derived screen point */
  await page.evaluate(() => { document.querySelector('[data-body="mars"]').click(); });
  await sleep(900);
  const marsRows = await page.evaluate(() => document.querySelectorAll('[data-object-list] .obj-row').length);
  check('the Mars list shows its ten machines', marsRows === 10, marsRows + ' rows');

  const pt = await page.evaluate(() => {
    const body = window.LB.scenes.globes.state().body;
    const scene = window.LB.scenes.globes.scene, cam = window.LB.scenes.globes.camera;
    const stage = document.querySelector('.explorer-stage');
    const rect = document.querySelector('#globe-canvas').getBoundingClientRect();
    const ray = new THREE.Raycaster(), v = new THREE.Vector2();
    const before = document.querySelector('[data-explorer-name]').textContent;
    for (let i = 6; i < 54; i++) for (let j = 4; j < 36; j++) {
      v.x = -1 + (2 * i) / 53; v.y = -1 + (2 * j) / 35;
      ray.setFromCamera(v, cam);
      const hits = ray.intersectObjects(scene.children, true);
      for (const h of hits) {
        const p = h.object.geometry && h.object.geometry.parameters;
        const sel = window.LB.scenes.globes.state().selected;
        if (p && p.radius === 0.22 && h.object.userData.body === body && h.object.userData.object.id !== sel) {
          const x = rect.left + ((v.x + 1) / 2) * rect.width;
          const y = rect.top + ((1 - v.y) / 2) * rect.height;
          const opt = { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true };
          stage.dispatchEvent(new PointerEvent('pointerdown', opt));
          stage.dispatchEvent(new PointerEvent('pointerup', opt));
          return { id: h.object.userData.object.id, x: Math.round(x), y: Math.round(y), before: before };
        }
      }
    }
    return null;
  });
  if (pt) {
    await sleep(2100);
    const after = await page.evaluate(() => ({
      name: document.querySelector('[data-explorer-name]').textContent,
      id: window.LB.scenes.globes.state().selected,
      cam: window.LB.scenes.globes.camera.position.toArray().map((n) => +n.toFixed(2))
    }));
    note('marker “' + pt.id + '” clicked at ' + pt.x + ',' + pt.y);
    check('clicking a marker on the globe selects that machine', after.id === pt.id, pt.before + ' → ' + after.name);
    check('the fly-to animation ran and the camera holds the pin', Math.hypot(after.cam[0], after.cam[1], after.cam[2]) > 3 && after.name !== pt.before, 'camera ' + after.cam.join(', '));
  } else {
    check('clicking a marker on the globe selects that machine', false, 'could not project a marker');
  }
  await page.screenshot({ path: path.join(SHOTS, '06-explorer-mars.png') });

  /* deep space */
  await page.evaluate(() => { document.querySelector('[data-body="deep"]').click(); });
  await sleep(700);
  const deep = await page.evaluate(() => ({
    on: document.querySelector('[data-deep]').classList.contains('is-on'),
    probes: document.querySelectorAll('.deep-probe').length,
    txt: document.querySelector('[data-deep]').textContent.replace(/\s+/g, ' ').trim().slice(0, 120),
    rows: document.querySelectorAll('[data-object-list] .obj-row').length
  }));
  check('deep space shows the solar-system diagram', deep.on && deep.probes === 2, deep.probes + ' probes · ' + deep.txt.slice(0, 70));
  check('both Voyagers are listed', deep.rows === 2, deep.rows + ' rows');
  await page.screenshot({ path: path.join(SHOTS, '07-explorer-deep.png') });

  /* search */
  await page.evaluate(() => {
    document.querySelector('[data-body="mars"]').click();
    const s = document.querySelector('[data-object-search]');
    s.value = 'rover';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(500);
  const found = await page.evaluate(() => [...document.querySelectorAll('[data-object-list] .obj-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 26)));
  check('searching the list narrows it', found.length > 0 && found.length < 10, found.length + ' matches: ' + found.slice(0, 3).join(' | '));

  /* ======================================================================
     E · the listening room
     ====================================================================== */
  console.log('\n── E · listening room ──────────────────────────────────');
  await scrollTo(page, await sectionY(page, '#signal', 0.3));
  await sleep(600);
  const seismo = { };
  seismo.before = await page.evaluate(() => document.querySelector('[data-seismo-clock]').textContent);
  await page.click('[data-seismo-play]');
  await sleep(2400);
  seismo.after = await page.evaluate(() => ({
    clock: document.querySelector('[data-seismo-clock]').textContent,
    count: document.querySelector('[data-seismo-count]').textContent,
    mag: document.querySelector('[data-seismo-mag]').textContent,
    canvasPainted: (() => {
      const c = document.getElementById('seismo-canvas');
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, Math.min(40, c.height)).data;
      let nonEmpty = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) nonEmpty++;
      return nonEmpty;
    })()
  }));
  check('the marsquake plays back', /SOL 1222 · [1-9]/.test(seismo.after.clock), seismo.before + ' → ' + seismo.after.clock);
  check('seismogram is drawn on the canvas', seismo.after.canvasPainted > 50, seismo.after.canvasPainted + ' painted pixels');
  check('magnitude and quake count readouts are live', /M\s*5/.test(seismo.after.mag) && parseInt(seismo.after.count, 10) >= 900, seismo.after.mag + ' · ' + seismo.after.count + ' quakes');
  await page.screenshot({ path: path.join(SHOTS, '08-signal-quake.png') });

  await page.click('[data-signal-mode="ingenuity"]');
  await sleep(900);
  const ing = await page.evaluate(() => ({
    mode: window.LB.scenes.signal.state().mode,
    panelOn: document.querySelector('[data-signal-panel="ingenuity"]').classList.contains('is-on'),
    stageTris: window.LB.scenes.signal.renderer.info.render.triangles
  }));
  check('switching to the helicopter changes the stage', ing.mode === 'ingenuity' && ing.panelOn, ing.mode + ', ' + ing.stageTris + ' tris');
  await page.click('[data-burst-run]');
  await sleep(6200);
  const burst = await page.evaluate(() => ({
    fill: document.querySelector('[data-burst-fill]').style.width,
    lines: document.querySelectorAll('[data-burst-log] .log-line').length,
    state: document.querySelector('[data-burst-state]').textContent,
    last: (document.querySelector('[data-burst-log] .log-line:last-child') || {}).textContent || ''
  }));
  check('the final downlink streams in', parseFloat(burst.fill) > 20, burst.fill + ' transferred');
  check('telemetry log lines arrive in order', burst.lines >= 4, burst.lines + ' lines · last: ' + burst.last.slice(0, 48));
  await page.screenshot({ path: path.join(SHOTS, '09-signal-ingenuity.png') });

  await page.click('[data-signal-mode="voyager"]');
  await sleep(800);
  const voy0 = await page.evaluate(() => ({
    mode: window.LB.scenes.signal.state().mode,
    dist: document.querySelector('[data-voyager-dist]').textContent
  }));
  await page.click('[data-voyager-send]');
  await sleep(2600);
  const voy1 = await page.evaluate(() => ({
    clock: document.querySelector('[data-voyager-clock]').textContent,
    bar: document.querySelector('[data-voyager-bar]').style.width,
    state: document.querySelector('[data-voyager-state]').textContent
  }));
  check('the Voyager command starts its journey', voy0.mode === 'voyager' && /^[1-9][\d.]* hours of 2[0-9]/.test(voy1.clock), voy0.dist + ' · ' + voy1.clock);
  check('the outbound leg draws progress on the DSN line', parseFloat(voy1.bar) > 3 && parseFloat(voy1.bar) <= 100, voy1.bar + ' · ' + voy1.state.slice(0, 60));
  await page.screenshot({ path: path.join(SHOTS, '10-signal-voyager.png') });

  /* ======================================================================
     F · timeline + modal
     ====================================================================== */
  console.log('\n── F · timeline, story modal ───────────────────────────');
  await scrollTo(page, await sectionY(page, '#timeline', 0.1));
  await sleep(800);
  const tl1 = await page.evaluate(() => ({
    items: document.querySelectorAll('#timeline-track .tl-item').length,
    chips: document.querySelectorAll('#timeline-track .tl-chip').length,
    spine: document.querySelector('[data-timeline-fill]').style.transform,
    near: document.querySelectorAll('.tl-item.is-near').length
  }));
  await scrollTo(page, await sectionY(page, '#timeline', 0.85));
  await sleep(900);
  const tl2 = await page.evaluate(() => ({
    spine: document.querySelector('[data-timeline-fill]').style.transform,
    near: document.querySelectorAll('.tl-item.is-near').length,
    knob: parseFloat(getComputedStyle(document.querySelector('[data-timeline-knob]')).opacity)
  }));
  check('the timeline carries every dated step', tl1.items === 16, tl1.items + ' entries, ' + tl1.chips + ' machine chips');
  check('the spine fills as you read', tl2.spine !== tl1.spine, tl1.spine + ' → ' + tl2.spine);
  check('entries light up when they come into view', tl2.near >= 5, tl1.near + ' → ' + tl2.near + ' lit');
  check('the playhead knob is visible while reading', tl2.knob > 0.5, 'opacity ' + tl2.knob.toFixed(2));
  await page.screenshot({ path: path.join(SHOTS, '11-timeline.png') });

  /* open a story from a timeline chip */
  const modal = await page.evaluate(async () => {
    const chip = document.querySelector('#timeline-track .tl-chip');
    chip.click();
    await new Promise((r) => setTimeout(r, 900));
    const m = document.getElementById('object-modal');
    const out = {
      open: m.classList.contains('is-open'),
      title: (document.querySelector('#modal-title') || {}).textContent || '',
      hasCanvas: !!document.querySelector('#modal-canvas'),
      viewer: !!(window.LB.viewer && window.LB.viewer.active),
      model: window.LB.viewer && window.LB.viewer.model && window.LB.viewer.model.userData.modelId,
      specs: document.querySelectorAll('.modal-info .spec > div').length,
      bullets: document.querySelectorAll('.modal-info .dots li').length,
      sources: document.querySelectorAll('.modal-sources a').length,
      stats: document.querySelectorAll('.modal-stats .ms').length,
      pos: (document.querySelector('[data-modal-pos]') || {}).textContent || ''
    };
    /* is the modal viewer really rendering? */
    const r = window.LB.viewer.renderer;
    out.vTris = r ? r.info.render.triangles : 0;
    return out;
  });
  check('a timeline chip opens the story modal', modal.open && modal.title.length > 3, modal.title + ' (' + modal.pos + ')');
  check('the modal spins the machine in 3D', modal.hasCanvas && modal.viewer && modal.vTris > 100, modal.model + ' · ' + modal.vTris + ' tris');
  check('the story carries facts, science and sources', modal.specs >= 3 && modal.bullets >= 3 && modal.sources >= 2 && modal.stats >= 3,
    modal.specs + ' specs · ' + modal.bullets + ' bullets · ' + modal.stats + ' stats · ' + modal.sources + ' NASA links');
  await page.screenshot({ path: path.join(SHOTS, '12-modal.png') });

  /* keyboard navigation */
  const nav = await page.evaluate(async () => {
    const t1 = document.querySelector('#modal-title').textContent;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const t2 = document.querySelector('#modal-title').textContent;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((r) => setTimeout(r, 500));
    return { t1: t1, t2: t2, closed: !document.getElementById('object-modal').classList.contains('is-open'), unlocked: !document.documentElement.classList.contains('is-locked') };
  });
  check('arrow keys step between machines', nav.t1 !== nav.t2, nav.t1.slice(0, 24) + ' → ' + nav.t2.slice(0, 24));
  check('Escape closes the modal and unlocks scrolling', nav.closed && nav.unlocked, 'closed');

  /* deep link */
  const deepPage = await browser.newPage();
  const dn = await gather(deepPage);
  await deepPage.setViewport({ width: 1600, height: 900 });
  await deepPage.goto(BASE + '/index.html#machine-insight', { waitUntil: 'load', timeout: 60000 });
  await sleep(3200);
  const deepOpen = await deepPage.evaluate(() => ({
    open: document.getElementById('object-modal').classList.contains('is-open'),
    title: (document.querySelector('#modal-title') || {}).textContent || ''
  }));
  check('a shared link opens straight into a story', deepOpen.open && /InSight/.test(deepOpen.title), deepOpen.title);
  check('deep-linked page has no errors', dn.errors.length === 0, dn.errors.slice(0, 2).join(' | '));
  await deepPage.close();

  /* ======================================================================
     G · catalogue page
     ====================================================================== */
  console.log('\n── G · catalogue ───────────────────────────────────────');
  const cat = await browser.newPage();
  const cn = await gather(cat);
  await cat.setViewport({ width: 1600, height: 1000 });
  const ct0 = Date.now();
  await cat.goto(BASE + '/catalog.html', { waitUntil: 'load', timeout: 60000 });
  const catReady = await waitReady(cat);
  const catReadyMs = Date.now() - ct0;
  try {
    await cat.waitForFunction(() => document.querySelectorAll('#catalog-grid .card').length >= 18, { timeout: 12000, polling: 100 });
  } catch (e) {}
  const catState = await cat.evaluate(() => ({
    cards: document.querySelectorAll('#catalog-grid .card').length,
    count: (document.getElementById('catalog-count') || {}).textContent,
    loaderGone: (() => { const l = document.getElementById('loader'); return l.hasAttribute('hidden') || getComputedStyle(l).opacity === '0'; })(),
    rows: [...document.querySelectorAll('#catalog-grid .card')].map((c) => c.dataset.card)
  }));
  check('all eighteen machines are catalogued', catState.cards === 18, catState.count);
  check('catalogue is interactive almost immediately', catReady && catReadyMs < 4000, catReadyMs + ' ms to ready');
  check('each card names its machine', catState.rows.indexOf('ingenuity') >= 0 && catState.rows.indexOf('voyager1') >= 0, catState.rows.slice(0, 6).join(', '));

  await cat.click('[data-filter-body="moon"]');
  await sleep(300);
  const moonCards = await cat.evaluate(() => document.querySelectorAll('#catalog-grid .card').length);
  check('the Moon filter works', moonCards === 6, moonCards + ' cards');
  await cat.click('[data-filter-body="all"]');
  await cat.click('[data-filter-status="active"]');
  await sleep(300);
  const activeCards = await cat.evaluate(() => [...document.querySelectorAll('#catalog-grid .card')].map((c) => c.dataset.card));
  check('the “still answering” filter works', activeCards.length === 4, activeCards.join(', '));
  await cat.click('[data-filter-status="all"]');

  await cat.evaluate(() => {
    const s = document.getElementById('catalog-search');
    s.value = 'helicopter';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);
  const heli = await cat.evaluate(() => [...document.querySelectorAll('#catalog-grid .card')].map((c) => c.dataset.card));
  check('search finds the helicopter', heli.length === 1 && heli[0] === 'ingenuity', heli.join(',') || 'none');
  await cat.evaluate(() => {
    const s = document.getElementById('catalog-search');
    s.value = 'zzzz';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);
  const noneState = await cat.evaluate(() => ({
    cards: document.querySelectorAll('#catalog-grid .card').length,
    empty: !document.getElementById('catalog-empty').hidden
  }));
  check('an empty search explains itself', noneState.cards === 0 && noneState.empty, 'empty state shown');
  await cat.evaluate(() => {
    const s = document.getElementById('catalog-search');
    s.value = '';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);

  await cat.evaluate(() => { document.querySelector('#catalog-grid [data-object="opportunity"]').click(); });
  await sleep(1000);
  const catModal = await cat.evaluate(() => ({
    open: document.getElementById('object-modal').classList.contains('is-open'),
    title: (document.querySelector('#modal-title') || {}).textContent || '',
    viz: (window.LB.viewer && window.LB.viewer.renderer) ? window.LB.viewer.renderer.info.render.triangles : 0
  }));
  check('a catalogue card opens the 3D story', catModal.open && /Opportunity/.test(catModal.title) && catModal.viz > 100, catModal.title.slice(0, 40) + ' · ' + catModal.viz + ' tris');
  await cat.screenshot({ path: path.join(SHOTS, '13-catalog.png') });
  await cat.evaluate(() => document.querySelector('[data-modal-close]').click());
  check('no errors on the catalogue page', cn.errors.length === 0, cn.errors.slice(0, 2).join(' | '));

  /* ======================================================================
     H · about page
     ====================================================================== */
  console.log('\n── H · about ───────────────────────────────────────────');
  const about = await browser.newPage();
  const an = await gather(about);
  await about.setViewport({ width: 1600, height: 1000 });
  await about.goto(BASE + '/about.html', { waitUntil: 'load', timeout: 60000 });
  await waitReady(about);
  await sleep(900);
  const aboutState = await about.evaluate(() => ({
    sources: document.querySelectorAll('#source-list li').length,
    faq: document.querySelectorAll('.qa-item').length,
    live: [...document.querySelectorAll('[data-live-mars]')].map((e) => e.textContent),
    year: (document.querySelector('[data-year]') || {}).textContent,
    steps: document.querySelectorAll('.step-list li').length
  }));
  await about.evaluate(() => document.querySelector('.qa-q').click());
  const faqOpen = await about.evaluate(() => document.querySelector('.qa-item').classList.contains('is-open'));
  check('about page lists every NASA source', aboutState.sources >= 14, aboutState.sources + ' links');
  check('the FAQ opens on click', faqOpen && aboutState.faq >= 5, aboutState.faq + ' questions');
  check('live readouts are populated there too', aboutState.live.length > 0 && /\d/.test(aboutState.live[0]), aboutState.live[0]);
  check('footer year is current', aboutState.year === '2026', aboutState.year);
  check('no errors on the about page', an.errors.length === 0, an.errors.slice(0, 2).join(' | '));
  await about.screenshot({ path: path.join(SHOTS, '14-about.png') });

  /* ======================================================================
     I · mobile
     ====================================================================== */
  console.log('\n── I · mobile ──────────────────────────────────────────');
  const mob = await browser.newPage();
  const mn = await gather(mob);
  await mob.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await mob.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 60000 });
  await waitReady(mob);
  await sleep(2600);
  const m1 = await mob.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    hero: parseFloat(getComputedStyle(document.querySelector('.hero-copy')).opacity),
    fit: [...document.querySelectorAll('.beat, .artifact-card, .explorer__stage, .signal-grid > *')].every((el) => el.getBoundingClientRect().width <= window.innerWidth + 1)
  }));
  check('no horizontal overflow on a phone', m1.overflow <= 2, m1.overflow + 'px');
  check('hero copy survives the small screen', m1.hero > 0.85, 'opacity ' + m1.hero.toFixed(2));
  check('story blocks fit the viewport', m1.fit, 'all blocks within width');
  await mob.screenshot({ path: path.join(SHOTS, '15-mobile-hero.png') });

  await mob.click('[data-nav-toggle]');
  await sleep(600);
  const sheetOpen = await mob.evaluate(() => document.getElementById('nav-sheet').classList.contains('is-open'));
  check('the mobile menu opens', sheetOpen, 'sheet is-open');
  await mob.click('[data-nav-toggle]');
  await sleep(400);

  await mob.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    const el = document.getElementById('hall');
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight - window.innerHeight) * 0.5);
  });
  await sleep(1400);
  const mHall = await mob.evaluate(() => {
    const c = document.querySelector('.artifact-card');
    const r = c.getBoundingClientRect();
    return { name: document.querySelector('[data-hall-name]').textContent, inView: r.top < window.innerHeight && r.bottom > 0, w: Math.round(r.width) };
  });
  check('the hall reads properly on a phone', mHall.inView && mHall.w > 200, mHall.name + ', panel ' + mHall.w + 'px wide');
  await mob.screenshot({ path: path.join(SHOTS, '16-mobile-hall.png') });

  await mob.evaluate(() => document.querySelector('#explorer').scrollIntoView());
  await sleep(1200);
  await mob.screenshot({ path: path.join(SHOTS, '17-mobile-explorer.png') });
  const mExpl = await mob.evaluate(() => ({
    rows: document.querySelectorAll('[data-object-list] .obj-row').length,
    panel: document.querySelector('[data-explorer-name]').textContent
  }));
  check('the explorer is usable on a phone', mExpl.rows === 6 && mExpl.panel.length > 2, mExpl.rows + ' rows, ' + mExpl.panel);
  check('no errors on mobile', mn.errors.length === 0, mn.errors.slice(0, 2).join(' | '));

  /* ======================================================================
     J · reduced motion
     ====================================================================== */
  console.log('\n── J · preferences + fallbacks ─────────────────────────');
  const rm = await browser.newPage();
  const rn = await gather(rm);
  await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rm.setViewport({ width: 1440, height: 900 });
  await rm.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 60000 });
  await waitReady(rm);
  await sleep(1800);
  const rmState = await rm.evaluate(() => ({
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    loaderGone: (() => { const l = document.getElementById('loader'); return l.hasAttribute('hidden') || getComputedStyle(l).opacity === '0'; })(),
    canvas: !!document.querySelector('#flight-canvas'),
    note: !!document.querySelector('.webgl-note'),
    marquee: getComputedStyle(document.querySelector('.strip__row')).animationName
  }));
  check('reduced-motion visitors still get the whole site', rmState.reduced && rmState.loaderGone && rmState.canvas, 'loader lifted, 3D still present');
  check('the ticker stops for reduced motion', rmState.marquee === 'none', 'animation: ' + rmState.marquee);
  check('a WebGL fallback message exists in the DOM', rmState.note, '.webgl-note present');
  await rm.click('[data-motion-toggle]');
  await sleep(180);
  const calmUI = await rm.evaluate(() => ({
    level: window.LB.motion.level,
    label: document.querySelector('[data-motion-label]').textContent,
    cap: window.LB.motion.cfg.cap
  }));
  check('the motion control switches to Calm', calmUI.level === 'calm' && calmUI.label === 'Calm' && calmUI.cap === 20,
    calmUI.level + ' · ' + calmUI.cap + ' fps');
  await sleep(350);                            // drain the one-time resize queue
  const calmFrame0 = await rm.evaluate(() => window.LB.scenes.flight.renderer.info.render.frame);
  await scrollTo(rm, await sectionY(rm, '#flight', 0.65));
  await sleep(250);
  const calmFrame1 = await rm.evaluate(() => window.LB.scenes.flight.renderer.info.render.frame);
  check('Calm keeps the hero canvas still while copy remains scrollable', calmFrame1 === calmFrame0,
    calmFrame0 + ' → ' + calmFrame1 + ' WebGL frames');
  await rm.evaluate(() => window.LB.motion.cycle());   // leave the saved choice at Balanced
  check('no errors with reduced motion', rn.errors.length === 0, rn.errors.slice(0, 2).join(' | '));

  /* ======================================================================
     K · content integrity (facts the entry depends on)
     ====================================================================== */
  console.log('\n── K · content integrity ───────────────────────────────');
  const facts = await page.evaluate(() => {
    const ids = ['apollo11lm', 'apollo12lm', 'apollo15lm', 'apollo17lm', 'surveyor1', 'surveyor3', 'viking1', 'viking2', 'pathfinder',
      'spirit', 'opportunity', 'phoenix', 'insight', 'ingenuity', 'curiosity', 'perseverance', 'voyager1', 'voyager2'];
    const missing = ids.filter((id) => !window.LB.data.byId(id));
    const noSrc = window.LB.data.objects.filter((o) => !o.sources || !o.sources.length);
    const noStory = window.LB.data.objects.filter((o) => !o.story || o.story.length < 80);
    const badUrl = [];
    window.LB.data.objects.forEach((o) => (o.sources || []).forEach((s) => { if (!/^https:\/\//.test(s.url)) badUrl.push(s.url); }));
    const statuses = window.LB.data.objects.reduce((a, o) => { a[o.status] = (a[o.status] || 0) + 1; return a; }, {});
    return {
      missing: missing, noSrc: noSrc.length, noStory: noStory.length, badUrl: badUrl,
      statuses: statuses,
      gallery: window.LB.data.gallery.length,
      glossary: window.LB.data.glossary.length,
      timeline: window.LB.data.timeline.length,
      coords: window.LB.data.objects.filter((o) => o.body !== 'deep' && (o.lat === null || o.lon === null)).length,
      long: window.LB.data.objects.filter((o) => o.story && o.story.split(/[.!?]/).length > 12).length
    };
  });
  check('all eighteen catalogued machines are present', facts.missing.length === 0, facts.missing.join(',') || '18 objects');
  check('every machine cites NASA', facts.noSrc === 0 && facts.badUrl.length === 0, 'no missing or non-https sources');
  check('every machine has a written story', facts.noStory === 0, facts.noStory + ' too short');
  check('stories stay short-sentence for school readers', facts.long === 0, facts.long + ' over-long stories');
  check('every surface machine has coordinates', facts.coords === 0, '18 objects, 16 with lat/lon');
  check('status spread matches the pitch (14 quiet · 2 working · 2 flying)',
    facts.statuses.silent + facts.statuses.retired === 14 && facts.statuses.active === 2 && facts.statuses.travelling === 2,
    JSON.stringify(facts.statuses));
  check('glossary, gallery and timeline are stocked', facts.glossary === 8 && facts.gallery === 6 && facts.timeline === 16,
    facts.glossary + ' terms · ' + facts.gallery + ' in the hall · ' + facts.timeline + ' timeline entries');

  /* ======================================================================
     summary
     ====================================================================== */
  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  ${pass} passed · ${fail} failed · ${warn} warnings`);
  if (fail) {
    console.log('\n  failures:');
    results.filter((r) => r[0] === 'FAIL').forEach((r) => console.log('   ✗ ' + r[1] + '  ' + r[2]));
  }
  fs.writeFileSync(path0.join(__dirname, 'results.json'), JSON.stringify({ pass, fail, warn, results }, null, 2));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('SUITE ERROR:', e && e.message); process.exit(2); });
