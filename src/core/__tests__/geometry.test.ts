import { describe, it, expect } from 'vitest';
import { point } from '../index';

describe('Point', () => {
  it('creates a point with x and y', () => {
    const p = point(3, 7);
    expect(p.x).toBe(3);
    expect(p.y).toBe(7);
  });
});
