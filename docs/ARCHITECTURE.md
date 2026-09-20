# البنية التقنية / Architecture

```
src/main/                Electron main process (Node.js, CommonJS)
  main.js                window, menu, workspace init, license status, updater, IPC registration
  preload.js             contextBridge: window.api.invoke(channel, payload) / on(event)
  ipc/index.js           all IPC handlers with role checks ({ok,data}|{ok:false,error})
  services/store.js      one-JSON-file-per-record store (safe on shared network folders)
  services/auth.js       users, scrypt password hashing, roles, sessions, CSV import
  services/license.js    Ed25519 license issue/verify (offline), machine id formatting
  services/exams.js      exam templates, attempts, grading, statistics
  services/question-generator.js  questions generated from real plant data (seeded RNG)
  services/exporter.js   CSV (BOM), JSON, HTML, PDF (printToPDF) exports
  services/updater.js    electron-updater (GitHub Releases or generic HTTPS feed)
  services/settings.js   per-installation settings
src/renderer/            UI (vanilla ES modules bundled by esbuild into dist/bundle.js)
  js/app.js              boot flow (activation → setup → login → shell), hash router, sidebar
  js/i18n.js             Arabic/English dictionary, RTL switching
  js/pages/*             one module per screen (dashboard, plants, plant, twin, exams, results, admin-*)
  js/twin/engine.js      simulation engine (thermal/PV/CSP/wind/hydro/nuclear)
  js/twin/solar.js       NOAA solar position, clear-sky irradiance
  js/twin/scenes.js      composeScene(): technology layout + site (fence, roads, admin, transmission line) baked into few meshes; TwinScene: renderer, sky, lights, terrain, sea, day/night
  js/twin/lib/textures.js   procedural canvas textures (sand, cladding, facades, PV cells, water normals…)
  js/twin/lib/materials.js  shared PBR materials (metre-based tiling), night-window emissive, anti-tiling ground shader
  js/twin/lib/primitives.js box/cyl/tube helpers, instancing, static-geometry baking, labels, plumes
  js/twin/lib/components.js parametric plant components (stack, cooling towers, boiler, GT package, HRSG, tanks, transformer, switchyard, pylons, nuclear unit, wind turbine, dam, barrage…)
  js/twin/lib/builders.js   per-technology layouts scaled by capacity/units (steam, CCGT, OCGT, diesel, nuclear, PV, CSP trough/tower, wind, hydro dam/run-of-river)
  js/twin/lib/env.js        physical sky (three.js Sky), sun/hemisphere lighting with shadows, terrain relief by biome, sea plane
  js/lib/map.js          offline SVG map (Natural Earth) with pan/zoom
  js/lib/charts.js       Chart.js wrappers; js/lib/report.js printable reports (Asfan footer)
  js/lib/brand.js        Asfan Co. signature: footer on every screen, mailto/WhatsApp links, About card, manual buttons
data/                    plants, countries, complexes, technologies, questions, map (+ sources/)
scripts/                 build-dataset, build-map, build-renderer (esbuild), make-icons, check-syntax, check-release
tools/license-cli/       vendor tool (keygen, issue, verify); dev-keys committed, prod keys git-ignored
tools/manual/            capture.cjs (Playwright screenshot tour of every screen, AR+EN, seeded data) + build.cjs (HTML → PDF); content-ar/en.cjs
docs/manual/             generated user manuals (PDF) shipped as extraResources → resources/manual, opened via app:openManual
test/                    node:test suites (store, auth, license, exams/generator, dataset, csv)
.github/workflows/       ci.yml (lint+test+bundle), release.yml (Windows NSIS build → GitHub Release)
```

## Security model
- Renderer runs sandboxed with `contextIsolation`, no Node integration, strict CSP; it only talks to the main process through whitelisted IPC channels.
- Every handler re-checks the session role (`superadmin > instructor > student`). Students never receive correct answers before submission.
- Passwords: scrypt (N=16384) with per-user salt. License keys: Ed25519 signatures; the app embeds only the public key.
- No telemetry; the only network access is the update check.

## Simulation model (summary)
- Sun position from plant coordinates and simulated UTC time (NOAA), clear-sky GHI (Haurwitz) and DNI (Meinel) with cloud/dust attenuation.
- PV: temperature coefficient −0.35 %/°C (NOCT model), soiling accumulation and cleaning, DC/AC ratio 1.25, curtailment setpoint.
- CSP: solar field thermal power with solar multiple, molten-salt storage charge/discharge, power-block efficiency (tower 40 %, trough 37 %).
- Wind: Ornstein–Uhlenbeck turbulence, cubic power curve between cut-in 3 m/s and rated 12 m/s, cut-out 25 m/s with hysteresis.
- Hydro: P = ρgQHη, reservoir mass balance with inflow, head depending on level, spilling.
- Thermal: unit state machine (off/starting/on/stopping/trip), min load, ramp limits, ambient derating for gas turbines, part-load efficiency, fuel LHV and CO₂ factors, vibration random walk with alarm/trip thresholds, random protection trips.
- Grid: first-order frequency response to generation/demand imbalance with diurnal demand profile.
