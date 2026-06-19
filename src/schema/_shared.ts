import type { OptionDef } from "../types";

/** Materie del profilo docente (Latino, Greco, Italiano, Geostoria). */
export const MATERIE: OptionDef[] = [
  { name: "Latino", color: "orange" },
  { name: "Greco", color: "blue" },
  { name: "Italiano", color: "green" },
  { name: "Geostoria", color: "brown" },
];

/**
 * Ciclo di vita a stati (§7): la stessa pipeline per Lezioni, UdA e Progetti.
 * IDEA → BOZZA → PROGETTATA → CALENDARIZZATA → IN SVOLGIMENTO → SVOLTA → VALUTATA → ARCHIVIATA
 */
export const STATO_CICLO: OptionDef[] = [
  { name: "Idea", color: "gray" },
  { name: "Bozza", color: "brown" },
  { name: "Progettata", color: "orange" },
  { name: "Calendarizzata", color: "yellow" },
  { name: "In svolgimento", color: "blue" },
  { name: "Svolta", color: "purple" },
  { name: "Valutata", color: "pink" },
  { name: "Archiviata", color: "green" },
];

/** Livelli cognitivi (tassonomia di Bloom rivista, §4.2). */
export const LIVELLI_BLOOM: OptionDef[] = [
  { name: "Ricordare", color: "gray" },
  { name: "Comprendere", color: "brown" },
  { name: "Applicare", color: "yellow" },
  { name: "Analizzare", color: "orange" },
  { name: "Valutare", color: "purple" },
  { name: "Creare", color: "red" },
];

/** Anno di corso (livello del curricolo, I–V), distinto dall'anno scolastico (§6). */
export const ANNI_CORSO: OptionDef[] = [
  { name: "I", color: "blue" },
  { name: "II", color: "blue" },
  { name: "III", color: "green" },
  { name: "IV", color: "green" },
  { name: "V", color: "green" },
];

/** Ciclo del liceo: il biennio e il triennio hanno obiettivi e strumenti diversi. */
export const CICLI: OptionDef[] = [
  { name: "Biennio", color: "yellow" },
  { name: "Triennio", color: "purple" },
];
