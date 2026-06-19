import { buildOrder, dataset, REL_SEP, schemaByKey } from "@model";
import type { BasePropertyDef, DbKey, SchemaDef } from "@model";
import { newId, type Rec, type State, type Value } from "./store";

function titleColumn(def: SchemaDef): string {
  return Object.entries(def.properties).find(([, p]) => p.type === "title")![0];
}

/** Converte il valore testuale del dataset nel valore tipato dello store. */
function parseBase(type: BasePropertyDef["type"], raw: string): Value {
  switch (type) {
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    case "checkbox":
      return /^(yes|true|s[iì]|x|vero)$/i.test(raw.trim());
    case "multi_select":
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    default:
      return raw; // title, rich_text, select, date, url, email, phone_number
  }
}

/**
 * Costruisce lo stato iniziale dai dati di esempio (le 4 UdA-modello), in due
 * passate come il seeder Notion: crea i record, poi risolve i titoli delle
 * relazioni in id. È la stessa sorgente `src/examples/data.ts`.
 */
export function buildSeedState(): State {
  const state: State = {};
  const idByTitle: Partial<Record<DbKey, Record<string, string>>> = {};

  for (const key of buildOrder) {
    const rows = dataset[key];
    if (!rows?.length) continue;
    const def = schemaByKey[key];
    const tcol = titleColumn(def);
    state[key] = {};
    idByTitle[key] = {};
    for (const row of rows) {
      const id = newId();
      const rec: Rec = { id };
      for (const [col, raw] of Object.entries(row)) {
        const prop = def.properties[col];
        if (!prop || !raw) continue;
        const v = parseBase(prop.type, raw);
        if (v !== undefined) rec[col] = v;
      }
      state[key]![id] = rec;
      idByTitle[key]![row[tcol]] = id;
    }
  }

  for (const key of buildOrder) {
    const rows = dataset[key];
    if (!rows?.length) continue;
    const def = schemaByKey[key];
    const tcol = titleColumn(def);
    for (const row of rows) {
      const id = idByTitle[key]![row[tcol]];
      const rec = state[key]![id];
      for (const [col, raw] of Object.entries(row)) {
        const rel = def.relations?.find((r) => r.name === col);
        if (!rel || !raw) continue;
        const ids = raw
          .split(REL_SEP)
          .map((t) => idByTitle[rel.target]?.[t.trim()])
          .filter((x): x is string => Boolean(x));
        if (ids.length) rec[col] = ids;
      }
    }
  }

  return state;
}
