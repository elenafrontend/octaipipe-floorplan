import { point } from '@core/index';

/**
 * Smoke slice: proves core → app conducts current.
 * Renders a single circle at a hardcoded Point.
 * Will become the container that wires core + modules in Stage 2.
 */
export function FloorplanView() {
  const center = point(200, 200);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 400 400"
      style={{ background: '#1a1a2e' }}
    >
      <circle
        cx={center.x}
        cy={center.y}
        r={8}
        fill="#e94560"
        stroke="#fff"
        strokeWidth={2}
      />
    </svg>
  );
}
