/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — the flight
   A scroll-scrubbed journey: leave Earth, cross to the Moon, then out to Mars.
   Real NASA-derived surface maps (see credits), stylised distances, and the
   landing sites of the objects in this story glowing on each world.
   ========================================================================== */
(function () {
  'use strict';
  const LB = (window.LB = window.LB || {});
  const U = LB.util;

  LB.register({
    name: 'journey',
    init() {
      const canvas = document.getElementById('flight-canvas');
      const section = document.getElementById('flight');
      if (!canvas || !section || !window.THREE) return;
      if (LB.assets) { LB.assets.expect('flight'); LB.assets.requireTextures('flight'); }

      /* High-DPI canvases already supersample, so MSAA only pays off when the
         drawing buffer is at or near 1x — skipping it above that roughly halves
         the fill cost of the biggest canvas on the page. */
      const wantAA = LB.dpr() < 1.4 && !LB.touch;
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: wantAA, alpha: false, stencil: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(LB.dpr ? LB.dpr() : 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x010307, 1);
      LB.addRenderer('flight', renderer);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x02040a, 0.00075);
      const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 4000);
      camera.position.set(0, 0, 26);

      const SUN = new THREE.Vector3(-0.55, 0.35, -1).normalize();
      const sun = new THREE.DirectionalLight(0xfff3e2, 2.2);
      sun.position.copy(SUN).multiplyScalar(200);
      scene.add(sun);
      scene.add(new THREE.AmbientLight(0x1b2740, 0.85));
      const bounce = new THREE.DirectionalLight(0x2b4a8a, 0.35);
      bounce.position.set(0.6, -0.4, 0.8);
      scene.add(bounce);

      /* ---------------------------------------------------------- textures */
      const loader = new THREE.TextureLoader();
      const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
      const loadedKeys = {};
      let loaded = 0;
      const total = 5;
      function load(url) {
        const t = loader.load(url, () => {
          loaded++; loadedKeys[url] = true;
          if (LB.assets) {
            LB.assets.progress(loaded / total);
            if (loaded >= total || (loadedKeys['assets/textures/moon.jpg'] && loadedKeys['assets/textures/earth.jpg'])) LB.assets.texturesDone('flight');
          }
          /* A texture only reaches the GPU the first time it is drawn. Doing that
             here, behind the loader, keeps a 2048px upload from landing in the
             middle of somebody's scroll. */
          if (loaded >= total) LB.warm(renderer, scene, camera);
        });
        t.encoding = THREE.sRGBEncoding;
        t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        t.anisotropy = Math.min(4, maxAniso);
        return t;
      }
      const TEX = {
        earth: load('assets/textures/earth.jpg'),
        moon: load('assets/textures/moon.jpg'),
        moonBump: load('assets/textures/moon_bump.jpg'),
        mars: load('assets/textures/mars.jpg'),
        marsBump: load('assets/textures/mars_bump.jpg')
      };
      TEX.moonBump.encoding = TEX.marsBump.encoding = THREE.LinearEncoding;

      /* ---------------------------------------------------------- worlds */
      const EARTH_Z = 0, MOON_Z = -150, MARS_Z = -330;
      function world(tex, bump, radius, z, seg, mat) {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(radius, seg, seg / 2),
          mat || new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump || null, bumpScale: bump ? 0.35 : 0, roughness: .92, metalness: .02, color: 0xffffff })
        );
        m.position.set(0, 0, z);
        m.rotation.y = Math.PI * 0.15;
        scene.add(m);
        return m;
      }
      const earth = world(TEX.earth, null, 6.4, EARTH_Z, 48,
        new THREE.MeshStandardMaterial({ map: TEX.earth, roughness: .72, metalness: .05, emissive: 0x061225, emissiveIntensity: .9 }));
      const moon = world(TEX.moon, TEX.moonBump, 8.2, MOON_Z, 48);
      const mars = world(TEX.mars, TEX.marsBump, 10.5, MARS_Z, 52);
      earth.rotation.z = 0.41;

      /* atmospheric rims */
      function atmosphere(radius, color, opacity, z, scale) {
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(radius * scale, 32, 20),
          new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        s.position.z = z;
        scene.add(s);
        return s;
      }
      const earthAir = atmosphere(6.4, 0x4f8fe0, 0.5, EARTH_Z, 1.06);
      const marsAir = atmosphere(10.5, 0xd8703f, 0.28, MARS_Z, 1.05);

      /* ---------------------------------------------------------- landing sites */
      function latLonToVec(lat, lon, radius) {
        const phi = lat * Math.PI / 180, lam = lon * Math.PI / 180;
        const cp = Math.cos(phi);
        return new THREE.Vector3(radius * cp * Math.cos(lam), radius * Math.sin(phi), -radius * cp * Math.sin(lam));
      }
      function dotTexture(hex) {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, hex); grd.addColorStop(0.32, hex.replace(')', ',.45)').replace('rgb', 'rgba'));
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      }
      const DOT_BLUE = dotTexture('rgb(140,190,255)');
      const DOT_RED = dotTexture('rgb(255,140,110)');
      const DOT_GREEN = dotTexture('rgb(90,240,180)');

      const markers = [];
      function addMarkers(list, host, radius, z, kind) {
        list.forEach((o) => {
          if (o.lat === null || o.lon === undefined) return;
          const tex = o.status === 'active' ? DOT_GREEN : (kind === 'moon' ? DOT_BLUE : DOT_RED);
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true }));
          const base = latLonToVec(o.lat, o.lon, radius * 1.008);
          s.position.copy(base);
          s.scale.setScalar(1.5);
          host.add(s);
          const ringGeo = new THREE.RingGeometry(0.06, 0.085, 24);
          const ringM = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: o.status === 'active' ? 0x5af0b4 : (kind === 'moon' ? 0x8cbeff : 0xff8a5c), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
          ringM.position.copy(base);
          ringM.lookAt(0, 0, 0);
          host.add(ringM);
          markers.push({ obj: o, sprite: s, ring: ringM, kind: kind, base: base.clone() });
        });
      }
      addMarkers(LB.data.moon, moon, 8.2, MOON_Z, 'moon');
      addMarkers(LB.data.mars, mars, 10.5, MARS_Z, 'mars');

      /* ---------------------------------------------------------- stars */
      function starfield() {
        const count = LB.touch ? 1200 : 2400;
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const c = new THREE.Color();
        for (let i = 0; i < count; i++) {
          const r = 300 + Math.random() * 1400;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
          pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
          c.setHSL(0.55 + Math.random() * 0.12, 0.35 + Math.random() * 0.4, 0.62 + Math.random() * 0.3);
          col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, map: DOT_BLUE, vertexColors: true, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
        scene.add(p);
        return p;
      }
      const stars = starfield();

      /* glints of hardware adrift, to hint at "left behind" — one Points cloud
         rather than 26 separate meshes: a single draw call, and it can be
         switched off completely when the visitor asks for less motion */
      const debris = (function () {
        const n = Math.round(34 * LB.motion.cfg.debris);
        const pos = new Float32Array(Math.max(1, n) * 3);
        for (let i = 0; i < n; i++) {
          pos[i * 3] = (Math.random() - .5) * 46;
          pos[i * 3 + 1] = (Math.random() - .5) * 30;
          pos[i * 3 + 2] = -20 - Math.random() * 330;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(g, new THREE.PointsMaterial({
          size: 0.34, map: DOT_BLUE, color: 0xdce8ff, transparent: true, opacity: .5,
          depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
        }));
        pts.visible = n > 0;
        scene.add(pts);
        return pts;
      })();

      /* ---------------------------------------------------------- DOM */
      const el = {
        copy: section.querySelector('.hero-copy'),
        actions: section.querySelector('.hero-actions'),
        stats: section.querySelector('.hero-stats'),
        beats: U.$$('.beat', section),
        hud: U.$$('.hud i', section),
        readout: section.querySelector('.journey-readout'),
        cue: section.querySelector('.scroll-cue')
      };
      const readoutValues = el.readout ? U.$$('b', el.readout) : [];
      /* beat 04 fades in, holds, then out again — as do the others */
      const BEAT_WINDOWS = [[0.05, 0.11, 0.25, 0.33], [0.33, 0.39, 0.47, 0.55], [0.55, 0.61, 0.69, 0.77], [0.77, 0.83, 0.95, 1.01]];
      const HUD_BOUNDS = [0, 0.24, 0.48, 0.72];

      function resize() {
        const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      }
      resize();
      LB.Scroll.watch(section);
      LB.Scroll.onResize(resize);

      /* ---------------------------------------------------------- loop */
      let p = 0, marsLight = 0, marsKm = 0, lastMarsCalc = 0;
      let lastMoonLight = -1, lastMarsLight2 = -1;
      let lastRenderP = -2, lastSX = NaN, lastSY = NaN, lastSpin = -1, lastScaleRev = -1;
      const lookTarget = new THREE.Vector3();
      const V_EARTH = new THREE.Vector3(0, 0, EARTH_Z);
      const V_MOON = new THREE.Vector3(0, 0, MOON_Z);
      const V_MARS = new THREE.Vector3(0, 0, MARS_Z);
      const dom = LB.dom;

      /* the real Earth–Mars distance, refreshed a few times a minute — it moves
         by a few thousand km an hour, so there is no reason to solve Kepler's
         equation on every frame */
      function refreshMars() {
        marsKm = LB.space.marsEarthKm(new Date());
        marsLight = LB.space.lightTime(marsKm);
      }
      refreshMars();

      this.update = (t, dt, S, P) => {
        if (LB.modalOpen) return;                   /* a story modal is on top */
        const prog = S.progress(section);           // exact scroll
        p = U.damp(p, prog, 6, dt);                 // gentle, silky cinematic easing
        const r = S.rectOf(section);
        if (r.bottom < -40 || r.top > innerHeight + 40) return;
        const cfg = LB.motion.cfg;
        const spin = cfg.spin;
        const fullMotion = LB.motion.level === 'full';
        /* Smooth continuous camera choreography without stepping stutter */
        const renderStep = LB.motion.level === 'calm' ? Infinity : 0.0008;
        const dirty = spin > 0 || Math.abs(p - lastRenderP) > renderStep ||
          (Math.abs(P.sx - lastSX) > 0.0003 || Math.abs(P.sy - lastSY) > 0.0003) ||
          spin !== lastSpin || LB.scaleRevision !== lastScaleRev;

        /* ---- camera choreography: Earth → Moon → Mars ---------------------- */
        const pA = U.clamp(p / 0.46);                     // leaving Earth
        const pB = U.clamp((p - 0.46) / 0.30);            // to the Moon
        const pC = U.clamp((p - 0.76) / 0.24);            // out to Mars
        const eA = U.easeOut(pA), eB = U.easeInOut(pB), eC = U.easeInOut(pC);   /* depart fast, arrive gently */
        let z = 26 - 54 * eA;                             // start beside Earth, swing past it
        z -= 190 * eB;                                    // cross to the Moon
        z -= 200 * eC;                                    // then out to Mars
        const sway = Math.sin(pA * 3.1 * Math.PI) * 6 * (1 - pB) + Math.sin(pB * 2.2 * Math.PI) * 9 + Math.sin(pC * 2.4 * Math.PI) * 12;
        const rise = Math.sin(pA * 2.2 * Math.PI) * 3.4 + Math.sin(pB * 1.6 * Math.PI) * 5 + Math.sin(pC * 1.8 * Math.PI) * 6;
        camera.position.set(sway + P.sx * 2.2, rise + P.sy * 1.6, z);

        /* aim: near Earth look back at Earth, near the Moon track the Moon, then Mars */
        const nearMoon = U.window(p, 0.22, 0.42, 0.55, 0.72);
        lookTarget.copy(V_EARTH);
        lookTarget.lerp(V_MOON, U.clamp(nearMoon + U.range(p, 0.14, 0.4)));
        lookTarget.lerp(V_MARS, U.range(p, 0.55, 0.9));
        lookTarget.x += P.sx * 3.5;
        lookTarget.y += P.sy * 2.2;
        camera.lookAt(lookTarget);
        camera.rotateZ(Math.sin(pA * 2.4 * Math.PI) * 0.04 + Math.sin(pC * 1.4 * Math.PI) * 0.05);

        /* ---- world spin + marker reveal ------------------------------------ */
        if (spin > 0) {
          earth.rotation.y += dt * 0.008 * spin;
          moon.rotation.y += dt * 0.004 * spin;
          mars.rotation.y += dt * 0.005 * spin;
          stars.rotation.y = t * 0.0025 * spin;
          earthAir.scale.setScalar(1 + Math.sin(t * 0.6) * 0.004);
        }

        const moonLight = U.range(p, 0.22, 0.5, U.easeOut) * (1 - U.range(p, 0.82, 0.97));
        const marsLightF = U.range(p, 0.66, 0.95, U.easeOut);
        /* only touch 32 materials when something actually changed */
        if (spin > 0 || moonLight !== lastMoonLight || marsLightF !== lastMarsLight2) {
          lastMoonLight = moonLight; lastMarsLight2 = marsLightF;
          for (let i = 0; i < markers.length; i++) {
            const mk = markers[i];
            const l = mk.kind === 'moon' ? moonLight : marsLightF;
            const pulse = 0.72 + 0.28 * Math.sin(t * 2.1 * spin + mk.base.x * 3);
            mk.sprite.material.opacity = l * pulse * 0.95;
            mk.sprite.scale.setScalar((mk.kind === 'moon' ? 1.5 : 1.9) * (0.85 + 0.3 * pulse));
            mk.ring.material.opacity = l * 0.85;
            mk.ring.scale.setScalar(1 + 0.55 * ((Math.sin(t * 1.6 * spin + mk.base.x) + 1) / 2));
          }
        }

        /* ---- debris drift (one cloud, one draw call) ----------------------- */
        if (debris.visible && spin > 0) {
          debris.rotation.y = t * 0.006 * spin;
          debris.rotation.x = Math.sin(t * 0.11) * 0.02 * spin;
        }

        /* ---- live light-time readout (Mars distance is really computed) ---- */
        if (t - lastMarsCalc > 20) { lastMarsCalc = t; refreshMars(); }
        if (el.readout) {
          dom.op(el.readout, U.range(p, 0.06, 0.14));
          const nearMarsF = U.range(p, 0.5, 0.95);
          const light = U.lerp(1.282, marsLight, nearMarsF);
          const distKm = U.lerp(384400, marsKm, nearMarsF);
          if (readoutValues[0]) dom.tx(readoutValues[0], U.compact(distKm) + ' km');
          if (readoutValues[1]) dom.tx(readoutValues[1], LB.space.lightLabel(light));
          if (readoutValues[2]) dom.tx(readoutValues[2], (p * 100).toFixed(0).padStart(3, '0') + '%');
        }

        /* ---- DOM overlays: copy, story beats, HUD -------------------------- */
        if (el.copy) {
          const out = U.range(prog, 0.006, 0.07);
          dom.op(el.copy, 1 - out);
          dom.ty(el.copy, -out * 40);
          dom.vis(el.copy, out <= 0.99);
        }
        if (el.actions) {
          dom.op(el.actions, 1 - U.range(prog, 0.005, 0.05));
          const live = prog <= 0.04;
          if (el.actions.style.pointerEvents !== (live ? 'auto' : 'none')) el.actions.style.pointerEvents = live ? 'auto' : 'none';
        }
        if (el.stats) dom.op(el.stats, 1 - U.range(prog, 0.008, 0.05));
        if (el.cue) dom.op(el.cue, 1 - U.range(prog, 0.004, 0.025));

        const windows = BEAT_WINDOWS;
        for (let i = 0; i < el.beats.length; i++) {
          const b = el.beats[i];
          const w = windows[i] || windows[0];
          const o = U.window(prog, w[0], w[1], w[2], w[3]);
          dom.op(b, o);
          dom.ty(b, U.lerp(24, -28, U.clamp((prog - w[0]) / (w[3] - w[0]))));
          dom.vis(b, o >= 0.01);
        }
        /* each light marks a leg of the route, lit once that leg is underway */
        for (let i = 0; i < el.hud.length; i++) {
          dom.cls(el.hud[i], 'is-on', prog > HUD_BOUNDS[i] || (i === 0 && prog >= 0));
        }

        if (dirty) {
          renderer.render(scene, camera);
          lastRenderP = p; lastSX = P.sx; lastSY = P.sy; lastSpin = spin; lastScaleRev = LB.scaleRevision;
        }
      };

      LB.warm(renderer, scene, camera);
      LB.scenes = LB.scenes || {};
      LB.scenes.flight = { scene: scene, camera: camera, renderer: renderer, worlds: { earth, moon, mars }, state: () => ({ p: p }) };
      if (LB.assets) LB.assets.done('flight');
    }
  });
})();
