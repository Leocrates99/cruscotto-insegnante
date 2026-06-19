import type { SchemaDef } from "../types";
import { ANNI_CORSO, CICLI, MATERIE } from "./_shared";

/**
 * Programmazione annuale — un record per abbinamento classe-materia (§4.1).
 * Catena di sostenibilità oraria (§13.8 A): somma le ore delle UdA e le confronta
 * col monte ore, con un semaforo che avverte se si pianifica oltre il consentito.
 */
export const programmazione: SchemaDef = {
  key: "programmazione",
  title: "Programmazione annuale",
  icon: "🗂️",
  description: "Il piano di lavoro annuale: finalità, scansione in UdA, monte ore, criteri (§4.1).",
  properties: {
    Titolo: { type: "title" },
    Materia: { type: "select", options: MATERIE },
    "Anno di corso": { type: "select", options: ANNI_CORSO },
    Ciclo: { type: "select", options: CICLI },
    "Monte ore": { type: "number" },
    "Finalità generali": { type: "rich_text" },
    "Strumenti di verifica": {
      type: "multi_select",
      options: [
        { name: "versione", color: "blue" },
        { name: "traduzione", color: "blue" },
        { name: "analisi del testo", color: "purple" },
        { name: "testo argomentativo", color: "pink" },
        { name: "tema", color: "pink" },
        { name: "interrogazione orale", color: "green" },
        { name: "questionario", color: "orange" },
        { name: "prova strutturata", color: "yellow" },
        { name: "prova esperta", color: "red" },
        { name: "mappa concettuale", color: "brown" },
      ],
    },
    Stato: {
      type: "select",
      options: [
        { name: "bozza", color: "gray" },
        { name: "approvata", color: "blue" },
        { name: "in svolgimento", color: "yellow" },
        { name: "archiviata", color: "green" },
      ],
    },
  },
  relations: [
    { name: "Anno scolastico", target: "anni" },
    { name: "Classe", target: "classi" },
    { name: "Competenze attese", target: "obiettivi" },
    { name: "Moduli/UdA", target: "uda", dual: true, dualName: "Programmazione" },
    { name: "Criteri/griglie di valutazione", target: "sapere" },
  ],
  // Rollup-di-rollup: somma "Ore pianificate" (a sua volta rollup) delle UdA.
  // Se l'API lo rifiuta, la passata 3 logga un avviso (vedi README §Limiti noti).
  rollups: [{ name: "Ore UdA totali", relation: "Moduli/UdA", target: "Ore pianificate", function: "sum" }],
  formulas: [
    { name: "Scostamento", expression: 'prop("Monte ore") - prop("Ore UdA totali")' },
    {
      name: "Semaforo",
      expression:
        'if(prop("Scostamento") < 0, "⚠ oltre il monte ore", if(prop("Scostamento") == 0, "● pieno", "○ margine"))',
    },
  ],
};
