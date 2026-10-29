# Abandoned but not Forgotten

**A 3D storytelling site built for the 2026 NASA Space Apps Challenge.**

The challenge: *“Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment
on the Moon and Mars”* — tell the story of the hardware NASA has left across the solar
system, and introduce school-age space fans to the machines and the science they made
possible.

This build answers it with eighteen machines (six on the Moon, ten on Mars, two still
flying out of the solar system), a lightweight 3D flight from Earth out to Mars, a museum
of 3D hardware you can turn in your hands, a globe explorer that flies to real landing
coordinates, a listening room where you can play a Marsquake and wait out a Voyager
command, and a catalogue where every fact links to NASA.

---

## Run it

No build step, no dependencies, no network at runtime.

```bash
cd leftbehind
python3 serve.py            # http://localhost:8080
python3 serve.py 9000       # or any other port
```

Opening `index.html` straight from the filesystem also works in most browsers, but a
local server is better: the surface maps are loaded as textures and some browsers treat
`file://` images as cross-origin.

**Home:** `index.html` · **Catalogue:** `catalog.html` · **About & sources:** `about.html`
· **Printable QR poster:** `qr/spaceapps-poster.html` (A4 render: `qr/spaceapps-poster.pdf`)

The poster carries a QR code to the official challenge page, baked in as inline SVG, so it
opens and prints offline. Regenerate it for any URL with:

```bash
python3 qr.py                                     # the official 2026 challenge page
python3 qr.py https://your-deployment.example     # your own link
```

`segno` is needed only for that build step — the site itself never depends on it.

---

## What is in the story

| World | Machines |
| --- | --- |
| The Moon (6) | Surveyor 1, Surveyor 3, Apollo 11 “Eagle” descent stage, Apollo 12 “Intrepid”, Apollo 15 “Falcon” + LRV‑1, Apollo 17 “Challenger” + LRV‑3 |
| Mars (10) | Viking 1, Viking 2, Pathfinder + Sojourner, Spirit, Opportunity, Phoenix, InSight, Ingenuity, Curiosity, Perseverance |
| Deep space (2) | Voyager 1, Voyager 2 |

Status spread: **14 silent or out of power · 2 still working · 2 still flying.**

---

## The six things to try

1. **Follow the hero.** Balanced mode keeps the Earth–Moon–Mars flight as a low-load 3D
   keyframe story: the text stays scroll-linked, while the WebGL canvas updates only at
   spaced waypoints. Calm freezes the canvas completely; the nav button switches between
   those two lightweight modes.
2. **Walk the artifact hall.** Six machines on lit pedestals in a dark museum. Balanced
   mode shows one detailed machine at a time; drag it to turn it, or switch machines by
   scrolling. This keeps the normal view to about 50 draw calls instead of ~190.
3. **Land somewhere.** The globe explorer carries the documented landing / final-rest
   coordinates; clicking a marker flies the camera down on an arc and prints the distance
   from Earth and today's radio delay, computed in the browser.
4. **Listen.** Play InSight's Sol 1222 marsquake, stream Ingenuity's final downlink from
   Valinor Hills, or send a command to Voyager 1 and wait out the light-time.
5. **Read the catalogue.** Search and filter all eighteen machines; each story opens in a
   modal with the machine spinning in 3D, its science, what it left behind, and its NASA
   sources.
6. **Check the maths.** Every figure in the About page is labelled *real*, *measured live*
   or *drawn* — nothing is quietly invented.

---

## Layout

```
leftbehind/
├── index.html            the story: flight → hall → explorer → listening room → timeline → why → glossary → CTA
├── catalog.html          18 machines, search/filter, story modal
├── about.html            the brief, how it was built, sources, FAQ
├── css/
│   ├── main.css          design system (console panels, type, nav, loader, cards, reveals)
│   └── components.css    hero stack, hall, explorer, listening room, timeline, modal, glossary
├── js/
│   ├── core.js           module registry, single rAF loop, scroll driver, pointer, light-time maths
│   ├── data.js           the catalogue — 18 objects, coordinates, stats, NASA sources, timeline, glossary
│   ├── hw.js             procedural hardware: 16 Three.js builders (LEM, LRV, Surveyor, MER, MSL, InSight, Phoenix, Viking, Ingenuity, Voyager, Pathfinder)
│   ├── artifacts.js      the artifact hall + the reusable mini 3D viewer used by every story modal
│   ├── journey.js        the scroll-scrubbed flight
│   ├── globes.js         the globe explorer (markers, fly-to arcs, deep-space diagram)
│   ├── signal.js         the listening room (marsquake, final downlink, Voyager round trip)
│   ├── timeline.js       the 1966 → today timeline
│   └── pages.js          readiness contract, loader, reveals, nav, catalogue, modal, live readouts
├── assets/textures/      Moon, Mars and Earth surface maps (5 files, 936 KB total)
├── vendor/three.min.js   Three.js r128 (MIT)
├── qr.py                 regenerates the QR poster (build-time only; needs `segno`)
├── qa/                   acceptance suite, its README, and reference screenshots
└── serve.py              tiny threaded local server
```

