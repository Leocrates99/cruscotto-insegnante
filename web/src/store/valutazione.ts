// Strumento di valutazione (web-local). Una "Griglia" unifica il calcolatore a esercizi
// (indicatori a PUNTI con un massimo) e le rubriche (indicatori a LIVELLI con descrittori),
// più le griglie a fasce di punteggio (es. condotta). Scala con presets, formule e regole.
//
// PRIVACY: i nomi degli studenti sono ammessi ma restano SOLO sul dispositivo (questo store
// non entra nel backup automatico né nell'export griglie). Avviso esplicito nell'UI.

import { useSyncExternalStore } from "react";
import { newId } from "./store";
import { seedGriglie } from "../data/modelliValutazione";
import { mediaSessione } from "../compute/voto";

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

/** Riga di correzione: un candidato, identificato dal numero di registro. nome facoltativo e locale. */
export interface RigaCorrezione {
  id: string;
  n?: number; // numero di registro
  nome?: string;
  valori: Record<string, number>; // [indId] = punti (tipo punti) | indice descrittore (livelli)
}

/** Una sessione di correzione = una verifica di una classe (salvata per l'anno scolastico). */
export interface Sessione {
  id: string;
  classe: string;
  materia?: string;
  titolo: string;
  data: string; // ISO yyyy-mm-dd
  annoScolastico: string;
  griglia: Griglia; // struttura della verifica (anche mista punti + livelli)
  righe: RigaCorrezione[];
  archiviata?: boolean;
  conclusa?: boolean; // correzione chiusa (consultabile, riapribile)
}

/** Voce d'archivio: SOLO medie di classe (aggregati anonimi). */
export interface ArchivioVoce {
  annoScolastico: string;
  classe: string;
  materia?: string;
  titolo?: string; // presente = media di singola verifica; assente = media generale annuale
  data?: string;
  media: number;
  nStudenti?: number;
  nVerifiche?: number;
}

interface ValutazioneState {
  griglie: Griglia[]; // modelli/struttura di partenza
  sessioni: Sessione[];
  archivio: ArchivioVoce[];
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

const KEY = "cruscotto-valutazione:v3";

function load(): ValutazioneState {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const p = JSON.parse(s) as Partial<ValutazioneState>;
      return { griglie: p.griglie?.length ? p.griglie : seedGriglie(), sessioni: p.sessioni ?? [], archivio: p.archivio ?? [], consentiNomi: p.consentiNomi ?? true };
    }
  } catch {
    /* storage non disponibile */
  }
  return { griglie: seedGriglie(), sessioni: [], archivio: [], consentiNomi: true };
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
  state = { ...state, griglie: state.griglie.filter((g) => g.id !== id) };
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

// ── Anno scolastico ──────────────────────────────────────────────────────────
export function annoCorrente(d: Date = new Date()): string {
  const y = d.getFullYear();
  const start = d.getMonth() >= 8 ? y : y - 1; // settembre = mese 8
  const a = String(start % 100).padStart(2, "0");
  const b = String((start + 1) % 100).padStart(2, "0");
  return `a.s. ${a}/${b}`;
}

// ── Sessioni (verifiche per classe) ──────────────────────────────────────────
export function sessioniDi(classe: string, anno?: string): Sessione[] {
  return state.sessioni.filter((s) => s.classe === classe && (!anno || s.annoScolastico === anno));
}
export function getSessione(id: string): Sessione | undefined {
  return state.sessioni.find((s) => s.id === id);
}
export function upsertSessione(s: Sessione): void {
  const i = state.sessioni.findIndex((x) => x.id === s.id);
  state = { ...state, sessioni: i >= 0 ? state.sessioni.map((x) => (x.id === s.id ? s : x)) : [...state.sessioni, s] };
  commit();
}
export function removeSessione(id: string): void {
  state = { ...state, sessioni: state.sessioni.filter((s) => s.id !== id) };
  commit();
}

// ── Archivio (SOLO medie di classe, aggregati anonimi) ───────────────────────
/** Consolida nell'archivio le medie dell'anno: una per verifica + una generale per classe. */
export function archiviaAnno(anno: string): number {
  const voci: ArchivioVoce[] = [];
  const classi = Array.from(new Set(state.sessioni.filter((s) => s.annoScolastico === anno && !s.archiviata).map((s) => s.classe)));
  for (const classe of classi) {
    const sess = state.sessioni.filter((s) => s.annoScolastico === anno && s.classe === classe && !s.archiviata);
    const medie: number[] = [];
    for (const s of sess) {
      const m = mediaSessione(s);
      medie.push(m);
      voci.push({ annoScolastico: anno, classe, materia: s.materia, titolo: s.titolo, data: s.data, media: m, nStudenti: s.righe.length });
    }
    if (medie.length) {
      const gen = Math.round((medie.reduce((a, b) => a + b, 0) / medie.length) * 100) / 100;
      voci.push({ annoScolastico: anno, classe, media: gen, nVerifiche: medie.length });
    }
  }
  if (voci.length) {
    state = {
      ...state,
      archivio: [...state.archivio, ...voci],
      sessioni: state.sessioni.map((s) => (s.annoScolastico === anno ? { ...s, archiviata: true } : s)),
    };
    commit();
  }
  return voci.length;
}
export function removeArchivioVoce(i: number): void {
  state = { ...state, archivio: state.archivio.filter((_, j) => j !== i) };
  commit();
}

export { newId };
