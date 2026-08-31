
/** A point in 2D space (model space: metres, Y-up). */
export type Point = {
  readonly x: number;
  readonly y: number;
};

/**
 * Hall geometry in model space.
 * Each inner array is a polyline — an ordered sequence of points
 * forming a connected path (a line is 2 points, an interpolated arc is N points).
 */
export type Geometry = ReadonlyArray<readonly Point[]>;
