import "dotenv/config";
import { notion, withRetry, describeError } from "./lib/notion";
import { loadManifest } from "./lib/state";
import { buildOrder } from "../config/buildOrder";
import { schemaByKey } from "./schema";

/**
 * Rilegge ogni data source dal manifest e stampa un riepilogo, confrontando il
 * numero di proprietà effettive con quelle attese dallo schema. Le relazioni
 * effettive includono anche le INVERSE (duali), quindi possono superare l'atteso:
 * il controllo "duro" è su rollup e formule, sintomo dell'eventuale fallback manuale.
 */
async function main() {
  const manifest = loadManifest();
  if (Object.keys(manifest).length === 0) {
    console.error('Manifest vuoto: esegui prima "npm run build".');
    process.exit(1);
  }

  console.log("\n━━ Verifica dello schema ━━\n");
  console.log(
    `${"Database".padEnd(24)}${"base".padStart(5)}${"rel".padStart(5)}${"roll".padStart(6)}${"form".padStart(6)}   atteso b/r/ro/f`
  );
  console.log("─".repeat(78));

  let problems = 0;

  for (const key of buildOrder) {
    const def = schemaByKey[key];
    const st = manifest[key];
    if (!st) {
      console.log(`${def.title.padEnd(24)}  — assente nel manifest`);
      problems++;
      continue;
    }

    const ds = (await withRetry(
      () => notion.dataSources.retrieve({ data_source_id: st.dataSourceId }),
      `leggi "${def.title}"`
    )) as { properties?: Record<string, { type: string }> };

    const c = countTypes(ds.properties ?? {});
    const eBase = Object.keys(def.properties).length;
    const eRel = def.relations?.length ?? 0;
    const eRoll = def.rollups?.length ?? 0;
    const eForm = def.formulas?.length ?? 0;

    console.log(
      `${def.title.padEnd(24)}${String(c.base).padStart(5)}${String(c.relation).padStart(5)}` +
        `${String(c.rollup).padStart(6)}${String(c.formula).padStart(6)}   ~${eBase}/${eRel}/${eRoll}/${eForm}`
    );

    if (c.rollup < eRoll || c.formula < eForm) problems++;
  }

  console.log("─".repeat(78));
  console.log(
    problems === 0
      ? "\n✅ Schema coerente: tutti i rollup e le formule attese sono presenti.\n"
      : `\n⚠ ${problems} database con rollup/formule da completare a mano (vedi README §Limiti noti).\n`
  );
}

function countTypes(props: Record<string, { type: string }>) {
  let base = 0;
  let relation = 0;
  let rollup = 0;
  let formula = 0;
  for (const p of Object.values(props)) {
    if (p.type === "relation") relation++;
    else if (p.type === "rollup") rollup++;
    else if (p.type === "formula") formula++;
    else base++;
  }
  return { base, relation, rollup, formula };
}

main().catch((err) => {
  console.error("❌ Verify:", describeError(err));
  process.exit(1);
});
