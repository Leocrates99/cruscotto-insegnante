// Strumento di valutazione (web-local). Una "Griglia" unifica il calcolatore a esercizi
// (indicatori a PUNTI con un massimo) e le rubriche (indicatori a LIVELLI con descrittori).
// I voti NON sono nominativi (§9): le righe di correzione sono anonime e restano sul dispositivo.

import { useSyncExternalStore } from "react";
import { newId } from "./store";

export interface Descrittore {
  etichetta: string;
  punti: number;
}

export interface Indicatore {
  id: string;
  nome: string;
  tipo: "punti" | "livelli";
  max?: number; // tipo "punti": punteggio massimo
  descrittori?: Descrittore[]; // tipo "livelli"
  peso?: number; // default 1
}

export interface ScalaVoto {
  votoMin: number;
  votoMax: number;
  sufficienza: number;
  sogliaSuff: number; // % dei punti per la sufficienza (il "bilanciamento" facilità/difficoltà)
  arrotondamento: number; // 0.25 | 0.5 | 1
  curva: "sufficienza" | "lineare";
}

export type Categoria = "esercizi" | "scritto" | "orale" | "scrutinio-materia" | "condotta" | "altro";

export interface Griglia {
  id: string;
  nome: string;
  categoria: Categoria;
  indicatori: Indicatore[];
  scala: ScalaVoto;
}

/** Una riga di correzione: candidato anonimo. valori[indId] = punti (tipo punti) | indice descrittore (livelli). */
export interface RigaCorrezione {
  id: string;
  etichetta?: string;
  valori: Record<string, number>;
}

interface ValutazioneState {
  griglie: Griglia[];
  bozze: Record<string, RigaCorrezione[]>;
}

export const SCALA_DEFAULT: ScalaVoto = {
  votoMin: 2,
  votoMax: 10,
  sufficienza: 6,
  sogliaSuff: 60,
  arrotondamento: 0.25,
  curva: "sufficienza",
};

const LIVELLI_GENERICI: Descrittore[] = [
  { etichetta: "Insufficiente", punti: 0 },
  { etichetta: "Sufficiente", punti: 1 },
  { etichetta: "Buono", punti: 2 },
  { etichetta: "Ottimo", punti: 3 },
];

const indLivelli = (nome: string): Indicatore => ({ id: newId(), nome, tipo: "livelli", descrittori: LIVELLI_GENERICI.map((d) => ({ ...d })), peso: 1 });
const indPunti = (nome: string, max: number): Indicatore => ({ id: newId(), nome, tipo: "punti", max, peso: 1 });

/** Modelli-scheletro NEUTRI: la struttura è generica, da personalizzare coi propri indicatori (PTOF). */
function seedGriglie(): Griglia[] {
  const scala = () => ({ ...SCALA_DEFAULT });
  return [
    { id: newId(), nome: "Verifica a esercizi", categoria: "esercizi", scala: scala(), indicatori: [indPunti("Esercizio 1", 5), indPunti("Esercizio 2", 5), indPunti("Esercizio 3", 5)] },
    { id: newId(), nome: "Scritto — modello da personalizzare (PTOF)", categoria: "scritto", scala: scala(), indicatori: [indLivelli("Aderenza alla consegna"), indLivelli("Correttezza linguistica"), indLivelli("Contenuti"), indLivelli("Organizzazione")] },
    { id: newId(), nome: "Orale — modello da personalizzare (PTOF)", categoria: "orale", scala: scala(), indicatori: [indLivelli("Conoscenze"), indLivelli("Esposizione"), indLivelli("Rielaborazione e collegamenti")] },
    { id: newId(), nome: "Scrutinio · voto di materia — modello (PTOF)", categoria: "scrutinio-materia", scala: scala(), indicatori: [indLivelli("Conoscenze"), indLivelli("Competenze"), indLivelli("Impegno e partecipazione"), indLivelli("Progressione")] },
    { id: newId(), nome: "Scrutinio · condotta — modello (PTOF)", categoria: "condotta", scala: scala(), indicatori: [indLivelli("Rispetto delle regole"), indLivelli("Partecipazione"), indLivelli("Relazioni e collaborazione")] },
  ];
}

const KEY = "cruscotto-valutazione:v1";

function load(): ValutazioneState {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const parsed = JSON.parse(s) as Partial<ValutazioneState>;
      return { griglie: parsed.griglie?.length ? parsed.griglie : seedGriglie(), bozze: parsed.bozze ?? {} };
    }
  } catch {
    /* storage non disponibile */
  }
  return { griglie: seedGriglie(), bozze: {} };
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

// ── Griglie ──────────────────────────────────────────────────────────────────
export function upsertGriglia(g: Griglia): void {
  const i = state.griglie.findIndex((x) => x.id === g.id);
  const griglie = i >= 0 ? state.griglie.map((x) => (x.id === g.id ? g : x)) : [...state.griglie, g];
  state = { ...state, griglie };
  commit();
}
export function removeGriglia(id: string): void {
  const { [id]: _omit, ...bozze } = state.bozze;
  state = { griglie: state.griglie.filter((g) => g.id !== id), bozze };
  commit();
}
export function nuovaGriglia(categoria: Categoria = "esercizi"): Griglia {
  return { id: newId(), nome: "Nuova griglia", categoria, scala: { ...SCALA_DEFAULT }, indicatori: [] };
}
export function importGriglie(list: Griglia[]): void {
  // accoda assegnando nuovi id (evita collisioni con quelle esistenti)
  const withIds = list.map((g) => ({ ...g, id: newId(), indicatori: g.indicatori.map((i) => ({ ...i, id: newId() })) }));
  state = { ...state, griglie: [...state.griglie, ...withIds] };
  commit();
}

// ── Bozze di correzione (anonime) ────────────────────────────────────────────
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
