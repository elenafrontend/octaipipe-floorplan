import type { Point } from '@core/index';
import { SensorMarker } from './SensorMarker';

/** One sensor, already reconciled into model space and reduced to its current frame. */
export type RenderableSensor = {
  readonly id: string;
  readonly position: Point;
  readonly temperatureC: number;
};

type SensorLayerProps = {
  readonly sensors: ReadonlyArray<RenderableSensor>;
};

/** Renders all sensor markers. Sits inside the same <g transform> as the floorplan geometry (D-7). */
export function SensorLayer({ sensors }: SensorLayerProps) {
  return (
    <>
      {sensors.map((sensor) => (
        <SensorMarker
          key={sensor.id}
          position={sensor.position}
          temperatureC={sensor.temperatureC}
        />
      ))}
    </>
  );
}
