import "dotenv/config";
import { notion, withRetry, getParentPageId, describeError } from "./lib/notion";
import { loadManifest, saveManifest, getDataSourceId } from "./lib/state";
import { hydrateManifestFromWorkspace } from "./lib/discover";
import { reconcile } from "./lib/pipeline";
import { ensureHomePage } from "./lib/homepage";
import { runSeed } from "./examples/seed";
import type { Manifest } from "./types";

/**
 * Prepara la pagina-genitore perché diventi un TEMPLATE duplicabile (Ramo 1):
 *   1) allinea lo schema (additivo);
 *   2) inserisce i dati dimostrativi solo se l'UdA è vuota (per non duplicarli);
 *   3) crea la pagina-guida «Inizia da qui».
 * Poi stampa la procedura di pubblicazione (l'unico passo solo-UI).
 *
 *   npm run template              prepara (idempotente)
 *   npm run template -- --refresh rigenera la pagina-guida
 */
function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function udaIsEmpty(manifest: Manifest): Promise<boolean> {
  const dataSourceId = getDataSourceId(manifest, "uda");
  const res = (await withRetry(
    () => notion.dataSources.query({ data_source_id: dataSourceId, page_size: 1 }),
    "verifica contenuto UdA"
  )) as { results: unknown[] };
  return res.results.length === 0;
}

async function main() {
  const parentPageId = getParentPageId();
  const manifest = loadManifest();

  console.log("\n━━ Prepara il template duplicabile (Ramo 1) ━━\n");

  const found = await hydrateManifestFromWorkspace(parentPageId, manifest);
  if (found > 0) console.log(`Riconosciuti ${found} database esistenti.`);
  saveManifest(manifest);

  console.log("\nAllineo lo schema…");
  await reconcile(parentPageId, manifest, { applyRenames: false, prune: false });
  saveManifest(manifest);

  console.log("\nDati dimostrativi:");
  if (await udaIsEmpty(manifest)) {
    console.log("  inserisco le 4 UdA-modello (greco · latino · italiano · geostoria)…");
    await runSeed();
  } else {
    console.log("  • già presenti: salto (per non duplicare).");
  }

  console.log("\nPagina-guida «Inizia da qui»:");
  const home = await ensureHomePage(parentPageId, manifest, hasFlag("--refresh"));
  console.log(home.created ? "  ✓ creata" : "  • già presente (usa `-- --refresh` per rigenerarla).");

  console.log("\n✅ Spazio pronto per la pubblicazione come template.\n");
  console.log("   Ultimo passo, nell'app Notion (solo-UI, non automatizzabile):");
  console.log("   1) apri la PAGINA-GENITORE (contiene i 17 database e la guida «Inizia da qui»);");
  console.log("   2) in alto a destra: Share → Publish → attiva «Allow duplicate as template»;");
  console.log('   3) copia il link pubblico: chi lo apre clicca "Duplicate" e ottiene tutto nel suo spazio.\n');
  console.log("   Perché funziona: duplicando la pagina-genitore INTERA, Notion rimappa le relazioni");
  console.log("   tra i 17 database copiati, così rollup e formule continuano a calcolare. Se invece");
  console.log("   si duplicasse un singolo database, le relazioni verso gli altri si spezzerebbero.\n");
}

main().catch((err) => {
  console.error("\n❌ Template:", describeError(err));
  process.exit(1);
});
