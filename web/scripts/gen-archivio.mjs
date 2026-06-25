// Build step: normalizza i file dell'archivio (web/data/) in src/data/archivio.json
// denormalizzato con gli indici per il client, applicando le 4 INVARIANTI del
// contratto-dati: una violazione = build rosso (process.exit(1)).
// Sorgente di verità = web/data/ (re-import a ogni sync dell'archivio).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildModel, validate, buildIndex } from "./archivio-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DATA = join(here, "..", "data");
const OUT = join(here, "..", "src", "data", "archivio.json");
const read = (f) => readFileSync(join(DATA, f), "utf8");

const model = buildModel(read);
const problems = validate(model);
const tot = problems.orfani.length + problems.parent.length + problems.riferimenti.length + problems.residui.length;
if (tot > 0) {
  console.error(`\n✗ Archivio: ${tot} violazioni delle invarianti (build interrotto):`);
  for (const [k, arr] of Object.entries(problems)) for (const e of arr.slice(0, 20)) console.error(`  [${k}] ${e}`);
  process.exit(1);
}

const index = { ...model, indici: buildIndex(model), meta: { conteggi: { obiettivi: model.obiettivi.length, voci: model.voci.length, parallelismi: model.parallelismi.length } } };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(index));
console.log(`✓ archivio.json — ${model.obiettivi.length} obiettivi · ${model.voci.length} voci · ${model.parallelismi.length} parallelismi · 4 invarianti ok`);
