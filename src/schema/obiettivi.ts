import type { SchemaDef } from "../types";
import { ANNI_CORSO, CICLI, LIVELLI_BLOOM, MATERIE } from "./_shared";

/**
 * Obiettivi — catalogo permanente e anno-neutro di obiettivi cognitivi (§4.2).
 * Lo stesso obiettivo si collega a più UdA e a più Verifiche.
 * Le proprietà-relazione "UdA" e "Verifiche" sono INVERSE generate dalle relazioni
 * duali dichiarate su UdA e Verifiche: alimentano i rollup qui sotto.
 */
export const obiettivi: SchemaDef = {
  key: "obiettivi",
  title: "Obiettivi",
  icon: "🎯",
  yearNeutral: true,
  description: "Obiettivi cognitivi riusabili, taggati per tipo, livello di Bloom e materia (§4.2).",
  properties: {
    Enunciato: { type: "title" },
    Tipo: {
      type: "select",
      options: [
        { name: "conoscenza", color: "gray" },
        { name: "abilità", color: "blue" },
        { name: "competenza", color: "green" },
      ],
    },
    "Livello cognitivo": { type: "select", options: LIVELLI_BLOOM },
    Materia: { type: "select", options: MATERIE },
    "Anno di corso": { type: "select", options: ANNI_CORSO },
    Ciclo: { type: "select", options: CICLI },
  },
  // "Verifiche" è la relazione inversa generata da Verifiche."Obiettivi verificati".
  rollups: [{ name: "n. verifiche", relation: "Verifiche", function: "count" }],
  formulas: [{ name: "Verificato", expression: 'prop("n. verifiche") > 0' }],
};
