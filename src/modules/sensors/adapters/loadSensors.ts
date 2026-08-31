import type { Sensor } from '../domain/sensor';

/**
 * Loads the sensor fixture — a single fetch, no polling yet (roadmap: "hardcoded
 * or from a static sensors.json, no timer yet"). Stage 4 replaces this with a
 * proper SensorsSource port once there's a timer/frame index to poll against.
 */
export async function loadSensors(url: string): Promise<Sensor[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sensors (${response.status}): ${url}`);
  }
  return response.json();
}
