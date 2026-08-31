import { describe, it, expect } from "vitest";
import { pan, zoom, type Camera } from "./../camera";

const baseCamera: Camera = {
    scale: 10,
    offset: { x: 100, y: 50 },
};

describe("pan", () => {
    it("shifts the offset by the given screen delta", () => {
        const result = pan(baseCamera, { x: 30, y: -20 });
        expect(result.offset).toEqual({ x: 130, y: 30 });
    });

    it("leaves the scale unchanged", () => {
        const result = pan(baseCamera, { x: 30, y: -20 });
        expect(result.scale).toBe(10);
    });

    it("does not mutate the input camera", () => {
        pan(baseCamera, { x: 30, y: -20 });
        expect(baseCamera.offset).toEqual({ x: 100, y: 50 });
    });
});

describe("zoom", () => {
    const anchor = { x: 200, y: 200 };

    it("multiplies the scale by the factor", () => {
        const result = zoom(baseCamera, 2, anchor);
        expect(result.scale).toBe(20);
    });

    it("computes the offset so the anchor stays fixed", () => {
        // newOffset = anchor * (1 - factor) + offset * factor
        // x: 200 * (1 - 2) + 100 * 2 = -200 + 200 = 0
        // y: 200 * (1 - 2) +  50 * 2 = -200 + 100 = -100
        const result = zoom(baseCamera, 2, anchor);
        expect(result.offset).toEqual({ x: 0, y: -100 });
    });

    it("keeps the anchor's model point under the anchor after zoom", () => {
        // Anchor invariance stated directly: the model point that sits under the
        // anchor before zoom must project back to the same screen anchor after.
        // model = (screen - offset) / scale  (per-axis, ignoring Y-flip — camera-only check)
        const factor = 2.5;
        const modelX = (anchor.x - baseCamera.offset.x) / baseCamera.scale;

        const zoomed = zoom(baseCamera, factor, anchor);
        const screenXAfter = modelX * zoomed.scale + zoomed.offset.x;

        expect(screenXAfter).toBeCloseTo(anchor.x);
    });

    it("does not mutate the input camera", () => {
        zoom(baseCamera, 2, anchor);
        expect(baseCamera).toEqual({ scale: 10, offset: { x: 100, y: 50 } });
    });
});