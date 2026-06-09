import { notion, withRetry } from "./notion";
import { setDbState } from "./state";
import { schemas } from "../schema";
import type { Manifest } from "../types";

/**
 * Ricostruisce il manifest leggendo i database già presenti SOTTO la pagina-genitore
 * e abbinandoli per TITOLO agli schemi. È ciò che rende il sistema idempotente anche
 * senza file di stato locale (es. in CI, dove `notion-state.json` non è versionato):
 * i database esistenti vengono riconosciuti e non ricreati.
 *
 * Limite noto: l'abbinamento è per titolo del database. Se rinomini il titolo di un
 * database direttamente nell'app, il riconoscimento salta e un nuovo `build` ne
 * creerebbe un doppione. Non rinominare i titoli dei database a mano.
 */
export async function hydrateManifestFromWorkspace(
  parentPageId: string,
  manifest: Manifest
): Promise<number> {
  const byTitle = new Map(schemas.map((s) => [s.title, s]));
  let found = 0;
  let cursor: string | undefined;

  do {
    const res = (await withRetry(
      () => notion.blocks.children.list({ block_id: parentPageId, start_cursor: cursor, page_size: 100 }),
      "elenco figli della pagina-genitore"
    )) as {
      results: Array<{ id: string; type: string; child_database?: { title: string } }>;
      has_more: boolean;
      next_cursor: string | null;
    };

    for (const block of res.results) {
      if (block.type !== "child_database" || !block.child_database) continue;
      const schema = byTitle.get(block.child_database.title);
      if (!schema || manifest[schema.key]) continue;

      // Per un blocco child_database, block.id È l'id del database.
      const db = (await withRetry(
        () => notion.databases.retrieve({ database_id: block.id }),
        `recupero data source di "${block.child_database!.title}"`
      )) as { id: string; data_sources?: Array<{ id: string }> };

      const dataSourceId = db.data_sources?.[0]?.id;
      if (!dataSourceId) continue;

      setDbState(manifest, schema.key, { databaseId: db.id, dataSourceId });
      found++;
    }

    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return found;
}
