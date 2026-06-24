import type { SchemaDef } from "../types";

/**
 * Riunioni e verbalizzazione (M11): appunti grezzi presi in consigli e collegi,
 * anticamera del verbale formale (che si protocolla altrove). Anno-specifico.
 */
export const riunioni: SchemaDef = {
  key: "riunioni",
  title: "Riunioni",
  icon: "🗣️",
  description: "Note grezze di consigli e collegi → bozza di verbale (M11).",
  properties: {
    Titolo: { type: "title" },
    Data: { type: "date" },
    Tipo: {
      type: "select",
      options: [
        { name: "consiglio di classe", color: "blue" },
        { name: "scrutinio", color: "red" },
        { name: "ricevimento genitori", color: "yellow" },
        { name: "collegio docenti", color: "purple" },
        { name: "dipartimento", color: "green" },
        { name: "GLO", color: "orange" },
        { name: "altro", color: "gray" },
      ],
    },
    "Note grezze": { type: "rich_text" },
  },
  relations: [
    { name: "Anno scolastico", target: "anni" },
    { name: "Classe", target: "classi" },
  ],
};
