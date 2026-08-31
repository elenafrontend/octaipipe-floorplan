import { useEffect, useState } from 'react';
import type { SensorsSource } from '@core/index';
import type { SensorSnapshot } from '../domain/sensor';

export type PollingState = {
  readonly data: readonly SensorSnapshot[] | null;
  readonly loading: boolean;
  readonly error: string | null;
};

/**
 * Subscribes to a SensorsSource and mirrors its stream into local state —
 * the UI reads "current state now", unaware the source is a fake polling a
 * static fixture rather than a real API (D-6).
 */
export function usePolling(
  source: SensorsSource<readonly SensorSnapshot[]>,
): PollingState {
  const [data, setData] = useState<readonly SensorSnapshot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = source.subscribe({
      onData: (frame) => {
        setData(frame);
        setLoading(false);
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load sensors');
        setLoading(false);
      },
    });
    return unsubscribe;
  }, [source]);

  return { data, loading, error };
}
