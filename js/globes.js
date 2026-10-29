/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — the ground-truth explorer
   Pick a world, click a marker, and the camera flies out along an arc to the
   exact spot where that machine sits today. Distances and light-times are
   computed live (see js/core.js -> LB.space).
   ========================================================================== */
(function () {
  'use strict';
  const LB = (window.LB = window.LB || {});
  const U = LB.util;

  LB.register({
    name: 'globes',
    init() {
      const section = document.getElementById('explorer');
      const canvas = document.getElementById('globe-canvas');
      if (!section || !canvas || !window.THREE) return;
      if (LB.assets) { LB.assets.expect('globes'); LB.assets.requireTextures('globes'); }

      /* ---------------------------------------------------------- renderer */
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: LB.dpr() < 1.4 && !LB.touch, alpha: true, stencil: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(LB.dpr ? LB.dpr() : 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);
      LB.addRenderer('globes', renderer);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 400);

      scene.add(new THREE.AmbientLight(0x22304c, 1.0));
      const key = new THREE.DirectionalLight(0xfff1de, 2.0); key.position.set(4, 2.2, 5); scene.add(key);
      const rim = new THREE.DirectionalLight(0x4c8cff, 0.75); rim.position.set(-5, -1.5, -4); scene.add(rim);

      /* ---------------------------------------------------------- textures */
      const loader = new THREE.TextureLoader();
      const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
      const TEX = {};
      let texLoaded = 0;
      ['moon', 'mars', 'earth', 'moon_bump', 'mars_bump'].forEach((k) => {
        TEX[k] = loader.load('assets/textures/' + k + '.jpg', () => {
          if (LB.assets) LB.assets.texturesDone('globes');
          /* upload every world's map while the loader is still up, not on the
             frame the visitor first clicks Mars */
          if (++texLoaded >= 5) warmAll();
        });
        TEX[k].encoding = THREE.sRGBEncoding; TEX[k].minFilter = THREE.LinearFilter;
        TEX[k].magFilter = THREE.LinearFilter; TEX[k].generateMipmaps = false;
        TEX[k].anisotropy = Math.min(4, maxAniso);
      });
      TEX.moon_bump.encoding = TEX.mars_bump.encoding = THREE.LinearEncoding;

      /* ---------------------------------------------------------- worlds */
      const R = 2.6;
      const MATS = {
        moon: new THREE.MeshStandardMaterial({ map: TEX.moon, bumpMap: TEX.moon_bump, bumpScale: 0.3, roughness: .95, metalness: .02 }),
        mars: new THREE.MeshStandardMaterial({ map: TEX.mars, bumpMap: TEX.mars_bump, bumpScale: 0.3, roughness: .9, metalness: .03, emissive: 0x1a0803, emissiveIntensity: .9 }),
        earth: new THREE.MeshStandardMaterial({ map: TEX.earth, roughness: .68, metalness: .05, emissive: 0x061225, emissiveIntensity: 1.1 })
      };
      const globes = {};
      ['moon', 'mars', 'earth'].forEach((b) => {
        const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 36), MATS[b]);
        m.rotation.z = b === 'mars' ? 0.44 : (b === 'earth' ? 0.41 : 0.03);
        g.add(m);
        const air = new THREE.Mesh(new THREE.SphereGeometry(R * 1.045, 32, 20),
          new THREE.MeshBasicMaterial({ color: b === 'earth' ? 0x4f8fe0 : (b === 'mars' ? 0xd8703f : 0x8797b8), transparent: true, opacity: b === 'moon' ? 0.1 : 0.24, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
        g.add(air);
        g.visible = false;
        scene.add(g);
        globes[b] = { group: g, mesh: m, air: air, spin: 0 };
      });

      function latLon(lat, lon, radius) {
        const phi = lat * Math.PI / 180, lam = lon * Math.PI / 180, cp = Math.cos(phi);
        return new THREE.Vector3(radius * cp * Math.cos(lam), radius * Math.sin(phi), -radius * cp * Math.sin(lam));
      }

      /* ---------------------------------------------------------- markers */
      function pinTexture(hex) {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d');
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, hex); gr.addColorStop(.4, hex.replace('rgb', 'rgba').replace(')', ',.5)')); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      }
      const TEX_BLUE = pinTexture('rgb(140,190,255)'), TEX_GREEN = pinTexture('rgb(90,240,180)'), TEX_RED = pinTexture('rgb(255,140,110)');

      const pickables = [];
      const markerGroups = {};
      ['moon', 'mars'].forEach((body) => {
        LB.data[body].forEach((o) => {
          if (o.lat === null || o.lon === null) return;
          const g = new THREE.Group();
          const base = latLon(o.lat, o.lon, R * 1.01);
          const normal = base.clone().normalize();
          const color = o.status === 'active' ? 0x5af0b4 : (body === 'moon' ? 0x8cbeff : 0xff8a5c);
          /* stalk */
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: .75 }));
          stalk.position.copy(base.clone().add(normal.clone().multiplyScalar(0.17)));
          stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
          g.add(stalk);
          /* head */
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshBasicMaterial({ color: color }));
          head.position.copy(base.clone().add(normal.clone().multiplyScalar(0.36)));
          g.add(head);
          /* glow sprite */
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: o.status === 'active' ? TEX_GREEN : (body === 'moon' ? TEX_BLUE : TEX_RED), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .0 }));
          sp.position.copy(head.position); sp.scale.setScalar(0.6);
          g.add(sp);
          /* expanding halo */
          const halo = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.12, 26),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: .0, side: THREE.DoubleSide, depthWrite: false }));
          halo.position.copy(head.position);
          halo.lookAt(0, 0, 0);
          g.add(halo);
          /* invisible fat hit target */
          const hit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
          hit.position.copy(head.position);
          hit.userData.object = o;
          hit.userData.body = body;
          g.add(hit);
          pickables.push(hit);
          markerGroups[o.id] = g;
          globes[body].mesh.add(g);
        });
      });

      /* ---------------------------------------------------------- approach arc */
      const arcMat = new THREE.LineBasicMaterial({ color: 0x8cbeff, transparent: true, opacity: 0 });
      const arcGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const arcLine = new THREE.Line(arcGeo, arcMat);
      scene.add(arcLine);

      /* travel indicator that rides the arc */
      const rider = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      rider.visible = false; scene.add(rider);

      /* ---------------------------------------------------------- deep space diagram */
      const deep = section.querySelector('[data-deep]');
      if (deep) {
        const AU = 149597870.7;
        const v1 = LB.data.byId('voyager1'), v2 = LB.data.byId('voyager2');
        const a1 = v1.distKm ? v1.distKm / AU : 163, a2 = v2.distKm ? v2.distKm / AU : 137;
        const maxAU = 180;
        deep.innerHTML =
          '<div class="deep-scale">' +
          '<div class="deep-sun"></div>' +
          '<div class="deep-lane"><span class="deep-lane-label">Sun</span></div>' +
          '<div class="deep-probe deep-probe--1" style="left:' + Math.min(96, (a1 / maxAU) * 100).toFixed(1) + '%"><b>Voyager 1</b><i>' + a1.toFixed(0) + ' AU</i><em>' + LB.space.lightLabel(v1.lightSec || 23 * 3600) + ' one-way</em></div>' +
          '<div class="deep-probe deep-probe--2" style="left:' + Math.min(96, (a2 / maxAU) * 100).toFixed(1) + '%"><b>Voyager 2</b><i>' + a2.toFixed(0) + ' AU</i><em>' + LB.space.lightLabel(v2.lightSec || 21 * 3600) + ' one-way</em></div>' +
          '<div class="deep-rule">' + [0, 40, 80, 120, 160].map((n) => '<span style="left:' + ((n / maxAU) * 100) + '%">' + n + ' AU</span>').join('') + '</div>' +
          '<p class="deep-note">Both Voyagers still answer. It takes about ' + (23 * 2) + ' hours for a command from Earth to reach Voyager 1 and for the reply to come back.</p>' +
          '</div>';
      }

      /* ---------------------------------------------------------- UI */
      const ui = {
        tabs: U.$$('[data-body]', section),
        list: section.querySelector('[data-object-list]'),
        search: section.querySelector('[data-object-search]'),
        panel: section.querySelector('[data-explorer-panel]'),
        name: section.querySelector('[data-explorer-name]'),
        meta: section.querySelector('[data-explorer-meta]'),
        story: section.querySelector('[data-explorer-story]'),
        dist: section.querySelector('[data-explorer-distance]'),
        light: section.querySelector('[data-explorer-light]'),
        coords: section.querySelector('[data-explorer-coords]'),
        stagetitle: section.querySelector('[data-explorer-stagetitle]'),
        hud: section.querySelector('[data-explorer-hud]'),
        open: section.querySelector('.explorer-panel [data-object]'),
        deep: deep
      };
      let body = 'moon', selected = null, query = '';
      let fly = null, hoverPt = null, hovering = false, sceneDirty = true, lastScaleRev = LB.scaleRevision;
      const keep = new THREE.Vector3();

      function objectsFor(b) {
        return (LB.data[b] || []).filter((o) => {
          if (!query) return true;
          const q = query.toLowerCase();
          return (o.name + ' ' + o.type + ' ' + o.site + ' ' + o.headline).toLowerCase().indexOf(q) >= 0;
        });
      }

      function renderList() {
        if (!ui.list) return;
        const list = objectsFor(body);
        ui.list.innerHTML = list.length ? list.map((o) => {
          const st = LB.data.STATUS[o.status];
          return '<button class="obj-row' + (selected === o.id ? ' is-on' : '') + '" data-pick="' + o.id + '">' +
            '<span class="obj-dot" style="background:' + (o.status === 'active' ? '#5af0b4' : (o.body === 'moon' ? '#8cbeff' : '#ff8a5c')) + '"></span>' +
            '<span class="obj-txt"><b>' + o.short + '</b><i>' + o.site + '</i></span>' +
            '<span class="obj-tag" style="color:' + st.color + '">' + st.short + '</span></button>';
        }).join('') : '<p class="obj-empty">Nothing matches that search. Try "rover", "Surveyor" or "2019".</p>';
      }

      function setReadout(o) {
        if (!o) return;
        const isMoon = o.body === 'moon';
        const now = new Date();
        const km = isMoon ? 384400 : LB.space.marsEarthKm(now);
        const lt = LB.space.lightTime(km);
        const ltEarth = LB.space.lightTime(6371 + 400);      // low Earth orbit, for scale
        if (ui.dist) ui.dist.textContent = U.num(km) + ' km';
        if (ui.light) ui.light.innerHTML = '<b>' + LB.space.lightLabel(lt) + '</b><span>for radio to reach ' + (isMoon ? 'the Moon' : 'Mars') + ' right now — ' + U.compact(km) + ' km away<span>' + (isMoon ? ' (mean)' : ' (computed today)') + '</span></span><i>Satellites in low Earth orbit answer in about ' + lb_short(ltEarth) + '.</i>';
        if (ui.coords) {
          const lat = o.lat === null ? '—' : Math.abs(o.lat).toFixed(3) + '° ' + (o.lat >= 0 ? 'N' : 'S');
          const lon = o.lon === null ? '—' : Math.abs(o.lon).toFixed(3) + '° ' + (o.lon >= 0 ? 'E' : 'W');
          ui.coords.innerHTML = '<span class="mono">' + lat + ' / ' + lon + '</span>' + (o.landed ? '<span>' + o.landed + '</span>' : '');
        }
      }
      function lb_short(s) { return s < 1 ? (s * 1000).toFixed(0) + ' ms' : s.toFixed(2) + ' s'; }

      function select(id, flyTo) {
        const o = LB.data.byId(id);
        if (!o) return;
        selected = id;
        sceneDirty = true;
        if (o.body !== 'deep' && o.body !== body) setBody(o.body, false);
        renderList();
        if (ui.name) ui.name.textContent = o.name;
        if (ui.meta) {
          const st = LB.data.STATUS[o.status];
          ui.meta.innerHTML = '<span class="tag ' + st.tag + '">' + st.label + '</span>' +
            '<span>' + o.type + '</span><span>' + LB.data.BODY[o.body].label + '</span>' +
            (o.landed ? '<span>' + o.landed + '</span>' : '') +
            (o.lastContact && o.status !== 'active' ? '<span>last heard: ' + o.lastContact + '</span>' : '') +
            (o.status === 'active' ? '<span>still talking to Earth</span>' : '') +
            (o.status === 'travelling' ? '<span>still travelling</span>' : '');
        }
        if (ui.story) ui.story.textContent = o.headline;
        if (ui.open) ui.open.dataset.object = o.id;
        setReadout(o);
        if (ui.panel) ui.panel.classList.add('is-live');
        if (flyTo && o.body !== 'deep' && o.lat !== null) startFly(o);
        if (ui.stagetitle) ui.stagetitle.textContent = o.short + ' — ' + (o.site || '');
        /* keep the chosen row visible — inside the list only, never the page */
        const row = ui.list && ui.list.querySelector('[data-pick="' + id + '"]');
        if (row && ui.list) {
          const top = row.offsetTop, bottom = top + row.offsetHeight;
          if (top < ui.list.scrollTop) ui.list.scrollTop = top - 8;
          else if (bottom > ui.list.scrollTop + ui.list.clientHeight) ui.list.scrollTop = bottom - ui.list.clientHeight + 8;
        }
      }
      LB.selectObject = select;

      const siteV = new THREE.Vector3();
      function siteWorld(o) {
        const g = markerGroups[o.id];
        if (!g) return null;
        g.children[1].getWorldPosition(siteV);   // [1] = the marker head
        return siteV;
      }

      function startFly(o) {
        const world = siteWorld(o) || latLon(o.lat, o.lon, R * 1.02);
        const dir = world.clone().normalize();
        const end = dir.multiplyScalar(R * 3.15);
        const start = camera.position.clone();
        const N = 42, pts = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const e = U.easeInOut(t);
          const d = start.clone().normalize().lerp(end.clone().normalize(), e).normalize();
          const r = U.lerp(start.length(), end.length(), e) + Math.sin(Math.PI * e) * R * 1.5;
          pts.push(d.multiplyScalar(r));
        }
        fly = { pts: pts, t: 0, dur: 1.5, obj: o, lookAt: new THREE.Vector3(0, 0, 0) };
        arcGeo.setFromPoints(pts);
        arcMat.opacity = 0.0;
        rider.visible = true;
        sceneDirty = true;
      }

      function setBody(b, keepSelection) {
        body = b;
        ['moon', 'mars', 'earth'].forEach((k) => { globes[k].group.visible = (k === body); });
        ui.tabs.forEach((t) => t.classList.toggle('is-on', t.dataset.body === b));
        if (ui.stagetitle) ui.stagetitle.textContent = LB.data.BODY[b].label;
        if (b === 'deep') {
          if (ui.hud) ui.hud.classList.add('is-hidden');
          if (ui.deep) ui.deep.classList.add('is-on');
          if (selected && LB.data.byId(selected).body === 'deep' && !keepSelection) select(selected, false);
        } else {
          if (ui.hud) ui.hud.classList.remove('is-hidden');
          if (ui.deep) ui.deep.classList.remove('is-on');
          camera.position.set(0, R * 1.4, R * 3.6);
          camera.lookAt(0, 0, 0);
          if (!keepSelection) {
            const first = (LB.data[b] || [])[0];
            if (first) select(first.id, false);
          }
        }
        renderList();
        sceneDirty = true;
      }

      ui.tabs.forEach((t) => t.addEventListener('click', () => { query = ''; if (ui.search) ui.search.value = ''; setBody(t.dataset.body); }));
      if (ui.search) {
        let deb = null;
        ui.search.addEventListener('input', () => {
          clearTimeout(deb);
          deb = setTimeout(() => {
            query = ui.search.value.trim();
            const list = objectsFor(body);
            if (list.length && selected && list.indexOf(LB.data.byId(selected)) < 0) select(list[0].id, true);
            renderList();
          }, 120);
        });
      }
      if (ui.list) ui.list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pick]');
        if (b) select(b.dataset.pick, true);
      });

      /* pointer picking */
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      function pickAt(x, y) {
        const r = canvas.getBoundingClientRect();
        ndc.x = ((x - r.left) / r.width) * 2 - 1;
        ndc.y = -((y - r.top) / r.height) * 2 + 1;
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(pickables, false);
        if (hits.length) select(hits[0].object.userData.object.id, true);
      }
      const stage = section.querySelector('.explorer-stage');
      let downPt = null;
      if (stage) {
        stage.addEventListener('pointerdown', (e) => { downPt = { x: e.clientX, y: e.clientY }; });
        stage.addEventListener('pointerup', (e) => {
          if (!downPt) return;
          const moved = Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y);
          downPt = null;
          if (moved < 6) pickAt(e.clientX, e.clientY);
        });
        stage.addEventListener('pointermove', (e) => {
          /* a raycast per pointer event is a raycast per 8 ms on a fast mouse;
             queue the point and let the frame loop test it once */
          hoverPt = { x: e.clientX, y: e.clientY };
        }, { passive: true });
        stage.addEventListener('pointerleave', () => { hoverPt = null; });
      }

      function resize() {
        const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.fov = camera.aspect < 1 ? 52 : 38;
        camera.updateProjectionMatrix();
      }
      /* Compile the shaders and upload all three worlds' textures with every
         group momentarily visible — otherwise the hidden worlds pay for it the
         first time they are switched to. */
      function warmAll() {
        if (!LB.warmEnabled) { LB.warm(renderer, scene, camera); return; }
        const was = {};
        ['moon', 'mars', 'earth'].forEach((k) => { was[k] = globes[k].group.visible; globes[k].group.visible = true; });
        LB.warm(renderer, scene, camera);
        ['moon', 'mars', 'earth'].forEach((k) => { globes[k].group.visible = was[k]; });
      }

      resize();
      LB.Scroll.watch(section);
      LB.Scroll.watch(canvas);
      LB.Scroll.onResize(resize);

      setBody('moon');
      camera.position.set(0, R * 1.4, R * 3.6);
      camera.lookAt(0, 0, 0);

      /* ---------------------------------------------------------- loop */
      let mAr = 0;
      const dom = LB.dom;
      this.update = (t, dt, S, P) => {
        if (LB.modalOpen) return;                 /* a story modal is on top */
        const r = S.rectOf(section);
        if (r.bottom < -60 || r.top > innerHeight + 60) return;
        const spin = LB.motion.cfg.spin;
        let dirty = sceneDirty || spin > 0 || LB.scaleRevision !== lastScaleRev;
        sceneDirty = false;
        const oldCamX = camera.position.x, oldCamY = camera.position.y, oldCamZ = camera.position.z;

        /* one hover raycast per frame, not one per pointer event */
        if (hoverPt && globes[body] && body !== 'deep') {
          const cr = S.rectOf(canvas);
          ndc.x = ((hoverPt.x - cr.left) / cr.width) * 2 - 1;
          ndc.y = -((hoverPt.y - cr.top) / cr.height) * 2 + 1;
          ray.setFromCamera(ndc, camera);
          const over = ray.intersectObjects(pickables, false).length > 0;
          hoverPt = null;
          if (over !== hovering) {
            hovering = over;
            stage.style.cursor = over ? 'pointer' : '';
            if (ui.hud) dom.cls(ui.hud, 'is-hovering', over);
          }
        }

        const g = globes[body];
        const selObj = selected ? LB.data.byId(selected) : null;
        if (fly) {
          dirty = true;
          fly.t += dt / fly.dur;
          const f = U.easeInOut(U.clamp(fly.t));
          const N = fly.pts.length - 1;
          const fi = f * N, i0 = Math.min(N - 1, Math.floor(fi)), fr = fi - i0;
          camera.position.copy(fly.pts[i0]).lerp(fly.pts[i0 + 1], fr);
          rider.position.copy(camera.position);
          arcMat.opacity = Math.sin(Math.PI * U.clamp(fly.t)) * 0.6;
          if (fly.t >= 1) { fly = null; rider.visible = false; arcMat.opacity = 0.18; }
        } else {
          const oldArc = arcMat.opacity;
          arcMat.opacity = U.damp(arcMat.opacity, 0.14, 2, dt);
          if (Math.abs(arcMat.opacity - oldArc) > 0.0002) dirty = true;
          if (g) {
            const locked = selObj && selObj.body === body && camera.position.length() < R * 4;
            if (locked) {
              /* hold the chosen site dead centre while the world turns beneath it */
              const world = siteWorld(selObj);
              if (world) {
                const d = U.damp(camera.position.length(), R * 3.15, 1.6, dt);
                keep.copy(world).normalize().multiplyScalar(d);
                camera.position.lerp(keep, Math.min(1, dt * 2.2));
                camera.position.x += P.sx * 0.22;
                camera.position.y += P.sy * 0.14;
              }
            } else {
              camera.position.x = U.damp(camera.position.x, P.sx * 1.4 + (spin ? Math.sin(t * 0.12) * 0.35 * spin : 0), 2, dt);
              camera.position.y = U.damp(camera.position.y, R * 1.35 + P.sy * 0.9, 2, dt);
              camera.position.z = U.damp(camera.position.z, R * 3.6, 2, dt);
            }
          }
        }
        camera.lookAt(0, 0, 0);

        if (g) {
          if (spin) { g.spin += dt * 0.035 * spin; g.mesh.rotation.y = g.spin; }
          g.air.scale.setScalar(1 + (spin ? Math.sin(t * 0.7) * 0.003 * spin : 0));
          mAr = U.damp(mAr, camera.position.length() < R * 4.2 ? 1 : 0.35, 2, dt);
        }
        /* marker pulse — skipped entirely once the world has been asked to hold still */
        if (spin && globes[body]) {
          const kids = globes[body].mesh.children;
          for (let i = 0; i < kids.length; i++) {
            const cs = kids[i].children;
            for (let j = 0; j < cs.length; j++) {
              const c = cs[j];
              if (c.isSprite) {
                const s = Math.sin(t * 2.2 * spin + i);
                c.material.opacity = 0.45 + 0.4 * s;
                c.scale.setScalar(0.55 + 0.18 * s);
              } else if (c.geometry && c.geometry.type === 'RingGeometry') {
                const s2 = (Math.sin(t * 1.5 * spin + i) + 1) / 2;
                c.scale.setScalar(1 + 1.1 * s2);
                c.material.opacity = 0.5 * (1 - s2) + 0.1;
              }
            }
          }
        }

        if (Math.abs(camera.position.x - oldCamX) > 0.0002 || Math.abs(camera.position.y - oldCamY) > 0.0002 || Math.abs(camera.position.z - oldCamZ) > 0.0002) dirty = true;
        if (dirty) { renderer.render(scene, camera); lastScaleRev = LB.scaleRevision; }
      };

      warmAll();
      LB.scenes = LB.scenes || {};
      LB.scenes.globes = { scene: scene, camera: camera, renderer: renderer, state: () => ({ body: body, selected: selected }) };
      if (LB.assets) LB.assets.done('globes');
    }
  });
})();
