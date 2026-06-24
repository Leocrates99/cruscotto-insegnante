// Avanzamento delle lezioni rispetto alla "tabella di marcia": confronta Data prevista,
// Data effettiva e Stato per capire se una lezione è in ritardo, in anticipo o in linea.

import { getRecord, type Rec } from "../store/store";

const toIds = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const toNum = (v: unknown): number => (typeof v === "number" ? v : Number.POSITIVE_INFINITY);

function iso(r: Rec, prop: string): string | undefined {
  const v = r[prop];
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined;
}
const oggi = (): string => new Date().toISOString().slice(0, 10);

export type LessonStato = "archiviata" | "svolta" | "in_anticipo" | "in_ritardo" | "da_svolgere";

const SVOLTE = new Set(["Svolta", "Valutata", "Archiviata"]);

/** Classifica una lezione rispetto alla data prevista e allo stato. */
export function lessonStato(l: Rec, today: string = oggi()): LessonStato {
  const stato = typeof l["Stato"] === "string" ? (l["Stato"] as string) : "";
  if (stato === "Archiviata") return "archiviata";
  const prevista = iso(l, "Data prevista");
  const effettiva = iso(l, "Data effettiva");
  if (SVOLTE.has(stato)) {
    if (prevista && effettiva && effettiva < prevista) return "in_anticipo";
    return "svolta";
  }
  if (prevista && prevista < today) return "in_ritardo";
  return "da_svolgere";
}

export interface UdaProgress {
  fatte: number;
  totali: number;
  pct: number;
  ritardi: number;
}

export function udaProgress(lezioni: Rec[], today: string = oggi()): UdaProgress {
  let fatte = 0;
  let ritardi = 0;
  for (const l of lezioni) {
    const s = lessonStato(l, today);
    if (s === "svolta" || s === "in_anticipo" || s === "archiviata") fatte++;
    else if (s === "in_ritardo") ritardi++;
  }
  const totali = lezioni.length;
  return { fatte, totali, pct: totali ? Math.round((fatte / totali) * 100) : 0, ritardi };
}

/** Lezioni collegate a una UdA, ordinate per Sequenza (poi per Data prevista). */
export function lessonsOfUda(uda: Rec): Rec[] {
  return toIds(uda["Lezioni"])
    .map((id) => getRecord("lezioni", id))
    .filter((l): l is Rec => Boolean(l))
    .sort((a, b) => toNum(a["Sequenza"]) - toNum(b["Sequenza"]) || (iso(a, "Data prevista") ?? "").localeCompare(iso(b, "Data prevista") ?? ""));
}

/** Titolo della classe collegata a una lezione (per il colore e l'etichetta). */
export function classeDiLezione(l: Rec): string | undefined {
  const id = toIds(l["Classe"])[0];
  if (!id) return undefined;
  const c = getRecord("classi", id);
  return c && typeof c["Titolo"] === "string" ? (c["Titolo"] as string) : undefined;
}
