/* ==========================================================================
   ABANDONED BUT NOT FORGOTTEN — the long timeline
   Sixty years of hardware, one spine that fills as you read.
   ========================================================================== */
(function () {
  'use strict';
  const LB = (window.LB = window.LB || {});
  const U = LB.util;

  LB.register({
    name: 'timeline',
    init() {
      const section = document.getElementById('timeline');
      const track = document.getElementById('timeline-track');
      if (!section || !track) return;

      const items = LB.data.timeline || [];
      const spine = section.querySelector('[data-timeline-fill]');
      const knob = section.querySelector('[data-timeline-knob]');

      track.innerHTML = items.map((it, i) => {
        const objs = (it.objects || []).map((id) => {
          const o = LB.data.byId(id);
          if (!o) return '';
          const st = LB.data.STATUS[o.status];
          return '<button class="tl-chip" data-object="' + o.id + '"><span class="obj-dot" style="background:' + st.color + '"></span>' + o.short + '</button>';
        }).join('');
        const kind = it.kind || 'first';
        return '<li class="tl-item tl-item--' + kind + '" data-reveal>' +
          '<div class="tl-marker"><span></span></div>' +
          '<div class="tl-year mono">' + it.year + '</div>' +
          '<div class="tl-body">' +
          '<h3 class="tl-title">' + (it.title || it.label) + '</h3>' +
          '<p class="tl-text">' + (it.text || it.sub) + '</p>' +
          (objs ? '<div class="tl-chips">' + objs + '</div>' : '') +
          '</div></li>';
      }).join('');

      /* Light each entry as it reaches the reading line — position based, so a
         jump from the nav or a Page Down still wakes every entry up.
         The entry tops are measured once (and again on resize) rather than
         sixteen times a second, which keeps the scroll free of forced layouts. */
      const entries = U.$$('.tl-item', track);
      const dom = LB.dom;
      let lit = -1, sinceLit = 0, tops = [];
      function measure() {
        const y = window.pageYOffset || document.documentElement.scrollTop || 0;
        tops = entries.map((e) => e.getBoundingClientRect().top + y);
      }
      function light() {
        const line = window.innerHeight * 0.74 + (window.pageYOffset || 0);
        let highest = -1;
        for (let i = 0; i < tops.length; i++) if (tops[i] < line) highest = i;
        if (highest > lit) {
          for (let i = lit + 1; i <= highest; i++) dom.cls(entries[i], 'is-near', true);
          lit = highest;
        }
      }
      LB.Scroll.watch(section);
      LB.Scroll.watch(track);
      LB.Scroll.onResize(() => { lit = -1; measure(); light(); });
      measure();
      light();

      let shown = 0;
      this.update = (t, dt, S) => {
        const r = S.rectOf(section);
        if (r.bottom < -80 || r.top > innerHeight + 80) return;
        const prog = S.progress(section);
        sinceLit += dt;
        if (sinceLit > 0.16) { sinceLit = 0; light(); }
        shown = U.damp(shown, U.range(prog, 0.06, 0.9), 6, dt);
        if (spine) dom.sy(spine, shown);
        if (knob) {
          dom.op(knob, U.range(prog, 0.02, 0.12));
          const rect = S.rectOf(track);
          const y = U.clamp((innerHeight * 0.5 - rect.top) / Math.max(1, rect.height), 0, 1);
          dom.st(knob, 'top', (y * 100).toFixed(2) + '%');
        }
      };

      if (spine) spine.style.transformOrigin = 'top';
    }
  });
})();
