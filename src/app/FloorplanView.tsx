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

const DXF_URL = '/octaipipefloorplan.dxf';
const geometrySource = createDxfSource(DXF_URL);

const ZOOM_STEP = 1.1;

/** Centres and scales the camera so geometry's bounding box fills the viewport. */
function fitCamera(geometry: Geometry, width: number, height: number, padding = 40): Camera {
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
 * Container: owns camera state, loads geometry via GeometrySource, wires
 * pan/zoom handlers. Joins geometry (and, from Stage 3, sensors) into one <svg>.
 */
export function FloorplanView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({ scale: 1, offset: { x: 0, y: 0 } });
  const dragOrigin = useRef<Point | null>(null);

  useEffect(() => {
    let cancelled = false;
    geometrySource
      .load()
      .then((loaded) => {
        if (cancelled) return;
        setGeometry(loaded);
        const rect = containerRef.current?.getBoundingClientRect();
        setCamera(fitCamera(loaded, rect?.width ?? 800, rect?.height ?? 600));
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

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {error && <div style={statusStyle}>Failed to load floorplan: {error}</div>}
      {!error && !geometry && <div style={statusStyle}>Loading floorplan…</div>}
      {!error && geometry && (
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
          <FloorplanSvg geometry={geometry} camera={camera} />
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
