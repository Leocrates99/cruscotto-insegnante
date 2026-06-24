import { useSyncExternalStore } from "react";
import { MATERIE } from "@model";
import type { Ordine } from "../data/concorso";

/** Una scuola del docente: corrente o passata (più scuole insieme = più "correnti"). */
export interface ScuolaProfilo {
  id: string;
  nome: string;
  ordine: Ordine;
  indirizzo?: string; // id indirizzo liceale (assente per le medie)
  corrente: boolean;
}

/** Una cella dell'orario di lavoro settimanale ricorrente. */
export interface OrarioSlot {
  giorno: number; // 0=lun … 6=dom
  fascia: string; // label della fascia oraria (es. "1ª ora")
  materia?: string;
  classe?: string;
}

/** Uno studente anonimo: identificato dal SOLO numero di registro (no nome/cognome obbligatori). */
export interface StudenteAnon {
  n: number;
  l104?: boolean;
  bes?: boolean;
  dsa?: boolean;
  nome?: string; // facoltativo, solo locale
}
/** Anagrafica di una classe: l'elenco per numero di registro. */
export interface ClasseInfo {
  studenti: StudenteAnon[];
}

/** Profilo del docente: scuole, classi di concorso e materie pertinenti (web-local). */
export interface Profile {
  onboarded: boolean;
  docente: string;
  scuole: ScuolaProfilo[];
  concorsi: string[]; // codici classe di concorso, es. "A-13"
  materie: string[]; // materie confermate → guidano i menù a tendina
  classi: string[]; // etichette delle classi del docente (es. "IV A")
  classeMaterie?: Record<string, string[]>; // SINOLO classe↔materie: le materie che insegni in quella classe
  classiInfo?: Record<string, ClasseInfo>; // anagrafica per classe (numeri di registro + 104/BES/DSA)
  orario: OrarioSlot[]; // tabella oraria di lavoro settimanale
  coloriMaterie?: Record<string, string>;
  coloriClassi?: Record<string, string>;
  /** a.s. per cui l'assetto (orario/classi/materie) è stato confermato "definitivo" (sempre modificabile). */
  assettoConfermato?: string;
}

const KEY = "cruscotto-profile:v1";
const DEFAULTS: Profile = { onboarded: false, docente: "", scuole: [], concorsi: [], materie: [], classi: [], orario: [] };

function load(): Profile {
  try {
    const s = localStorage.getItem(KEY);
    return s ? { ...DEFAULTS, ...(JSON.parse(s) as Partial<Profile>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let profile = load();
const listeners = new Set<() => void>();

function commit(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* storage non disponibile */
  }
  listeners.forEach((l) => l());
}

export function getProfile(): Profile {
  return profile;
}
export function setProfile(patch: Partial<Profile>): void {
  profile = { ...profile, ...patch };
  commit();
}
export function subscribeProfile(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function useProfile(): Profile {
  return useSyncExternalStore(subscribeProfile, getProfile);
}

/** Solo le scuole correnti (per derivare l'universo di materie disponibili). */
export function scuoleCorrenti(p: Profile = profile): ScuolaProfilo[] {
  const cur = p.scuole.filter((s) => s.corrente);
  return cur.length ? cur : p.scuole;
}

/**
 * Materie che guidano i menù: quelle confermate nel profilo, altrimenti le 4 classiche
 * di default (così l'app resta usabile prima della profilazione).
 */
export function materieAttive(p: Profile = profile): string[] {
  return p.materie.length ? p.materie : MATERIE.map((m) => m.name);
}

/** Classi del docente (working set per i menù). */
export function classiAttive(p: Profile = profile): string[] {
  return p.classi;
}

/** Anagrafica di una classe (vuota se non compilata). */
export function classeInfo(label: string, p: Profile = profile): ClasseInfo {
  return p.classiInfo?.[label] ?? { studenti: [] };
}

/** SINOLO: le materie che il docente insegna in quella classe (esplicite dal profilo). */
export function materieDiClasse(label: string, p: Profile = profile): string[] {
  return p.classeMaterie?.[label] ?? [];
}

/**
 * Materie "effettive" per una classe ai fini dei menù: l'associazione esplicita se c'è,
 * altrimenti tutte le materie del docente (così resta usabile prima di compilare il sinolo).
 */
export function materieClasseEffettive(label: string, p: Profile = profile): string[] {
  const ms = materieDiClasse(label, p);
  return ms.length ? ms : materieAttive(p);
}

/** Conteggi derivati dell'anagrafica di una classe. */
export function contiClasse(label: string, p: Profile = profile): { tot: number; l104: number; bes: number; dsa: number } {
  const s = classeInfo(label, p).studenti;
  return { tot: s.length, l104: s.filter((x) => x.l104).length, bes: s.filter((x) => x.bes).length, dsa: s.filter((x) => x.dsa).length };
}
