# spec.md — Data Centre Floorplan Viewer

> Phase 1 (Specify) output. Canonical spec assembled from the Stage-0 discussion.
> Records what was actually discussed. `[fact]` = from the brief or the DXF file itself;
> `[inferred]` = our working hypothesis, to be validated against real data.

---

## Overview

A small **React + TypeScript** web app that renders a data-centre hall floorplan from a
**DXF** file and overlays **live sensor readings** (temperature / humidity) at their real
positions in the hall, with pan/zoom and per-sensor inspection.

- **Type & status:** take-home assessment for a Frontend Engineer role at OctaiPipe. Stage 0
  (ideation) complete; this is the Phase-1 spec.
- **Time budget:** `[fact]` aim ~3h, hard stop 4h. Deliberate, explained scope cuts are
  valued over a rushed attempt at everything.
- **Real-world context:** a scaled-down version of a screen in OctaiPipe's **ACE** product,
  where engineers see a hall's layout and its live conditions overlaid in one place.

---

## Target user & primary scenario

- **User:** a data-centre engineer / facilities operator monitoring a hall.
- **Primary scenario:** open the hall floorplan, pan/zoom to navigate it, see sensors
  overlaid at their positions with current temperature, and click/hover a sensor to inspect
  its label, temperature and humidity while values update live.

---

## User stories

- As an engineer, I want to **see the hall floorplan** rendered from the DXF, so that I have
  the physical layout as context.
- As an engineer, I want to **pan and zoom** the plan, so that I can navigate a large hall
  and focus on an area.
- As an engineer, I want to **see sensors overlaid at their real positions** with their
  current temperature, so that I can read conditions against the physical layout.
- As an engineer, I want to **hover or click a sensor to see its detail** (label, temperature,
  humidity), so that I can inspect a specific point.
- As an engineer, I want **values to update live**, so that I'm looking at current conditions
  rather than a static snapshot.
- As an engineer, I want the view to **behave sensibly while data is loading or if it fails**,
  so that I'm not left with a broken or silent screen. `[inferred]` (from rubric "loading and
  failure states"; exact UX not yet discussed)

---

## Acceptance criteria (EARS notation)

Coordinate space
- The system shall render the DXF geometry in a single normalised model space (metres).
- When the user pans or zooms, the system shall keep sensors aligned to their geometry
  positions (no drift between plan and overlay).
- When the user clicks a sensor marker, the system shall identify the sensor via SVG DOM events (no coordinate back-conversion needed)

Sensor overlay & join
- The system shall place each sensor at its position in the shared model space.
- Where sensor coordinates and DXF geometry use different units, the system shall reconcile
  them via a single named scale factor before rendering.
- The system shall display each sensor's current temperature on the overlay.

Interaction
- When the user hovers or clicks a sensor, the system shall show its label, temperature and
  humidity.

Live data cycle
- While the app is running, the system shall advance through the readings on a timer so
  values visibly update.
- The system shall obtain readings through a data layer shaped like a polled API, so the UI
  is written against "current state now" rather than local data.

States
- While initial data is loading, the system shall show a loading state. `[inferred]`
- If loading the floorplan or sensors fails, then the system shall show a failure state
  rather than a blank/broken screen. `[inferred]`

---

## Functional requirements

- **FR-1** Parse `floorplan.dxf` at runtime and render its geometry (lines, arcs, polyline).
- **FR-2** Normalise parsed DXF entities into an internal geometry model before rendering
  (parse → normalise → render); DXF specifics do not leak past the parser.
- **FR-3** Support pan and zoom over the plan via a single camera transform (scale + offset).
- **FR-4** Provide model→screen coordinate conversion as a pure function. Sensor hit-testing uses SVG DOM events directly.
- **FR-5** Load sensors, reconcile their coordinate units into model space, and overlay them
  at position with current temperature.
- **FR-6** Show sensor detail (label, temperature, humidity) on hover/click.
- **FR-7** Advance readings on a ~5s-interval timer through a polled-API-shaped data layer,
  emitting the current frame as a snapshot to the UI.
- **FR-8** Handle loading and failure states for data acquisition. `[inferred]`

---

## Non-functional requirements

- **Coordinate accuracy:** `[fact from rubric]` model→screen conversion must stay accurate
  under pan/zoom — this is the primary quality bar.
- **Robustness to messy input:** `[fact]` the DXF is representative but not perfectly tidy;
  parsing must handle it pragmatically and not crash on an unparseable entity.
- **Testability:** `[fact]` a small number of tests where they earn their keep — specifically
  model-to-screen conversion, selection/polling behaviour, and a user interaction path.
- **Performance budget:** not yet discussed (pan/zoom is expected to feel smooth, but no
  explicit numeric budget was set).
- **Accessibility:** not yet discussed.
- **Security / observability:** not yet discussed.

---

## Data model

