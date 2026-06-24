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

/** Profilo del docente: scuole, classi di concorso e materie pertinenti (web-local). */
export interface Profile {
  onboarded: boolean;
  docente: string;
  scuole: ScuolaProfilo[];
  concorsi: string[]; // codici classe di concorso, es. "A-13"
  materie: string[]; // materie confermate → guidano i menù a tendina
  classi: string[]; // etichette delle classi del docente (es. "IV A")
  orario: OrarioSlot[]; // tabella oraria di lavoro settimanale
  coloriMaterie?: Record<string, string>;
  coloriClassi?: Record<string, string>;
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
