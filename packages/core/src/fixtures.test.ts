import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsePlcOpenXml } from "./index.js";

function fixture(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../../fixtures/plcopen-xml/${relativePath}`, import.meta.url)), "utf8");
}

describe("PLCopen XML fixtures", () => {
  it.each([
    ["fbd/basic-logic.xml", "BasicLogic", "fbd"],
    ["fbd/timer-ton.xml", "DelayedFan", "fbd"],
    ["ld/basic-rung.xml", "BasicRung", "ld"],
    ["ld/motor-latch.xml", "MotorLatch", "ld"],
  ] as const)("parses %s", (path, name, language) => {
    const result = parsePlcOpenXml(fixture(path));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.pous).toEqual([expect.objectContaining({ name, language })]);
    expect(result.document.diagnostics).toEqual([]);
  });

  it("warns for a non-PLCopen namespace", () => {
    const result = parsePlcOpenXml(fixture("invalid/wrong-namespace.xml"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.diagnostics.map(({ code }) => code)).toContain("NAMESPACE_UNSUPPORTED");
  });

  it("reports unresolved local references", () => {
    const result = parsePlcOpenXml(fixture("invalid/unresolved-reference.xml"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.diagnostics).toContainEqual(expect.objectContaining({ code: "REFERENCE_UNRESOLVED", localId: "999" }));
  });
});
