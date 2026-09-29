import { describe, expect, it } from "vitest";
import {
  clampViewportScale,
  fitDiagramViewport,
  panDiagramViewport,
  resetDiagramViewport,
  zoomDiagramViewportAt,
} from "./viewport.js";

describe("diagram viewport", () => {
  it("honors custom zoom limits", () => {
    expect(clampViewportScale(0.1, 0.5, 2)).toBe(0.5);
    expect(clampViewportScale(4, 0.5, 2)).toBe(2);
  });

  it("fits a large diagram inside the available canvas", () => {
    const viewport = fitDiagramViewport(
      { x: 100, y: 50, width: 2000, height: 1000 },
      { width: 1000, height: 600 },
      20,
    );

    expect(viewport.scale).toBeCloseTo(0.48);
    expect(viewport.x).toBeCloseTo(58.3333);
    expect(viewport.y).toBeCloseTo(-75);
  });

  it("keeps the world position under the pointer fixed while zooming", () => {
    const viewport = { x: 100, y: 200, scale: 2 };
    const pointer = { x: 240, y: 120 };
    const before = {
      x: viewport.x + pointer.x / viewport.scale,
      y: viewport.y + pointer.y / viewport.scale,
    };
    const zoomed = zoomDiagramViewportAt(viewport, pointer, 1.5);

    expect(zoomed.x + pointer.x / zoomed.scale).toBeCloseTo(before.x);
    expect(zoomed.y + pointer.y / zoomed.scale).toBeCloseTo(before.y);
  });

  it("converts screen drag distance into world-space panning", () => {
    expect(panDiagramViewport({ x: 10, y: 20, scale: 2 }, { x: 40, y: -20 })).toEqual({
      x: -10,
      y: 30,
      scale: 2,
    });
  });

  it("centers a diagram at 100 percent", () => {
    expect(
      resetDiagramViewport(
        { x: 50, y: 25, width: 400, height: 200 },
        { width: 800, height: 500 },
      ),
    ).toEqual({ x: -150, y: -125, scale: 1 });
  });
});

