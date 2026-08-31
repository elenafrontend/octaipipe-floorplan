import { Helper } from 'dxf';
import type { Geometry, GeometrySource } from '@core/index';
import { normalise } from '../domain/normalise';

/**
 * Loads and parses a .dxf file into model-space Geometry.
 * `dxf` is used only as a raw-entity source — its own types/rendering never
 * pass normalise (architecture.md: DXF specifics never leak past here).
 */
export function createDxfSource(url: string): GeometrySource {
  return {
    async load(): Promise<Geometry> {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch DXF (${response.status}): ${url}`);
      }
      const text = await response.text();
      const { polylines } = new Helper(text).toPolylines();
      return normalise(polylines);
    },
  };
}
