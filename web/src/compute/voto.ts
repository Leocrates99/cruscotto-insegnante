// Calcolo del voto da una griglia. Supporta scale multiple, più formule di conversione,
// arrotondamenti e regole; griglie a curva (percentuale → voto) e a fasce (punteggio → voto).

import type { ArrotondaModo, Fascia, FormulaId, Griglia, Indicatore, RigaCorrezione, ScalaVoto } from "../store/valutazione";

export interface ScalaPreset {
  nome: string;
  votoMin: number;
  votoMax: number;
  sufficienza: number;
  arrotondamento: number;
  labels?: string[];
}

export const SCALE_PRESETS: Record<string, ScalaPreset> = {
  decimi: { nome: "Decimi (1–10)", votoMin: 1, votoMax: 10, sufficienza: 6, arrotondamento: 0.25 },
  decimi0: { nome: "Decimi (0–10)", votoMin: 0, votoMax: 10, sufficienza: 6, arrotondamento: 0.5 },
  quindicesimi: { nome: "Quindicesimi (1–15)", votoMin: 1, votoMax: 15, sufficienza: 10, arrotondamento: 0.5 },
  ventesimi: { nome: "Ventesimi (0–20)", votoMin: 0, votoMax: 20, sufficienza: 12, arrotondamento: 0.5 },
  trentesimi: { nome: "Trentesimi (0–30)", votoMin: 0, votoMax: 30, sufficienza: 18, arrotondamento: 1 },
  centesimi: { nome: "Centesimi (0–100)", votoMin: 0, votoMax: 100, sufficienza: 60, arrotondamento: 1 },
  lettere: { nome: "Lettere (A–F)", votoMin: 0, votoMax: 5, sufficienza: 2, arrotondamento: 1, labels: ["F", "E", "D", "C", "B", "A"] },
  giudizi: { nome: "Giudizi", votoMin: 0, votoMax: 4, sufficienza: 2, arrotondamento: 1, labels: ["Grav. insuff.", "Insufficiente", "Sufficiente", "Buono", "Ottimo"] },
};

type Calc = (p: number, s: ScalaVoto) => number; // p in [0,1]
export const FORMULE: Record<FormulaId, { nome: string; desc: string; calc: Calc }> = {
  lineare: { nome: "Lineare", desc: "Proporzionale semplice", calc: (p, s) => s.votoMin + p * (s.votoMax - s.votoMin) },
  bilanciata: {
    nome: "Bilanciata",
    desc: "Soglia di sufficienza regolabile",
    calc: (p, s) => {
      const soglia = Math.min(Math.max(s.sogliaSuff / 100, 0.01), 0.99);
      return p <= soglia
        ? s.votoMin + (p / soglia) * (s.sufficienza - s.votoMin)
        : s.sufficienza + ((p - soglia) / (1 - soglia)) * (s.votoMax - s.sufficienza);
    },
  },
  generosa: { nome: "Generosa", desc: "Favorisce i punteggi medi", calc: (p, s) => s.votoMin + Math.pow(p, 0.75) * (s.votoMax - s.votoMin) },
  severa: { nome: "Severa", desc: "Penalizza i punteggi bassi", calc: (p, s) => s.votoMin + Math.pow(p, 1.4) * (s.votoMax - s.votoMin) },
  scalini: { nome: "A scalini", desc: "Fasce del 10%", calc: (p, s) => s.votoMin + Math.floor(p * 10) * ((s.votoMax - s.votoMin) / 10) },
};

export const ARROTONDAMENTI: Record<ArrotondaModo, string> = { vicino: "Al più vicino", eccesso: "Per eccesso", difetto: "Per difetto" };

const r2 = (x: number) => Math.round(x * 100) / 100;

export function round(x: number, step: number, modo: ArrotondaModo = "vicino"): number {
  if (!step) return r2(x);
  if (modo === "eccesso") return Math.ceil(x / step) * step;
  if (modo === "difetto") return Math.floor(x / step) * step;
  return Math.round(x / step) * step;
}

/** Punteggio massimo di un indicatore (punti vs livelli, col peso). */
export function maxIndicatore(ind: Indicatore): number {
  const peso = ind.peso ?? 1;
  if (ind.tipo === "punti") return (ind.max ?? 0) * peso;
  return (ind.descrittori ?? []).reduce((mx, d) => Math.max(mx, d.punti), 0) * peso;
}

/** Punteggio ottenuto da un indicatore dato il valore inserito. */
export function puntiIndicatore(ind: Indicatore, v: number | undefined): number {
  const peso = ind.peso ?? 1;
  if (v === undefined || Number.isNaN(v)) return 0;
  if (ind.tipo === "punti") return Math.min(Math.max(v, 0), ind.max ?? 0) * peso;
  return ((ind.descrittori ?? [])[v]?.punti ?? 0) * peso;
}

