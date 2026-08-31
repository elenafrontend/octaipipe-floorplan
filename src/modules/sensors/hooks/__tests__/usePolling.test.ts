import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { SensorsSource, SourceObserver } from '@core/index';
import type { SensorSnapshot } from '../../domain/sensor';
import { usePolling } from '../usePolling';

type Frame = readonly SensorSnapshot[];

/** A hand-controlled SensorsSource double — the test drives ticks directly, no fake timers needed. */
function createFakeSource() {
  let observer: SourceObserver<Frame> | null = null;
  const source: SensorsSource<Frame> = {
    subscribe(o) {
      observer = o;
      return () => {
        observer = null;
      };
    },
  };
  return {
    source,
    emit(frame: Frame) {
      observer?.onData(frame);
    },
    fail(error: unknown) {
      observer?.onError(error);
    },
  };
}

const frame1: Frame = [
  {
    id: 's1',
    label: 'Aisle A-01',
    position: { x: 5200, y: -2300 },
    reading: { timestamp: 't1', temperatureC: 20.5, humidityPct: 45 },
  },
];

const frame2: Frame = [
  {
    id: 's1',
    label: 'Aisle A-01',
    position: { x: 5200, y: -2300 },
    reading: { timestamp: 't2', temperatureC: 20.6, humidityPct: 45 },
  },
];

describe('usePolling', () => {
  it('starts loading with no data', () => {
    const fake = createFakeSource();
    const { result } = renderHook(() => usePolling(fake.source));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions loading to data on the first frame', () => {
    const fake = createFakeSource();
    const { result } = renderHook(() => usePolling(fake.source));

    act(() => fake.emit(frame1));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(frame1);
  });

  it('advances to the next frame on a later tick', () => {
    const fake = createFakeSource();
    const { result } = renderHook(() => usePolling(fake.source));

    act(() => fake.emit(frame1));
    act(() => fake.emit(frame2));

    expect(result.current.data).toEqual(frame2);
  });

  it('surfaces an error and stops loading', () => {
    const fake = createFakeSource();
    const { result } = renderHook(() => usePolling(fake.source));

    act(() => fake.fail(new Error('network down')));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('network down');
    expect(result.current.data).toBeNull();
  });
});
