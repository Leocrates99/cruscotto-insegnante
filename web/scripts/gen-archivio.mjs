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
const tot = Object.values(problems).reduce((a, arr) => a + arr.length, 0);
if (tot > 0) {
  console.error(`\n✗ Archivio: ${tot} violazioni delle invarianti (build interrotto):`);
  for (const [k, arr] of Object.entries(problems)) for (const e of arr.slice(0, 20)) console.error(`  [${k}] ${e}`);
  process.exit(1);
}

const rep = model.repertori;
const conteggi = {
  obiettivi: model.obiettivi.length, voci: model.voci.length, parallelismi: model.parallelismi.length,
  prerequisiti: rep.prerequisiti.length, metodologie: rep.metodologie.length, fasi: rep.fasi.length,
  arrangiamenti: rep.arrangiamenti.length, materiali: rep.materiali.length, valutazione: rep.valutazione.length, inclusione: rep.inclusione.length, agenda: rep.agenda.length,
};
const index = { ...model, indici: buildIndex(model), meta: { conteggi } };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(index));
console.log(`✓ archivio.json — ${conteggi.obiettivi} obiettivi · ${conteggi.voci} voci · ${conteggi.parallelismi} parallelismi · repertori ${rep.prerequisiti.length}/${rep.metodologie.length}/${rep.fasi.length}/${rep.arrangiamenti.length}/${rep.materiali.length}/${rep.valutazione.length}/${rep.inclusione.length} · agenda ${rep.agenda.length} · 7 invarianti ok`);
