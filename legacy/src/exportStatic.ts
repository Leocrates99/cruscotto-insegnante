import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOrder } from "../config/buildOrder";
import { schemaByKey } from "./schema";
import { columnsFor, toCsv } from "./staticExport/csv";
import { dataset } from "./examples/data";

// Generatore OFFLINE (nessun token, nessuna API): produce una cartella di CSV +
// guide, pronta da importare in Notion via «Import → Markdown & CSV».

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../static-template");

function homeMd(): string {
  return `# 🏛️ Cruscotto del docente — modello statico

Questa cartella contiene i **17 database** del cruscotto in formato CSV, più questa guida.
Importali in Notion in un colpo solo: **Import → Markdown & CSV → seleziona la cartella (o lo .zip)**.

> ⚠️ **Leggi prima \`GUIDA-IMPORT.md\`.** L'import ricrea tabelle, colonne e dati di esempio,
> ma **non** relazioni, rollup e formule (limite dell'import di Notion). Lì trovi come
> riattivare la parte "intelligente".

I dati di esempio coprono **quattro UdA-modello** (greco, latino, italiano, geostoria, tra
biennio e triennio): esplorali e poi eliminali quando inizi a usarlo davvero.

Per far dialogare il cruscotto con le skill di Claude (\`progettazione-didattica\`,
\`burocrazia-scolastica\`) usa \`brief-template.md\` in questa cartella.
`;
}

function guideMd(): string {
  return `# Guida all'import

## Come importare

1. In Notion: **Settings → Import** (oppure **Import** dal menu della sidebar).
2. Scegli **Markdown & CSV**.
3. Seleziona **tutta la cartella** \`static-template\` (o il file \`static-template.zip\`).
4. Notion crea una pagina con dentro i 17 database (uno per CSV) e i dati di esempio.

La **prima colonna** di ogni CSV diventa il titolo del database.

## Cosa NON sopravvive all'import (e perché)

L'import CSV di Notion ricrea **tabelle, colonne e righe**, ma **non**:

- **Relazioni** → le colonne come *Anno scolastico*, *UdA*, *Obiettivi*, *Materiali*…
  arrivano come **testo** (i titoli dei record collegati), non come vere relazioni.
- **Rollup** → *Ore pianificate*, *Ore UdA totali*, *Obiettivi totali/verificati*: assenti.
- **Formule** → *Copertura %*, *Scostamento*, *Semaforo*, *Verificato*: assenti.

È un limite della funzione *Import* di Notion, non di questi file: relazioni e campi
calcolati non sono rappresentabili in un CSV.

## Due strade per renderlo PIENAMENTE funzionante

### A) Riconnessione manuale (senza codice)
Per ogni colonna-relazione (le trovi elencate sotto), in Notion cambia il **tipo** della
proprietà da *Testo* a *Relation* scegliendo il database giusto, poi riassegna i valori.
Infine ricrea i rollup e le formule come descritto nel \`README\` del progetto (sezioni §13.8).
È fattibile ma lungo: ha senso solo se vuoi restare del tutto fuori dal codice.

### B) Import + un comando (consigliata)
1. Importa questi CSV **dentro la pagina-genitore** del progetto, in modo che i 17 database
   risultino **figli diretti** di quella pagina (se Notion li annida in una sotto-pagina
   "import", spostali nella pagina-genitore).
2. **Non rinominare** i database: i loro titoli devono restare identici ai nomi dei file
   (è così che vengono riconosciuti).
3. Lancia una volta **\`npm run build\`**: riconosce i database già importati (per titolo)
   e **aggiunge da solo relazioni, rollup e formule**. In pochi minuti il modello è completo
   e identico a quello costruito via codice. (Le colonne-relazione testuali restano: puoi
   ripopolarle come vere relazioni, oppure cancellarle perché \`build\` crea quelle giuste.)

> Se invece vuoi una copia **già completa e cliccabile** senza toccare nulla, usa il
> **template duplicabile** (Ramo 1 del README): è l'unico modo in cui Notion preserva
> tutto (relazioni e calcoli) in una sola azione — ma è un *Duplicate*, non un file.

## Colonne-relazione da riconvertire (testo → relation)

${buildOrder
  .map((key) => {
    const def = schemaByKey[key];
    const rels = (def.relations ?? []).map((r) => `\`${r.name}\` → ${schemaByKey[r.target].title}`);
    return rels.length ? `- **${def.title}**: ${rels.join("; ")}` : null;
  })
  .filter(Boolean)
  .join("\n")}
`;
}

function main(): void {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  // Niente prefisso numerico nel nome file: Notion usa il nome del CSV come TITOLO
  // del database, e i titoli devono combaciare con lo schema perché `npm run build`
  // (strada B) li riconosca senza creare doppioni.
  for (const key of buildOrder) {
    const def = schemaByKey[key];
    const csv = toCsv(columnsFor(def), dataset[key] ?? []);
    writeFileSync(resolve(OUT, `${def.title}.csv`), csv, "utf8");
  }

  writeFileSync(resolve(OUT, "00 — Inizia da qui.md"), homeMd(), "utf8");
  writeFileSync(resolve(OUT, "GUIDA-IMPORT.md"), guideMd(), "utf8");
  // Modulo per il dialogo con le skill (vedi docs/sinergia-skill.md).
  copyFileSync(resolve(here, "../docs/brief-template.md"), resolve(OUT, "brief-template.md"));

  console.log(`✓ Generati ${buildOrder.length} CSV + guide (import + brief) in: ${OUT}`);
  console.log("  Importali in Notion con: Import → Markdown & CSV → seleziona la cartella.");
}

main();
