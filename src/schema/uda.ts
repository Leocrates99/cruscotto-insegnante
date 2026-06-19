import type { SchemaDef } from "../types";
import { ANNI_CORSO, CICLI, STATO_CICLO } from "./_shared";

/**
 * UdA — Unità didattica di apprendimento (§4, §7). Contenitore delle Lezioni.
 * Riceve la relazione inversa "Programmazione" (dalla duale su Programmazione).
 * Due catene di rollup:
 *  - sostenibilità oraria: "Ore pianificate" = somma delle ore delle Lezioni;
 *  - copertura obiettivi: quanti obiettivi dichiarati hanno almeno una verifica.
 */
export const uda: SchemaDef = {
  key: "uda",
  title: "UdA",
  icon: "🧩",
  description: "Unità didattica: competenza attesa, obiettivi, lezioni, ciclo di vita a stati (§7).",
  properties: {
    Titolo: { type: "title" },
    "Competenza attesa": { type: "rich_text" },
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
  ],
  rollups: [
    { name: "Ore pianificate", relation: "Lezioni", target: "Durata (ore)", function: "sum" },
    { name: "Obiettivi totali", relation: "Obiettivi", function: "count" },
    // "checked" conta gli Obiettivi collegati con Verificato = true.
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
