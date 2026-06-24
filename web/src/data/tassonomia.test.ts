import { describe, it, expect } from "vitest";
import taxJson from "./tassonomia_3d.json";
import { bloomLabel, cercaObiettivi, cicloDaFase, materiaCodici, materieInsegnate, nucleiConObiettivi, obiettiviPerMateria, type Tassonomia } from "./tassonomia";

const T = taxJson as unknown as Tassonomia;

describe("tassonomia — ponti e query", () => {
  it("il dato è caricabile e completo", () => {
    expect(T.obiettivi.length).toBe(372);
    expect(T.insegnamenti.length).toBe(149);
  });

  it("materiaCodici mappa i nomi del cruscotto sui codici", () => {
    expect(materiaCodici(T, "Lingua e cultura greca")).toEqual(["GRC"]);
    expect(materiaCodici(T, "Storia e geografia (biennio)")).toEqual(["STO", "GEO"]);
    expect(materiaCodici(T, "Lingua e letteratura italiana")).toEqual(["ITA"]);
  });

  it("obiettiviPerMateria filtra per materia (e ciclo)", () => {
    expect(obiettiviPerMateria(T, "Lingua e cultura greca").length).toBe(35);
    expect(obiettiviPerMateria(T, "Lingua e letteratura italiana").length).toBe(55);
    const biennio = obiettiviPerMateria(T, "Lingua e letteratura italiana", { ciclo: "Biennio" });
    expect(biennio.length).toBeGreaterThan(0);
    expect(biennio.length).toBeLessThan(55);
    expect(biennio.every((o) => o.fase === "biennio" || o.fase === "quinquennio")).toBe(true);
  });

  it("filtra per indirizzo del profilo (ponte id→codice)", () => {
    const greco = obiettiviPerMateria(T, "Lingua e cultura greca", { indirizzoId: "classico" });
    expect(greco.length).toBe(35); // il greco è del classico
    expect(greco.every((o) => o.indirizzi.includes("LC"))).toBe(true);
  });

  it("cercaObiettivi: query vuota = tutti; nessun match = vuoto", () => {
    expect(cercaObiettivi(T, "", { materiaNome: "Lingua e cultura greca" }).length).toBe(35);
    expect(cercaObiettivi(T, "zzz-non-esiste-xyz", {}).length).toBe(0);
    const sub = cercaObiettivi(T, "sintassi", { materiaNome: "Lingua e cultura latina" });
    expect(sub.length).toBeGreaterThan(0);
  });

  it("materieInsegnate per classe di concorso e indirizzo", () => {
    const a13 = materieInsegnate(T, "A-13", "classico");
    expect(a13.length).toBeGreaterThan(0);
    expect(a13.some((i) => i.materia === "GRC")).toBe(true);
  });

  it("nucleiConObiettivi raggruppa per nucleo senza perdere obiettivi", () => {
    const gruppi = nucleiConObiettivi(T, "Lingua e cultura greca");
    expect(gruppi.length).toBeGreaterThan(1);
    expect(gruppi.every((g) => g.nucleo && g.obiettivi.length > 0)).toBe(true);
    expect(gruppi.reduce((s, g) => s + g.obiettivi.length, 0)).toBe(35);
  });

  it("helper Bloom e ciclo", () => {
    expect(bloomLabel("ricordare")).toBe("Ricordare");
    expect(bloomLabel(null)).toBeUndefined();
    expect(cicloDaFase("biennio")).toBe("Biennio");
    expect(cicloDaFase("triennio")).toBe("Triennio");
  });
});
