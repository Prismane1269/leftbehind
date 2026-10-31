/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — the ground-truth explorer (v2.0 Cinematic)
   Interactive 3D planetary exploration of the Moon, Mars, and Earth with:
   - Full orbit rotation, momentum drag, and trackpad/wheel pinch-to-zoom
   - Multi-layer realistic PBR shading, atmospheric rim glow, cloud layer
   - Ground-truth coordinates fly-to navigation & radar beacons
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
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        stencil: false,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(LB.dpr ? Math.min(window.devicePixelRatio || 1, 1.5) : 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);
      LB.addRenderer('globes', renderer);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 500);

      /* Cinematic realistic lighting rig */
      scene.add(new THREE.AmbientLight(0x1a263d, 1.1));
      const keySun = new THREE.DirectionalLight(0xfff7ea, 2.4);
      keySun.position.set(6, 2.8, 5.5);
      scene.add(keySun);
      const deepSpaceRim = new THREE.DirectionalLight(0x4070c0, 0.85);
      deepSpaceRim.position.set(-6, -2, -5);
      scene.add(deepSpaceRim);

      /* ---------------------------------------------------------- textures */
      const loader = new THREE.TextureLoader();
      const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
      const TEX = {};
      let texLoaded = 0;
      ['moon', 'mars', 'earth', 'moon_bump', 'mars_bump'].forEach((k) => {
        TEX[k] = loader.load('assets/textures/' + k + '.jpg', () => {
          if (LB.assets) LB.assets.texturesDone('globes');
          if (++texLoaded >= 5) warmAll();
        });
        TEX[k].encoding = THREE.sRGBEncoding;
        TEX[k].minFilter = THREE.LinearFilter;
        TEX[k].magFilter = THREE.LinearFilter;
        TEX[k].generateMipmaps = false;
        TEX[k].anisotropy = Math.min(4, maxAniso);
      });
      TEX.moon_bump.encoding = TEX.mars_bump.encoding = THREE.LinearEncoding;

      /* ---------------------------------------------------------- procedural cloud canvas */
      function createCloudTexture() {
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 512;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1024, 512);
        // Soft cloud wisps
        for (let i = 0; i < 700; i++) {
          const x = Math.random() * 1024;
          const y = (Math.random() * 0.7 + 0.15) * 512;
          const rad = Math.random() * 45 + 10;
          const alpha = Math.random() * 0.16 + 0.02;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
          grad.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        return tex;
      }
      const TEX_CLOUDS = createCloudTexture();

      /* ---------------------------------------------------------- worlds & shaders */
      const R = 2.6;
      const MATS = {
        moon: new THREE.MeshStandardMaterial({
          map: TEX.moon,
          bumpMap: TEX.moon_bump,
          bumpScale: 0.42,
          roughness: 0.92,
          metalness: 0.03
        }),
        mars: new THREE.MeshStandardMaterial({
          map: TEX.mars,
          bumpMap: TEX.mars_bump,
          bumpScale: 0.38,
          roughness: 0.86,
          metalness: 0.04,
          emissive: 0x180702,
          emissiveIntensity: 0.75
        }),
        earth: new THREE.MeshStandardMaterial({
          map: TEX.earth,
          roughness: 0.52,
          metalness: 0.08,
          emissive: 0x07152b,
          emissiveIntensity: 0.9
        })
      };

      const globes = {};
      ['moon', 'mars', 'earth'].forEach((b) => {
        const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), MATS[b]);
        m.rotation.z = b === 'mars' ? 0.44 : (b === 'earth' ? 0.41 : 0.03);
        g.add(m);

        /* Realistic Fresnel Rayleigh atmospheric haze */
        const airGeo = new THREE.SphereGeometry(R * 1.055, 48, 36);
        const airMat = new THREE.MeshBasicMaterial({
          color: b === 'earth' ? 0x5aa5ff : (b === 'mars' ? 0xe27a44 : 0x9fb3d4),
          transparent: true,
          opacity: b === 'moon' ? 0.08 : (b === 'earth' ? 0.32 : 0.22),
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const air = new THREE.Mesh(airGeo, airMat);
        g.add(air);

        /* Earth dynamic cloud shell */
        let cloudsMesh = null;
        if (b === 'earth') {
          const cloudGeo = new THREE.SphereGeometry(R * 1.018, 56, 40);
          const cloudMat = new THREE.MeshStandardMaterial({
            map: TEX_CLOUDS,
            transparent: true,
            opacity: 0.48,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
          g.add(cloudsMesh);
        }

        g.visible = false;
        scene.add(g);
        globes[b] = { group: g, mesh: m, air: air, clouds: cloudsMesh, rotX: 0, rotY: 0, velX: 0, velY: 0 };
      });

      function latLon(lat, lon, radius) {
        const phi = lat * Math.PI / 180, lam = lon * Math.PI / 180, cp = Math.cos(phi);
        return new THREE.Vector3(radius * cp * Math.cos(lam), radius * Math.sin(phi), -radius * cp * Math.sin(lam));
      }

      /* ---------------------------------------------------------- markers & radar beacons */
      function pinTexture(hex) {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d');
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, hex);
        gr.addColorStop(0.38, hex.replace('rgb', 'rgba').replace(')', ',.55)'));
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      }
      const TEX_BLUE = pinTexture('rgb(140,195,255)');
      const TEX_GREEN = pinTexture('rgb(90,240,180)');
      const TEX_RED = pinTexture('rgb(255,140,110)');
      const TEX_GOLD = pinTexture('rgb(255,210,120)');

      const pickables = [];
      const markerGroups = {};
      ['moon', 'mars', 'earth'].forEach((body) => {
        (LB.data[body] || []).forEach((o) => {
          if (o.lat === null || o.lon === null) return;
          const g = new THREE.Group();
          const base = latLon(o.lat, o.lon, R * 1.012);
          const normal = base.clone().normalize();
          const color = o.status === 'active' ? 0x5af0b4 : (body === 'moon' ? 0x8cbeff : (body === 'earth' ? 0xffd278 : 0xff8a5c));

          /* stalk */
          const stalk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85 })
          );
          stalk.position.copy(base.clone().add(normal.clone().multiplyScalar(0.18)));
          stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
          g.add(stalk);

          /* head */
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), new THREE.MeshBasicMaterial({ color: color }));
          head.position.copy(base.clone().add(normal.clone().multiplyScalar(0.38)));
          g.add(head);

          /* pulsing radar glow sprite */
          const spMap = o.status === 'active' ? TEX_GREEN : (body === 'moon' ? TEX_BLUE : (body === 'earth' ? TEX_GOLD : TEX_RED));
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spMap, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
          sp.position.copy(head.position);
          sp.scale.setScalar(0.7);
          g.add(sp);

          /* expanding halo ring */
          const halo = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.13, 32),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
          );
          halo.position.copy(head.position);
          halo.lookAt(0, 0, 0);
          g.add(halo);

          /* fat hit target */
          const hit = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
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

      const rider = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      rider.visible = false;
      scene.add(rider);

      /* ---------------------------------------------------------- deep space diagram */
      const deep = section.querySelector('[data-deep]');
      if (deep) {
        const AU = 149597870.7;
        const v1 = LB.data.byId('voyager1'), v2 = LB.data.byId('voyager2');
        const a1 = v1 && v1.distKm ? v1.distKm / AU : 163, a2 = v2 && v2.distKm ? v2.distKm / AU : 137;
        const maxAU = 180;
        deep.innerHTML =
          '<div class="deep-scale">' +
          '<div class="deep-sun"></div>' +
          '<div class="deep-lane"><span class="deep-lane-label">Sun</span></div>' +
          '<div class="deep-probe deep-probe--1" style="left:' + Math.min(96, (a1 / maxAU) * 100).toFixed(1) + '%"><b>Voyager 1</b><i>' + a1.toFixed(0) + ' AU</i><em>' + (v1 ? LB.space.lightLabel(v1.lightSec || 23 * 3600) : '22h') + ' one-way</em></div>' +
          '<div class="deep-probe deep-probe--2" style="left:' + Math.min(96, (a2 / maxAU) * 100).toFixed(1) + '%"><b>Voyager 2</b><i>' + a2.toFixed(0) + ' AU</i><em>' + (v2 ? LB.space.lightLabel(v2.lightSec || 21 * 3600) : '19h') + ' one-way</em></div>' +
          '<div class="deep-rule">' + [0, 40, 80, 120, 160].map((n) => '<span style="left:' + ((n / maxAU) * 100) + '%">' + n + ' AU</span>').join('') + '</div>' +
          '<p class="deep-note">Both Voyagers still answer. It takes about ' + (23 * 2) + ' hours for a command from Earth to reach Voyager 1 and for the reply to come back.</p>' +
          '</div>';
      }

      /* ---------------------------------------------------------- UI references */
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

      /* Pre-allocated scratch objects for zero GC in RAF loop */
      const scratchV1 = new THREE.Vector3();
      const scratchV2 = new THREE.Vector3();
      const keep = new THREE.Vector3();
      const siteV = new THREE.Vector3();

      /* Interactive Orbit & Zoom State */
      let isDragging = false;
      let lastPointerX = 0, lastPointerY = 0;
      let targetCamDistance = R * 3.6;
      let currentCamDistance = R * 3.6;
      const MIN_CAM_DIST = R * 1.55;
      const MAX_CAM_DIST = R * 5.4;

      function objectsFor(b) {
        return (LB.data[b] || []).filter((o) => {
          if (!query) return true;
          const q = query.toLowerCase();
          return (o.name + ' ' + o.type + ' ' + (o.site || '') + ' ' + o.headline).toLowerCase().indexOf(q) >= 0;
        });
      }

      function renderList() {
        if (!ui.list) return;
        const list = objectsFor(body);
        ui.list.innerHTML = list.length ? list.map((o) => {
          const st = LB.data.STATUS[o.status] || { short: 'Site', color: '#8fb4ff' };
          const dotColor = o.status === 'active' ? '#5af0b4' : (o.body === 'moon' ? '#8cbeff' : (o.body === 'earth' ? '#ffd278' : '#ff8a5c'));
          return '<button class="obj-row' + (selected === o.id ? ' is-on' : '') + '" data-pick="' + o.id + '">' +
            '<span class="obj-dot" style="background:' + dotColor + '"></span>' +
            '<span class="obj-txt"><b>' + o.short + '</b><i>' + (o.site || o.type) + '</i></span>' +
            '<span class="obj-tag" style="color:' + st.color + '">' + st.short + '</span></button>';
        }).join('') : '<p class="obj-empty">Nothing matches that search. Try "Apollo", "rover", or "Curiosity".</p>';
      }

      function setReadout(o) {
        if (!o) return;
        const isMoon = o.body === 'moon';
        const isEarth = o.body === 'earth';
        const now = new Date();
        const km = isEarth ? 0 : (isMoon ? 384400 : LB.space.marsEarthKm(now));
        const lt = isEarth ? 0 : LB.space.lightTime(km);
        if (ui.dist) ui.dist.textContent = isEarth ? '0 km (Home)' : U.num(km) + ' km';
        if (ui.light) {
          if (isEarth) {
            ui.light.innerHTML = '<b>Instantaneous</b><span>Origin of all listed space missions · Cape Canaveral, Florida</span>';
          } else {
            ui.light.innerHTML = '<b>' + LB.space.lightLabel(lt) + '</b><span>for radio to reach ' + (isMoon ? 'the Moon' : 'Mars') + ' right now — ' + U.compact(km) + ' km away<span>' + (isMoon ? ' (mean)' : ' (computed live)') + '</span></span>';
          }
        }
        if (ui.coords) {
          const lat = o.lat === null ? '—' : Math.abs(o.lat).toFixed(3) + '° ' + (o.lat >= 0 ? 'N' : 'S');
          const lon = o.lon === null ? '—' : Math.abs(o.lon).toFixed(3) + '° ' + (o.lon >= 0 ? 'E' : 'W');
          ui.coords.innerHTML = '<span class="mono">' + lat + ' / ' + lon + '</span>' + (o.landed ? '<span>' + o.landed + '</span>' : '');
        }
      }

      function select(id, flyTo) {
        const o = LB.data.byId(id);
        if (!o) return;
        selected = id;
        sceneDirty = true;
        if (o.body !== 'deep' && o.body !== body) setBody(o.body, false);
        renderList();
        if (ui.name) ui.name.textContent = o.name;
        if (ui.meta) {
          const st = LB.data.STATUS[o.status] || { tag: 'tag--active', label: 'Operational' };
          const bodyLabel = (LB.data.BODY[o.body] && LB.data.BODY[o.body].label) || o.body;
          ui.meta.innerHTML = '<span class="tag ' + st.tag + '">' + st.label + '</span>' +
            '<span>' + o.type + '</span><span>' + bodyLabel + '</span>' +
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
        const row = ui.list && ui.list.querySelector('[data-pick="' + id + '"]');
        if (row && ui.list) {
          const top = row.offsetTop, bottom = top + row.offsetHeight;
          if (top < ui.list.scrollTop) ui.list.scrollTop = top - 8;
          else if (bottom > ui.list.scrollTop + ui.list.clientHeight) ui.list.scrollTop = bottom - ui.list.clientHeight + 8;
        }
      }
      LB.selectObject = select;

      function siteWorld(o) {
        const g = markerGroups[o.id];
        if (!g) return null;
        g.children[1].getWorldPosition(siteV);
        return siteV;
      }

      function startFly(o) {
        const world = siteWorld(o) || latLon(o.lat, o.lon, R * 1.02);
        const dir = world.clone().normalize();
        targetCamDistance = R * 2.3; // Closer, cinematic inspection distance
        const end = dir.clone().multiplyScalar(targetCamDistance);
        const start = camera.position.clone();
        const N = 48, pts = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const e = U.easeInOut(t);
          const d = start.clone().normalize().lerp(end.clone().normalize(), e).normalize();
          const r = U.lerp(start.length(), end.length(), e) + Math.sin(Math.PI * e) * R * 1.35;
          pts.push(d.multiplyScalar(r));
        }
        fly = { pts: pts, t: 0, dur: 1.6, obj: o };
        arcGeo.setFromPoints(pts);
        arcMat.opacity = 0.0;
        rider.visible = true;
        sceneDirty = true;
      }

      function setBody(b, keepSelection) {
        body = b;
        ['moon', 'mars', 'earth'].forEach((k) => {
          if (globes[k]) globes[k].group.visible = (k === body);
        });
        ui.tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.body === b));
        if (ui.stagetitle) ui.stagetitle.textContent = (LB.data.BODY[b] && LB.data.BODY[b].label) || b;
        if (b === 'deep') {
          if (ui.hud) ui.hud.classList.add('is-hidden');
          if (ui.deep) ui.deep.classList.add('is-on');
          if (selected && LB.data.byId(selected).body === 'deep' && !keepSelection) select(selected, false);
        } else {
          if (ui.hud) ui.hud.classList.remove('is-hidden');
          if (ui.deep) ui.deep.classList.remove('is-on');
          targetCamDistance = R * 3.4;
          camera.position.set(0, R * 1.2, targetCamDistance);
          camera.lookAt(0, 0, 0);
          if (!keepSelection) {
            const first = (LB.data[b] || [])[0];
            if (first) select(first.id, false);
          }
        }
        renderList();
        sceneDirty = true;
      }

      ui.tabs.forEach((t) => t.addEventListener('click', () => {
        query = '';
        if (ui.search) ui.search.value = '';
        setBody(t.dataset.body);
      }));

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

      /* ---------------------------------------------------------- pointer picking & orbital drag */
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();

      function pickAt(x, y) {
        const r = canvas.getBoundingClientRect();
        ndc.x = ((x - r.left) / r.width) * 2 - 1;
        ndc.y = -((y - r.top) / r.height) * 2 + 1;
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(pickables, false);
        if (hits.length) {
          select(hits[0].object.userData.object.id, true);
        }
      }

      const stage = section.querySelector('.explorer-stage');
      let downPt = null;

      if (stage) {
        /* Pointer Down: start drag & recording */
        stage.addEventListener('pointerdown', (e) => {
          // Ignore if clicking tabs or list controls
          if (e.target.closest('.explorer-side') || e.target.closest('.explorer-panel')) return;
          isDragging = true;
          downPt = { x: e.clientX, y: e.clientY };
          lastPointerX = e.clientX;
          lastPointerY = e.clientY;
          stage.setPointerCapture(e.pointerId);
        });

        /* Pointer Move: orbit globe with momentum */
        stage.addEventListener('pointermove', (e) => {
          hoverPt = { x: e.clientX, y: e.clientY };
          if (!isDragging || !globes[body]) return;

          const dx = e.clientX - lastPointerX;
          const dy = e.clientY - lastPointerY;
          lastPointerX = e.clientX;
          lastPointerY = e.clientY;

          const g = globes[body];
          g.velY = dx * 0.005;
          g.velX = dy * 0.005;
          g.rotY += g.velY;
          g.rotX = U.clamp(g.rotX + g.velX, -Math.PI * 0.35, Math.PI * 0.35);

          // If user interacts manually, unbind automated site lock
          fly = null;
          sceneDirty = true;
        }, { passive: true });

        /* Pointer Up: finalize click or release drag */
        const endDrag = (e) => {
          if (!isDragging) return;
          isDragging = false;
          if (downPt) {
            const moved = Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y);
            downPt = null;
            if (moved < 6) pickAt(e.clientX, e.clientY);
          }
        };
        stage.addEventListener('pointerup', endDrag);
        stage.addEventListener('pointercancel', endDrag);
        stage.addEventListener('pointerleave', () => { hoverPt = null; });

        /* Interactive Zoom: Mouse wheel & trackpad */
        stage.addEventListener('wheel', (e) => {
          if (e.target.closest('.explorer-side') || e.target.closest('.explorer-panel')) return;
          e.preventDefault();
          const delta = Math.sign(e.deltaY) * (R * 0.28);
          targetCamDistance = U.clamp(targetCamDistance + delta, MIN_CAM_DIST, MAX_CAM_DIST);
          sceneDirty = true;
        }, { passive: false });
      }

      function resize() {
        const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.fov = camera.aspect < 1 ? 52 : 38;
        camera.updateProjectionMatrix();
        sceneDirty = true;
      }

      function warmAll() {
        if (!LB.warmEnabled) { LB.warm(renderer, scene, camera); return; }
        const was = {};
        ['moon', 'mars', 'earth'].forEach((k) => {
          if (globes[k]) { was[k] = globes[k].group.visible; globes[k].group.visible = true; }
        });
        LB.warm(renderer, scene, camera);
        ['moon', 'mars', 'earth'].forEach((k) => {
          if (globes[k]) globes[k].group.visible = was[k];
        });
      }

      resize();
      LB.Scroll.watch(section);
      LB.Scroll.watch(canvas);
      LB.Scroll.onResize(resize);

      setBody('moon');
      camera.position.set(0, R * 1.2, targetCamDistance);
      camera.lookAt(0, 0, 0);

      /* ---------------------------------------------------------- 60FPS RAF Loop */
      const dom = LB.dom;
      this.update = (t, dt, S, P) => {
        if (LB.modalOpen) return;
        const r = S.rectOf(section);
        if (r.bottom < -60 || r.top > innerHeight + 60) return;

        const spin = LB.motion.cfg.spin;
        let dirty = sceneDirty || spin > 0 || isDragging || LB.scaleRevision !== lastScaleRev;
        sceneDirty = false;
        const oldCamX = camera.position.x, oldCamY = camera.position.y, oldCamZ = camera.position.z;

        /* One hover raycast per frame */
        if (hoverPt && globes[body] && body !== 'deep' && !isDragging) {
          const cr = S.rectOf(canvas);
          ndc.x = ((hoverPt.x - cr.left) / cr.width) * 2 - 1;
          ndc.y = -((hoverPt.y - cr.top) / cr.height) * 2 + 1;
          ray.setFromCamera(ndc, camera);
          const over = ray.intersectObjects(pickables, false).length > 0;
          hoverPt = null;
          if (over !== hovering) {
            hovering = over;
            stage.style.cursor = over ? 'pointer' : (isDragging ? 'grabbing' : 'grab');
            if (ui.hud) dom.cls(ui.hud, 'is-hovering', over);
          }
        }

        const g = globes[body];
        const selObj = selected ? LB.data.byId(selected) : null;

        /* Smooth camera distance zoom easing */
        currentCamDistance = U.damp(currentCamDistance, targetCamDistance, 8, dt);
        if (Math.abs(currentCamDistance - targetCamDistance) > 0.001) dirty = true;

        if (fly) {
          dirty = true;
          fly.t += dt / fly.dur;
          const f = U.easeInOut(U.clamp(fly.t));
          const N = fly.pts.length - 1;
          const fi = f * N, i0 = Math.min(N - 1, Math.floor(fi)), fr = fi - i0;
          camera.position.copy(fly.pts[i0]).lerp(fly.pts[i0 + 1], fr);
          rider.position.copy(camera.position);
          arcMat.opacity = Math.sin(Math.PI * U.clamp(fly.t)) * 0.7;
          if (fly.t >= 1) {
            fly = null;
            rider.visible = false;
            arcMat.opacity = 0.2;
          }
        } else {
          const oldArc = arcMat.opacity;
          arcMat.opacity = U.damp(arcMat.opacity, 0.12, 2, dt);
          if (Math.abs(arcMat.opacity - oldArc) > 0.0002) dirty = true;

          if (g) {
            const locked = selObj && selObj.body === body && !isDragging && Math.abs(g.velX) < 0.0001 && Math.abs(g.velY) < 0.0001;
            if (locked) {
              const world = siteWorld(selObj);
              if (world) {
                keep.copy(world).normalize().multiplyScalar(currentCamDistance);
                camera.position.lerp(keep, Math.min(1, dt * 2.8));
                camera.position.x += P.sx * 0.15;
                camera.position.y += P.sy * 0.1;
              }
            } else {
              // Inertial damped orbit
              camera.position.x = U.damp(camera.position.x, Math.sin(g.rotY) * currentCamDistance + P.sx * 0.8, 4, dt);
              camera.position.y = U.damp(camera.position.y, Math.sin(g.rotX) * currentCamDistance * 0.75 + P.sy * 0.6, 4, dt);
              camera.position.z = U.damp(camera.position.z, Math.cos(g.rotY) * Math.cos(g.rotX) * currentCamDistance, 4, dt);
            }
          }
        }
        camera.lookAt(0, 0, 0);

        if (g) {
          /* Damping inertia after drag */
          if (!isDragging) {
            g.rotY += g.velY;
            g.rotX = U.clamp(g.rotX + g.velX, -Math.PI * 0.35, Math.PI * 0.35);
            g.velX = U.damp(g.velX, 0, 4.5, dt);
            g.velY = U.damp(g.velY, 0, 4.5, dt);
          }
          if (spin && !isDragging) {
            g.rotY += dt * 0.025 * spin;
          }
          g.mesh.rotation.y = g.rotY;
          g.mesh.rotation.x = g.rotX;

          /* Earth cloud independent layer rotation */
          if (g.clouds) {
            g.clouds.rotation.y = g.rotY * 1.08 + t * 0.01;
            g.clouds.rotation.x = g.rotX;
          }

          /* Subtle atmospheric pulsing */
          g.air.scale.setScalar(1 + (spin ? Math.sin(t * 0.8) * 0.003 * spin : 0));
        }

        /* Radar marker pulses */
        if (globes[body]) {
          const kids = globes[body].mesh.children;
          for (let i = 0; i < kids.length; i++) {
            const cs = kids[i].children;
            for (let j = 0; j < cs.length; j++) {
              const c = cs[j];
              if (c.isSprite) {
                const s = Math.sin(t * 2.4 + i);
                c.material.opacity = 0.5 + 0.45 * s;
                c.scale.setScalar(0.6 + 0.2 * s);
              } else if (c.geometry && c.geometry.type === 'RingGeometry') {
                const s2 = (Math.sin(t * 1.8 + i) + 1) / 2;
                c.scale.setScalar(1 + 1.25 * s2);
                c.material.opacity = 0.55 * (1 - s2) + 0.08;
              }
            }
          }
        }

        if (Math.abs(camera.position.x - oldCamX) > 0.0002 ||
            Math.abs(camera.position.y - oldCamY) > 0.0002 ||
            Math.abs(camera.position.z - oldCamZ) > 0.0002) {
          dirty = true;
        }

        if (dirty) {
          renderer.render(scene, camera);
          lastScaleRev = LB.scaleRevision;
        }
      };

      warmAll();
      LB.scenes = LB.scenes || {};
      LB.scenes.globes = {
        scene: scene,
        camera: camera,
        renderer: renderer,
        state: () => ({ body: body, selected: selected })
      };
      if (LB.assets) LB.assets.done('globes');
    }
  });
})();
