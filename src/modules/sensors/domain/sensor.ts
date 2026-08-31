/** Raw sensor position — millimetres (per brief), not yet reconciled into model space. */
export type SensorPosition = {
  readonly x: number;
  readonly y: number;
};

/** One point in a sensor's time series. */
export type Reading = {
  readonly timestamp: string; // ISO-8601
  readonly temperatureC: number;
  readonly humidityPct: number;
};

/**
 * A sensor and its full reading series (D-1: shared timeline across all
 * sensors, played back via one frame index). `position` stays raw mm — data
 * stays dumb; the mm→m reconciliation happens where it joins model space.
 */
export type Sensor = {
  readonly id: string;
  readonly label: string;
  readonly position: SensorPosition;
  readonly readings: readonly Reading[];
};

/** One sensor reduced to its current frame — what SensorsSource streams. */
export type SensorSnapshot = {
  readonly id: string;
  readonly label: string;
  readonly position: SensorPosition;
  readonly reading: Reading;
};
