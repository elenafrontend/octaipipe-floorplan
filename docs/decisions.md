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
  absurd). The misleading header is the "not tidy" trap. Confirmed empirically by overlaying
  sensors on the plan.

## D-3 · Render — SVG
- **Chosen:** SVG as a swappable renderer over our own neutral `Geometry` type (knows nothing
  about DXF or SVG), which holds the hall in model space (metres, Y-up). Two pure, testable
  model↔screen functions convert to pixels — forward to draw, inverse to resolve a sensor click —
  accounting for pan/zoom.
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

---

## Not yet decided
- Unit-reconciliation factor — ÷1000 is the hypothesis; confirm by overlaying sensors.
- Loading / failure UX specifics — states are placed (D-6); exact visual treatment open.
- `GeometrySource` port — kept symmetric with `SensorsSource` for now; may collapse (geometry
  loads once, not a stream).