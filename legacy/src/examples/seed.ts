import { notion, withRetry } from "../lib/notion";
import { getDataSourceId, loadManifest } from "../lib/state";
import { buildOrder } from "../../config/buildOrder";
import { schemaByKey } from "../schema";
import { dataset, REL_SEP } from "./data";
import type { BasePropertyDef, DbKey, SchemaDef } from "../types";

/** Nome della colonna-titolo di un database. */
function titleColumn(def: SchemaDef): string {
  const entry = Object.entries(def.properties).find(([, p]) => p.type === "title");
  if (!entry) throw new Error(`Nessuna proprietà title in "${def.key}".`);
  return entry[0];
}

/** Mappa un valore di testo nel payload di una proprietà base, secondo il tipo. */
function mapBase(def: BasePropertyDef, raw: string): unknown | undefined {
  switch (def.type) {
    case "title":
      return { title: [{ text: { content: raw } }] };
    case "rich_text":
      return { rich_text: [{ text: { content: raw } }] };
    case "select":
      return { select: { name: raw } };
    case "multi_select":
      return { multi_select: raw.split(",").map((s) => ({ name: s.trim() })).filter((o) => o.name) };
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? { number: n } : undefined;
    }
    case "date":
      return { date: { start: raw } };
    case "checkbox":
      return { checkbox: /^(yes|true|s[iì]|x|vero)$/i.test(raw.trim()) };
    case "url":
      return { url: raw };
    case "email":
      return { email: raw };
    case "phone_number":
      return { phone_number: raw };
    case "files":
      return undefined; // non rappresentabile da testo
  }
}

function basePageProps(def: SchemaDef, row: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [col, raw] of Object.entries(row)) {
    if (!raw) continue;
    const prop = def.properties[col];
    if (!prop) continue; // colonne-relazione: passata 2
    const value = mapBase(prop, raw);
    if (value !== undefined) out[col] = value;
  }
  return out;
}

function relationPageProps(
  def: SchemaDef,
  row: Record<string, string>,
  idByTitle: Partial<Record<DbKey, Record<string, string>>>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [col, raw] of Object.entries(row)) {
    if (!raw) continue;
    const rel = def.relations?.find((r) => r.name === col);
    if (!rel) continue;
    const ids = raw
      .split(REL_SEP)
      .map((t) => idByTitle[rel.target]?.[t.trim()])
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ id }));
    if (ids.length) out[col] = { relation: ids };
  }
  return out;
}

/**
 * Seeder generico a due passate: (1) crea tutte le pagine con le sole proprietà
 * base, costruendo la mappa titolo→id per database; (2) imposta le relazioni
 * risolvendo i titoli in id. Indipendente dall'ordine: i target esistono sempre
 * al momento della passata 2. Le relazioni duali si impostano dal lato dichiarato.
 */
export async function runSeed(): Promise<{ pages: number }> {
  const manifest = loadManifest();
  const idByTitle: Partial<Record<DbKey, Record<string, string>>> = {};
  let pages = 0;

  // Passata 1 — pagine + proprietà base
  for (const key of buildOrder) {
    const rows = dataset[key];
    if (!rows?.length) continue;
    const def = schemaByKey[key];
    const dataSourceId = getDataSourceId(manifest, key);
    const tCol = titleColumn(def);
    idByTitle[key] = {};
    for (const row of rows) {
      const res = (await withRetry(
        () =>
          notion.pages.create({
            parent: { type: "data_source_id", data_source_id: dataSourceId },
            properties: basePageProps(def, row) as never,
          }),
        `crea ${def.title}: ${row[tCol]}`
      )) as { id: string };
      idByTitle[key]![row[tCol]] = res.id;
      pages++;
    }
    console.log(`  ✓ ${def.title}: ${rows.length} pagine`);
  }

  // Passata 2 — relazioni
  for (const key of buildOrder) {
    const rows = dataset[key];
    if (!rows?.length) continue;
    const def = schemaByKey[key];
    const tCol = titleColumn(def);
    for (const row of rows) {
      const props = relationPageProps(def, row, idByTitle);
      if (Object.keys(props).length === 0) continue;
      const pageId = idByTitle[key]![row[tCol]];
      await withRetry(
        () => notion.pages.update({ page_id: pageId, properties: props as never }),
        `relazioni ${def.title}: ${row[tCol]}`
      );
    }
  }

  return { pages };
}
