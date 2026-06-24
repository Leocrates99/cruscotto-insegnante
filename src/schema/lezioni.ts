import type { SchemaDef } from "../types";
import { EDUCAZIONE_CIVICA, MATERIE, METODOLOGIE, STATO_CICLO, STRUMENTI_SPAZI, VERIFICA_FORMATIVA } from "./_shared";

/**
 * Lezioni — la singola seduta (M3). Riceve la relazione inversa "UdA".
 * "Data prevista" e "Data effettiva" sono distinte per il confronto previsto/svolto;
 * "Durata (ore)" alimenta il rollup "Ore pianificate" dell'UdA (§7.3).
 * Progettazione didattica strutturata: prerequisiti, conoscenze/abilità/competenze,
 * fasi, metodologie, strumenti, compiti/esercizi, educazione civica, raccordi
 * interdisciplinari, inclusione, verifica formativa.
 */
export const lezioni: SchemaDef = {
  key: "lezioni",
  title: "Lezioni",
  icon: "📘",
  description: "Progettazione della singola lezione: obiettivi, conoscenze/competenze, fasi, metodi, compiti, esito (M3).",
  properties: {
    Titolo: { type: "title" },
    Materia: { type: "select", options: MATERIE },
    "Data prevista": { type: "date" },
    "Data effettiva": { type: "date" },
    "Durata (ore)": { type: "number" },
    Stato: { type: "select", options: STATO_CICLO },
    Sequenza: { type: "number" },
    Prerequisiti: { type: "rich_text" },
    "Obiettivi della lezione": { type: "rich_text" },
    Conoscenze: { type: "rich_text" },
    "Abilità": { type: "rich_text" },
    Competenze: { type: "rich_text" },
    Fasi: { type: "rich_text" },
    Metodologie: { type: "multi_select", options: METODOLOGIE },
    "Strumenti e spazi": { type: "multi_select", options: STRUMENTI_SPAZI },
    "Compiti ed esercizi": { type: "rich_text" },
    "Consegna compiti": { type: "date" },
    "Educazione civica": { type: "multi_select", options: EDUCAZIONE_CIVICA },
    "Raccordi interdisciplinari": { type: "multi_select", options: [] },
    "Inclusione (misure)": { type: "rich_text" },
    "Verifica formativa": { type: "select", options: VERIFICA_FORMATIVA },
    "Esito/riflessione": { type: "rich_text" },
  },
  relations: [
    { name: "Anno scolastico", target: "anni" },
    { name: "Classe", target: "classi" },
    { name: "Materiali", target: "materiali", dual: true, dualName: "Lezioni" },
  ],
};
