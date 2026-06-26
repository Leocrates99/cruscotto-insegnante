import { useSyncExternalStore } from "react";

/**
 * La "bussola" annuale: la programmazione didattica di una materia per una classe,
 * in un anno scolastico. Local-first (localStorage), come gli altri store del Cruscotto.
 * Le voci scelte sono ID dell'archivio (mai mostrati: si risolvono in `testo`).
 */
export interface Bussola {
  id: string;           // `${materia}|${classe}|${annoScol}`
  materia: string;
  classe: string;
  annoScol: string;     // etichetta a.s.
  vociIds: string[];    // contenuti/competenze scelti per l'anno
  note: string;
  data: string;         // ISO ultima modifica
  confermata: boolean;  // la bussola è stata convalidata dal docente
}

const KEY = "cruscotto-programmazione:v1";

function load(): Record<string, Bussola> {
  try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as Record<string, Bussola>) : {}; }
  catch { return {}; }
}

let store = load();
const listeners = new Set<() => void>();
function commit(): void {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage off */ }
  listeners.forEach((l) => l());
}

export const bussolaId = (materia: string, classe: string, annoScol: string) => `${materia}|${classe}|${annoScol}`;

export function getBussola(materia: string, classe: string, annoScol: string): Bussola | undefined {
  return store[bussolaId(materia, classe, annoScol)];
}
export function upsertBussola(b: Bussola): void {
  store = { ...store, [b.id]: { ...b, data: new Date().toISOString() } };
  commit();
}
export function removeBussola(id: string): void {
  const n = { ...store }; delete n[id]; store = n; commit();
}
/** Le bussole confermate per un dato anno scolastico (per gli adempimenti). */
export function bussoleConfermate(annoScol: string): Bussola[] {
  return Object.values(store).filter((b) => b.annoScol === annoScol && b.confermata);
}

export function subscribeProgrammazione(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export function useProgrammazione(): Record<string, Bussola> {
  return useSyncExternalStore(subscribeProgrammazione, () => store);
}
