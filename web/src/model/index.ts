// Riuso del modello condiviso (gli stessi file che generano lo schema Notion):
// tipi, definizioni dei 17 database, ordine di build e dati di esempio.
// Tutti privi di dipendenze da Node/Notion → impacchettabili per il browser.
export type {
  DbKey,
  SchemaDef,
  BasePropertyDef,
  RelationDef,
  RollupDef,
  FormulaDef,
  OptionDef,
  NotionColor,
} from "@root-src/types";

export { schemas, schemaByKey } from "@root-src/schema";
export { STATO_CICLO, MATERIE, LIVELLI_BLOOM, ANNI_CORSO, CICLI } from "@root-src/schema/_shared";
export { buildOrder } from "@root-config/buildOrder";
export { dataset, REL_SEP } from "@root-src/examples/data";
