import type { SensorsSource, SourceObserver } from '@core/index';
import type { Sensor, SensorSnapshot } from '../domain/sensor';

const POLL_INTERVAL_MS = 5000;

type Frame = readonly SensorSnapshot[];

/** D-1: sensors share one timeline, so the frame count is just the first sensor's series length. */
function frameCount(sensors: readonly Sensor[]): number {
  return sensors[0]?.readings.length ?? 0;
}

function toSnapshot(sensors: readonly Sensor[], index: number): Frame {
  const snapshot: SensorSnapshot[] = [];
  for (const sensor of sensors) {
    const reading = sensor.readings[index];
    if (!reading) continue; // defensive: shouldn't happen under D-1's shared timeline
    snapshot.push({
      id: sensor.id,
      label: sensor.label,
      position: sensor.position,
      reading,
    });
  }
  return snapshot;
}

/**
 * Holds the full reading series and, on a ~5s timer, emits the current
 * frame via a shared frame index. Lives conceptually outside React (like a
 * server) — usePolling is the only thing that talks to it.
 */
export function createSensorsSource(url: string): SensorsSource<Frame> {
  return {
    subscribe(observer: SourceObserver<Frame>) {
      let cancelled = false;
      let timer: ReturnType<typeof setInterval> | undefined;

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch sensors (${response.status}): ${url}`);
          }
          return response.json() as Promise<Sensor[]>;
        })
        .then((sensors) => {
          if (cancelled) return;
          const count = frameCount(sensors);
          let index = 0;
          observer.onData(toSnapshot(sensors, index));

          if (count > 1) {
            timer = setInterval(() => {
              index = (index + 1) % count;
              observer.onData(toSnapshot(sensors, index));
            }, POLL_INTERVAL_MS);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) observer.onError(err);
        });

      return () => {
        cancelled = true;
        if (timer) clearInterval(timer);
      };
    },
  };
}
