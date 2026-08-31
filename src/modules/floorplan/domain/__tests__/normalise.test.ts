import { describe, it, expect } from 'vitest';
import { normalise } from '../normalise';

describe('normalise', () => {
  it('converts raw dxf polylines into Geometry', () => {
    const raw = [
      { vertices: [[0, 0], [1, 0], [1, 1]] },
      { vertices: [[5, 5], [6, 6]] },
    ];

    expect(normalise(raw)).toEqual([
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
      [{ x: 5, y: 5 }, { x: 6, y: 6 }],
    ]);
  });

  it('skips broken entities without crashing', () => {
    const raw = [
      { vertices: [[0, 0], [1, 1]] }, // good
      { vertices: [] }, // no vertices
      { vertices: [[1, 1]] }, // single vertex, no line
      { vertices: [[NaN, 0], [1, 1]] }, // non-finite coordinate
      { vertices: [[0, 0], ['bad', 3]] }, // non-numeric coordinate
      {}, // missing vertices entirely
      null,
      undefined,
    ];

    expect(() => normalise(raw)).not.toThrow();
    expect(normalise(raw)).toEqual([[{ x: 0, y: 0 }, { x: 1, y: 1 }]]);
  });

  it('returns an empty Geometry for an empty input', () => {
    expect(normalise([])).toEqual([]);
  });
});
