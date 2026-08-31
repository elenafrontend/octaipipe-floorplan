import type { Geometry } from '@core/index';

type FloorplanSvgProps = {
  readonly geometry: Geometry;
};

/**
 * Renders Geometry in raw model coordinates — no transform of its own.
 * The caller (app/FloorplanView) wraps this in the single <g transform>
 * shared with SensorLayer (D-7): one Camera-derived SVG matrix does the
 * model→screen mapping for both, instead of each owning its own.
 */
export function FloorplanSvg({ geometry }: FloorplanSvgProps) {
  return (
    <>
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
    </>
  );
}
