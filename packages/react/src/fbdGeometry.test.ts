import { describe, expect, it } from "vitest";
import { normalizeBlockPins, orthogonalPath } from "./fbdGeometry.js";

describe("FBD geometry normalization", () => {
  it("distributes overlapping pins and places them on the block sides", () => {
    const bounds = { x: 200, y: 50, width: 210, height: 180 };
    const pins = normalizeBlockPins(bounds, [
      { id: "a", name: "A", side: "input", position: { x: 200, y: 80 } },
      { id: "b", name: "B", side: "input", position: { x: 200, y: 80 } },
      { id: "q", name: "Q", side: "output", position: { x: 270, y: 80 } },
    ]);

    expect(pins[0].position).toEqual({ x: 200, y: 80 });
    expect(pins[1].position).toEqual({ x: 200, y: 215 });
    expect(pins[2].position).toEqual({ x: 410, y: 80 });
  });

  it("keeps valid distinct pin heights", () => {
    const pins = normalizeBlockPins(
      { x: 100, y: 20, width: 120, height: 100 },
      [
        { id: "a", name: "A", side: "input", position: { x: 100, y: 50 } },
        { id: "b", name: "B", side: "input", position: { x: 100, y: 90 } },
      ],
    );

    expect(pins.map((pin) => pin.position.y)).toEqual([50, 90]);
  });

  it("aligns a connection with its normalized pin using orthogonal segments", () => {
    const points = orthogonalPath(
      { x: 100, y: 70 },
      { x: 260, y: 100 },
      [{ x: 100, y: 70 }, { x: 180, y: 70 }, { x: 180, y: 140 }, { x: 260, y: 140 }],
    );

    expect(points[0]).toEqual({ x: 100, y: 70 });
    expect(points.at(-1)).toEqual({ x: 260, y: 100 });
    expect(points).toEqual([
      { x: 100, y: 70 },
      { x: 180, y: 70 },
      { x: 180, y: 100 },
      { x: 260, y: 100 },
    ]);
    expect(points.every((point, index) => index === 0 || point.x === points[index - 1].x || point.y === points[index - 1].y)).toBe(true);
  });
});

