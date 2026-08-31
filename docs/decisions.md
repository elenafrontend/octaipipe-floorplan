# decisions.md — Decision log

> Significant choices, compact format: chosen / rejected / why in one block.
> `[fact]` = from the brief or the DXF itself; `[inferred]` = working hypothesis.

---

## D-1 · sensors.json data structure
- **Chosen:** a bare array of sensors (no wrapper key); each with `id`, `label`, grouped
  `position: { x, y }`, and a `readings[]` series of `{ timestamp, temperatureC, humidityPct }`.
  Single shared timeline — all sensors share timestamps and reading count, played back via one
  shared frame index. `[inferred]`
- **Rejected:** flat snapshot rows — duplicate position, slip geometry and telemetry together,
  worse for future overlays. Per-sensor independent timelines — needless; a shared frame index
  is simpler.
- **Why:** minimal identity + position + time series; units carried in field names
  (`temperatureC`, `humidityPct`) for self-documentation. `sensors.json` wasn't provided —
  shape designed from the brief and the sibling psychrometric task's style. `[inferred]`
- **Fixture (Stage 3):** `[inferred]` real data still wasn't provided, so `public/sensors.json`
  is a fabricated fixture built to this shape — 6 sensors, positions placed inside the real
  hall's DXF bounding box (converted to mm) so they land inside the plan, 6 shared readings each
  5s apart, loosely modelling cold/mid/hot aisle banding (~20-21C / ~23-24C / ~27-29C) so
  `tempToColor`'s range has something to show. Swappable later for a real file with no code
  changes beyond the fetch URL.

```json
[
  {
    "id": "s1",
    "label": "Aisle A-01",
    "position": { "x": 5200, "y": 1300 },
    "readings": [
      { "timestamp": "2026-08-24T08:00:00Z", "temperatureC": 22.4, "humidityPct": 41 }
    ]
  }
]
```

## D-2 · DXF units — metres, not the header's millimetres
- **Chosen:** treat the DXF/model world as metres.
- **Rejected:** trusting `$INSUNITS = 4` (mm) — contradicts the geometry, would misread hall size.
- **Why:** `[fact]` bounding box ≈ 10 × 8; `[inferred]` only sensible as metres (a 10 mm hall is
  absurd). The misleading header is the "not tidy" trap.
- **Confirmed** `[fact]` in Stage 2: `dxf`'s `Helper().toPolylines()` bbox on the real file is
  `(3.81, -3.53)` to `(14.15, 4.71)` — a ~10.3 × 8.2 hall, matching the header's own
  `$EXTMIN`/`$EXTMAX`. Raw coordinates are used as-is in `normalise.ts`, no scaling. 952
  polylines out (849 LINE + 102 ARC + 1 LWPOLYLINE), none dropped — the real file needed none of
  `normalise`'s skip-on-broken-entity path, which remains as a defensive boundary (spec: "not
  perfectly tidy") and is exercised by its unit test instead.
- **Sensor side confirmed in Stage 3:** the ÷1000 hypothesis (mm→m) is now applied as
  `SENSOR_MM_TO_M` in `app/FloorplanView.tsx`. Since `sensors.json` itself is a fabricated
  fixture (no real file — see D-1), positions were chosen inside the DXF's real bounding box, so
  "sensors land inside the hall" is true by construction rather than independent proof the
  factor is right. The ÷1000 reading (mm, per the brief) is still the only interpretation
  consistent with the brief's own example (`x: 5200` reads as 5.2 m — sane for a ~10 m hall).

## D-3 · Render — SVG
- **Chosen:** SVG as a swappable renderer over our own neutral `Geometry` type (knows nothing
  about DXF or SVG), which holds the hall in model space (metres, Y-up). A pure, testable modelToScreen function converts to pixels. 
- Hit-testing is free via SVG DOM events (<circle onClick>).
- **Rejected:** canvas — overkill at this scale.
- **Why:** `[fact]` ~950 entities — SVG handles them easily, headroom to ~10k nodes. Native
  interactivity (`<circle onClick>` — hit-testing for free), pan/zoom via one parent
  `<g transform>` (the container moves, not each node). The expensive part (geometry) is static;
  the dynamic part (sensors) is a handful of nodes. If it grows: culling / LOD, or swap the
  renderer for canvas without rewriting parse/normalise/transforms.

