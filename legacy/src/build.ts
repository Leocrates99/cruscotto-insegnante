import "dotenv/config";
import { getParentPageId, describeError } from "./lib/notion";
import { loadManifest, saveManifest } from "./lib/state";
import { hydrateManifestFromWorkspace } from "./lib/discover";
import { reconcile } from "./lib/pipeline";

/**
 * Build/allineamento dello schema, idempotente. Riconosce prima i database già
 * presenti nello spazio (così non li duplica anche senza file di stato locale),
 * poi crea i mancanti e riallinea proprietà base, relazioni, rollup e formule.
 * Additivo: non rinomina e non rimuove nulla (per quello c'è `npm run migrate`).
 */
async function main() {
  const parentPageId = getParentPageId();
  const manifest = loadManifest();

  console.log("\n━━ Cruscotto del docente — build/allineamento dello schema ━━\n");
  console.log("Riconoscimento dei database già presenti nello spazio…");
  const found = await hydrateManifestFromWorkspace(parentPageId, manifest);
  console.log(found > 0 ? `  • riconosciuti ${found} database esistenti` : "  • nessun database preesistente");
  saveManifest(manifest);

  await reconcile(parentPageId, manifest, { applyRenames: false, prune: false });

  saveManifest(manifest);
  console.log("\n✅ Allineamento completato.");
  console.log("   La prima volta:  npm run seed   →   npm run verify\n");
}

main().catch((err) => {
  console.error("\n❌ Build interrotto:", describeError(err));
  process.exit(1);
});
