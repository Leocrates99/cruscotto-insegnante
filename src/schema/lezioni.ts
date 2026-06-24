import type { OptionDef, SchemaDef } from "../types";
import { MATERIE, STATO_CICLO } from "./_shared";

/** Metodologie didattiche (per la progettazione della lezione/attività). */
const METODOLOGIE: OptionDef[] = [
  { name: "lezione frontale", color: "gray" },
  { name: "lezione dialogata", color: "blue" },
  { name: "cooperative learning", color: "green" },
  { name: "flipped classroom", color: "purple" },
  { name: "debate", color: "pink" },
  { name: "problem solving", color: "orange" },
  { name: "brainstorming", color: "yellow" },
  { name: "peer tutoring", color: "green" },
  { name: "didattica laboratoriale", color: "orange" },
  { name: "studio guidato", color: "blue" },
  { name: "role playing", color: "pink" },
  { name: "EAS (episodio di apprendimento situato)", color: "purple" },
];

/** Strumenti e spazi della lezione. */
const STRUMENTI: OptionDef[] = [
  { name: "libro di testo", color: "green" },
  { name: "LIM / monitor", color: "blue" },
  { name: "fotocopie / schede", color: "gray" },
  { name: "dizionario", color: "brown" },
  { name: "dispositivi / BYOD", color: "purple" },
  { name: "laboratorio", color: "orange" },
  { name: "audiovisivi", color: "pink" },
  { name: "mappe / schemi", color: "yellow" },
  { name: "piattaforma e-learning", color: "blue" },
  { name: "biblioteca", color: "brown" },
];

/**
 * Lezioni — la singola seduta (M3). Riceve la relazione inversa "UdA".
 * "Data prevista" e "Data effettiva" sono distinte per il confronto previsto/svolto;
 * "Durata (ore)" alimenta il rollup "Ore pianificate" dell'UdA (§7.3).
 * Progettazione didattica strutturata: prerequisiti, conoscenze/abilità/competenze,
 * fasi, metodologie, strumenti, compiti/esercizi, inclusione, verifica formativa.
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
    "Strumenti e spazi": { type: "multi_select", options: STRUMENTI },
    "Compiti ed esercizi": { type: "rich_text" },
    "Consegna compiti": { type: "date" },
    "Inclusione (misure)": { type: "rich_text" },
    "Verifica formativa": {
      type: "select",
      options: [
        { name: "domande flash", color: "yellow" },
        { name: "exit ticket", color: "yellow" },
        { name: "esercitazione", color: "blue" },
        { name: "interrogazione breve", color: "green" },
        { name: "correzione collettiva", color: "green" },
        { name: "prova semistrutturata", color: "orange" },
        { name: "autovalutazione", color: "purple" },
      ],
    },
    "Esito/riflessione": { type: "rich_text" },
  },
  relations: [
    { name: "Anno scolastico", target: "anni" },
    { name: "Classe", target: "classi" },
    { name: "Materiali", target: "materiali", dual: true, dualName: "Lezioni" },
  ],
};
