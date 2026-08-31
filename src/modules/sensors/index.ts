// Public API of the sensors module.
export type { Sensor, SensorPosition, Reading, SensorSnapshot } from './domain/sensor';
export { createSensorsSource } from './adapters/sensorsSource';
export { usePolling } from './hooks/usePolling';
export type { PollingState } from './hooks/usePolling';
export { SensorLayer } from './ui/SensorLayer';
export type { RenderableSensor } from './ui/SensorLayer';
