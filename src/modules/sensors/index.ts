// Public API of the sensors module.
export type { Sensor, SensorPosition, Reading } from './domain/sensor';
export { loadSensors } from './adapters/loadSensors';
export { SensorLayer } from './ui/SensorLayer';
export type { RenderableSensor } from './ui/SensorLayer';
