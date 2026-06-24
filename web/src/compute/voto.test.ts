import { describe, it, expect } from "vitest";
import { SCALE_PRESETS, calcoloInverso, distribuzione, fasciaDi, maxIndicatore, puntiIndicatore, round, votoDaPercentuale, votoRiga } from "./voto";
import type { Griglia, Indicatore, ScalaVoto } from "../store/valutazione";

const scala: ScalaVoto = { preset: "decimi", votoMin: 2, votoMax: 10, sufficienza: 6, sogliaSuff: 60, arrotondamento: 0.25, arrotondaModo: "vicino", formula: "bilanciata", tipo: "curva" };

describe("voto — formule", () => {
  it("bilanciata: 0% → min, soglia → sufficienza, 100% → max", () => {
    expect(votoDaPercentuale(0, scala)).toBe(2);
    expect(votoDaPercentuale(0.6, scala)).toBe(6);
    expect(votoDaPercentuale(1, scala)).toBe(10);
    expect(votoDaPercentuale(0.3, scala)).toBe(4);
  });
  it("lineare", () => {
    expect(votoDaPercentuale(0.5, { ...scala, formula: "lineare" })).toBe(6);
  });
  it("generosa premia i medi, severa li penalizza", () => {
    expect(votoDaPercentuale(0.5, { ...scala, formula: "generosa" })).toBeGreaterThan(votoDaPercentuale(0.5, { ...scala, formula: "lineare" }));
    expect(votoDaPercentuale(0.5, { ...scala, formula: "severa" })).toBeLessThan(votoDaPercentuale(0.5, { ...scala, formula: "lineare" }));
  });
});

describe("voto — arrotondamenti", () => {
  it("vicino / eccesso / difetto", () => {
    expect(round(6.1, 0.25, "vicino")).toBe(6);
    expect(round(6.1, 0.25, "eccesso")).toBe(6.25);
    expect(round(6.1, 0.25, "difetto")).toBe(6);
    expect(round(4.3, 0.5, "vicino")).toBe(4.5);
  });
});

describe("voto — indicatori", () => {
  const punti: Indicatore = { id: "p", nome: "E1", tipo: "punti", max: 5, peso: 2 };
  const liv: Indicatore = { id: "l", nome: "Crit", tipo: "livelli", peso: 1, descrittori: [{ etichetta: "I", punti: 0 }, { etichetta: "S", punti: 1 }, { etichetta: "O", punti: 3 }] };
  it("punti con peso e clamp", () => {
    expect(maxIndicatore(punti)).toBe(10);
    expect(puntiIndicatore(punti, 3)).toBe(6);
    expect(puntiIndicatore(punti, 99)).toBe(10);
  });
  it("livelli per indice", () => {
    expect(maxIndicatore(liv)).toBe(3);
    expect(puntiIndicatore(liv, 2)).toBe(3);
    expect(puntiIndicatore(liv, undefined)).toBe(0);
  });
});

describe("voto — riga, inverso, distribuzione", () => {
  const g: Griglia = { id: "g", nome: "x", categoria: "esercizi", scala, indicatori: [
    { id: "e1", nome: "E1", tipo: "punti", max: 5 },
    { id: "e2", nome: "E2", tipo: "punti", max: 5 },
  ] };
  it("votoRiga", () => {
    const r = votoRiga(g, { id: "r", valori: { e1: 5, e2: 1 } });
    expect(r.punti).toBe(6);
    expect(r.max).toBe(10);
    expect(r.voto).toBe(6);
  });
  it("indicatore non attivo escluso dal max", () => {
    const g2: Griglia = { ...g, indicatori: [g.indicatori[0], { ...g.indicatori[1], attivo: false }] };
    expect(votoRiga(g2, { id: "r", valori: { e1: 5 } }).max).toBe(5);
  });
  it("calcoloInverso: punti per la sufficienza", () => {
    const inv = calcoloInverso(6, scala, 10);
    expect(inv.punti).toBeCloseTo(6, 0); // soglia 60% di 10
  });
  it("distribuzione conta sufficienti e dev. std", () => {
    const d = distribuzione(g, [
      { id: "a", valori: { e1: 5, e2: 5 } },
      { id: "b", valori: { e1: 3, e2: 0 } },
      { id: "c", valori: { e1: 5, e2: 1 } },
    ]);
    expect(d.n).toBe(3);
    expect(d.sufficienti).toBe(2);
    expect(d.devStd).toBeGreaterThan(0);
  });
});

describe("voto — scala a fasce (condotta) e preset", () => {
  const fasce: ScalaVoto = {
    preset: "decimi", votoMin: 5, votoMax: 10, sufficienza: 6, sogliaSuff: 60, arrotondamento: 1, arrotondaModo: "vicino", formula: "bilanciata", tipo: "fasce",
    fasce: [
      { min: 55, max: 60, voto: 10 }, { min: 48, max: 54, voto: 9 }, { min: 41, max: 47, voto: 8 },
      { min: 34, max: 40, voto: 7 }, { min: 25, max: 33, voto: 6 }, { min: 0, max: 24, voto: 5 },
    ],
  };
  it("il totale punti cade nella fascia giusta", () => {
    expect(fasciaDi(57, fasce)?.voto).toBe(10);
    expect(fasciaDi(50, fasce)?.voto).toBe(9);
    expect(fasciaDi(30, fasce)?.voto).toBe(6);
    expect(fasciaDi(10, fasce)?.voto).toBe(5);
  });
  it("preset disponibili", () => {
    expect(SCALE_PRESETS.quindicesimi.sufficienza).toBe(10);
    expect(SCALE_PRESETS.lettere.labels?.length).toBe(6);
  });
});
