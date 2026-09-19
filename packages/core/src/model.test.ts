import { describe, expect, it } from "vitest";
import type { OpenPlcProgram } from "./model.js";

describe("OpenPLC node model", () => {
  it("models FBD variables as independent nodes", () => {
    const program: OpenPlcProgram = {
      name: "TimerDemo",
      diagram: {
        language: "fbd",
        bounds: { x: 0, y: 0, width: 420, height: 220 },
        nodes: [
          { id: "start", type: "variable", label: "Start", typeName: "BOOL", bounds: { x: 20, y: 80, width: 80, height: 28 } },
          { id: "timer", type: "block", typeName: "TON", bounds: { x: 160, y: 60, width: 120, height: 100 }, pins: [{ id: "in", side: "input", name: "IN", position: { x: 160, y: 90 } }] },
        ],
        edges: [],
      },
    };
    expect(program.diagram.nodes.find((node) => node.id === "start")?.type).toBe("variable");
    expect("variable" in (program.diagram.nodes.find((node) => node.id === "timer")?.pins?.[0] ?? {})).toBe(false);
  });
});