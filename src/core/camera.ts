import type { Point } from "./geometry";

/**
 * Viewport state: how model space maps to screen space.
 *
 * - `scale`  — pixels per model-unit (metres). Zoom changes this.
 * - `offset` — translation in screen pixels after scaling. Pan changes this.
 *
 * The Y-flip (CAD Y-up → screen Y-down) is handled in the transform functions,
 * not stored here — camera is a plain data bag, transforms are pure functions.
 */
export type Camera = {
    readonly scale: number;
    readonly offset: Point;
};