### sensors.json (assumed shape) `[inferred]`
`sensors.json` was not provided. Shape is designed from the brief and the sibling
psychrometric assessment's data style (which uses a grouped object with a `readings[]` array
and unit-suffixed field names).

- Root: a **bare array** of sensors (no wrapper key — no hall-level metadata in this task).
- Each sensor: minimal — identity + position + a time series.
- Position **grouped** into `position: { x, y }` (a point is a single entity; maps onto a
  `Point` type).
- Field names carry units for self-documentation: `temperatureC`, `humidityPct`.
- Time as ISO-8601 `timestamp` strings.
- **Shared timeline:** `[inferred]` all sensors share the same timestamps and reading count
  (simpler; matches the sibling task's single ordered series). Playback via one shared frame
  index; timestamps are metadata, not the driver.

```json
[
  {
    "id": "s1",
    "label": "Aisle A-01",
    "position": { "x": 5200, "y": 1300 },
    "readings": [
      { "timestamp": "2026-08-24T08:00:00Z", "temperatureC": 22.4, "humidityPct": 41 },
      { "timestamp": "2026-08-24T08:00:05Z", "temperatureC": 22.7, "humidityPct": 40 }
    ]
  }
]
```

### Coordinate spaces (three, not two)
1. **Sensor data units** — `[fact from brief]` stated as millimetres (e.g. `x: 5200`).
2. **DXF / model space** — `[inferred]` header says mm (`$INSUNITS = 4`) but bounding box
   (`$EXTMIN`/`$EXTMAX` ≈ 10 × 8) only makes sense as **metres**. Treated as metres; the
   misleading header is the "not tidy" trap.
3. **Screen space** — pixels in the canvas/SVG; origin top-left, Y points down.

### Transforms
- **Unit reconciliation (sensor → model):** `[inferred]` scale factor, working hypothesis
  ÷1000 (mm→m). **Not hardcoded blindly** — a named constant, confirmed empirically by
  overlaying sensors on the plan.
- **Model → screen:** `screenX = worldX * scale + offsetX`;
  `screenY = -worldY * scale + offsetY` (Y flipped: CAD Y-up vs screen Y-down).
- **Screen → model:** inverse of the above; needed to resolve clicks to sensors.
- Sensors and geometry meet in **one shared model space** — this is where "sensor data joins
  geometry."

### Geometry pipeline
- `[fact]` DXF content: ~849 LINE, 102 ARC, 1 LWPOLYLINE; no blocks/inserts/splines/text;
  almost all on layer `0`, one entity on `h01_z01`; machine-generated (dxfrw 0.6.3).
- **parse** (library) → raw entities → **normalise** into our own geometry model (single
  units, Y handled) → **render** our model, not the DXF.
- `[inferred]` arcs (centre + radius + angles) either drawn as arcs or approximated as
  segments; parser may yield an entity without coordinates → skip it, don't crash the render.

### Live-data handling
- `[fact from brief]` structure the data handling as though readings came from a polled API.
- `[inferred]` simulated client-side: a fake "API" layer holds the full series and, on a
  timer, emits the current frame as a snapshot. The UI is written against "current state now",
  unaware the data is local.

---

## MVP scope (in priority order)

1. Correct coordinate space: model↔screen both directions, accurate under pan/zoom.
2. Sensors land at the right positions and join the geometry cleanly (data stays dumb;
   visual meaning lives in the render layer, so a future overlay drops in cleanly).
3. Live data cycle behaving like a polled API, with loading/failure states.
4. Sensor detail on hover/click (label, temperature, humidity).
5. Basic floorplan render (lines, arcs, polyline).

---

## Out of scope

- Visual polish beyond what's needed to read the plan and sensors clearly `[fact]` (brief
  says prioritise floorplan/sensor interaction over polish).
- Richer overlays (heatmap, zones, airflow) — the architecture should *allow* a future
  overlay, but none is built. `[inferred]`
- Hall-level metadata / multi-hall support (bare sensor array, single plan).
- Per-sensor independent timelines / interpolation by real time — deliberately cut in favour
  of a single shared frame index.
- Real backend / real polling — the API is simulated client-side.

---

## Success metric

Success = alignment with the reviewer's rubric ("What We Look At"):
1. Correct, robust handling of the coordinate space, accurate under pan/zoom.
2. How cleanly sensor data joins the geometry, and how easily a future overlay could be added.
3. Data and state handling — the update cycle, loading and failure states.
4. Code quality, sensible component boundaries, and the judgement shown in the README.

Every design decision should trace to one of these four.

---

## Open questions

- Exact `sensors.json` format — unconfirmed until the real file arrives; current shape is a
  hypothesis.
- Unit-reconciliation factor — ÷1000 is a hypothesis; confirm by overlaying sensors.
- Loading / failure UX — states are placed (decisions.md D-6); exact visual treatment open.