/** Mappa una percentuale di punteggio [0..1] sul voto, secondo la scala/curva. */
export function votoDaPercentuale(pct: number, scala: ScalaVoto): number {
  const p = Math.min(Math.max(pct, 0), 1);
  const f = FORMULE[scala.formula] ?? FORMULE.bilanciata;
  let v = round(f.calc(p, scala), scala.arrotondamento, scala.arrotondaModo);
  const minG = scala.votoMinGarantito ?? scala.votoMin;
  if (scala.quasiSuff && v >= scala.sufficienza - scala.arrotondamento && v < scala.sufficienza) v = scala.sufficienza;
  return Math.max(minG, Math.min(scala.votoMax, v));
}

export function votoDisplay(voto: number, scala: ScalaVoto): string {
  if (scala.labels && scala.labels.length) {
    const idx = Math.min(scala.labels.length - 1, Math.max(0, Math.round(voto)));
    return scala.labels[idx];
  }
  return voto.toLocaleString("it-IT", { maximumFractionDigits: scala.arrotondamento < 1 ? 2 : 0 });
}

/** La fascia che contiene il punteggio totale (griglie a fasce, es. condotta). */
export function fasciaDi(punti: number, scala: ScalaVoto): Fascia | undefined {
  const f = scala.fasce ?? [];
  return f.find((x) => punti >= x.min && punti <= x.max) ?? (punti > 0 ? f[0] : f[f.length - 1]);
}

export interface VotoRiga {
  punti: number;
  max: number;
  pct: number;
  voto: number;
  giudizio?: string;
}
export function votoRiga(griglia: Griglia, riga: RigaCorrezione): VotoRiga {
  let punti = 0;
  let max = 0;
  for (const ind of griglia.indicatori) {
    if (ind.attivo === false) continue;
    punti += puntiIndicatore(ind, riga.valori[ind.id]);
    max += maxIndicatore(ind);
  }
  if (griglia.scala.tipo === "fasce") {
    const f = fasciaDi(punti, griglia.scala);
    return { punti: r2(punti), max, pct: max > 0 ? punti / max : 0, voto: f?.voto ?? griglia.scala.votoMin, giudizio: f?.giudizio };
  }
  const pct = max > 0 ? punti / max : 0;
  return { punti: r2(punti), max, pct, voto: votoDaPercentuale(pct, griglia.scala) };
}

export function rigaCompilata(riga: RigaCorrezione): boolean {
  return Object.values(riga.valori).some((v) => typeof v === "number" && !Number.isNaN(v));
}

/** Quanti punti servono per un voto-obiettivo (per "arrivare alla sufficienza / al voto pieno"). */
export function calcoloInverso(votoTarget: number, scala: ScalaVoto, maxPunti?: number): { pct: number | null; punti: number | null } {
  if (scala.tipo === "fasce") {
    const f = (scala.fasce ?? []).find((x) => x.voto === votoTarget) ?? (scala.fasce ?? []).find((x) => votoTarget <= x.voto);
    return { pct: null, punti: f ? f.min : null };
  }
  const f = FORMULE[scala.formula] ?? FORMULE.bilanciata;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f.calc(mid, scala) < votoTarget) lo = mid;
    else hi = mid;
  }
  const pct = (lo + hi) / 2;
  return { pct, punti: maxPunti != null ? r2(pct * maxPunti) : null };
}

export interface RigaTabella {
  punti: number;
  pct: number;
  voto: number;
  suff: boolean;
}
export function tabellaConversione(maxPunti: number, scala: ScalaVoto, steps = 20): RigaTabella[] {
  const rows: RigaTabella[] = [];
  const tot = maxPunti > 0 ? maxPunti : 100;
  for (let i = 0; i <= steps; i++) {
    const punti = (tot / steps) * i;
    const pct = punti / tot;
    const voto = scala.tipo === "fasce" ? fasciaDi(punti, scala)?.voto ?? scala.votoMin : votoDaPercentuale(pct, scala);
    rows.push({ punti: r2(punti), pct, voto, suff: voto >= scala.sufficienza });
  }
  return rows;
}

export interface Distribuzione {
  n: number;
  sufficienti: number;
  pctSuff: number;
  media: number;
  min: number;
  max: number;
  devStd: number;
}
export function distribuzione(griglia: Griglia, righe: RigaCorrezione[]): Distribuzione {
  const voti = righe.map((r) => votoRiga(griglia, r).voto);
  const n = voti.length;
  if (n === 0) return { n: 0, sufficienti: 0, pctSuff: 0, media: 0, min: 0, max: 0, devStd: 0 };
  const sufficienti = voti.filter((v) => v >= griglia.scala.sufficienza).length;
  const media = voti.reduce((a, b) => a + b, 0) / n;
  const devStd = Math.sqrt(voti.reduce((s, v) => s + (v - media) ** 2, 0) / n);
  return {
    n,
    sufficienti,
    pctSuff: Math.round((sufficienti / n) * 100),
    media: r2(media),
    min: Math.min(...voti),
    max: Math.max(...voti),
    devStd: r2(devStd),
  };
}
