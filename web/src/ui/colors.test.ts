import { describe, it, expect } from "vitest";
import { classeColor, materiaColor } from "./materia";

describe("colori — materie e classi", () => {
  it("materiaColor: nome canonico noto", () => {
    expect(materiaColor("Lingua e cultura greca")).toBe("#1800ac");
  });
  it("classeColor: definito e deterministico", () => {
    const a = classeColor("IV A");
    expect(a).toBeTruthy();
    expect(classeColor("IV A")).toBe(a);
  });
  it("classeColor: undefined per input vuoto", () => {
    expect(classeColor(undefined)).toBeUndefined();
  });
  it("classi diverse → colori (di norma) diversi", () => {
    const cols = ["I A", "II B", "III C", "IV D", "V E"].map((c) => classeColor(c));
    expect(new Set(cols).size).toBeGreaterThan(1);
  });
});
