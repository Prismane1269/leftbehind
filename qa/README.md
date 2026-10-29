# QA — acceptance suite for “Abandoned but not Forgotten”

`e2e.js` drives a real Chrome through the whole site and asserts **96 checks** across
eleven sections. It also verifies the lightweight Balanced default, the Calm toggle, and
that the internal Full path still restores the cinematic fly-through. The suite is regression
cover if the site is edited.

## Run it

```bash
# 1. serve the project root (threaded — it serves 5 textures + 6 modules at once)
cd ..
python3 serve.py 8080 &

# 2. run the suite
cd qa
npm i puppeteer          # downloads its own Chrome
node e2e.js
```

Overrides:

| variable | default | meaning |
| --- | --- | --- |
| `BASE` | `http://127.0.0.1:8080` | where the site is served |
| `CHROME` | puppeteer's own Chrome | browser binary |
| `SHOTS` | `qa/shots` | where screenshots are written |

Exit code is `0` when everything passes; failures are listed at the end and written to
`results.json`.

## What it covers

| § | Section | Representative checks |
| --- | --- | --- |
| A | **Boot** | loader lifts, boot under 9 s, *no request leaves the machine*, all 5 surface maps, Three.js r128, 6 modules, 4 scenes built, Balanced is the 30 fps / sub-1x default, readiness contract satisfied, geometry drawn, zero page errors, zero failed requests |
| B | **The flight** | hero readable, no beat intrudes, live readout populated, Balanced repaints only at coarse 3D keyframes, internal Full test restores the camera fly-through, each beat takes its turn **one at a time**, reaches Mars, HUD advances |
| C | **Artifact hall** | 6 plinths, scroll walks the hall (01 → 06), one detailed model rendered at a time, per-machine specs and status tag, **drag turns the machine in front of you** (Δrad asserted), model geometry drawn |
| D | **Globe explorer** | Moon list = 6, Mars list = 10, choosing a machine updates the card, coordinates to 3 decimals, live distance + light-time, **real raycast-driven click on a marker selects that machine**, fly-to runs, deep-space diagram has both Voyagers, search narrows the list |
| E | **Listening room** | marsquake plays (clock advances), seismogram pixels actually painted, magnitude + quake count live, mode switch changes the 3D stage, downlink streams and logs arrive in order, Voyager command starts its journey with a sane hour count and draws DSN progress |
| F | **Timeline + modal** | 16 dated entries, 24 machine chips, spine fills with scroll, entries light up, knob visible, chip opens the modal, modal spins the machine in 3D, facts/science/sources present, arrow keys step, Escape closes and unlocks, deep link `#machine-insight` opens straight into a story |
| G | **Catalogue** | 18 cards, interactive in ~1.2 s, Moon filter = 6, “still answering” = 4, search finds the helicopter, empty search explains itself, card opens the 3D story |
| H | **About** | 18 source links, 5 FAQ items open on click, live readouts, current footer year |
| I | **Mobile** (390×844) | no horizontal overflow, hero intact, blocks fit, menu opens, hall panel readable, explorer usable |
| J | **Preferences** | reduced-motion still gets the whole site, ticker stops, WebGL fallback message exists |
| K | **Content integrity** | all 18 objects present, every one cites NASA over https, every story long enough yet short-sentenced, all surface machines have coordinates, status spread 14/2/2, glossary/gallery/timeline stocked |

## Reference screenshots (`shots/`, 1280×720)

| file | what it shows |
| --- | --- |
| `01-hero.png`, `01b-hero-clean.png` | the hero over Earth before and after the loader clears |
| `02-flight-moon.png`, `03-flight-mars.png` | mid-flight: the Moon flyby and the Mars leg |
| `04-hall.png` | the artifact hall with a machine on its pedestal |
| `05-explorer-moon.png`, `06-explorer-mars.png`, `07-explorer-deep.png` | the globe explorer on all three worlds + the deep-space diagram |
| `08-signal-quake.png`, `09-signal-ingenuity.png`, `10-signal-voyager.png` | the three listening-room modes |
| `11-timeline.png` | the 1966 → today timeline |
| `12-modal.png` | a story modal with the machine in 3D |
| `13-catalog.png` | the catalogue |
| `14-about.png` | the About page (brief, build notes, sources) |
| `15-mobile-hero.png`, `16-mobile-hall.png`, `17-mobile-explorer.png` | phone layout |

## Notes for anyone re-running this

- **Headless SwiftShader is a software renderer.** Balanced keeps it at a 30 fps update
  budget and avoids repainting the hero on every wheel tick. On a 1600×900 / DPR-2 scroll
  run it completed the full page in 7.6 s with 5.7% of frame gaps over 50 ms. Full is an
  internal test mode with more continuous motion; use Balanced for the normal acceptance run.
- The suite forces `document.documentElement.style.scrollBehavior = 'auto'` and waits a
  couple of animation frames before sampling scroll-driven values — otherwise you sample
  mid-animation and see half-finished transitions.
- Text elements that fade between machines are allowed 130–190 ms to swap; the suite waits
  for the real DOM opacity rather than racing the transition.
- Two timers deliberately run on **wall-clock** time (`performance.now()`), not accumulated
  frame time, so their assertions stay true on slow machines: the Ingenuity downlink and
  the Voyager round trip.
