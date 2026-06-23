import { notion, withRetry } from "./notion";
import { getDataSourceId } from "./state";
import type { Manifest, SchemaDef } from "../types";

/**
 * Passata 2 — aggiunge le proprietà-relazione a una data source.
 *
 * I target sono risolti dal manifest (devono esistere: passata 1 completata).
 * Le relazioni DUALI vanno dichiarate una sola volta (dal lato indicato nello
 * schema): Notion crea automaticamente la proprietà inversa sul target.
 *
 * Nota: in Notion una proprietà-relazione punta a UNA sola data source. I casi
 * "polimorfici" del prospetto (Scadenze → Programmazione|Progetto|Classe|UdA,
 * Idee → UdA|Lezione, Verifiche → UdA|Lezione) sono modellati come più relazioni
 * distinte e facoltative negli schemi (§13.6).
 */
export async function addRelations(def: SchemaDef, manifest: Manifest): Promise<number> {
  if (!def.relations?.length) return 0;
  const dataSourceId = getDataSourceId(manifest, def.key);

  const properties: Record<string, unknown> = {};
  for (const rel of def.relations) {
    const targetDataSourceId = getDataSourceId(manifest, rel.target);
    if (rel.dual) {
      properties[rel.name] = {
        type: "relation",
        relation: {
          data_source_id: targetDataSourceId,
          type: "dual_property",
          dual_property: rel.dualName ? { synced_property_name: rel.dualName } : {},
        },
      };
    } else {
      properties[rel.name] = {
        type: "relation",
        relation: {
          data_source_id: targetDataSourceId,
          type: "single_property",
          single_property: {},
        },
      };
    }
  }

  await withRetry(
    () => notion.dataSources.update({ data_source_id: dataSourceId, properties: properties as never }),
    `relazioni di "${def.title}"`
  );
  return def.relations.length;
}