## D-4 · Stack
- **Chosen:** Vite + React 19 + TS; ESLint + Prettier (+ react-hooks); Vitest + Testing Library
  as the single test stack.
- **Rejected:** Tailwind (+ cva/clsx/tailwind-merge) — UI surface is small and it doesn't touch
  the SVG canvas; plain CSS / CSS Modules instead. Playwright — the three test targets
  (transforms, selection/polling, interaction path) are reachable in Vitest + TL, no canvas
  pixel-clicks to verify, so a second browser stack isn't worth the 3-4h budget. Also dropped:
  coverage (rubric doesn't look at it), fontsource, steiger/FSD (scale too small).
- **Why:** `[fact from rubric]` deliberate scope cuts valued over a rushed full stack; each cut
  is a standard tool removed for this scale, not an oversight.

## D-5 · DXF parser — `dxf` (skymakerolof)
- **Chosen:** `dxf` `[fact]` v5.3.1, actively maintained; used only as a source of raw entities.
- **Rejected:** `dxf-parser` — stricter, throws on an incomplete file.
- **Why:** tested on a LINE/ARC/LWPOLYLINE sample — `dxf` tolerates a missing `EOF` where
  `dxf-parser` crashes; `[fact]` spec warns the file is "not tidy", so a forgiving parser lowers
  the risk. It also expands arcs into polylines out of the box.
- **Arcs:** use the library's interpolation. `[fact]` ~11% of entities and not a rubric target
  (floorplan render is last in the MVP) — they're detail (door swings, fillets), not the
  skeleton. A hand-written interpolation would be needless: the library already handles the
  tricky edges (sweep direction, wrap past 0°, segment count). Fallback: skip arcs — the plan
  still reads on lines.
- **Boundary:** `dxf` output passes through our `normalise`; its own rendering never reaches the
  render layer.

## D-6 · Data layer — hand-rolled polling hook behind a port
- **Chosen:** a fake source holds the full series and emits the current frame on a ~5s timer via
  a shared frame index (implements a `SensorsSource` port); a `usePolling` hook subscribes and
  exposes `{ data, loading, error }`; UI reads "current state now". No global store — the cache
  is the hook's local `useState` of the last frame.
- **Rejected:** TanStack Query — its value is caching/invalidation/dedup, none needed for one
  stream; would be weight without payoff, and the "continuous tick" is closer to a subscription
  than a refetch. Global store (Redux/Zustand) — one stream on one screen doesn't need it (YAGNI).
- **Why:** the rubric checks clarity of the data cycle and loading/failure states, not tooling
  depth. The port keeps the choice reversible: a real fetch/WebSocket is a new adapter, UI
  untouched. Production path (server state → TanStack Query, client state → store) noted in README.

## D-7 · Sensor rendering placement — inside the `<g transform>`
- **Chosen:** geometry (Stage 2) and sensors (Stage 3) render in raw model coordinates inside one
  parent `<g transform>`; the `<g>`'s SVG matrix — built directly from `Camera` (`matrix(scale 0
  0 -scale offsetX offsetY)`) — performs the model→screen mapping. Pan/zoom moves that one
  container; the browser does the per-point multiplication, not our code.
- **Rejected:** rendering outside the `<g>` in screen space, converting each point via
  `modelToScreen` before render.
- **Why:** matches architecture.md's render section exactly ("all geometry sits in one parent `<g
  transform>`"), gives free SVG-DOM hit-testing for sensors (FR-4/D-3), and removes an entire
  class of drift bugs (JS-computed screen coords disagreeing with the DOM's own transform).
- **Consequence:** `modelToScreen` has no call site in the render path. It stays in `core` —
  pure, documented, the same formula the `<g>`'s matrix encodes — but earns no dedicated unit
  test of its own beyond what `camera.test.ts` already covers for `scale`/`offset` math; the
  render path's coordinate accuracy is instead proven by the visible hall staying aligned under
  pan/zoom. This is what roadmap.md's Stage 1 note ("modelToScreen test deferred to Stage 2,
  pending sensor-placement decision") resolves to: no test added, YAGNI — it has no consumer to
  test against.

---

## Not yet decided
- Loading / failure UX specifics — states are placed (D-6); exact visual treatment open.
- `GeometrySource` port — added in Stage 2 with a single `load(): Promise<Geometry>` method (no
  polling shape, unlike `SensorsSource` — geometry loads once). Did not collapse; `dxfSource.ts`
  is its only implementation so far.