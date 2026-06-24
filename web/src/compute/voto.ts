// Calcolo del voto a partire da una griglia (esercizi a punti o rubrica a livelli) e
// dai punteggi di una riga di correzione. La "curva a sufficienza" è il bilanciamento:
// spostando la soglia % per la sufficienza si rende la prova più facile o più difficile.

import type { Griglia, Indicatore, RigaCorrezione, ScalaVoto } from "../store/valutazione";

/** Punteggio massimo di un indicatore (gestisce punti vs livelli, col peso). */
export function maxIndicatore(ind: Indicatore): number {
  const peso = ind.peso ?? 1;
  if (ind.tipo === "punti") return (ind.max ?? 0) * peso;
  const m = (ind.descrittori ?? []).reduce((mx, d) => Math.max(mx, d.punti), 0);
  return m * peso;
}

/** Punteggio ottenuto da un indicatore dato il valore inserito. */
export function puntiIndicatore(ind: Indicatore, v: number | undefined): number {
  const peso = ind.peso ?? 1;
  if (v === undefined || Number.isNaN(v)) return 0;
  if (ind.tipo === "punti") return Math.min(Math.max(v, 0), ind.max ?? 0) * peso;
  return ((ind.descrittori ?? [])[v]?.punti ?? 0) * peso;
}

export function round(x: number, step: number): number {
  if (!step) return Math.round(x * 100) / 100;
  return Math.round(x / step) * step;
}

/** Mappa una percentuale di punteggio [0..1] sul voto, secondo la scala/curva. */
export function votoDaPercentuale(pct: number, scala: ScalaVoto): number {
  const p = Math.min(Math.max(pct, 0), 1);
  const { votoMin, votoMax, sufficienza } = scala;
  let v: number;
  if (scala.curva === "lineare") {
    v = votoMin + p * (votoMax - votoMin);
  } else {
    const s = Math.min(Math.max(scala.sogliaSuff / 100, 0.01), 0.99);
    v = p <= s ? votoMin + (p / s) * (sufficienza - votoMin) : sufficienza + ((p - s) / (1 - s)) * (votoMax - sufficienza);
  }
  return round(Math.min(Math.max(v, votoMin), votoMax), scala.arrotondamento);
}

export interface VotoRiga {
  punti: number;
  max: number;
  pct: number;
  voto: number;
}
export function votoRiga(griglia: Griglia, riga: RigaCorrezione): VotoRiga {
  let punti = 0;
  let max = 0;
  for (const ind of griglia.indicatori) {
    punti += puntiIndicatore(ind, riga.valori[ind.id]);
    max += maxIndicatore(ind);
  }
  const pct = max > 0 ? punti / max : 0;
  return { punti: Math.round(punti * 100) / 100, max, pct, voto: votoDaPercentuale(pct, griglia.scala) };
}

/** Una riga è "compilata" se ha almeno un valore inserito (per la distribuzione). */
export function rigaCompilata(riga: RigaCorrezione): boolean {
  return Object.values(riga.valori).some((v) => typeof v === "number" && !Number.isNaN(v));
}

export interface Distribuzione {
  n: number;
  sufficienti: number;
  pctSuff: number;
  media: number;
  min: number;
  max: number;
}
export function distribuzione(griglia: Griglia, righe: RigaCorrezione[]): Distribuzione {
  const voti = righe.map((r) => votoRiga(griglia, r).voto);
  const n = voti.length;
  if (n === 0) return { n: 0, sufficienti: 0, pctSuff: 0, media: 0, min: 0, max: 0 };
  const sufficienti = voti.filter((v) => v >= griglia.scala.sufficienza).length;
  const somma = voti.reduce((a, b) => a + b, 0);
  return {
    n,
    sufficienti,
    pctSuff: Math.round((sufficienti / n) * 100),
    media: Math.round((somma / n) * 100) / 100,
    min: Math.min(...voti),
    max: Math.max(...voti),
  };
}
