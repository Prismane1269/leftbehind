/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — hardware library
   Every piece of hardware is modelled from geometry in code (no downloads):
   Apollo descent stage, lunar rover, Surveyor, MER & MSL rovers, InSight,
   Phoenix, Viking, Ingenuity, Voyager and the Pathfinder lander.
   Each builder returns a THREE.Group whose userData.anim(t) animates it.
   ========================================================================== */
(function () {
  'use strict';
  const LB = (window.LB = window.LB || {});
  const U = LB.util;

  /* ------------------------------------------------------------ textures */
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  const TEX = {
    foil: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#c99a2e'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * w, y = Math.random() * h, s = Math.random() * 14 + 2;
        g.fillStyle = 'rgba(' + (230 + Math.random() * 25) + ',' + (180 + Math.random() * 60) + ',' + (60 + Math.random() * 90) + ',' + (0.05 + Math.random() * 0.25) + ')';
        g.beginPath();
        g.moveTo(x, y); g.lineTo(x + s, y + s * 0.3); g.lineTo(x + s * 0.6, y + s); g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(255,235,180,.22)'; g.lineWidth = 1;
      for (let i = 0; i < 26; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); }
    }),
    solar: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#0a1730'; g.fillRect(0, 0, w, h);
      const cols = 8, rows = 8, gap = 3, cw = w / cols, ch = h / rows;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        g.fillStyle = 'hsl(' + (215 + Math.random() * 14) + ',' + (70 + Math.random() * 20) + '%,' + (26 + Math.random() * 16) + '%)';
        g.fillRect(x * cw + gap, y * ch + gap, cw - gap * 2, ch - gap * 2);
        g.strokeStyle = 'rgba(140,190,255,.5)'; g.lineWidth = 1;
        g.strokeRect(x * cw + gap + .5, y * ch + gap + .5, cw - gap * 2 - 1, ch - gap * 2 - 1);
        g.beginPath(); g.moveTo(x * cw + gap, y * ch + ch / 2); g.lineTo(x * cw + cw - gap, y * ch + ch / 2); g.strokeStyle = 'rgba(190,220,255,.25)'; g.stroke();
      }
    }),
    mesh: canvasTex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(205,215,230,.85)'; g.lineWidth = 2;
      for (let i = -w; i < w * 2; i += 12) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + w, h); g.stroke();
        g.beginPath(); g.moveTo(i + w, 0); g.lineTo(i, h); g.stroke();
      }
    }),
    mli: canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#dfe6f0'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        g.strokeStyle = 'rgba(140,155,175,' + (0.08 + Math.random() * 0.12) + ')';
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        const x = Math.random() * w, y = Math.random() * h;
        g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 40, y + (Math.random() - .5) * 12); g.stroke();
      }
    })
  };

  /* ------------------------------------------------------------ materials */
  function M() {
    const foil = new THREE.MeshStandardMaterial({ map: TEX.foil, color: 0xffffff, metalness: .95, roughness: .34, emissive: 0x2a1c04, emissiveIntensity: .7 });
    const alu = new THREE.MeshStandardMaterial({ map: TEX.mli, color: 0xcbd4e0, metalness: .85, roughness: .38, emissive: 0x0a0f16, emissiveIntensity: .5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b323c, metalness: .8, roughness: .45, emissive: 0x05070b, emissiveIntensity: .6 });
    const black = new THREE.MeshStandardMaterial({ color: 0x15181e, metalness: .5, roughness: .6 });
    const solar = new THREE.MeshStandardMaterial({ map: TEX.solar, color: 0xffffff, metalness: .35, roughness: .3, emissive: 0x0a1c3a, emissiveIntensity: .85 });
    const mesh = new THREE.MeshStandardMaterial({ map: TEX.mesh, color: 0xd7dee8, metalness: .6, roughness: .5, transparent: true, alphaTest: .35, side: THREE.DoubleSide });
    const white = new THREE.MeshStandardMaterial({ map: TEX.mli, color: 0xffffff, metalness: .4, roughness: .55, emissive: 0x0d1219, emissiveIntensity: .5 });
    const goldTrim = new THREE.MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: .7 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 1, roughness: .12 });
    const accent = (hex) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: .85 });
    return { foil, alu, dark, black, solar, mesh, white, goldTrim, glass, accent };
  }

  /* ------------------------------------------------------------ small helpers */
  function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x || 0, y || 0, z || 0); return m; }
  function cyl(rt, rb, h, seg, mat, x, y, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat); m.position.set(x || 0, y || 0, z || 0); return m; }
  function sph(r, mat, x, y, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat); m.position.set(x || 0, y || 0, z || 0); return m; }
  function ring(r, tube, mat) { return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24), mat); }
  function dish(radius, depth, mat) {
    const g = new THREE.Group();
    const d = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat || M_shared.alu);
    d.rotation.x = Math.PI; d.scale.y = depth;
    const rim = ring(radius * 0.99, radius * 0.03, mat || M_shared.alu); rim.rotation.x = Math.PI / 2;
    const feed = cyl(radius * .05, radius * .05, radius * .55, 8, mat || M_shared.dark); feed.rotation.x = Math.PI / 2; feed.position.z = radius * .3;
    g.add(d, rim, feed);
    return g;
  }
  let M_shared = null;

  /* ============================================================ BUILDERS */

  /* --- Apollo Lunar Module descent stage: the iconic four-legged gold base */
  function buildLEM(opts) {
    opts = opts || {};
    const M = M_shared, g = new THREE.Group();
    const S = 1.0;
    // octagonal descent stage body, gold foil wrapped
    const body = cyl(1.28, 1.34, 1.15, 8, M.foil, 0, 0.15, 0);
    body.rotation.y = Math.PI / 8;
    g.add(body);
    // upper deck + equipment bay
    const deck = cyl(1.2, 1.2, 0.1, 8, M.alu, 0, 0.78, 0); deck.rotation.y = Math.PI / 8; g.add(deck);
    g.add(box(1.1, .34, .9, M.dark, 0, .95, .1));
    // the engine bell below
    const bell = cyl(.34, .52, .52, 20, M.dark, 0, -.42, 0); g.add(bell);
    const bellGlow = sph(.2, M.accent('#ff8a3c'), 0, -.66, 0); bellGlow.material.opacity = .35; g.add(bellGlow);
    // four legs + footpads + ladder
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const leg = new THREE.Group();
      const strut = cyl(.055, .07, 1.75, 8, M.alu, 0, -.85, 0);
      const pad = cyl(.3, .26, .09, 16, M.alu, 0, -1.72, 0);
      leg.add(strut, pad);
      // secondary strut
      const s2 = cyl(.035, .035, 1.2, 6, M.alu, .3, -.5, 0); s2.rotation.z = -.28; leg.add(s2);
      leg.position.set(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15);
      leg.rotation.z = Math.cos(a) * -0.18;
      leg.rotation.x = Math.sin(a) * 0.18;
      leg.rotation.y = -a;
      g.add(leg);
    }
    // ladder on the front leg
    const lad = new THREE.Group();
    for (let i = 0; i < 6; i++) { const r = cyl(.022, .022, .34, 6, M.alu, 0, -0.28 - i * 0.24, 0); r.rotation.z = Math.PI / 2; lad.add(r); }
    const r1 = cyl(.022, .022, 1.5, 6, M.alu, -.17, -0.94, 0), r2 = cyl(.022, .022, 1.5, 6, M.alu, .17, -0.94, 0);
    lad.add(r1, r2);
    lad.position.set(0, 0.15, 1.28); lad.rotation.x = -.44;
    g.add(lad);
    // plume deflectors around the engine
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const p = box(.5, .34, .04, M.foil, Math.cos(a) * .95, -.3, Math.sin(a) * .95);
      p.rotation.y = -a; g.add(p);
    }
    // antenna mast
    const mast = cyl(.03, .03, 1.1, 6, M.alu, .5, 1.1, -.2); g.add(mast);
    g.add(sph(.09, M.white, .5, 1.68, -.2));
    // the plaque on a leg
    if (opts.plaque !== false) g.add(box(.36, .22, .02, M.alu, 0, -.55, 1.32));

    // ambient dust ring so it feels placed on a surface
    const dustRing = ring(1.5, .012, M.accent(opts.accent || '#8fb4ff'));
    dustRing.rotation.x = Math.PI / 2; dustRing.position.y = -1.76; dustRing.material.opacity = .35;
    g.add(dustRing);
    g.userData.anim = (t) => { bellGlow.material.opacity = .22 + .16 * Math.sin(t * 1.6); };
    g.userData.footprint = { w: 3.1, h: 2.4, d: 3.1 };
    return g;
  }

  /* --- Lunar Roving Vehicle (Apollo 15–17) */
  function buildLRV() {
    const M = M_shared, g = new THREE.Group();
    const chassis = box(1.9, .18, .95, M.alu, 0, 0, 0); g.add(chassis);
    // wire mesh wheels (iconic)
    const wheels = [];
    const wp = [[-.95, .38, -.45], [-.95, .38, .45], [.95, .38, -.45], [.95, .38, .45]];
    wp.forEach((p) => {
      const w = new THREE.Group();
      const t = cyl(.38, .38, .22, 18, M.mesh, 0, 0, 0);
      t.rotation.x = Math.PI / 2;
      const hub = cyl(.14, .14, .24, 12, M.dark, 0, 0, 0); hub.rotation.x = Math.PI / 2;
      w.add(t, hub);
      w.position.set(p[0], p[1], p[2]);
      g.add(w); wheels.push(w);
    });
    // suspension arms
    wp.forEach((p) => {
      const a = box(.5, .06, .08, M.alu, p[0] * .55, .18, p[2] * .8); g.add(a);
    });
    // fenders
    [-.95, .95].forEach((x) => [-.45, .45].forEach((z) => {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .3, 12, 1, true, 0, Math.PI), M.alu);
      f.rotation.x = Math.PI / 2; f.rotation.z = Math.PI; f.position.set(x, .5, z);
      g.add(f);
    }));
    // seats + backrest
    const seat = box(1.5, .06, .38, M.black, .05, .38, 0); g.add(seat);
    const back = box(1.3, .34, .05, M.black, -.55, .58, 0); back.rotation.z = .18; g.add(back);
    // control console + joystick + TV camera + dish
    const cons = box(.42, .26, .38, M.dark, .85, .36, .1); g.add(cons);
    const stick = cyl(.03, .03, .34, 6, M.alu, .85, .62, -.06); g.add(stick);
    const cam = box(.16, .16, .16, M.alu, -1.0, .55, 0); g.add(cam);
    const d = dish(.42, .5, M.alu); d.position.set(-.2, .78, -.35); d.rotation.set(-.5, .4, 0); g.add(d);
    const ant = cyl(.02, .02, 1.5, 6, M.alu, -1.15, .9, .2); ant.rotation.z = .22; g.add(ant);
    // sample bags + low-gain antenna
    g.add(box(.3, .24, .24, M.white, .5, .3, -.4));
    const glow = ring(1.15, .01, M.accent('#8fb4ff')); glow.rotation.x = Math.PI / 2; glow.position.y = -.05; glow.material.opacity = .3; g.add(glow);
    wheels.forEach((w, i) => { w.rotation.z = i; });
    g.userData.anim = (t, dt) => { wheels.forEach((w, i) => { if (dt) w.rotation.y += dt * 0.15 * (1 - (i % 2)); }); };
    g.userData.footprint = { w: 3.0, h: 1.6, d: 2.6 };
    return g;
  }

  /* --- Surveyor (1966–68) */
  function buildSurveyor() {
    const M = M_shared, g = new THREE.Group();
    const body = cyl(.62, .58, .85, 12, M.white, 0, .1, 0); g.add(body);
    g.add(box(.9, .3, .9, M.dark, 0, .55, .1));               // electronics box / mast base
    // tripod legs with crushable blocks
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      const leg = new THREE.Group();
      leg.add(cyl(.045, .05, 1.5, 8, M.alu, 0, -.75, 0));
      leg.add(cyl(.16, .14, .2, 10, M.alu, 0, -1.5, 0));
      const brace = cyl(.03, .03, 1.5, 6, M.alu, .34, -.32, 0); brace.rotation.z = -.42; leg.add(brace);
      leg.position.set(Math.cos(a) * .5, .1, Math.sin(a) * .5);
      leg.rotation.z = Math.cos(a) * -.26; leg.rotation.x = Math.sin(a) * .26; leg.rotation.y = -a;
      g.add(leg);
    }
    // solar panel on top + mast + dish + camera drum
    const panel = box(1.65, .04, 1.35, M.solar, 0, .95, .05); g.add(panel);
    const mast = cyl(.03, .03, .75, 6, M.alu, -.35, 1.3, -.35); g.add(mast);
    const cam = cyl(.16, .16, .3, 14, M.dark, -.35, 1.72, -.35); cam.rotation.x = Math.PI / 2; g.add(cam);
    const d = dish(.34, .45, M.alu); d.position.set(.42, 1.25, .3); d.rotation.set(-.9, -.5, 0); g.add(d);
    const ant = cyl(.015, .015, 1.1, 5, M.alu, .5, 1.1, -.5); g.add(ant);
    // solar sensor + footpad dust
    const halo = ring(1.25, .01, M.accent('#ffd9a0')); halo.rotation.x = Math.PI / 2; halo.position.y = -1.62; halo.material.opacity = .3; g.add(halo);
    const sun = sph(.05, M.accent('#ffb44d'), .62, 1.4, -.6); g.add(sun);
    g.userData.anim = (t) => { sun.position.x = .62 + Math.sin(t * .5) * .02; };
    g.userData.footprint = { w: 2.4, h: 2.2, d: 2.4 };
    return g;
  }

  /* --- MER rover (Spirit & Opportunity) */
  function buildMER(opts) {
    opts = opts || {};
    const M = M_shared, g = new THREE.Group();
    const body = box(1.0, .42, .72, M.alu, 0, .05, 0); g.add(body);
    g.add(box(.55, .22, .6, M.white, -.1, .3, 0));                    // warm electronics box
    // solar wings (folded flat, as on the surface)
    const wL = box(.9, .03, .78, M.solar, -1.05, .3, 0); const wR = box(.9, .03, .78, M.solar, 1.05, .3, 0);
    wL.rotation.z = .04; wR.rotation.z = -.04; g.add(wL, wR);
    // rocker-bogie + 6 wheels
    const wheels = [];
    const zs = [-.44, 0, .44];
    [-1, 1].forEach((s) => {
      const bogie = box(.9, .07, .07, M.dark, s * .1, .12, .5); g.add(bogie);
      const bogie2 = box(.9, .07, .07, M.dark, s * .1, .12, -.5); g.add(bogie2);
      zs.forEach((z) => {
        const w = cyl(.24, .24, .16, 16, M.dark, s * .58, -.24, z);
        w.rotation.z = Math.PI / 2;
        const hub = cyl(.09, .09, .18, 10, M.alu, s * .58, -.24, z); hub.rotation.z = Math.PI / 2;
        g.add(w, hub); wheels.push(w);
      });
    });
    // mast with pancam + navcam
    const mast = cyl(.045, .045, .95, 8, M.alu, .3, .78, -.15); g.add(mast);
    const head = box(.42, .16, .16, M.dark, .3, 1.3, -.15); g.add(head);
    const lensL = cyl(.05, .05, .07, 10, M.glass, .3, 1.32, -.24); lensL.rotation.x = Math.PI / 2; g.add(lensL);
    const lensR = cyl(.05, .05, .07, 10, M.glass, .3, 1.32, -.06); lensR.rotation.x = Math.PI / 2; g.add(lensR);
    const lensGlow = sph(.03, M.accent(opts.accent || '#7db3ff'), .3, 1.32, -.15); lensGlow.material.opacity = .8; g.add(lensGlow);
    // robotic arm (IDD) stowed on front
    const armA = cyl(.05, .05, .5, 8, M.alu, .45, -.05, .36); armA.rotation.x = Math.PI / 2.2; g.add(armA);
    const armB = cyl(.04, .04, .34, 8, M.alu, .45, -.18, .6); g.add(armB);
    // low gain + high gain antennas
    const lga = cyl(.015, .015, .9, 5, M.alu, -.42, .7, -.25); g.add(lga);
    const d = dish(.3, .4, M.alu); d.position.set(.7, .6, .35); d.rotation.set(-.6, .5, 0); g.add(d);
    // dust ring for context
    const halo = ring(1.25, .01, M.accent(opts.accent || '#ffb44d')); halo.rotation.x = Math.PI / 2; halo.position.y = -.46; halo.material.opacity = .28; g.add(halo);
    g.userData.anim = (t) => { head.rotation.y = Math.sin(t * .3) * .5; lensL.rotation.y = head.rotation.y; lensR.rotation.y = head.rotation.y; };
    g.userData.footprint = { w: 3.0, h: 2.0, d: 2.0 };
    return g;
  }

  /* --- MSL / Mars 2020 rover (Curiosity & Perseverance) */
  function buildMSL(opts) {
    opts = opts || {};
    const M = M_shared, g = new THREE.Group();
    const body = box(1.5, .52, 1.0, M.alu, 0, .16, 0); g.add(body);
    // RTG at the back
    const rtg = cyl(.2, .2, .72, 12, M.dark, -1.0, .3, 0); rtg.rotation.z = Math.PI / 2; g.add(rtg);
    const rtgFins = [];
    for (let i = 0; i < 6; i++) { const f = box(.06, .34, .34, M.alu, -1.2 + i * .1, .3, 0); g.add(f); rtgFins.push(f); }
    // top deck gear
    g.add(box(.5, .3, .5, M.white, .1, .55, -.2));                  // MMRTG / computers
    const d = dish(.42, .5, M.alu); d.position.set(-.5, .85, .3); d.rotation.set(-.5, .4, 0); g.add(d);
    // remote sensing mast (taller than MER)
    const mast = cyl(.06, .06, 1.5, 10, M.alu, .6, 1.15, -.2); g.add(mast);
    const head = box(.5, .18, .18, M.dark, .6, 1.95, -.2); g.add(head);
    const lens = cyl(.06, .06, .08, 10, M.glass, .6, 1.97, -.3); lens.rotation.x = Math.PI / 2; g.add(lens);
    const glow = sph(.032, M.accent(opts.accent || '#7db3ff'), .6, 1.97, -.2); g.add(glow);
    // 6 big wheels + suspension
    const wheels = [];
    [-1, 1].forEach((s) => {
      [-.62, 0, .62].forEach((z) => {
        const w = cyl(.38, .38, .3, 18, M.dark, s * .82, -.34, z); w.rotation.z = Math.PI / 2;
        const cleat = cyl(.42, .42, .05, 18, M.alu, s * .82, -.34, z); cleat.rotation.z = Math.PI / 2;
        const hub = cyl(.12, .12, .34, 12, M.alu, s * .82, -.34, z); hub.rotation.z = Math.PI / 2;
        g.add(w, cleat, hub); wheels.push(w);
      });
      const arm = box(1.2, .09, .09, M.dark, s * .35, .1, .62); g.add(arm);
    });
    // robotic arm (stowed) + sample caching bits (Perseverance)
    const armA = cyl(.07, .07, .8, 8, M.alu, .62, -.1, .5); armA.rotation.x = Math.PI / 2.3; g.add(armA);
    const armB = cyl(.055, .055, .5, 8, M.alu, .62, -.34, .92); g.add(armB);
    if (opts.samples) for (let i = 0; i < 3; i++) g.add(cyl(.035, .035, .2, 8, M.white, .1 + i * .16, .62, .1));
    const halo = ring(1.75, .012, M.accent(opts.accent || '#ff8a5c')); halo.rotation.x = Math.PI / 2; halo.position.y = -.72; halo.material.opacity = .28; g.add(halo);
    g.userData.anim = (t) => { head.rotation.y = Math.sin(t * .25) * .42; lens.rotation.y = head.rotation.y; };
    g.userData.footprint = { w: 3.9, h: 2.6, d: 2.6 };
    return g;
  }

  /* --- InSight */
  function buildInSight() {
    const M = M_shared, g = new THREE.Group();
    const deck = cyl(1.0, 1.0, .22, 10, M.alu, 0, 0, 0); g.add(deck);
    // two round fan-fold solar arrays
    [-1, 1].forEach((s) => {
      const s1 = cyl(1.05, 1.05, .035, 22, M.solar, s * 1.15, .1, 0);
      const s2 = cyl(.85, .85, .035, 22, M.solar, s * 2.75, .1, 0);
      s1.scale.set(.6, 1, 1); s2.scale.set(.55, 1, 1);
      g.add(s1, s2);
    });
    // instruments: seismometer dome, wind sensor, magnetometer, heat probe
    const seis = cyl(.26, .3, .3, 16, M.white, .72, -.16, .5); g.add(seis);
    const seisDome = sph(.24, M.alu, .72, -.02, .5); g.add(seisDome);
    const boom = cyl(.02, .02, .8, 6, M.alu, -.5, .12, -.4); boom.rotation.z = .4; g.add(boom);
    g.add(sph(.14, M.white, -.85, .34, -.4));
    const hp = cyl(.045, .045, .5, 8, M.dark, .3, -.4, .78); g.add(hp);
    const hpcable = cyl(.012, .012, .7, 5, M.dark, .52, -.2, .68); hpcable.rotation.z = 1.1; g.add(hpcable);
    // robotic arm (retirement pose — reaching down)
    const a1 = cyl(.06, .06, .7, 8, M.alu, -.7, .35, .2); a1.rotation.set(.5, 0, .5); g.add(a1);
    const a2 = cyl(.05, .05, .6, 8, M.alu, -.95, .05, .45); a2.rotation.set(.9, 0, .3); g.add(a2);
    const cam = box(.16, .14, .14, M.dark, .62, .34, .42); g.add(cam);
    const glow = sph(.03, M.accent('#ffb44d'), 0, .18, .2); g.add(glow);
    g.userData.anim = (t) => { glow.material.opacity = .4 + .3 * Math.sin(t * .9); };
    g.userData.footprint = { w: 4.2, h: 1.6, d: 2.4 };
    return g;
  }

  /* --- Phoenix */
  function buildPhoenix() {
    const M = M_shared, g = new THREE.Group();
    const deck = cyl(.92, .92, .24, 8, M.alu, 0, 0, 0); deck.rotation.y = Math.PI / 8; g.add(deck);
    // two round solar arrays (like InSight's, but the earlier design)
    [-1, 1].forEach((s) => {
      const s1 = cyl(.95, .95, .04, 20, M.solar, s * 1.05, .14, 0); s1.scale.set(.62, 1, 1); g.add(s1);
      const s2 = cyl(.8, .8, .04, 20, M.solar, s * 2.5, .14, 0); s2.scale.set(.55, 1, 1); g.add(s2);
    });
    // mast + camera + meteorological boom
    const mast = cyl(.05, .05, 1.15, 8, M.alu, -.2, .7, 0); g.add(mast);
    const cam = box(.22, .2, .2, M.alu, -.2, 1.3, 0); g.add(cam);
    const lens = cyl(.05, .05, .06, 10, M.glass, -.2, 1.3, .12); lens.rotation.x = Math.PI / 2; g.add(lens);
    const met = cyl(.02, .02, .9, 6, M.alu, .5, 1.1, 0); g.add(met);
    g.add(sph(.08, M.white, .5, 1.6, 0));
    // robotic arm with scoop, reaching down
    const a1 = cyl(.055, .055, .8, 8, M.alu, .55, -.35, .35); a1.rotation.set(.4, 0, -.35); g.add(a1);
    const scoop = box(.22, .12, .26, M.alu, .3, -.75, .55); g.add(scoop);
    g.add(box(.4, .18, .3, M.white, -.55, .3, .1));
    const halo = ring(1.1, .01, M.accent('#9fd0ff')); halo.rotation.x = Math.PI / 2; halo.position.y = -.2; halo.material.opacity = .28; g.add(halo);
    g.userData.anim = (t) => { cam.rotation.y = Math.sin(t * .3) * .35; };
    g.userData.footprint = { w: 3.8, h: 1.8, d: 2.2 };
    return g;
  }

  /* --- Viking lander */
  function buildViking() {
    const M = M_shared, g = new THREE.Group();
    const body = box(1.5, .95, 1.5, M.white, 0, .1, 0); g.add(body);
    // three legs
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3 + Math.PI / 6;
      const leg = new THREE.Group();
      leg.add(cyl(.07, .08, 1.5, 8, M.alu, 0, -.75, 0));
      leg.add(cyl(.22, .2, .12, 12, M.alu, 0, -1.5, 0));
      const brace = cyl(.04, .04, 1.2, 6, M.alu, .42, -.3, 0); brace.rotation.z = -.45; leg.add(brace);
      leg.position.set(Math.cos(a) * .72, .1, Math.sin(a) * .72);
      leg.rotation.z = Math.cos(a) * -.2; leg.rotation.x = Math.sin(a) * .2; leg.rotation.y = -a;
      g.add(leg);
    }
    // S-band dish on the deck
    const d = dish(.72, .5, M.alu); d.position.set(-.2, 1.15, 0); d.rotation.x = -1.1; g.add(d);
    // biology instrument boom + sampler arm
    const boom = cyl(.045, .045, 1.5, 8, M.alu, .95, .75, -.2); boom.rotation.z = -.9; g.add(boom);
    const arm = cyl(.05, .05, 1.9, 8, M.alu, .05, -.5, .95); arm.rotation.set(.75, 0, 0); g.add(arm);
    const scoop = box(.2, .1, .16, M.alu, .05, -1.05, 1.55); g.add(scoop);
    // RTG shroud + meteorology boom
    g.add(box(1.2, .5, .5, M.black, 0, .82, .2));
    const met = cyl(.02, .02, 1.0, 6, M.alu, -1.0, 1.5, .4); g.add(met);
    g.add(sph(.09, M.white, -1.0, 2.0, .4));
    const light = sph(.05, M.accent('#ffb44d'), .4, 1.5, .3); g.add(light);
    const halo = ring(1.4, .012, M.accent('#ffb44d')); halo.rotation.x = Math.PI / 2; halo.position.y = -1.56; halo.material.opacity = .3; g.add(halo);
    g.userData.anim = (t) => { light.material.opacity = .35 + .35 * Math.abs(Math.sin(t * .7)); };
    g.userData.footprint = { w: 3.0, h: 2.6, d: 3.0 };
    return g;
  }

  /* --- Ingenuity helicopter */
  function buildIngenuity() {
    const M = M_shared, g = new THREE.Group();
    const fus = box(.62, .28, .5, M.foil, 0, .32, 0); g.add(fus);
    g.add(box(.5, .12, .4, M.black, 0, .16, 0));                        // battery + avionics
    // solar panel on top
    const panel = box(.66, .03, .52, M.solar, 0, .5, 0); g.add(panel);
    // four legs with feet
    [[-.42, -.3], [.42, -.3], [-.42, .3], [.42, .3]].forEach((p) => {
      const leg = cyl(.022, .022, .55, 6, M.alu, p[0], .02, p[1]);
      leg.rotation.z = p[0] > 0 ? .22 : -.22; leg.rotation.x = p[1] > 0 ? -.2 : .2;
      g.add(leg);
      const foot = cyl(.07, .05, .05, 10, M.black, p[0] * 1.14, -.26, p[1] * 1.14); g.add(foot);
      const strut = cyl(.015, .015, .5, 5, M.alu, p[0] * .7, .1, p[1] * .7); strut.rotation.z = .5; g.add(strut);
    });
    // mast + antenna
    const mast = cyl(.02, .02, .34, 6, M.alu, .18, .6, -.14); g.add(mast);
    g.add(sph(.05, M.white, .18, .78, -.14));
    const ant = box(.06, .22, .12, M.dark, -.3, .42, .1); g.add(ant);
    // rotors: two counter-rotating pairs on a mast
    const rotors = [];
    [.06, -.06].forEach((dz, i) => {
      const hubY = .92 + i * .1;
      const r = new THREE.Group();
      r.position.set(0, hubY, dz);
      for (let b = 0; b < 2; b++) {
        const blade = box(1.05, .012, .075, M.dark, Math.cos(b * Math.PI) * .53, 0, 0);
        const blade2 = box(1.05, .012, .075, M.dark, -Math.cos(b * Math.PI) * .53, 0, 0);
        r.add(blade, blade2);
      }
      const cap = cyl(.05, .05, .12, 8, M.alu, 0, 0, 0); r.add(cap);
      g.add(r); rotors.push(r);
    });
    // the swashplate tower
    g.add(cyl(.035, .035, .38, 6, M.alu, 0, .74, 0));
    const glow = sph(.045, M.accent('#7db3ff'), 0, .34, -.26); g.add(glow);
    const broken = new THREE.Group();                                  // the wound: a stub of rotor blade
    broken.position.set(.5, .92, .06); broken.rotation.set(.2, .5, -.4);
    broken.add(box(.3, .01, .07, M.dark, .1, 0, 0));
    g.add(broken);
    g.userData.anim = (t, dt) => {
      rotors[0].rotation.y += (dt || .016) * 0;                         // grounded: blades are still
      broken.rotation.z = -.4 + Math.sin(t * .8) * .03;
      glow.material.opacity = .3 + .3 * Math.abs(Math.sin(t * .6));
    };
    g.userData.footprint = { w: 2.2, h: 1.6, d: 2.2 };
    return g;
  }

  /* --- Voyager (deep space: bus, big dish, booms, RTGs) */
  function buildVoyager() {
    const M = M_shared, g = new THREE.Group();
    const bus = cyl(.72, .72, .5, 12, M.white, 0, 0, 0); bus.rotation.x = Math.PI / 2; g.add(bus);
    const dishMesh = dish(1.5, .34, M.white);
    dishMesh.position.set(0, 0, .45); dishMesh.rotation.y = Math.PI;
    g.add(dishMesh);
    // science boom
    const boom = cyl(.055, .055, 2.4, 8, M.alu, -1.2, -.1, -.2); boom.rotation.z = Math.PI / 2 + .12; g.add(boom);
    [-1.9, -.9, .1].forEach((x, i) => g.add(sph(.09 + i * .02, M.dark, x, -.28 + i * .03, -.2)));
    // RTG boom with three generators
    [.55, .95, 1.35].forEach((x, i) => {
      const rtg = cyl(.16, .16, .5, 10, M.black, x, -.05, .55 - i * .06);
      rtg.rotation.z = Math.PI / 2; g.add(rtg);
      const fin = cyl(.26, .26, .03, 12, M.alu, x + .2, -.05, .55 - i * .06); fin.rotation.z = Math.PI / 2; g.add(fin);
    });
    // magnetometer boom + Golden Record
    const mag = cyl(.02, .02, 2.0, 5, M.alu, -1.0, .6, .3); mag.rotation.z = 1.15; g.add(mag);
    const rec = cyl(.24, .24, .012, 24, M.foil, -.35, .62, .9); rec.rotation.x = Math.PI / 2; g.add(rec);
    const glow = ring(1.55, .012, M.accent('#c4b5fd')); glow.rotation.x = Math.PI / 2; glow.material.opacity = .3; g.add(glow);
    g.userData.anim = (t) => { g.rotation.y = Math.sin(t * .1) * .06; };
    g.userData.footprint = { w: 3.4, h: 3.4, d: 3.4 };
    return g;
  }

  /* --- Mars Pathfinder lander + Sojourner */
  function buildPathfinder() {
    const M = M_shared, g = new THREE.Group();
    const base = cyl(1.0, 1.05, .22, 8, M.alu, 0, 0, 0); base.rotation.y = Math.PI / 8; g.add(base);
    // four unfolded petals
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const p = box(.95, .04, .95, M.solar, Math.cos(a) * 1.4, .14, Math.sin(a) * 1.4);
      p.rotation.y = -a;
      p.rotation.z = .06 * Math.cos(a);
      g.add(p);
    }
    // central mast + instruments + camera
    const mast = cyl(.05, .05, .9, 8, M.alu, .25, .6, -.2); g.add(mast);
    const cam = box(.22, .18, .18, M.alu, .25, 1.1, -.2); g.add(cam);
    const d = dish(.3, .4, M.alu); d.position.set(-.35, .8, .3); d.rotation.set(-.6, .4, 0); g.add(d);
    const met = cyl(.02, .02, 1.2, 5, M.alu, .7, 1.2, .2); g.add(met);
    // ramps
    [-1, 1].forEach((s) => { const r = box(.56, .03, .5, M.alu, s * .95, -.06, 0); g.add(r); });
    g.add(box(.5, .2, .34, M.white, -.2, .3, .2));
    // Sojourner, parked beside
    const soj = new THREE.Group();
    soj.position.set(.95, -.1, -.75);
    const sb = box(.5, .22, .38, M.alu, 0, .1, 0); soj.add(sb);
    soj.add(box(.72, .02, .5, M.solar, 0, .25, 0));
    [[-.3, -.2], [.3, -.2], [-.3, .2], [.3, .2]].forEach((p) => {
      const w = cyl(.13, .13, .1, 12, M.dark, p[0], -.08, p[1]); w.rotation.z = Math.PI / 2; soj.add(w);
    });
    soj.add(cyl(.02, .02, .4, 5, M.alu, .2, .45, -.15));
    soj.add(sph(.05, M.accent('#7db3ff'), .2, .68, -.15));
    g.add(soj);
    const halo = ring(1.9, .012, M.accent('#ff8a5c')); halo.rotation.x = Math.PI / 2; halo.position.y = -.14; halo.material.opacity = .28; g.add(halo);
    g.userData.anim = (t) => { cam.rotation.y = Math.sin(t * .35) * .4; };
    g.userData.footprint = { w: 4.2, h: 2.0, d: 4.2 };
    return g;
  }

  /* ------------------------------------------------------------ registry */
  const BUILDERS = {
    lem: buildLEM,
    lemlrv: (o) => {                                    // Apollo 15–17: descent stage + parked rover
      const g = new THREE.Group();
      const lm = buildLEM(o);
      lm.scale.setScalar(.82); lm.position.set(-.55, .1, 0);
      const lrv = buildLRV();
      lrv.scale.setScalar(.78); lrv.position.set(1.6, -.75, .1); lrv.rotation.y = -.5;
      g.add(lm, lrv);
      g.userData.anim = (t, dt) => { lm.userData.anim(t, dt); lrv.userData.anim(t, dt); };
      g.userData.footprint = { w: 5.4, h: 2.6, d: 3.6 };
      return g;
    },
    lrv: buildLRV,
    surveyor: buildSurveyor,
    mer: buildMER,
    msl: buildMSL,
    insight: buildInSight,
    phoenix: buildPhoenix,
    viking: buildViking,
    ingenuity: buildIngenuity,
    voyager: buildVoyager,
    pathfinder: buildPathfinder
  };

  LB.hw = {
    TEX,
    initMaterials() { M_shared = M(); return M_shared; },
    build(modelId, opts) {
      if (!M_shared) this.initMaterials();
      const fn = BUILDERS[modelId] || BUILDERS.mer;
      const g = fn(opts || {});
      g.userData.modelId = modelId;
      return g;
    },
    list() { return Object.keys(BUILDERS); }
  };
})();
