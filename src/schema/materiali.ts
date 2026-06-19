import type { SchemaDef } from "../types";
import { CICLI, MATERIE } from "./_shared";

/**
 * Materiali — il serbatoio (M4). Anno-neutro: si riusa negli anni, quindi NON
 * porta la relazione Anno (§6). I file pesanti restano su Drive; qui vive il link.
 */
export const materiali: SchemaDef = {
  key: "materiali",
  title: "Materiali",
  icon: "📚",
  yearNeutral: true,
  description: "Versioni, testi, esercizi, schede, prove, attività — catalogati una volta (M4).",
  properties: {
    Titolo: { type: "title" },
    Tipo: {
      type: "select",
      options: [
        { name: "versione", color: "blue" },
        { name: "testo", color: "purple" },
        { name: "analisi del testo", color: "purple" },
        { name: "antologia", color: "purple" },
        { name: "esercizio", color: "yellow" },
        { name: "verifica", color: "red" },
        { name: "traccia", color: "red" },
        { name: "scheda", color: "green" },
        { name: "mappa concettuale", color: "brown" },
        { name: "linea del tempo", color: "orange" },
        { name: "carta/atlante", color: "orange" },
        { name: "fonte storica", color: "pink" },
        { name: "presentazione", color: "gray" },
        { name: "laboratorio", color: "orange" },
      ],
    },
    Materia: { type: "select", options: MATERIE },
    Ciclo: { type: "select", options: CICLI },
    Argomento: { type: "rich_text" },
    Difficoltà: {
      type: "select",
      options: [
        { name: "bassa", color: "green" },
        { name: "media", color: "yellow" },
        { name: "alta", color: "red" },
      ],
    },
    Origine: {
      type: "select",
      options: [
        { name: "manuale", color: "default" },
        { name: "progettazione-didattica", color: "blue" },
        { name: "libro di testo", color: "green" },
        { name: "web", color: "gray" },
      ],
    },
    "Fonte/autore": { type: "rich_text" },
    Tag: { type: "multi_select", options: [] },
    "Link al file": { type: "url" },
  },
};
