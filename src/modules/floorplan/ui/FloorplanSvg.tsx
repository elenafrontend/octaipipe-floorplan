import type { Camera, Geometry } from '@core/index';

type FloorplanSvgProps = {
  readonly geometry: Geometry;
  readonly camera: Camera;
};

/**
 * Renders Geometry inside one <g transform>, in model coordinates. Pan/zoom
 * moves this single container — the SVG matrix performs the model→screen
 * mapping natively (the same scale/offset/Y-flip modelToScreen encodes,
 * applied once here instead of per point). Sensors join the same <g> in
 * Stage 3, which is what resolves decisions.md's open "sensor rendering
 * placement" question: modelToScreen stays available (and camera-tested)
 * but isn't called from the render path.
 */
export function FloorplanSvg({ geometry, camera }: FloorplanSvgProps) {
  const { scale, offset } = camera;
  return (
    <g transform={`matrix(${scale} 0 0 ${-scale} ${offset.x} ${offset.y})`}>
      {geometry.map((polyline, index) => (
        <polyline
          key={index}
          points={polyline.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#d0d4dc"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
