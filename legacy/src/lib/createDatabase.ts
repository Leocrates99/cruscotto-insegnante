import { notion, withRetry } from "./notion";
import { toNotionProps } from "./props";
import type { DbState, SchemaDef } from "../types";

/**
 * Passata 1 — crea il database (contenitore) con la sua data source e le sole
 * proprietà base (niente relazioni/rollup/formule). Restituisce databaseId e
 * dataSourceId da salvare nel manifest.
 *
 * Nota SDK v5 / API 2025-09-03: lo schema iniziale si passa in
 * `initial_data_source.properties`; le proprietà aggiuntive (relazioni, rollup,
 * formule) si aggiungono poi con `dataSources.update` (passate 2 e 3).
 */
export async function createDatabase(parentPageId: string, def: SchemaDef): Promise<DbState> {
  const res = await withRetry(
    () =>
      notion.databases.create({
        parent: { type: "page_id", page_id: parentPageId },
        title: [{ type: "text", text: { content: def.title } }],
        icon: def.icon ? { type: "emoji", emoji: def.icon as never } : undefined,
        // L'unione dei tipi-proprietà è ampia e versione-sensibile: castiamo solo
        // QUESTO campo. I nomi degli altri campi restano validati dal type-check.
        initial_data_source: { properties: toNotionProps(def.properties) as never },
      }),
    `crea database "${def.title}"`
  );

  const r = res as {
    id: string;
    data_sources?: Array<{ id: string }>;
    initial_data_source?: { id: string };
  };
  const databaseId = r.id;
  const dataSourceId = r.data_sources?.[0]?.id ?? r.initial_data_source?.id;
  if (!dataSourceId) {
    throw new Error(
      `Impossibile leggere il data_source_id per "${def.title}". ` +
        'Verifica la forma della risposta di "databases.create" nell\'SDK installato.'
    );
  }
  return { databaseId, dataSourceId };
}
