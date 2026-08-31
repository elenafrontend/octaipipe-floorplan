# Architecture — Data Centre Floorplan Viewer

## Overview

React + TypeScript SPA, single screen. Renders DXF geometry as SVG, overlays live sensors in a
shared model space, supports pan/zoom and per-sensor inspection. Data flows through a
polled-API-shaped layer.

Organising principle: **high cohesion, low coupling.** A shared coordinate kernel (`core`) that
everything stands on, self-contained feature modules (`floorplan`, `sensors`) that never reach
into each other, and a single composition point (`app`).

## Layers & dependency direction

```
app  →  modules/{floorplan, sensors}  →  core
```

Arrows point one way only. `core` depends on nothing; modules depend only on `core`; `app` wires
everything together. Modules never import each other directly — they meet only in `app`, and
their shared language is neutral types from `core` (`Geometry`, `Point`, `Camera`).

- **core** — shared coordinate kernel. Pure, no React, no IO, no DXF/SVG specifics. This is where
  the coordinate math (the primary quality bar) lives, and where the spec test targets sit.
- **modules** — self-contained vertical slices. Each owns its domain, data adapter, and UI.
- **app** — composition + orchestration. Holds shared state (camera), joins geometry and sensors
  into one `<svg>`.

## File structure

```
src/
  core/                       shared kernel — everything stands on this
    geometry.ts                 Geometry, Point types
    transforms.ts               model↔screen — pure functions   ← spec tests
    camera.ts                   Camera type + pure operations
    ports.ts                    interfaces: SensorsSource, GeometrySource
    index.ts                    public door of the kernel

  modules/
    floorplan/                  everything about hall geometry
      domain/
        normalise.ts            raw dxf entities → Geometry
      adapters/
        dxfSource.ts            load .dxf + dxf package (implements GeometrySource)
      ui/
        FloorplanSvg.tsx        renders Geometry
      index.ts                  public door of the module

    sensors/                    everything about sensors, collected
      domain/
        sensor.ts               Sensor, Reading types
        resolveClick.ts         screen→model→nearest sensor
        tempToColor.ts          temperature → marker colour (pure)
      adapters/
        sensorsSource.ts        fake polling "API" (implements SensorsSource)
      hooks/
        usePolling.ts           subscribes to source, exposes { data, loading, error }
      ui/
        SensorLayer.tsx         renders markers (future overlay is a neighbour here)
        SensorMarker.tsx
        DetailPanel.tsx
      index.ts                  public door of the module

  app/
    FloorplanView.tsx           container: wires core + modules, owns camera state
    App.tsx
```

## Cohesion & coupling

Folders permit good structure but don't guarantee it. Three rules keep coupling low:

1. **Module = black box via `index.ts`.** A module exposes only its `index.ts` barrel; importing
   another module's internals (`sensors` → `floorplan/domain/...`) is forbidden. Outside code
   sees the contract, not the guts.
2. **Modules don't talk directly.** `floorplan` and `sensors` don't know each other exist. They
   share only `core` types and meet only in `app`. No pairwise coupling, no cycles.
3. **Core is independent.** `core` never imports from `modules/` or `app/`. This keeps it pure
   and testable in isolation (spec tests run without the rest of the app).

Placement follows purpose: a unit lives where its *meaning* is (`transforms` in `core` because
it's shared; `resolveClick` and `tempToColor` in `sensors` because their purpose is
sensor-specific). Correct placement raises cohesion and lowers coupling at once.

## Coordinate spaces & transforms

Three distinct spaces, kept separate deliberately:

1. **Sensor data units** — millimetres (per brief).
2. **Model space** — metres, Y-up. The single source of truth about the hall. Geometry and
   sensors both live here — this is where sensor data joins geometry.
3. **Screen space** — pixels, origin top-left, Y-down, reflects current pan/zoom.

Reconciliation: sensor mm → model metres via a single named scale factor (working hypothesis
÷1000, confirmed empirically by overlaying sensors on the plan — not hardcoded blindly).

Transforms are pure functions in `core/transforms.ts`:
- `modelToScreen(point, camera)` — forward, to draw.
  `screenX = worldX * scale + offsetX`; `screenY = -worldY * scale + offsetY`
  (Y flipped: CAD Y-up vs screen Y-down).
- `screenToModel(point, camera)` — inverse, to resolve which sensor a click hit.

Purity is deliberate: accuracy under pan/zoom is the primary quality bar, and pure functions are
the easiest thing to test — input → expected output, no DOM.

## Render

SVG over the neutral `Geometry` contract. All geometry sits in one parent `<g transform>`;
pan/zoom moves that single container, not each node. Sensor hit-testing is free
(`<circle onClick>`). The renderer consumes neutral geometry, not DXF, so it is swappable for
canvas without touching parse/normalise/transforms. → decisions.md D-3.

## Geometry pipeline

```
.dxf → [dxf package] → raw entities → [normalise] → Geometry → [SVG render]
```

`dxf` is used only as a source of raw entities — its own rendering never reaches the render
layer. `normalise` converts raw entities into neutral `Geometry` (single units, Y handled). Arcs
are interpolated to polylines via the library; fallback is to skip arcs, and the plan still reads
on lines. → decisions.md D-5.

## Data layer (polled-API shape)

Three levels, kept distinct:

1. **Source** — `sensors/adapters/sensorsSource.ts` holds the full reading series and, on a ~5s
   timer, emits the current frame via a shared frame index. Lives conceptually outside React
   (like a server). Implements the `SensorsSource` port.
2. **State / delivery** — `sensors/hooks/usePolling.ts` subscribes to the source, holds the
   current frame in local `useState`, and exposes `{ data, loading, error }`.
3. **Consumption** — UI reads the hook and renders the current frame.

```
sensorsSource (timer, outside React)
   → usePolling (useState, loading/error)
      → SensorLayer / DetailPanel
```

The UI is written against "current state now" and doesn't know the data is local. Swapping the
fake source for a real fetch/WebSocket means changing the adapter behind the `SensorsSource`
port — the UI is untouched. No global store; the cache is the hook's local `useState` of the last
frame. → decisions.md D-6.

## State ownership

- **Camera** (pan/zoom) → `app/FloorplanView`. Shared across modules, so it lives at the
  composition point.
- **Sensor data** → `usePolling` inside `sensors`. Belongs to the sensors module only.
- **Selected sensor** → `app`. The *calculation* of which sensor a click hits is `sensors`
  (`resolveClick`); the *ownership* of which one is currently selected sits in `app`, where both
  the marker layer and the detail panel can read it.

Each piece of state lives where its meaning is.

## Loading & failure states

- Initial `.dxf` / `.json` load → loading state.
- Parse failure or source error → failure state, not a blank screen.
- Surfaced through `usePolling` (`loading`, `error`) and the floorplan loader; `app` renders the
  appropriate state.

## UI shell (minimal — Stage 3 folded in)

Visual language borrowed from the ACE product (minimal subset), plain CSS / CSS Modules:
- Dark canvas holds the plan (near-black); geometry in light strokes.
- Sensors are `<circle>` markers coloured by temperature via a pure `tempToColor` function
  (single red-orange accent — colour carries the value). Marker also shows current temperature.
- Fixed detail panel beside the canvas, shown on hover/click: label, temperature, humidity.
  Empty state when nothing is selected. Fixed (not floating) — reads the selected sensor from
  state, independent of camera, so no screen-space repositioning on pan/zoom.
- Small status pill for live / loading / error (dot + label).

Not in scope: zone fills / heatmap, product side-metrics, tasks, tabs. We take the visual
language, not the layout. Interaction over polish (per brief).
