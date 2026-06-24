import { describe, it, expect } from "vitest";
import type { Rec } from "../store/store";
import { lessonStato, udaProgress } from "./progress";

const OGGI = "2026-06-24";
const lez = (p: Record<string, unknown>): Rec => ({ id: Math.random().toString(36), ...p }) as Rec;

describe("progress — classificazione lezioni", () => {
  it("in ritardo: data prevista passata e non svolta", () => {
    expect(lessonStato(lez({ "Data prevista": "2026-01-10", Stato: "Progettata" }), OGGI)).toBe("in_ritardo");
  });
  it("da svolgere: data futura, non svolta", () => {
    expect(lessonStato(lez({ "Data prevista": "2026-12-01", Stato: "Progettata" }), OGGI)).toBe("da_svolgere");
  });
  it("svolta: stato Svolta", () => {
    expect(lessonStato(lez({ "Data prevista": "2026-01-10", Stato: "Svolta" }), OGGI)).toBe("svolta");
  });
  it("in anticipo: effettiva prima della prevista", () => {
    expect(lessonStato(lez({ "Data prevista": "2026-06-10", "Data effettiva": "2026-06-05", Stato: "Svolta" }), OGGI)).toBe("in_anticipo");
  });
  it("archiviata: stato Archiviata", () => {
    expect(lessonStato(lez({ Stato: "Archiviata" }), OGGI)).toBe("archiviata");
  });

  it("udaProgress conta fatte, totali e ritardi", () => {
    const lezioni = [
      lez({ "Data prevista": "2026-01-10", Stato: "Svolta" }),
      lez({ "Data prevista": "2026-01-10", Stato: "Progettata" }), // ritardo
      lez({ "Data prevista": "2026-12-01", Stato: "Progettata" }), // da svolgere
    ];
    const p = udaProgress(lezioni, OGGI);
    expect(p).toMatchObject({ fatte: 1, totali: 3, ritardi: 1 });
    expect(p.pct).toBe(33);
  });
});
