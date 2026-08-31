import type { Geometry, Point } from '@core/index';

/** A raw vertex tuple like [x, y, ...] — or anything else the parser handed us. */
function toPoint(vertex: unknown): Point | null {
  if (!Array.isArray(vertex)) return null;
  const [x, y] = vertex as unknown[];
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/** A raw dxf-library polyline entity — or anything else, since the parser is untyped. */
function toPolyline(entity: unknown): readonly Point[] | null {
  if (
    typeof entity !== 'object' ||
    entity === null ||
    !('vertices' in entity) ||
    !Array.isArray((entity as { vertices: unknown }).vertices)
  ) {
    return null;
  }

  const points: Point[] = [];
  for (const vertex of (entity as { vertices: unknown[] }).vertices) {
    const point = toPoint(vertex);
    if (!point) return null; // one bad vertex taints the whole entity — skip it, don't guess
    points.push(point);
  }
  return points.length >= 2 ? points : null;
}

/**
 * Raw dxf polylines (arcs already interpolated by the `dxf` package, per D-5)
 * → neutral model-space Geometry. Model space is metres (D-2): the DXF header
 * claims millimetres but the extents only make sense as metres, so raw
 * coordinate values are used as-is, no scaling here.
 *
 * Input is untyped on purpose — the parser can hand back an entity with
 * missing or non-numeric coordinates, and those are skipped rather than
 * thrown (FR-2: don't crash the render on messy input).
 */
export function normalise(rawPolylines: ReadonlyArray<unknown>): Geometry {
  const geometry: Point[][] = [];
  for (const entity of rawPolylines) {
    const polyline = toPolyline(entity);
    if (polyline) geometry.push(polyline as Point[]);
  }
  return geometry;
}
