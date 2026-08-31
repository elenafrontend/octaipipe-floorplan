import type { Point } from '@core/index';
import { tempToColor } from '../domain/tempToColor';

type SensorMarkerProps = {
  readonly position: Point; // model space (metres) — already reconciled from raw sensor mm
  readonly temperatureC: number;
};

const MARKER_RADIUS_M = 0.2;
const LABEL_GAP_M = 0.15;

/**
 * One sensor marker, placed directly in model coordinates (it renders inside
 * the same Y-flipped <g transform> as the floorplan geometry — D-7). The
 * nested `scale(1 -1)` cancels that flip locally, so the temperature label
 * comes out upright instead of mirrored; `translate` still does the actual
 * positioning, so pan/zoom stays drift-free without any manual conversion.
 */
export function SensorMarker({ position, temperatureC }: SensorMarkerProps) {
  return (
    <g transform={`translate(${position.x} ${position.y}) scale(1 -1)`}>
      <circle
        cx={0}
        cy={0}
        r={MARKER_RADIUS_M}
        fill={tempToColor(temperatureC)}
        stroke="#1a1a2e"
        strokeWidth={0.03}
      />
      <text
        x={0}
        y={-(MARKER_RADIUS_M + LABEL_GAP_M)}
        fill="#d0d4dc"
        fontSize={0.35}
        textAnchor="middle"
      >
        {temperatureC.toFixed(1)}°C
      </text>
    </g>
  );
}
