import "dotenv/config";
import { getParentPageId, describeError } from "./lib/notion";
import { loadManifest, saveManifest } from "./lib/state";
import { hydrateManifestFromWorkspace } from "./lib/discover";
import { reconcile, planAll, planHasChanges } from "./lib/pipeline";

/**
 * Migrazione dello schema verso lo stato dichiarato nei file di `src/schema/`.
 *
 *   npm run plan              → mostra il diff senza toccare nulla (sola lettura)
 *   npm run migrate           → applica: crea mancanti, rinomina, allinea base/relazioni/rollup
 *   npm run migrate -- --prune→ applica E rimuove le proprietà non più previste (distruttivo)
 *
 * In CI: `plan` sui pull request, `migrate` sui push a main (vedi .github/workflows).
 */
function hasFlag(flag: string): boolean {
  if (process.argv.includes(flag)) return true;
  const envName = flag.replace(/^--/, "").toUpperCase();
  return process.env[envName] === "true";
}

async function main() {
  const parentPageId = getParentPageId();
  const manifest = loadManifest();
  const planOnly = hasFlag("--plan");
  const prune = hasFlag("--prune");

  console.log(`\n━━ Migrazione schema — modalità ${planOnly ? "PLAN (sola lettura)" : "APPLY"} ━━\n`);

  const found = await hydrateManifestFromWorkspace(parentPageId, manifest);
  if (found > 0) console.log(`Riconosciuti ${found} database esistenti nello spazio.\n`);
  saveManifest(manifest);

  if (planOnly) {
    const plans = (await planAll(manifest)).filter(planHasChanges);
    if (plans.length === 0) {
      console.log("✅ Nessuna differenza: lo schema in Notion è allineato ai file.\n");
      return;
    }
    for (const p of plans) {
      const bits: string[] = [];
      if (p.missing) bits.push("DB da creare");
      if (p.toAdd.length) bits.push(`+${p.toAdd.length} da aggiungere (${p.toAdd.join(", ")})`);
      if (p.toRename.length) bits.push(`✎ ${p.toRename.map((r) => `${r.from}→${r.to}`).join(", ")}`);
      if (p.orphans.length) bits.push(`−${p.orphans.length} orfane (${p.orphans.join(", ")})`);
      console.log(`• ${p.title}: ${bits.join("  |  ")}`);
    }
    console.log(
      `\n${plans.length} database con differenze. Applica con "npm run migrate"` +
        `${prune ? "" : ' (le orfane vengono rimosse solo con "-- --prune").'}\n`
    );
    return;
  }

  await reconcile(parentPageId, manifest, { applyRenames: true, prune });
  saveManifest(manifest);
  console.log(`\n✅ Migrazione applicata${prune ? " (con prune delle orfane)" : ""}.\n`);
}

main().catch((err) => {
  console.error("\n❌ Migrazione interrotta:", describeError(err));
  process.exit(1);
});
