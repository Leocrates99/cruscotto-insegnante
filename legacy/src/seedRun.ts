import "dotenv/config";
import { describeError } from "./lib/notion";
import { loadManifest } from "./lib/state";
import { runSeed } from "./examples/seed";

/**
 * Inserisce i dati di esempio: una UdA-modello per ciascuna materia umanistica
 * (greco, latino, italiano, geostoria), su biennio e triennio. Richiede che lo
 * schema esista già (esegui prima "npm run build"). Da lanciare UNA volta:
 * rilanciarlo crea pagine duplicate.
 */
async function main() {
  const m = loadManifest();
  if (!m.anni || !m.uda) {
    console.error('Manifest incompleto: esegui prima "npm run build".');
    process.exit(1);
  }

  console.log("\n━━ Seed — 4 UdA-modello (greco · latino · italiano · geostoria) ━━\n");
  const { pages } = await runSeed();

  console.log(`\n✅ Seed completato: ${pages} pagine create.`);
  console.log("   Controlla in Notion, ad esempio sull'UdA «Euripide e la crisi del tragico»:");
  console.log("   • 'Ore pianificate' = 6 e 'Copertura %' ≈ 60");
  console.log("   • sulla Programmazione di Greco: 'Semaforo' = '○ margine'.\n");
}

main().catch((err) => {
  console.error("❌ Seed:", describeError(err));
  process.exit(1);
});