Roughly 5,000 lines of hand-written HTML, CSS and JavaScript, plus the vendored library.

---

## Technical notes

- **Vanilla JS + Three.js r128, no framework, no bundler.** One budgeted `requestAnimationFrame`
  loop in `core.js` drives every module through `LB.register({ name, init, update })`.
  It stops in background tabs; static scenes render on demand instead of repainting at 60 fps.
- **Readiness contract.** Every module with async work calls `LB.assets.expect(name)` and
  reports back with `done()` / `texturesDone()`. The loader mirrors that progress and has
  a safety net: it lifts at 3 s if all but one module is ready, and unconditionally at
  11 s, so a visitor can never be trapped behind it.
- **No mid-scroll resolution changes.** The engine uses stable quality presets so a
  device-pixel-buffer reallocation never lands on a scroll frame. Balanced renders below
  native DPR, caps scene updates at 30 fps, and leaves the canvases still between keyframes
  and user interactions. Calm freezes the remaining waypoints and caps at 20 fps.
- **Light-time is computed, not quoted.** `LB.space` carries mean orbital elements for
  Earth and Mars, solves Kepler's equation and returns today's Earth–Mars distance, which
  drives every radio-delay readout. Good to about 1%.
- **Wall-clock pacing.** The Ingenuity downlink and the Voyager round trip advance on
  `performance.now()` rather than accumulated frame time, so they keep true time even on a
  slow device.
- **Nothing loads from the network at runtime.** Three.js is vendored, textures ship with
  the site, the QR is baked in as inline SVG, and the font is a system stack. The build works
  offline on a school laptop.
- **Motion control.** The nav button cycles Balanced / Calm and remembers the
  choice. `prefers-reduced-motion` starts in Calm. Balanced disables perpetual spin,
  parallax, ticker motion and reveal transitions; only user actions and coarse hero
  waypoints redraw 3D. Calm freezes the remaining waypoints and uses a 20 fps budget.
- **Accessibility.** The catalogue, filters, modals (Esc, ←/→) and listening room are
  keyboard operable; there is a WebGL fallback that keeps all text readable, and the
  stories are written in short sentences with an eight-term glossary.
- **Performance.** On the same headless SwiftShader scroll harness (1600×900, DPR 2),
  Balanced completes a full-page scroll in **7.6 s** with **5.7%** of sampled frame gaps
  over 50 ms. Calm further lowers the render/update budget on slower devices.

---

## The maths, the maps and what is drawn

| Thing | Status |
| --- | --- |
| Coordinates, dates, mission statistics, mission status | **Real** — NASA mission pages, NSSDC, NASA fact sheets (linked in every story) |
| Earth–Mars distance and radio light-time | **Computed live** in your browser from simplified JPL mean orbital elements |
| Earth–Moon distance | Mean value (384,400 km); the real distance varies by ±20,000 km over a month |
| Sol 1222 marsquake trace | **Synthetic** — shaped to match the real event's structure (P-wave, S-wave, surface waves) |
| Ingenuity's final downlink log | **Dramatised** from the real final sols; not a verbatim transcript |
| Hardware models | **Procedural approximations** in Three.js — recognisable, not engineering drawings |
| Moon / Mars / Earth surface maps | Solar System Scope, CC BY 4.0, resized and recompressed for the web |

Not affiliated with or endorsed by NASA. Built as a challenge entry.

---

## Testing

`qa/e2e.js` is a Puppeteer acceptance suite covering boot and offline isolation, the
scroll-scrubbed flight, the hall (including drag), the globe explorer (including a real
raycast-driven marker click), the listening room, the timeline and story modal, the
catalogue filters, the About page, mobile layout, reduced motion and content integrity.

```bash
cd qa
npm i puppeteer
python3 ../serve.py &          # serve from the project root
node e2e.js                    # BASE=http://... CHROME=/path/to/chrome to override
```

Last run: **96 passed, 0 failed, 0 warnings.** Screenshots land in `qa/shots/`.

---

## Credits

- Surface maps: [Solar System Scope](https://www.solarsystemscope.com/textures/) — CC BY 4.0
- Three.js — MIT
- Challenge brief: [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/)
- Hardware models, diagrams, interface and all text: written for this entry
