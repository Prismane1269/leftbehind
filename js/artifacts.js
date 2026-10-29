/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — the artifact hall
   Six pieces of hardware on lit pedestals. Scroll walks the hall; drag spins
   the machine in front of you. Also exports LB.viewer: a reusable mini 3D
   viewer used by every story modal in the site.
   ========================================================================== */
(function () {
  'use strict';
  const LB = (window.LB = window.LB || {});
  const U = LB.util;

  /* ======================================================================
     Mini viewer — one renderer that can be re-pointed at any canvas
     ====================================================================== */
  const viewer = LB.viewer = {
    renderer: null, scene: null, camera: null, current: null, canvas: null, t: 0, spin: 0, drag: 0, dragging: false, lastX: 0,
    ensure() {
      if (this.renderer) return;
      /* a small canvas, so keep MSAA when the buffer is under ~1.6x and let
         higher densities supersample instead */
      this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, stencil: false, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(LB.dpr ? LB.dpr() : 1);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.setClearColor(0x000000, 0);
      LB.addRenderer('viewer', this.renderer);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      this.camera.position.set(0, 1.05, 6.6);
      this.camera.lookAt(0, -0.12, 0);
      this.scene.add(new THREE.AmbientLight(0x2b3854, 1.05));
      const key = new THREE.DirectionalLight(0xfff0dc, 1.5); key.position.set(3.4, 5.2, 4.6); this.scene.add(key);
      const rim = new THREE.PointLight(0x6ea8ff, 2.0, 22, 1.7); rim.position.set(-3.6, 1.4, 2.4); this.scene.add(rim);
      const under = new THREE.PointLight(0xff8a5c, 1.1, 18, 1.8); under.position.set(2.6, -2.4, -1.6); this.scene.add(under);
      this.lights = { key, rim, under };
    },
    set(modelId, accent) {
      this.ensure();
      if (this.current) { this.scene.remove(this.current); this.dispose(this.current); }
      const g = LB.hw.build(modelId, { accent: accent });
      const box = new THREE.Box3().setFromObject(g);
      const size = new THREE.Vector3(); box.getSize(size);
      const center = new THREE.Vector3(); box.getCenter(center);
      g.position.sub(center);
      const s = 2.35 / Math.max(size.x, size.y, size.z);
      g.scale.setScalar(s);
      const wrap = new THREE.Group();
      wrap.add(g);
      this.scene.add(wrap);
      this.current = wrap;
      this.model = g;
      this.radius = Math.max(size.x, size.z) * s * 0.5;
      this.spin = -0.6;
      if (this.lights && accent) this.lights.under.color.set(accent);
    },
    dispose(g) {
      g.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    },
    mount(canvas, modelId, accent) {
      this.canvas = canvas;
      if (!this._bound) {
        this._bound = true;
        const down = (e) => { this.dragging = true; this.lastX = (e.touches ? e.touches[0].clientX : e.clientX); };
        const move = (e) => {
          const x = (e.touches ? e.touches[0].clientX : e.clientX);
          if (this.dragging) { this.drag += (x - this.lastX) * 0.01; this.lastX = x; }
        };
        const up = () => { this.dragging = false; };
        canvas.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move, { passive: true });
        window.addEventListener('pointerup', up);
      }
      this.set(modelId, accent);
      this.resize();
    },
    resize() {
      if (!this.canvas || !this.renderer) return;
      const w = this.canvas.clientWidth || 460, h = this.canvas.clientHeight || 340;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      if (!this._attached) { this.canvas.parentNode.appendChild(this.renderer.domElement); this._attached = true; }
      this.renderer.domElement.style.position = 'absolute';
      this.renderer.domElement.style.inset = '0';
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
    },
    update(t, dt) {
      if (!this.renderer || !this.current) return;
      this.spin += dt * 0.28 * LB.motion.cfg.spin;   /* calm: it holds still until you drag it */
      this.current.rotation.y = this.spin + this.drag;
      this.current.rotation.x = Math.sin(t * 0.3) * 0.02 + 0.02;
      if (this.model && this.model.userData.anim) this.model.userData.anim(t, dt);
      this.resize();
      this.renderer.render(this.scene, this.camera);
    }
  };

  /* ======================================================================
     The hall
     ====================================================================== */
  LB.register({
    name: 'hall',
    init() {
      const section = document.getElementById('hall');
      const canvas = document.getElementById('hall-canvas');
      if (!section || !canvas || !window.THREE) return;
      if (LB.assets) LB.assets.expect('hall');

      const ids = LB.data.gallery;
      const objects = ids.map((id) => LB.data.byId(id));

      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: LB.dpr() < 1.4 && !LB.touch, alpha: true, stencil: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(LB.dpr ? LB.dpr() : 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);
      LB.addRenderer('hall', renderer);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x03060c, 0.021);
      const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 200);
      camera.position.set(0, 2.5, 15.2);
      camera.lookAt(0, 0.45, 0);

      /* floor */
      const floorGeo = new THREE.PlaneGeometry(90, 90);
      const floorTex = (function () {
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const g = c.getContext('2d');
        g.fillStyle = '#05080e'; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = 'rgba(120,170,255,.16)'; g.strokeRect(.5, .5, 256, 256);
        g.strokeStyle = 'rgba(120,170,255,.05)';
        g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 30);
        return t;
      })();
      const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
        map: floorTex, color: 0x4a5a76, metalness: .62, roughness: .48, emissive: 0x040810, emissiveIntensity: 1
      }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6;
      scene.add(floor);

      /* lights */
      scene.add(new THREE.AmbientLight(0x26344f, 1.5));
      const spotTarget = new THREE.Object3D(); scene.add(spotTarget);
      const key = new THREE.DirectionalLight(0xa9c8ff, 1.05); key.position.set(5, 9, 6); scene.add(key);
      const rim = new THREE.DirectionalLight(0xffb44d, 0.34); rim.position.set(-4, 3, -7); scene.add(rim);
      const spots = [];

      /* pedestals */
      const RADIUS = 7.4, STEP = (Math.PI * 2) / ids.length;
      const ring = new THREE.Group(); scene.add(ring);
      const plinths = [];
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 512; labelCanvas.height = 128;

      function labelTexture(title, sub, accent) {
        const g = labelCanvas.getContext('2d');
        g.clearRect(0, 0, 512, 128);
        g.fillStyle = 'rgba(5,8,14,.96)'; g.fillRect(0, 0, 512, 128);
        g.strokeStyle = 'rgba(160,200,255,.28)'; g.lineWidth = 2; g.strokeRect(1, 1, 510, 126);
        g.fillStyle = accent || '#8cbeff'; g.fillRect(0, 0, 5, 128);
        g.fillStyle = '#eef3fb';
        let size = 40;
        g.font = '600 ' + size + 'px Inter, Helvetica, Arial, sans-serif';
        while (g.measureText(title).width > 452 && size > 20) { size -= 2; g.font = '600 ' + size + 'px Inter, Helvetica, Arial, sans-serif'; }
        g.fillText(title, 22, 54);
        /* the site string can be long — trim it to what the plate can hold */
        let place = String(sub || '').replace(/ \(.*?\)/g, '').trim();
        if (place.length > 34) place = place.slice(0, 32).replace(/[ ,]+$/, '') + '…';
        g.fillStyle = 'rgba(160,185,215,.92)'; g.font = '400 24px ui-monospace, Menlo, monospace';
        g.fillText(place, 22, 94);
        const t = new THREE.CanvasTexture(labelCanvas); t.encoding = THREE.sRGBEncoding;
        return t;
      }

      objects.forEach((o, i) => {
        const a = i * STEP;
        const g = new THREE.Group();
        g.position.set(Math.sin(a) * RADIUS, -1.6, Math.cos(a) * RADIUS);
        g.rotation.y = a;
        g.userData.base = g.position.clone();

        /* plinth */
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.62, 0.5, 26),
          new THREE.MeshStandardMaterial({ color: 0x0c1119, metalness: .7, roughness: .34, emissive: 0x081020, emissiveIntensity: .8 }));
        plinth.position.y = 0.25; g.add(plinth);
        const plinthRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.018, 6, 40),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(o.status === 'active' ? '#5af0b4' : '#6ea8ff'), transparent: true, opacity: .8 }));
        plinthRing.rotation.x = Math.PI / 2; plinthRing.position.y = 0.52; g.add(plinthRing);

        /* the machine */
        const model = LB.hw.build(o.model, { accent: o.status === 'active' ? '#5af0b4' : '#6ea8ff' });
        const bb = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3(); bb.getSize(size);
        const s2 = 2.3 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(s2);
        model.position.y = 0.5 - bb.min.y * s2;
        const holder = new THREE.Group();
        holder.add(model);
        g.add(holder);

        /* label plate */
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.39),
          new THREE.MeshBasicMaterial({ map: labelTexture(o.short, o.site, o.status === 'active' ? '#5af0b4' : '#8cbeff'), transparent: true, fog: false }));
        plate.position.set(0, 2.0, 0.06); g.add(plate);

        /* spot cone */
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 2.5, 5.2, 22, 1, true),
          new THREE.MeshBasicMaterial({ color: o.status === 'active' ? 0x5af0b4 : 0x6ea8ff, transparent: true, opacity: .045, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
        cone.position.y = 3.1; g.add(cone);
        const pLight = new THREE.PointLight(o.status === 'active' ? 0x5af0b4 : 0x6ea8ff, 1.4, 12, 1.9);
        pLight.position.set(0, 3.2, 0.4); g.add(pLight);
        spots.push(pLight);

        ring.add(g);
        plinths.push({ group: g, model: model, holder: holder, plate: plate, cone: cone, light: pLight, obj: o, spin: 0, base: g.userData.base.clone() });
      });

      /* dust */
      const dn = LB.touch ? 50 : 100;
      const dp = new Float32Array(dn * 3);
      for (let i = 0; i < dn; i++) {
        dp[i * 3] = (Math.random() - .5) * 34;
        dp[i * 3 + 1] = Math.random() * 8 - 1;
        dp[i * 3 + 2] = (Math.random() - .5) * 34;
      }
      const dgeo = new THREE.BufferGeometry();
      dgeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 0.05, color: 0xbfd8ff, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, map: (function () { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })() }));
      scene.add(dust);

      /* -------------------------------------------------- drag to spin the model */
      let dragging = false, lastX = 0, dragVel = 0, activeIndex = 0;
      const dragLayer = section.querySelector('.gallery-drag');
      const onDown = (e) => { dragging = true; lastX = e.clientX; e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); };
      const onMove = (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; dragVel += dx * 0.006; };
      const onUp = () => { dragging = false; };
      if (dragLayer) {
        dragLayer.addEventListener('pointerdown', onDown);
        dragLayer.addEventListener('pointermove', onMove);
        dragLayer.addEventListener('pointerup', onUp);
        dragLayer.addEventListener('pointercancel', onUp);
      }

      /* -------------------------------------------------- UI */
      const ui = {
        idx: section.querySelector('[data-hall-idx]'),
        name: section.querySelector('[data-hall-name]'),
        site: section.querySelector('[data-hall-site]'),
        story: section.querySelector('[data-hall-story]'),
        specs: section.querySelector('[data-hall-specs]'),
        tag: section.querySelector('[data-hall-tag]'),
        dots: U.$$('[data-hall-dot]', section),
        open: section.querySelector('[data-hall-open]')
      };
      let shown = -1;
      const dom = LB.dom;
      function swapText(el, text, delay) {
        if (!el) return;
        if (el._t) { clearTimeout(el._t); el._t = null; }
        el.style.opacity = '0';
        el._t = setTimeout(() => {
          el.textContent = text;
          el.style.opacity = '1';
          el._t = null;
        }, delay || 150);
      }
      function showInfo(i) {
        if (i === shown) return;
        shown = i;
        const o = objects[i];
        if (!o) return;
        if (ui.idx) dom.tx(ui.idx, '0' + (i + 1) + ' / 0' + objects.length);
        swapText(ui.name, o.short, 130);
        if (ui.site) dom.tx(ui.site, o.site + ' · ' + LB.data.BODY[o.body].label);
        swapText(ui.story, o.headline, 190);
        if (ui.specs) {
          ui.specs.innerHTML = (o.stats || []).map((s) => '<div><span>' + s[0] + '</span><b>' + s[1] + '</b></div>').join('');
        }
        if (ui.tag) {
          const st = LB.data.STATUS[o.status];
          ui.tag.className = 'tag ' + st.tag;
          dom.tx(ui.tag, st.label + (o.lastContact && o.status !== 'active' && o.status !== 'travelling' ? ' ' + o.lastContact : ''));
        }
        if (ui.open) ui.open.dataset.object = o.id;
        ui.dots.forEach((d, k) => dom.cls(d, 'is-on', k === i));
      }

      /* Balanced mode keeps the six plinths and their labels in the scene but
         draws only the machine currently in front. Scrolling still brings all
         six models into the same 3D turntable, one at a time. It cuts the hall
         from ~190 draw calls to about 40; Full brings back the whole ring. */
      let lodIndex = -1, lodMode = '';
      function setLOD(index) {
        const mode = LB.motion.level;
        if (index === lodIndex && mode === lodMode) return false;
        lodIndex = index; lodMode = mode;
        /* Every level renders one detailed machine at a time. The other five
           plinths remain as part of the room, but don't multiply draw calls. */
        for (let i = 0; i < plinths.length; i++) {
          const pl = plinths[i];
          const live = i === index;
          pl.model.visible = live;
          pl.plate.visible = live;
          pl.cone.visible = live;
          pl.light.visible = live;
        }
        return true;
      }

      function resize() {
        const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        const narrow = camera.aspect < 1;
        camera.fov = narrow ? 52 : 42;
        camera.position.set(0, narrow ? 2.6 : 2.5, narrow ? 16.4 : 15.2);
        camera.updateProjectionMatrix();
      }
      resize();
      LB.Scroll.watch(section);
      LB.Scroll.onResize(resize);

      /* -------------------------------------------------- loop */
      let pos = 0, visible = false, lastScaleRev = LB.scaleRevision;
      this.update = (t, dt, S, P) => {
        /* a story modal covers the hall — no reason to keep drawing behind it */
        if (LB.modalOpen) return;
        const r = S.rectOf(section);
        visible = r.bottom > 0 && r.top < innerHeight;
        if (!visible) return;
        const spin = LB.motion.cfg.spin;
        const fullMotion = LB.motion.level === 'full';

        const prog = S.progress(section);
        const local = U.range(prog, 0.04, 0.96);
        const target = local * (objects.length - 1);
        const oldPos = pos;
        /* Balanced snaps only when a new machine takes the foreground. It does
           not continuously scrub a six-object WebGL scene with the scroll bar. */
        pos = fullMotion ? U.damp(pos, target, 6, dt) : target;
        let dirty = (fullMotion && Math.abs(pos - oldPos) > 0.0002) || LB.scaleRevision !== lastScaleRev;
        const displayPos = fullMotion ? pos : Math.round(pos);
        ring.rotation.y = -displayPos * STEP;
        activeIndex = U.clamp(Math.round(pos), 0, objects.length - 1);
        showInfo(activeIndex);
        if (setLOD(activeIndex)) dirty = true;
        if (spin > 0 || Math.abs(dragVel) > 0.001) dirty = true;

        /* drag becomes model spin (only the front machine) */
        dragVel *= (1 - Math.min(1, dt * 2.6));
        for (let i = 0; i < plinths.length; i++) {
          const pl = plinths[i];
          const d = Math.min(Math.abs(i - pos), objects.length - Math.abs(i - pos));
          const near = Math.pow(U.clamp(1 - d / 1.5), 1.3);
          pl.spin += dt * (0.22 + near * 0.5) * spin;
          if (i === activeIndex) pl.spin += dragVel;          /* dragging always works */
          pl.holder.rotation.y = pl.spin;
          const lift = near * 0.2;
          pl.group.position.y = pl.base.y + (spin ? Math.sin(t * 0.6 + i) * 0.06 * spin : 0) + lift;
          pl.group.scale.setScalar(0.9 + near * 0.13);
          if (i === activeIndex) {
            pl.cone.material.opacity = 0.02 + near * 0.05;
            pl.light.intensity = 0.7 + near * 2.1 + (spin ? Math.sin(t * 1.1 + i) * 0.08 * spin : 0);
            if (spin && pl.model.userData.anim) pl.model.userData.anim(t, dt * spin);
          }
        }

        /* camera + feel — pointer parallax is intentionally tiny in Balanced */
        const oldX = camera.position.x, oldY = camera.position.y;
        ring.rotation.y += P.sx * 0.0012;
        camera.position.y = U.damp(camera.position.y, (camera.aspect < 1 ? 2.6 : 2.5) + P.sy * 0.35 + (spin ? Math.sin(t * 0.35) * 0.06 * spin : 0), 3, dt);
        camera.position.x = U.damp(camera.position.x, P.sx * 0.6, 3, dt);
        if (Math.abs(camera.position.x - oldX) > 0.0002 || Math.abs(camera.position.y - oldY) > 0.0002) dirty = true;
        camera.lookAt(0, 0.5 + P.sy * 0.12, 0);
        if (spin) { dust.rotation.y = t * 0.012 * spin; dirty = true; }

        if (dirty) { renderer.render(scene, camera); lastScaleRev = LB.scaleRevision; }
      };

      showInfo(0);
      LB.warm(renderer, scene, camera);
      setLOD(0);
      renderer.render(scene, camera);
      LB.scenes = LB.scenes || {};
      LB.scenes.hall = { scene: scene, camera: camera, renderer: renderer, plinths: plinths, state: () => ({ pos: pos, active: activeIndex }) };
      if (LB.assets) LB.assets.done('hall');
    }
  });
})();
