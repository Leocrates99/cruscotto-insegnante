import { describe, it, expect } from "vitest";
import { distribuzione, maxIndicatore, puntiIndicatore, round, votoDaPercentuale, votoRiga } from "./voto";
import type { Griglia, Indicatore, ScalaVoto } from "../store/valutazione";

const scala: ScalaVoto = { votoMin: 2, votoMax: 10, sufficienza: 6, sogliaSuff: 60, arrotondamento: 0.25, curva: "sufficienza" };

describe("voto — mappatura percentuale → voto", () => {
  it("0% → votoMin, soglia → sufficienza, 100% → votoMax", () => {
    expect(votoDaPercentuale(0, scala)).toBe(2);
    expect(votoDaPercentuale(0.6, scala)).toBe(6);
    expect(votoDaPercentuale(1, scala)).toBe(10);
  });
  it("a metà soglia: a metà tra minimo e sufficienza", () => {
    expect(votoDaPercentuale(0.3, scala)).toBe(4);
  });
  it("curva lineare", () => {
    expect(votoDaPercentuale(0.5, { ...scala, curva: "lineare" })).toBe(6);
  });
  it("arrotondamento allo step", () => {
    expect(round(4.3, 0.5)).toBe(4.5);
    expect(round(5.12, 0.25)).toBe(5);
  });
});

describe("voto — indicatori", () => {
  const punti: Indicatore = { id: "p", nome: "E1", tipo: "punti", max: 5, peso: 2 };
  const liv: Indicatore = { id: "l", nome: "Crit", tipo: "livelli", peso: 1, descrittori: [
    { etichetta: "Insuff", punti: 0 }, { etichetta: "Suff", punti: 1 }, { etichetta: "Ottimo", punti: 3 },
  ] };
  it("punti: max e punteggio con peso e clamp", () => {
    expect(maxIndicatore(punti)).toBe(10);
    expect(puntiIndicatore(punti, 3)).toBe(6);
    expect(puntiIndicatore(punti, 99)).toBe(10);
  });
  it("livelli: max e punteggio per indice descrittore", () => {
    expect(maxIndicatore(liv)).toBe(3);
    expect(puntiIndicatore(liv, 2)).toBe(3);
    expect(puntiIndicatore(liv, undefined)).toBe(0);
  });
});

describe("voto — riga e distribuzione", () => {
  const g: Griglia = {
    id: "g", nome: "x", categoria: "esercizi", scala,
    indicatori: [
      { id: "e1", nome: "E1", tipo: "punti", max: 5 },
      { id: "e2", nome: "E2", tipo: "punti", max: 5 },
    ],
  };
  it("votoRiga: punti/max/pct e voto coerente", () => {
    const r = votoRiga(g, { id: "r", valori: { e1: 5, e2: 1 } });
    expect(r.punti).toBe(6);
    expect(r.max).toBe(10);
    expect(r.pct).toBeCloseTo(0.6);
    expect(r.voto).toBe(6);
  });
  it("distribuzione: conta sufficienti, min e max", () => {
    const righe = [
      { id: "a", valori: { e1: 5, e2: 5 } },
      { id: "b", valori: { e1: 3, e2: 0 } },
      { id: "c", valori: { e1: 5, e2: 1 } },
    ];
    const d = distribuzione(g, righe);
    expect(d.n).toBe(3);
    expect(d.sufficienti).toBe(2);
    expect(d.min).toBe(4);
    expect(d.max).toBe(10);
  });
});
