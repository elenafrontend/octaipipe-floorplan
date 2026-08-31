/** A point in 2D space (model: metres, Y-up; screen: pixels, Y-down). */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Creates a Point. */
export function point(x: number, y: number): Point {
  return { x, y };
}
