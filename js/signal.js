/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — listening room
   Three ways to hear the hardware:
     1. InSight  — play a Marsquake recorded by a seismometer (synthetic trace)
     2. Ingenuity— watch the final data downlink from the damaged helicopter
     3. Voyager  — send a command and wait for the light-time round trip
   ========================================================================== */
(function () {
  'use strict';
  const LB = (window.LB = window.LB || {});
  const U = LB.util;

  LB.register({
    name: 'signal',
    init() {
      const section = document.getElementById('signal');
      const canvas = document.getElementById('signal-canvas');
      const seismo = document.getElementById('seismo-canvas');
      if (!section || !window.THREE) return;
      if (LB.assets) LB.assets.expect('signal');

      /* ============================================================ 3D stage */
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: LB.dpr() < 1.4 && !LB.touch, alpha: true, stencil: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(LB.dpr ? LB.dpr() : 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);
      LB.addRenderer('signal', renderer);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 600);
      camera.position.set(0, 1.6, 9);
      camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0x24304c, 1.05));
      const key = new THREE.DirectionalLight(0xfff0dc, 1.35); key.position.set(4, 5, 6); scene.add(key);
      const rim = new THREE.PointLight(0x6ea8ff, 1.6, 24, 1.8); rim.position.set(-4.5, 1.5, 2.4); scene.add(rim);

      /* ---------------------------------------------- Ingenuity scene group */
      const ing = new THREE.Group(); scene.add(ing);
      const heli = LB.hw.build('ingenuity', { accent: '#5af0b4' });
      heli.scale.setScalar(1.5); heli.position.set(-0.6, -0.55, 0);
      ing.add(heli);
      /* Mars ground ridge */
      const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 48),
        new THREE.MeshStandardMaterial({ color: 0x35180e, roughness: 1, metalness: .02, emissive: 0x120503, emissiveIntensity: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -1.5; ing.add(ground);
      const ridge = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.6, 1.1, 40, 1, false), new THREE.MeshStandardMaterial({ color: 0x2a1209, roughness: 1 }));
      ridge.position.set(0, -1.95, 0); ing.add(ridge);
      /* one instanced draw call for the whole rock field instead of sixty */
      const rockCount = LB.touch ? 18 : 30;
      const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0),
        new THREE.MeshStandardMaterial({ color: 0x51261a, roughness: 1 }), rockCount);
      const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
      const _sc = new THREE.Vector3(), _pv = new THREE.Vector3();
      for (let i = 0; i < rockCount; i++) {
        const a = Math.random() * Math.PI * 2, rr = 1.6 + Math.random() * 5;
        _pv.set(Math.cos(a) * rr, -1.48 + Math.random() * .04, Math.sin(a) * rr);
        _e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); _q.setFromEuler(_e);
        const s = 0.05 + Math.random() * 0.16;
        _sc.set(s, s * (0.7 + Math.random() * 0.5), s);
        rocks.setMatrixAt(i, _m4.compose(_pv, _q, _sc));
      }
      rocks.instanceMatrix.needsUpdate = true;
      rocks.frustumCulled = false;      /* instances spread wider than the base geometry */
      ing.add(rocks);
      /* data burst particles rising to the relay orbiter */
      const bn = 120, bpos = new Float32Array(bn * 3);
      for (let i = 0; i < bn; i++) { bpos[i * 3] = (Math.random() - .5) * .6; bpos[i * 3 + 1] = Math.random() * 6; bpos[i * 3 + 2] = (Math.random() - .5) * .6; }
      const bgeo = new THREE.BufferGeometry(); bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
      const burst = new THREE.Points(bgeo, new THREE.PointsMaterial({ color: 0x5af0b4, size: 0.055, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      ing.add(burst);
      const relay = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.34, 0.34),
        new THREE.MeshStandardMaterial({ color: 0xb9c6d6, metalness: .8, roughness: .4, emissive: 0x0a1a2a, emissiveIntensity: .8 }));
      relay.position.set(0, 5.2, 0); relay.rotation.z = 0.4; ing.add(relay);
      const relayPanel1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 0.7), new THREE.MeshStandardMaterial({ color: 0x0a1730, emissive: 0x14346b, emissiveIntensity: .9, metalness: .4, roughness: .35 }));
      relayPanel1.position.set(0, 0, 0); relay.add(relayPanel1);
      /* transmission line to the orbiter */
      const linePts = [new THREE.Vector3(-0.6, -0.25, 0), new THREE.Vector3(0, 5.2, 0)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const beam = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x5af0b4, transparent: true, opacity: 0 }));
      ing.add(beam);

      /* ---------------------------------------------- Voyager scene group */
      const voy = new THREE.Group(); voy.visible = false; scene.add(voy);
      const v1 = LB.hw.build('voyager', {}); v1.scale.setScalar(1.05); v1.position.set(5.2, 0.2, 0); voy.add(v1);
      const earthTex = new THREE.TextureLoader().load('assets/textures/earth.jpg', () => warmAll());
      earthTex.encoding = THREE.sRGBEncoding; earthTex.minFilter = THREE.LinearFilter; earthTex.magFilter = THREE.LinearFilter; earthTex.generateMipmaps = false;
      const earthSmall = new THREE.Mesh(new THREE.SphereGeometry(0.85, 40, 26),
        new THREE.MeshStandardMaterial({ map: earthTex, roughness: .7, metalness: .05, emissive: 0x08182e, emissiveIntensity: 1.2 }));
      earthSmall.position.set(-6.4, -0.3, 0); voy.add(earthSmall);
      const earthHalo = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0x4f8fe0, transparent: true, opacity: .22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      earthSmall.add(earthHalo);
      /* dish glow so Voyager reads as "still talking" */
      const vGlow = new THREE.PointLight(0xc4b5fd, 1.5, 8, 2); vGlow.position.set(5.2, 0.6, 0.6); voy.add(vGlow);
      v1.rotation.y = -Math.PI / 2.2;
      /* the beam: three segments, animated by u */
      function makeBeamSeg(color, opacity) {
        const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const m = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity });
        const l = new THREE.Line(g, m);
        return l;
      }
      const beamUp = makeBeamSeg(0x8cbeff, 0), beamDown = makeBeamSeg(0x5af0b4, 0), beamWait = makeBeamSeg(0xffb44d, 0);
      voy.add(beamUp, beamDown, beamWait);
      /* Earth and Voyager do not move inside this scene, so the beam geometry is
         built once — rebuilding three line buffers every frame was pure waste */
      const BEAM_A = new THREE.Vector3(-6.4, -0.3, 0);
      const BEAM_B = new THREE.Vector3(5.2, 0.2, 0);
      beamUp.geometry.setFromPoints([BEAM_A, BEAM_B]);
      beamDown.geometry.setFromPoints([BEAM_B, BEAM_A]);
      beamWait.geometry.setFromPoints([BEAM_A, BEAM_B]);
      const CAM_VOY = new THREE.Vector3(0, 0.6, 12.4), CAM_ING = new THREE.Vector3(0, 1.6, 9);
      const LOOK_VOY = new THREE.Vector3(0, 0, 0), LOOK_ING = new THREE.Vector3(0, 0.4, 0);
      const pkt = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const pkt2 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), new THREE.MeshBasicMaterial({ color: 0x5af0b4 }));
      const pkt3 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffb44d }));
      voy.add(pkt, pkt2, pkt3);
      /* star dust for the deep */
      const dn = 500, dp = new Float32Array(dn * 3);
      for (let i = 0; i < dn; i++) { dp[i * 3] = (Math.random() - .5) * 30; dp[i * 3 + 1] = (Math.random() - .5) * 14; dp[i * 3 + 2] = -4 - Math.random() * 20; }
      const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      voy.add(new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0xbfd8ff, size: 0.06, transparent: true, opacity: .65, depthWrite: false, blending: THREE.AdditiveBlending })));

      /* ---------------------------------------------- UI + mode machine */
      const P = { epoch: 0, dur: 92, playing: false, mode: 'insight' };
      let sceneDirty = true, lastScaleRev = LB.scaleRevision;
      const ui = {
        tabs: U.$$('[data-signal-mode]', section),
        panels: U.$$('[data-signal-panel]', section),
        play: section.querySelector('[data-seismo-play]'),
        reset: section.querySelector('[data-seismo-reset]'),
        clock: section.querySelector('[data-seismo-clock]'),
        mag: section.querySelector('[data-seismo-mag]'),
        count: section.querySelector('[data-seismo-count]'),
        burst: section.querySelector('[data-burst-run]'),
        burstFill: section.querySelector('[data-burst-fill]'),
        burstState: section.querySelector('[data-burst-state]'),
        burstLog: section.querySelector('[data-burst-log]'),
        voySend: section.querySelector('[data-voyager-send]'),
        voyClock: section.querySelector('[data-voyager-clock]'),
        voyState: section.querySelector('[data-voyager-state]'),
        voyBar: section.querySelector('[data-voyager-bar]'),
        voyDist: section.querySelector('[data-voyager-dist]')
      };

      /* ---- Mode 1: InSight seismogram (2D canvas) ---- */
      let wave = null, waveLen = 0;
      function buildSeismogram() {
        const seed = 0x5172E;
        const n = 2200;
        const arr = new Float32Array(n);
        let s = seed;
        const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
        for (let i = 0; i < n; i++) arr[i] = (rand() * 2 - 1);
        /* quake arrives at t ≈ 0.38, decays; add aftershocks */
        const out = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const t = i / n;
          let env = 0.05;
          if (t > 0.36) env = 0.95 * Math.exp(-(t - 0.36) * 4.2);
          if (t > 0.62 && t < 0.78) env += 0.35 * Math.exp(-(t - 0.62) * 7);
          if (t > 0.86) env += 0.18 * Math.exp(-(t - 0.86) * 12);
          out[i] = U.clamp(arr[i] * env + Math.sin(i * 0.06) * 0.03 * env, -1, 1);
        }
        wave = out; waveLen = n;
        /* prefix sums, so "how many quakes so far" is a lookup and not a
           2,200-iteration scan on every frame of playback */
        quakePrefix = new Int32Array(n + 1);
        for (let i = 0; i < n; i++) quakePrefix[i + 1] = quakePrefix[i] + (Math.abs(out[i]) > 0.55 ? 1 : 0);
      }
      let quakePrefix = null;
      buildSeismogram();

      /* The grid, the labels and the trace never change, so they are painted
         once into an offscreen canvas and blitted; a frame of playback then
         costs one drawImage plus a playhead instead of ~2,000 line segments. */
      let seismoBase = null, seismoKey = '', lastSeismo = '', lastSeismoAt = 0;
      function seismoBaseCanvas(w, h, dpr) {
        const key = w + 'x' + h + '@' + dpr;
        if (seismoBase && seismoKey === key) return seismoBase;
        if (!seismoBase) seismoBase = document.createElement('canvas');
        seismoBase.width = Math.floor(w * dpr); seismoBase.height = Math.floor(h * dpr);
        const g = seismoBase.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        g.strokeStyle = 'rgba(140,190,255,.10)'; g.lineWidth = 1;
        const gx = w / 12, gy = h / 6;
        for (let i = 1; i <= 12; i++) { const x = i * gx; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        for (let i = 1; i < 6; i++) { const y = i * gy; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.font = '11px ui-monospace, Menlo, monospace';
        ['P-wave', 'S-wave', 'surface waves'].forEach((lab, i) => {
          const x = w * ([0.40, 0.50, 0.66][i]);
          g.fillStyle = 'rgba(140,190,255,.65)';
          g.fillRect(x, 6, 1, h);
          g.fillText(lab, x + 5, 16 + i * 13);
        });
        const half = h / 2 - 8;
        g.strokeStyle = 'rgba(140,190,255,.35)'; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
        g.beginPath();
        for (let x = 0; x < w; x++) {
          const v = wave[Math.floor((x / w) * waveLen)] || 0;
          const y = h / 2 - v * half;
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        const grad = g.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#8cbeff'); grad.addColorStop(.5, '#5af0b4'); grad.addColorStop(1, '#ffb44d');
        g.strokeStyle = grad; g.lineWidth = 1.5; g.stroke();
        seismoKey = key;
        return seismoBase;
      }

      function drawSeismo(cursor, force) {
        if (!seismo) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = seismo.clientWidth, h = seismo.clientHeight;
        if (w < 8 || h < 8) return;                      /* hidden panel: nothing to draw into */
        /* skip when neither the size nor the playhead has really moved, and
           hold playback to roughly 30 repaints a second */
        const now = performance.now();
        const key = w + 'x' + h + '@' + dpr + '@' + (cursor === null ? '-' : Math.round(cursor * w));
        if (!force && key === lastSeismo) return;
        if (!force && now - lastSeismoAt < 30) return;
        lastSeismo = key; lastSeismoAt = now;

        if (seismo.width !== Math.floor(w * dpr) || seismo.height !== Math.floor(h * dpr)) {
          seismo.width = Math.floor(w * dpr); seismo.height = Math.floor(h * dpr);
        }
        const g = seismo.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, seismo.width, seismo.height);
        g.drawImage(seismoBaseCanvas(w, h, dpr), 0, 0);
        if (cursor !== null) {
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          const x = cursor * w;
          g.fillStyle = 'rgba(90,240,180,.18)'; g.fillRect(0, 0, x, h);
          g.strokeStyle = 'rgba(90,240,180,.95)'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
        }
      }

      function setMode(m) {
        P.mode = m;
        sceneDirty = true;
        ui.tabs.forEach((t) => t.classList.toggle('is-on', t.dataset.signalMode === m));
        ui.panels.forEach((p) => p.classList.toggle('is-on', p.dataset.signalPanel === m));
        ing.visible = (m === 'ingenuity');
        voy.visible = (m === 'voyager');
        if (m === 'voyager') {
          const km = LB.data.byId('voyager1').distKm || 24.5e9;
          if (ui.voyDist) ui.voyDist.textContent = U.compact(km) + ' km from Earth';
        }
      }
      ui.tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.signalMode)));

      /* ---- playback state ---- */
      let burstRun = null, voyRun = null;
      function toggleSeismo() {
        if (P.playing) { P.playing = false; }
        else {
          P.playing = true;
          if (P.epoch >= P.dur) P.epoch = 0;
        }
        if (ui.play) ui.play.textContent = P.playing ? 'Pause the record' : (P.epoch > 0 && P.epoch < P.dur ? 'Resume' : 'Play the record');
        if (ui.play) ui.play.classList.toggle('is-playing', P.playing);
      }
      if (ui.play) ui.play.addEventListener('click', toggleSeismo);
      if (ui.reset) ui.reset.addEventListener('click', () => { P.epoch = 0; P.playing = false; if (ui.play) { ui.play.textContent = 'Play the record'; ui.play.classList.remove('is-playing'); } drawSeismo(0, true); });

      if (ui.burst) ui.burst.addEventListener('click', () => {
        if (burstRun) return;
        burstRun = { startedAt: (window.performance || Date).now(), t: 0, logs: [
          [0.06, 'sol 1067 · flight 72 complete. touchdown confirmed.'],
          [0.22, 'navcam stereo pair 1/12 …'],
          [0.40, 'IMU: one blade damaged. rotor 2 vibration out of limits.'],
          [0.58, 'sol 1069 · 3,000+ images and engineering data cached'],
          [0.74, 'relay: MRO overhead in 40 minutes — handoff armed'],
          [0.90, 'sol 1070 · last packets, uplink only. farewell, Ingenuity.']
        ] };
        sceneDirty = true;
        if (ui.burstLog) ui.burstLog.innerHTML = '';
        ui.burst.textContent = 'Downloading…';
      });

      if (ui.voySend) ui.voySend.addEventListener('click', () => {
        if (voyRun) return;
        const km = LB.data.byId('voyager1').distKm || 24.5e9;
        const oneWay = LB.space.lightTime(km);                 // hours
        voyRun = { startedAt: (window.performance || Date).now(), t: 0, dur: 12000, oneWay: oneWay, hours: oneWay / 3600, km: km };
        sceneDirty = true;
        ui.voySend.textContent = 'Command sent';
      });

      function resize() {
        const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.fov = camera.aspect < 1 ? 52 : 40;
        camera.updateProjectionMatrix();
        sceneDirty = true;
      }
      /* Both hidden groups get compiled and their textures uploaded up front,
         so switching tabs mid-scroll costs nothing. */
      function warmAll() {
        if (!LB.warmEnabled) { LB.warm(renderer, scene, camera); return; }
        const iv = ing.visible, vv = voy.visible;
        ing.visible = true; voy.visible = true;
        LB.warm(renderer, scene, camera);
        ing.visible = iv; voy.visible = vv;
      }

      resize();
      LB.Scroll.watch(section);
      LB.Scroll.onResize(resize);
      setMode('insight');
      drawSeismo(0, true);
      window.addEventListener('resize', () => drawSeismo(P.playing || P.epoch ? U.clamp(P.epoch / P.dur) : null, true));

      /* ---------------------------------------------------------- loop */
      const dom = LB.dom;
      let lastPktColor = -1;
      this.update = (t, dt, S, Ptr) => {
        if (LB.modalOpen) return;                    /* a story modal is on top */
        const r = S.rectOf(section);
        if (r.bottom < -60 || r.top > innerHeight + 60) { return; }
        const spin = LB.motion.cfg.spin;
        let dirty = sceneDirty || spin > 0 || LB.scaleRevision !== lastScaleRev;
        sceneDirty = false;
        const oldX = camera.position.x, oldY = camera.position.y, oldZ = camera.position.z;

        /* seismogram playback */
        if (P.playing) {
          P.epoch += dt;
          if (P.epoch >= P.dur) { P.epoch = P.dur; P.playing = false; if (ui.play) { ui.play.textContent = 'Play again'; ui.play.classList.remove('is-playing'); } }
          const cur = P.epoch / P.dur;
          drawSeismo(cur);
          if (ui.clock) dom.tx(ui.clock, 'SOL 1222 · ' + (P.epoch).toFixed(1) + 's of ' + P.dur + 's');
          if (ui.count && quakePrefix) {
            const idx = Math.min(quakePrefix.length - 1, Math.floor(cur * waveLen));
            dom.tx(ui.count, String(Math.min(1319, 900 + quakePrefix[idx])));
          }
          if (cur > 0.36 && cur < 0.42 && ui.mag) dom.tx(ui.mag, 'M 5.0');
        } else if (P.epoch) {
          drawSeismo(P.epoch / P.dur);
        }
        if (ui.mag && !P.epoch) dom.tx(ui.mag, 'M 5.0 (Sol 1222)');

        /* ---- Ingenuity downlink ---- */
        const wall = (window.performance || Date).now();
        if (burstRun && !burstRun.ended) {
          /* wall-clock pacing: a slow frame must not stretch the download */
          dirty = true;
          burstRun.t = (wall - burstRun.startedAt) / 7000;
          const b = U.clamp(burstRun.t);
          if (ui.burstFill) dom.st(ui.burstFill, 'width', (b * 100).toFixed(0) + '%');
          burst.material.opacity = 0.15 + 0.7 * Math.abs(Math.sin(t * 3));
          if (ui.burstState) dom.tx(ui.burstState, b < 0.95 ? 'receiving telemetry' : 'link closed');
          if (ui.burstLog) {
            burstRun.logs.forEach((l, i) => {
              if (b >= l[0] && !burstRun['shown' + i]) {
                burstRun['shown' + i] = true;
                const d = document.createElement('p');
                d.className = 'log-line';
                d.textContent = l[1];
                ui.burstLog.appendChild(d);
                ui.burstLog.scrollTop = ui.burstLog.scrollHeight;
              }
            });
          }
          if (b >= 1) {
            if (burstRun && !burstRun.ended) {
              burstRun.ended = true;
              if (ui.burst) ui.burst.textContent = 'Download again';
              if (ui.burstState) ui.burstState.textContent = 'final frame received';
            }
            /* keep the run object so state lingers */
          }
        } else if (!burstRun) {
          burst.material.opacity = 0.0;
        }
        beam.material.opacity = 0.16 + (burstRun && !burstRun.ended ? 0.5 * Math.abs(Math.sin(t * 2.4)) : 0);
        if (spin) {
          relay.rotation.y = t * 0.25 * spin;
          relay.position.y = 5.2 + Math.sin(t * 0.4 * spin) * 0.06;
          heli.userData.anim && heli.userData.anim(t, dt * spin);
        }

        /* ---- Voyager round trip ---- */
        if (voyRun && !voyRun.ended) {
          dirty = true;
          voyRun.t = (wall - voyRun.startedAt) / voyRun.dur;      // 12 s stands in for 46 h
          const p = U.clamp(voyRun.t);
          const oneWayLabel = LB.space.lightLabel(voyRun.oneWay);
          const phase = p < 0.5 ? (p / 0.5) : ((p - 0.5) / 0.5);
          beamUp.material.opacity = 0.3;
          pkt.visible = true;
          pkt.position.lerpVectors(BEAM_A, BEAM_B, phase);
          const wantColor = p < 0.5 ? 0x8cbeff : 0x5af0b4;
          if (wantColor !== lastPktColor) { lastPktColor = wantColor; pkt.material.color.set(wantColor); }
          if (ui.voyClock) {
            /* one-way light time is stored in seconds — the readout counts hours */
            const hours = (p < 0.5 ? (p / 0.5) : 1) * (voyRun.hours || voyRun.oneWay / 3600);
            dom.tx(ui.voyClock, hours.toFixed(1) + ' hours of ' + (voyRun.hours || 23).toFixed(1) + ' h');
          }
          if (ui.voyState) {
            dom.tx(ui.voyState, p < 0.5 ? 'command travelling out at light speed (' + oneWayLabel + ')' : 'reply travelling home — the same ' + oneWayLabel + ' back');
            dom.st(ui.voyBar, 'width', (p * 100).toFixed(0) + '%');
          }
          if (p >= 1) {
            if (!voyRun.ended) {
              voyRun.ended = true;
              if (ui.voySend) ui.voySend.textContent = 'Send again';
              if (ui.voyState) ui.voyState.textContent = 'round trip complete: ' + LB.space.lightLabel(voyRun.oneWay * 2) + '. Voyager 1 is still there.';
            }
          }
        } else if (!voyRun) {
          pkt.visible = false; pkt2.visible = false; pkt3.visible = false;
          beamUp.material.opacity = 0.12; beamDown.material.opacity = 0.12; beamWait.material.opacity = 0.06;
        }
        if (spin) earthSmall.rotation.y += dt * 0.05 * spin;

        /* camera drift */
        const target = P.mode === 'voyager' ? CAM_VOY : CAM_ING;
        camera.position.lerp(target, Math.min(1, dt * 1.4));
        camera.position.x += Ptr.sx * 0.35;
        camera.position.y += Ptr.sy * 0.22;
        camera.lookAt(P.mode === 'voyager' ? LOOK_VOY : LOOK_ING);
        if (Math.abs(camera.position.x - oldX) > 0.0002 || Math.abs(camera.position.y - oldY) > 0.0002 || Math.abs(camera.position.z - oldZ) > 0.0002) dirty = true;

        if (dirty) { renderer.render(scene, camera); lastScaleRev = LB.scaleRevision; }
      };

      setMode('insight');
      drawSeismo(0, true);
      /* compile the shaders for every mode now — switching tabs mid-scroll must
         not pay for a program build */
      warmAll();
      LB.scenes = LB.scenes || {};
      LB.scenes.signal = { scene: scene, camera: camera, renderer: renderer, state: () => ({ mode: P.mode, epoch: P.epoch }) };
      if (LB.assets) LB.assets.done('signal');
    }
  });
})();
