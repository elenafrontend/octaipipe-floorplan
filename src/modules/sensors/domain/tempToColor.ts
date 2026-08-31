/**
 * Temperature → marker colour. Single red-orange accent (architecture.md's
 * UI shell): a neutral grey at/below COLD_C, ramping to the accent at/above
 * HOT_C — colour intensity carries the value, not a multi-hue spectrum.
 */
const COLD_C = 18;
const HOT_C = 30;

const NEUTRAL_RGB = { r: 107, g: 114, b: 128 }; // #6b7280
const ACCENT_RGB = { r: 233, g: 69, b: 96 }; // #e94560 — the app's existing accent

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

export function tempToColor(temperatureC: number): string {
  const t = clamp01((temperatureC - COLD_C) / (HOT_C - COLD_C));
  const r = lerp(NEUTRAL_RGB.r, ACCENT_RGB.r, t);
  const g = lerp(NEUTRAL_RGB.g, ACCENT_RGB.g, t);
  const b = lerp(NEUTRAL_RGB.b, ACCENT_RGB.b, t);
  return `rgb(${r}, ${g}, ${b})`;
}
