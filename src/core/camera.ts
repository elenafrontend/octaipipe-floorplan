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

/** Shift the viewport by a screen-space pixel delta (mouse drag). */
export function pan(camera: Camera, delta: Point): Camera {
    return {
        scale: camera.scale,
        offset: {
            x: camera.offset.x + delta.x,
            y: camera.offset.y + delta.y,
        },
    };
}

/**
 * Scale the viewport around a screen-space anchor (usually the cursor).
 * The anchor point stays fixed on screen after the zoom.
 *
 * newScale  = scale * factor
 * newOffset = anchor * (1 - factor) + offset * factor
 */
export function zoom(camera: Camera, factor: number, anchor: Point): Camera {
    return {
        scale: camera.scale * factor,
        offset: {
            x: anchor.x * (1 - factor) + camera.offset.x * factor,
            y: anchor.y * (1 - factor) + camera.offset.y * factor,
        },
    };
}