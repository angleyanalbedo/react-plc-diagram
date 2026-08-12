import { describe, expect, it } from "vitest";
import { parsePlcOpenXml, PLCOPEN_XML_201_NAMESPACE } from "./index.js";

describe("parsePlcOpenXml", () => {
  it("discovers FBD and LD POUs", () => {
    const result = parsePlcOpenXml(`<project xmlns="${PLCOPEN_XML_201_NAMESPACE}"><types><pous><pou name="Main" pouType="program"><body><FBD /></body></pou><pou name="Safety" pouType="program"><body><LD /></body></pou></pous></types></project>`);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.pous.map(({ language }) => language)).toEqual(["fbd", "ld"]);
  });

  it("rejects DTD input", () => {
    expect(parsePlcOpenXml("<!DOCTYPE project><project />").ok).toBe(false);
  });
});
