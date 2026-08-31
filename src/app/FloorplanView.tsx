import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import type { Camera, Geometry, Point } from '@core/index';
import { pan, zoom } from '@core/index';
import { createDxfSource, FloorplanSvg } from '@modules/floorplan';
import { loadSensors, SensorLayer } from '@modules/sensors';
import type { RenderableSensor, Sensor } from '@modules/sensors';

const DXF_URL = '/octaipipefloorplan.dxf';
const geometrySource = createDxfSource(DXF_URL);

const SENSORS_URL = '/sensors.json';

/** Reconciles raw sensor millimetres into model-space metres (D-2's ÷1000 hypothesis, confirmed here). */
const SENSOR_MM_TO_M = 1 / 1000;

const ZOOM_STEP = 1.1;

/** Centres and scales the camera so geometry's bounding box fills the viewport. */
function fitCamera(
  geometry: Geometry,
  width: number,
  height: number,
  padding = 40,
): Camera {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polyline of geometry) {
    for (const p of polyline) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }

  if (!Number.isFinite(minX)) {
    return { scale: 1, offset: { x: width / 2, y: height / 2 } };
  }

  const modelWidth = maxX - minX || 1;
  const modelHeight = maxY - minY || 1;
  const scale = Math.min(
    (width - padding * 2) / modelWidth,
    (height - padding * 2) / modelHeight,
  );
  const modelCenterX = (minX + maxX) / 2;
  const modelCenterY = (minY + maxY) / 2;

  return {
    scale,
    offset: {
      x: width / 2 - modelCenterX * scale,
      y: height / 2 + modelCenterY * scale,
    },
  };
}

/**
 * Reduces a sensor to its current frame for render: model-space position
 * (mm→m reconciled) and the latest reading. Single frame for now — Stage 4
 * advances this via a polled frame index instead of always reading [0].
 */
function toRenderableSensor(sensor: Sensor): RenderableSensor | null {
  const current = sensor.readings[0];
  if (!current) return null;
  return {
    id: sensor.id,
    position: {
      x: sensor.position.x * SENSOR_MM_TO_M,
      y: sensor.position.y * SENSOR_MM_TO_M,
    },
    temperatureC: current.temperatureC,
  };
}

/**
 * Container: owns camera state, loads geometry + sensors, wires pan/zoom.
 * Joins geometry and sensors into one <svg> under a single shared
 * <g transform> (D-7) — the join point architecture.md assigns to app.
 */
export function FloorplanView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [sensors, setSensors] = useState<Sensor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({ scale: 1, offset: { x: 0, y: 0 } });
  const dragOrigin = useRef<Point | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([geometrySource.load(), loadSensors(SENSORS_URL)])
      .then(([loadedGeometry, loadedSensors]) => {
        if (cancelled) return;
        setGeometry(loadedGeometry);
        setSensors(loadedSensors);
        const rect = containerRef.current?.getBoundingClientRect();
        setCamera(fitCamera(loadedGeometry, rect?.width ?? 800, rect?.height ?? 600));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load floorplan');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleWheel(e: ReactWheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const anchor: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    setCamera((c) => zoom(c, factor, anchor));
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!dragOrigin.current) return;
    const delta: Point = {
      x: e.clientX - dragOrigin.current.x,
      y: e.clientY - dragOrigin.current.y,
    };
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    setCamera((c) => pan(c, delta));
  }

  function handlePointerUp() {
    dragOrigin.current = null;
  }

  const ready = !error && geometry && sensors;
  const renderableSensors = sensors
    ? sensors.map(toRenderableSensor).filter((s): s is RenderableSensor => s !== null)
    : [];

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {error && <div style={statusStyle}>Failed to load floorplan: {error}</div>}
      {!error && !ready && <div style={statusStyle}>Loading floorplan…</div>}
      {ready && (
        <svg
          width="100%"
          height="100%"
          style={{ background: '#1a1a2e', touchAction: 'none' }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <g
            transform={`matrix(${camera.scale} 0 0 ${-camera.scale} ${camera.offset.x} ${camera.offset.y})`}
          >
            <FloorplanSvg geometry={geometry} />
            <SensorLayer sensors={renderableSensors} />
          </g>
        </svg>
      )}
    </div>
  );
}

const statusStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#1a1a2e',
  color: '#d0d4dc',
  fontFamily: 'sans-serif',
};
