import type { SchemaDef } from "../types";
import { MATERIE } from "./_shared";

/**
 * Verifiche — formative (territorio naturale di Notion) e bozze di sommative.
 * MAI voti nominativi: qui sta la progettazione e l'esito qualitativo di classe
 * (§4.3, §9). "Obiettivi verificati" è duale verso Obiettivi: genera lì la
 * relazione "Verifiche" che alimenta il rollup di copertura.
 */
export const verifiche: SchemaDef = {
  key: "verifiche",
  title: "Verifiche",
  icon: "✅",
  description: "Verifiche formative e bozze di sommative; mai voti nominativi (§4.3, §9).",
  properties: {
    Titolo: { type: "title" },
    Materia: { type: "select", options: MATERIE },
    Tipo: {
      type: "select",
      options: [
        { name: "formativa", color: "green" },
        { name: "sommativa-bozza", color: "orange" },
      ],
    },
    Tipologia: {
      type: "select",
      options: [
        { name: "interrogazione orale", color: "green" },
        { name: "colloquio", color: "green" },
        { name: "esposizione", color: "green" },
        { name: "versione", color: "blue" },
        { name: "analisi del testo (Tip. A)", color: "purple" },
        { name: "testo argomentativo (Tip. B)", color: "pink" },
        { name: "tema (Tip. C)", color: "pink" },
        { name: "questionario", color: "orange" },
        { name: "prova semistrutturata", color: "yellow" },
        { name: "prova esperta", color: "red" },
      ],
    },
    Modalità: {
      type: "select",
      options: [
        { name: "traduzione guidata", color: "blue" },
        { name: "mappa", color: "purple" },
        { name: "exit ticket", color: "yellow" },
        { name: "domanda flash", color: "pink" },
        { name: "autocorrezione in coppia", color: "green" },
        { name: "commento orale", color: "orange" },
      ],
    },
    "Esito qualitativo": { type: "rich_text" },
  },
  relations: [
    { name: "Anno scolastico", target: "anni" },
    { name: "UdA", target: "uda" },
    { name: "Lezione", target: "lezioni" },
    { name: "Obiettivi verificati", target: "obiettivi", dual: true, dualName: "Verifiche" },
  ],
};
