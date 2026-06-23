import { describe, it, expect } from "vitest";
import { concorsiPerScuole, materieProfilo, materieScuola, type ScuolaRef } from "./concorso";

const classico: ScuolaRef = { ordine: "liceo", indirizzo: "classico" };
const scientifico: ScuolaRef = { ordine: "liceo", indirizzo: "scientifico" };
const media: ScuolaRef = { ordine: "media" };

describe("concorso — derivazione delle materie", () => {
  it("A-13 al Liceo Classico → italiano, latino, greco, storia e geografia, storia", () => {
    const m = materieProfilo([classico], ["A-13"]);
    expect(m).toContain("Lingua e letteratura italiana");
    expect(m).toContain("Lingua e cultura latina");
    expect(m).toContain("Lingua e cultura greca");
    expect(m).toContain("Storia e geografia (biennio)");
    expect(m).toContain("Storia (triennio)");
  });

  it("A-13 non porta materie scientifiche", () => {
    const m = materieProfilo([classico], ["A-13"]);
    expect(m).not.toContain("Matematica");
    expect(m).not.toContain("Fisica");
  });

  it("il greco è esclusivo del classico", () => {
    expect(materieScuola([classico])).toContain("Lingua e cultura greca");
    expect(materieScuola([scientifico])).not.toContain("Lingua e cultura greca");
  });

  it("il selettore delle classi di concorso è filtrato sul contesto", () => {
    const codes = concorsiPerScuole([classico]);
    expect(codes).toContain("A-13");
    expect(codes).not.toContain("A-41"); // informatica (Scienze Applicate) non esiste al classico
  });

  it("alle medie, A-12 → italiano, storia, geografia", () => {
    const m = materieProfilo([media], ["A-12"]);
    expect(m).toEqual(expect.arrayContaining(["Italiano", "Storia", "Geografia"]));
  });

  it("senza scuole indicate, ricade sulle materie della classe di concorso", () => {
    expect(materieProfilo([], ["A-13"]).length).toBeGreaterThan(0);
  });

  it("nessuna classe di concorso → nessuna materia", () => {
    expect(materieProfilo([classico], [])).toEqual([]);
  });
});
