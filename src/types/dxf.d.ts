// `dxf` (skymakerolof, v5.3.1) ships no types. Declares only the surface we
// use — dxfSource.ts is the only place this boundary is crossed (D-5).
declare module 'dxf' {
  export class Helper {
    constructor(contents: string);
    toPolylines(): {
      bbox: unknown;
      polylines: ReadonlyArray<{
        rgb: string;
        layer: unknown;
        vertices: ReadonlyArray<ReadonlyArray<number>>;
      }>;
    };
  }
}
