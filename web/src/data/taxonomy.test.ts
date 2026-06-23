import { describe, it, expect } from "vitest";
import { MATERIE, dataset } from "@model";
import { obiettiviPerMateria } from "./catalog";
import { SLOT } from "./concorso";

// Guard di coerenza: tutte le fonti di "materia" devono parlare la stessa tassonomia.
// Questo test sarebbe FALLITO quando il profilo usava i nomi normativi e il seed i nomi brevi.
const canon = new Set(MATERIE.map((m) => m.name));
const materieCatalogoCdC = new Set(SLOT.map((s) => s.materia));

describe("coerenza della tassonomia delle materie", () => {
  it("ogni materia dei dati di esempio è una materia canonica", () => {
    const seedMaterie = new Set<string>();
    for (const rows of Object.values(dataset)) {
      for (const r of rows ?? []) if (r.Materia) seedMaterie.add(r.Materia);
    }
    for (const m of seedMaterie) expect(canon.has(m), `materia del seed fuori tassonomia: ${m}`).toBe(true);
  });

  it("ogni chiave del catalogo obiettivi è una materia canonica", () => {
    for (const k of Object.keys(obiettiviPerMateria)) expect(canon.has(k), `chiave catalogo fuori tassonomia: ${k}`).toBe(true);
  });

  it("ogni materia di default è producibile dal catalogo classi di concorso", () => {
    for (const m of canon) expect(materieCatalogoCdC.has(m), `materia di default non nel catalogo CdC: ${m}`).toBe(true);
  });
});
