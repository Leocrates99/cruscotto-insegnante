import type { SchemaDef } from "../types";
import { ANNI_CORSO, CICLI } from "./_shared";

/** Classi — dimensione trasversale (programmazione, lezioni, osservazioni). */
export const classi: SchemaDef = {
  key: "classi",
  title: "Classi",
  icon: "🏛️",
  description: "Identificativo di classe (es. 'IV classico'); nessun dato anagrafico di studenti (§9).",
  properties: {
    Titolo: { type: "title" },
    Indirizzo: {
      type: "select",
      options: [
        { name: "Classico", color: "blue" },
        { name: "Scientifico", color: "green" },
        { name: "Scienze umane", color: "orange" },
      ],
    },
    "Anno di corso": { type: "select", options: ANNI_CORSO },
    Ciclo: { type: "select", options: CICLI },
    Note: { type: "rich_text" },
  },
};
