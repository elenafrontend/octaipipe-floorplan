import type { Geometry } from './geometry';

/**
 * Loads hall geometry once — not a stream. Unlike SensorsSource, the plan
 * doesn't change while the app runs, so there's no polling shape here.
 */
export interface GeometrySource {
  load(): Promise<Geometry>;
}

export type SourceObserver<T> = {
  onData(data: T): void;
  onError(error: unknown): void;
};

/**
 * Streams data over time (polling shape) — generic over the payload, since
 * core doesn't know sensor-specific types (dependency rule: core imports
 * nothing from modules/). sensors/adapters/sensorsSource.ts supplies the
 * concrete type: SensorsSource<readonly SensorSnapshot[]>.
 */
export interface SensorsSource<T> {
  subscribe(observer: SourceObserver<T>): () => void;
}
