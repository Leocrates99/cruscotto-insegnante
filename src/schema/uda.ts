import type { SchemaDef } from "../types";
import { ANNI_CORSO, CICLI, EDUCAZIONE_CIVICA, METODOLOGIE, STATO_CICLO, STRUMENTI_SPAZI, VERIFICA_FORMATIVA } from "./_shared";

/**
 * UdA — Unità didattica di apprendimento (§4, §7). Contenitore delle Lezioni.
 * Riceve la relazione inversa "Programmazione" (dalla duale su Programmazione).
 * Stesso livello di arricchimento didattico della lezione (conoscenze/abilità/
 * competenze, metodologie, strumenti, compiti, educazione civica, raccordi),
 * più gli elementi propri dell'UdA (competenza attesa, prodotto, compito di realtà).
 * Due catene di rollup: ore pianificate e copertura obiettivi.
 */
export const uda: SchemaDef = {
  key: "uda",
  title: "UdA",
  icon: "🧩",
  description: "Unità didattica: competenza attesa, prodotto, conoscenze/abilità/competenze, lezioni, ciclo di vita (§7).",
  properties: {
    Titolo: { type: "title" },
    "Competenza attesa": { type: "rich_text" },
    "Prodotto atteso": { type: "rich_text" },
    "Compito di realtà": { type: "rich_text" },
    Prerequisiti: { type: "rich_text" },
    Conoscenze: { type: "rich_text" },
    "Abilità": { type: "rich_text" },
    Competenze: { type: "rich_text" },
    Metodologie: { type: "multi_select", options: METODOLOGIE },
    "Strumenti e spazi": { type: "multi_select", options: STRUMENTI_SPAZI },
    "Compiti ed esercizi": { type: "rich_text" },
    "Educazione civica": { type: "multi_select", options: EDUCAZIONE_CIVICA },
    "Raccordi interdisciplinari": { type: "multi_select", options: [] },
    "Inclusione (misure)": { type: "rich_text" },
    "Verifica formativa": { type: "select", options: VERIFICA_FORMATIVA },
    "Anno di corso": { type: "select", options: ANNI_CORSO },
    Ciclo: { type: "select", options: CICLI },
    Stato: { type: "select", options: STATO_CICLO },
    "Data inizio": { type: "date" },
    "Data fine": { type: "date" },
  },
  relations: [
    { name: "Anno scolastico", target: "anni" },
    { name: "Obiettivi", target: "obiettivi", dual: true, dualName: "UdA" },
    { name: "Lezioni", target: "lezioni", dual: true, dualName: "UdA" },
    { name: "Materiali", target: "materiali" },
  ],
  rollups: [
    { name: "Ore pianificate", relation: "Lezioni", target: "Durata (ore)", function: "sum" },
    { name: "Obiettivi totali", relation: "Obiettivi", function: "count" },
    { name: "Obiettivi verificati", relation: "Obiettivi", target: "Verificato", function: "checked" },
  ],
  formulas: [
    {
      name: "Copertura %",
      expression:
        'if(prop("Obiettivi totali") == 0, 0, round(prop("Obiettivi verificati") / prop("Obiettivi totali") * 100))',
    },
  ],
};
