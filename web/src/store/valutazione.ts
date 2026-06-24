// Strumento di valutazione (web-local). Una "Griglia" unifica il calcolatore a esercizi
// (indicatori a PUNTI con un massimo) e le rubriche (indicatori a LIVELLI con descrittori),
// più le griglie a fasce di punteggio (es. condotta). Scala con presets, formule e regole.
//
// PRIVACY: i nomi degli studenti sono ammessi ma restano SOLO sul dispositivo (questo store
// non entra nel backup automatico né nell'export griglie). Avviso esplicito nell'UI.

import { useSyncExternalStore } from "react";
import { newId } from "./store";
import { seedGriglie } from "../data/modelliValutazione";

export interface Descrittore {
  etichetta: string;
  punti: number;
}

export interface Indicatore {
  id: string;
  nome: string;
  descrizione?: string;
  tipo: "punti" | "livelli";
  max?: number; // tipo "punti"
  descrittori?: Descrittore[]; // tipo "livelli"
  peso?: number; // default 1
  attivo?: boolean; // default true
}

export interface Fascia {
  min: number;
  max: number;
  voto: number;
  giudizio?: string;
  colore?: string;
}

export type FormulaId = "lineare" | "bilanciata" | "generosa" | "severa" | "scalini";
export type ArrotondaModo = "vicino" | "eccesso" | "difetto";

export interface ScalaVoto {
  preset?: string;
  votoMin: number;
  votoMax: number;
  sufficienza: number;
  sogliaSuff: number; // % dei punti per la sufficienza (bilanciamento)
  arrotondamento: number; // step
  arrotondaModo: ArrotondaModo;
  formula: FormulaId;
  votoMinGarantito?: number;
  quasiSuff?: boolean;
  labels?: string[]; // scale a giudizi/lettere
  tipo: "curva" | "fasce";
  fasce?: Fascia[]; // tipo "fasce": il voto = fascia che contiene il punteggio totale
}

export type Categoria = "esercizi" | "scritto" | "orale" | "scrutinio-materia" | "condotta" | "altro";

export interface Griglia {
  id: string;
  nome: string;
  categoria: Categoria;
  indicatori: Indicatore[];
  scala: ScalaVoto;
}

/** Riga di correzione: un candidato. nome/classe ammessi ma solo locali. */
export interface RigaCorrezione {
  id: string;
  nome?: string;
  classe?: string;
  valori: Record<string, number>; // [indId] = punti (tipo punti) | indice descrittore (livelli)
}

interface ValutazioneState {
  griglie: Griglia[];
  bozze: Record<string, RigaCorrezione[]>;
  consentiNomi: boolean;
}

export const SCALA_DEFAULT: ScalaVoto = {
  preset: "decimi",
  votoMin: 1,
  votoMax: 10,
  sufficienza: 6,
  sogliaSuff: 60,
  arrotondamento: 0.25,
  arrotondaModo: "vicino",
  formula: "bilanciata",
  votoMinGarantito: 1,
  quasiSuff: false,
  tipo: "curva",
};

const KEY = "cruscotto-valutazione:v2";

function load(): ValutazioneState {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const p = JSON.parse(s) as Partial<ValutazioneState>;
      return { griglie: p.griglie?.length ? p.griglie : seedGriglie(), bozze: p.bozze ?? {}, consentiNomi: p.consentiNomi ?? true };
    }
  } catch {
    /* storage non disponibile */
  }
  return { griglie: seedGriglie(), bozze: {}, consentiNomi: true };
}

let state = load();
const listeners = new Set<() => void>();

function commit(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignora */
  }
  listeners.forEach((l) => l());
}

export function getValutazione(): ValutazioneState {
  return state;
}
export function subscribeValutazione(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function useValutazione(): ValutazioneState {
  return useSyncExternalStore(subscribeValutazione, getValutazione);
}

export function setConsentiNomi(v: boolean): void {
  state = { ...state, consentiNomi: v };
  commit();
}

// ── Griglie ──────────────────────────────────────────────────────────────────
export function upsertGriglia(g: Griglia): void {
  const i = state.griglie.findIndex((x) => x.id === g.id);
  const griglie = i >= 0 ? state.griglie.map((x) => (x.id === g.id ? g : x)) : [...state.griglie, g];
  state = { ...state, griglie };
  commit();
}
export function removeGriglia(id: string): void {
  const bozze = { ...state.bozze };
  delete bozze[id];
  state = { ...state, griglie: state.griglie.filter((g) => g.id !== id), bozze };
  commit();
}
export function nuovaGriglia(categoria: Categoria = "esercizi"): Griglia {
  return { id: newId(), nome: "Nuova griglia", categoria, scala: { ...SCALA_DEFAULT }, indicatori: [] };
}
export function importGriglie(list: Griglia[]): void {
  const withIds = list.map((g) => ({ ...g, id: newId(), indicatori: (g.indicatori ?? []).map((i) => ({ ...i, id: newId() })) }));
  state = { ...state, griglie: [...state.griglie, ...withIds] };
  commit();
}

// ── Bozze di correzione (locali) ─────────────────────────────────────────────
export function getBozza(grigliaId: string): RigaCorrezione[] {
  return state.bozze[grigliaId] ?? [];
}
export function setBozza(grigliaId: string, righe: RigaCorrezione[]): void {
  state = { ...state, bozze: { ...state.bozze, [grigliaId]: righe } };
  commit();
}
export function svuotaBozza(grigliaId: string): void {
  setBozza(grigliaId, []);
}

export { newId };
