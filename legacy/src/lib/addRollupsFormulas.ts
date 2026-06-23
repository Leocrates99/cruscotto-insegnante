import { notion, withRetry, describeError } from "./notion";
import { getDataSourceId } from "./state";
import { schemas } from "../schema";
import type { Manifest, RollupDef, SchemaDef } from "../types";

interface Options {
  /** Se false, i fallimenti (attesi al primo giro) non vengono segnalati. */
  logWarnings: boolean;
}

/**
 * Passata 3 — aggiunge rollup e formule a una data source.
 *
 * I rollup sono creati uno per uno dentro un try/catch: un rollup "fragile"
 * (es. rollup-di-rollup, vedi README §Limiti noti) non blocca gli altri. La
 * passata 3 viene eseguita due volte dall'orchestratore, perché alcuni rollup
 * dipendono da rollup di altri DB creati più avanti nell'ordine di build.
 */
export async function addRollupsAndFormulas(
  def: SchemaDef,
  manifest: Manifest,
  opts: Options
): Promise<number> {
  const rollups = def.rollups ?? [];
  const formulas = def.formulas ?? [];
  if (rollups.length === 0 && formulas.length === 0) return 0;

  const dataSourceId = getDataSourceId(manifest, def.key);
  let applied = 0;

  for (const r of rollups) {
    const property = buildRollupProperty(def, r);
    try {
      await withRetry(
        () =>
          notion.dataSources.update({
            data_source_id: dataSourceId,
            properties: { [r.name]: property } as never,
          }),
        `rollup "${r.name}" su "${def.title}"`
      );
      applied++;
    } catch (err) {
      if (opts.logWarnings) {
        console.warn(
          `  ⚠ rollup "${r.name}" su "${def.title}" non creato automaticamente ` +
            `(${describeError(err)}). Completalo a mano nell'app — vedi README §Limiti noti.`
        );
      }
    }
  }

  if (formulas.length > 0) {
    const properties: Record<string, unknown> = {};
    for (const f of formulas) {
      properties[f.name] = { type: "formula", formula: { expression: f.expression } };
    }
    try {
      await withRetry(
        () => notion.dataSources.update({ data_source_id: dataSourceId, properties: properties as never }),
        `formule di "${def.title}"`
      );
      applied += formulas.length;
    } catch (err) {
      if (opts.logWarnings) {
        console.warn(
          `  ⚠ formule di "${def.title}" non create (${describeError(err)}). Vedi README §Limiti noti.`
        );
      }
    }
  }

  return applied;
}

/** Costruisce il payload di una proprietà rollup risolvendo il nome del target. */
function buildRollupProperty(def: SchemaDef, r: RollupDef) {
  const rollupPropertyName = r.target ?? titlePropertyOf(targetKeyOfRelation(def, r.relation));
  return {
    type: "rollup",
    rollup: {
      relation_property_name: r.relation,
      rollup_property_name: rollupPropertyName,
      function: r.function,
    },
  };
}

/**
 * Trova la chiave del DB di destinazione di una relazione, per nome.
 * La relazione può essere dichiarata su questo schema, oppure essere l'INVERSA
 * di una relazione duale dichiarata su un altro schema (caso dei conteggi, es.
 * Obiettivi."Verifiche" generata da Verifiche."Obiettivi verificati").
 */
function targetKeyOfRelation(def: SchemaDef, relationName: string) {
  const direct = def.relations?.find((x) => x.name === relationName);
  if (direct) return direct.target;
  for (const s of schemas) {
    for (const x of s.relations ?? []) {
      if (x.dual && x.target === def.key && x.dualName === relationName) return s.key;
    }
  }
  throw new Error(
    `Relazione "${relationName}" non trovata su "${def.key}" per il rollup. ` +
      `Controlla i nomi in src/schema/${def.key}.ts.`
  );
}

function titlePropertyOf(key: string): string {
  const s = schemas.find((x) => x.key === key);
  if (!s) throw new Error(`Schema "${key}" non trovato.`);
  const titleEntry = Object.entries(s.properties).find(([, p]) => p.type === "title");
  if (!titleEntry) throw new Error(`Nessuna proprietà "title" in "${key}".`);
  return titleEntry[0];
}
