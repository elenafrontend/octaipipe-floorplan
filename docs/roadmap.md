# roadmap.md — Data Centre Floorplan Viewer

> Phase 5 (Roadmap) output. Implementation broken into ordered, feature-sliced stages.
> Vertical slices: each stage ends in something visible. Coordinate core (the primary
> quality bar) is pinned with tests up front, before any UI.

## Conventions

- **Workflow:** GitHub Flow — `main` stays green; each stage on a short-lived `feat/…`
  branch, merged via PR (no squash, so staged commits stay visible).
- **Commits:** Angular — `type(scope): subject`. Types: `feat`, `fix`, `refactor`,
  `chore`, `docs`, `test`, `style`, `perf`.
- **Testing:** TDD where tests earn their keep. Three spec-test targets, one per relevant
  stage: model↔screen conversion (S1), selection/polling (S4), interaction path (S5).

---

## Stage 0 — Scaffold + structure + README skeleton
Branch: `feat/scaffold`

Tooling only + proof the skeleton conducts current from `core` to screen.

- `chore(app)`: scaffold Vite + React 19 + TS
- `chore(app)`: set up Vitest + Testing Library
- `chore(app)`: configure ESLint + Prettier + react-hooks
- Folder structure from architecture.md: `core/ modules/{floorplan,sensors}/ app/`
  with `index.ts` barrels
- Smoke slice: `core` exports `Point` → `app` renders `<svg>` with one hardcoded circle;
  one trivial Vitest test green
- README skeleton: friendly, concise human-readable text — how to run + placeholders for
  decisions / AI-usage / next steps

**Done when:** `npm run dev` opens a page with the circle; lint + one test green.

---

## Stage 1 — Coordinate core
Branch: `feat/core`

The coordinate kernel in full, before any UI — primary quality bar, pinned by tests first.

- `feat(core)`: `Geometry`, `Point`, `Camera` types
- `feat(core)`: `transforms.ts` — `modelToScreen`
- `feat(core)`: `camera.ts` — pan/zoom operations
- `test(core)`: model->screen, round-trip, behaviour under zoom
  ← **spec-test #1**
- `feat(core)`: `ports.ts` — `SensorsSource`, `GeometrySource` interfaces

**Done when:** transforms are pure and fully tested; no DOM involved.

---

## Stage 2 — Floorplan on screen
Branch: `feat/floorplan`

First visible result: the hall renders and pans/zooms.

- `feat(floorplan)`: `normalise.ts` — raw dxf entities → `Geometry`
- `feat(floorplan)`: `dxfSource.ts` — load `.dxf` + `dxf` package (implements `GeometrySource`)
- `feat(floorplan)`: `FloorplanSvg.tsx` — render `Geometry` inside one `<g transform>`
- `feat(app)`: `FloorplanView` owns camera state, wires pan/zoom handlers
- `test(floorplan)`: normalise on a DXF slice (skip a broken entity, don't crash)

**Closes open questions:** ÷1000 reconciliation factor and "metres, not mm" (D-2) confirmed
empirically here, on the real render.

**Done when:** the hall is on screen and navigable under pan/zoom.

---

## Stage 3 — Sensor overlay
Branch: `feat/sensors-overlay`

Static sensors land at their positions — the moment data meets geometry.

- `feat(sensors)`: `Sensor`, `Reading` types
- `feat(sensors)`: `tempToColor.ts` (pure) + `SensorMarker.tsx`, `SensorLayer.tsx`
- `feat(app)`: sensor mm → model m via a single named scale factor; overlay into the same `<svg>`
- Single frame for now — hardcoded or from a static `sensors.json`, no timer yet

**Done when:** sensors sit on their real positions, aligned to geometry under pan/zoom.

---

## Stage 4 — Live cycle
Branch: `feat/live-polling`

Data comes alive; the UI is written against "current state now". Live before interaction:
polling is the heart of the rubric's data/state bar, so it's ready first if budget tightens.

- `feat(sensors)`: `sensorsSource.ts` — holds the full series, emits the current frame on a
  ~5s timer via a shared frame index (implements `SensorsSource`)
- `feat(sensors)`: `usePolling.ts` — subscribes to the source; `{ data, loading, error }`
  in local `useState`
- `feat(app)`: `FloorplanView` reads the hook; `SensorLayer` renders the current frame;
  loading / error / live states
- `test(sensors)`: polling — frame advances on tick, loading→data transition ← **spec-test #2**

**Done when:** values visibly update on the timer; loading and error states surface.

---

## Stage 5 — Interaction + detail panel
Branch: `feat/sensor-detail`

Final MVP slice: click/hover reveals a sensor.

- `feat(sensors)`: `resolveClick.ts` — screen→model→nearest sensor
- `feat(sensors)`: `DetailPanel.tsx` — label, temperature, humidity + empty state
- `feat(app)`: `app` owns the selected sensor; marker layer and panel both read it
- `test(sensors)`: interaction path — click a marker → panel shows its data ← **spec-test #3**
- Live values in the panel come for free: selected + current frame from Stage 4

**Done when:** clicking/hovering a sensor shows its live detail.

---

## Stage 6 — README final + polish pass
Branch: `docs/readme`

- Fill placeholders: key decisions & trade-offs, AI-usage, what's next
- Clean `npm run dev` run; verify how-to-run

**Done when:** README is complete and the run instructions are verified from scratch.

---

## Cut order (if the 4h budget bites)

Most-cuttable first, each cut cheap to explain in the README:
1. **Live cycle** (S4) — a static overlay still reads; note "polling designed, not wired"
   is the honest fallback. (Built early precisely so it's *not* the thing cut — but it's
   the first candidate if it comes to it.)
2. **Arc interpolation** (within S2) — skip arcs, the plan still reads on lines (D-5).
3. **Hover** (within S5) — click-only still proves the interaction path.

Floorplan render, coordinate accuracy, and sensor overlay are the load-bearing rubric items
and are not on the cut list.
