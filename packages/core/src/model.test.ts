import { describe, expect, it } from "vitest";
import type { OpenPlcProgram } from "./model.js";

describe("OpenPLC node model", () => {
  it("keeps function block variables on pins", () => {
    const program: OpenPlcProgram = {
      name: "TimerDemo",
      diagram: {
        language: "fbd",
        bounds: { x: 0, y: 0, width: 420, height: 220 },
        nodes: [{
          id: "timer",
          type: "block",
          typeName: "TON",
          bounds: { x: 160, y: 60, width: 120, height: 100 },
          pins: [{
            id: "in",
            side: "input",
            name: "IN",
            variable: "Start",
            position: { x: 160, y: 90 },
          }],
        }],
        edges: [],
      },
    };
    expect(program.diagram.nodes[0].pins?.[0].variable).toBe("Start");
  });
});
