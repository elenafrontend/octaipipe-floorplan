import type { Geometry } from './geometry';

/**
 * Loads hall geometry once — not a stream. Unlike SensorsSource (Stage 4),
 * the plan doesn't change while the app runs, so there's no polling shape here.
 */
export interface GeometrySource {
  load(): Promise<Geometry>;
}
