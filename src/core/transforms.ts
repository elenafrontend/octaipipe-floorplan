import type { Point } from "./geometry";
import type { Camera } from "./camera";

/**
 * Model space (metres, Y-up) → screen space (pixels, Y-down).
 *
 * screenX =  worldX * scale + offsetX
 * screenY = -worldY * scale + offsetY
 *
 * The negative on Y flips the axis: CAD conventions (Y-up)
 * to screen conventions (Y-down, origin top-left).
 */
export function modelToScreen(point: Point, camera: Camera): Point {
    return {
        x: point.x * camera.scale + camera.offset.x,
        y: -point.y * camera.scale + camera.offset.y,
    };
}

