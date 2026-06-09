import { notion, withRetry } from "./notion";
import { toNotionProps } from "./props";
import { getDataSourceId, setDbState } from "./state";
import { createDatabase } from "./createDatabase";
import { addRelations } from "./addRelations";
import { addRollupsAndFormulas } from "./addRollupsFormulas";
import { buildOrder } from "../../config/buildOrder";
import { schemaByKey, schemas } from "../schema";
import type { DbKey, Manifest, SchemaDef } from "../types";

export interface ReconcileOptions {
  /** Applica le rinomine di proprietà dichiarate negli schemi (migrazione). */
  applyRenames: boolean;
  /** Rimuove le proprietà presenti in Notion ma non più previste (distruttivo). */
  prune: boolean;
}

// ── Insiemi di nomi attesi ────────────────────────────────────────────────────

/** Nomi delle proprietà che lo schema definisce esplicitamente. */
export function desiredPropertyNames(def: SchemaDef): Set<string> {
  const names = new Set<string>(Object.keys(def.properties));
  for (const r of def.relations ?? []) names.add(r.name);
  for (const r of def.rollups ?? []) names.add(r.name);
  for (const f of def.formulas ?? []) names.add(f.name);
  return names;
}

/** Nomi delle proprietà INVERSE generate dalle relazioni duali di altri DB verso questo. */
export function reverseDualNames(key: DbKey): Set<string> {
  const names = new Set<string>();
  for (const s of schemas) {
    for (const r of s.relations ?? []) {
      if (r.dual && r.target === key && r.dualName) names.add(r.dualName);
    }
  }
  return names;
}

/** Tutto ciò che, legittimamente, può esistere su questa data source. */
export function expectedPropertyNames(def: SchemaDef): Set<string> {
  const names = desiredPropertyNames(def);
  for (const n of reverseDualNames(def.key)) names.add(n);
  return names;
}

type CurrentProps = Record<string, { type: string }>;

async function retrieveProps(dataSourceId: string, label: string): Promise<CurrentProps> {
  const ds = (await withRetry(
    () => notion.dataSources.retrieve({ data_source_id: dataSourceId }),
    `leggi proprietà di ${label}`
  )) as { properties?: CurrentProps };
  return ds.properties ?? {};
}

// ── Passi di allineamento ──────────────────────────────────────────────────────

/** Crea i database mancanti (i presenti, riconosciuti dal manifest, si saltano). */
export async function ensureDatabases(parentPageId: string, manifest: Manifest): Promise<void> {
  for (const key of buildOrder) {
    const def = schemaByKey[key];
    if (manifest[key]) continue;
    const state = await createDatabase(parentPageId, def);
    setDbState(manifest, key, state);
    console.log(`  ＋ creato database "${def.title}"`);
  }
}

/**
 * Riallinea le proprietà BASE su ogni data source esistente. È il passo che rende
 * `build` davvero idempotente sulle modifiche di schema: alla creazione le base
 * vengono impostate una volta, ma per propagare un nuovo campo o una nuova opzione
 * a uno spazio già costruito serve questo PATCH (additivo: non rimuove nulla).
 */
export async function ensureBaseProperties(manifest: Manifest): Promise<void> {
  for (const key of buildOrder) {
    const def = schemaByKey[key];
    const dataSourceId = getDataSourceId(manifest, key);
    await withRetry(
      () =>
        notion.dataSources.update({
          data_source_id: dataSourceId,
          properties: toNotionProps(def.properties) as never,
        }),
      `proprietà base di "${def.title}"`
    );
  }
}

/** Applica le rinomine dichiarate: "from" esistente e "to" assente → PATCH del nome. */
export async function applyRenames(manifest: Manifest): Promise<number> {
  let applied = 0;
  for (const key of buildOrder) {
    const def = schemaByKey[key];
    if (!def.renames?.length) continue;
    const dataSourceId = getDataSourceId(manifest, key);
    const current = await retrieveProps(dataSourceId, `"${def.title}"`);
    for (const { from, to } of def.renames) {
      if (current[from] && !current[to]) {
        await withRetry(
          () =>
            notion.dataSources.update({
              data_source_id: dataSourceId,
              properties: { [from]: { name: to } } as never,
            }),
          `rinomina "${from}" → "${to}" in "${def.title}"`
        );
        console.log(`  ✎ "${def.title}": "${from}" → "${to}"`);
        applied++;
      }
    }
  }
  return applied;
}

export async function ensureRelations(manifest: Manifest): Promise<void> {
  for (const key of buildOrder) {
    await addRelations(schemaByKey[key], manifest);
  }
}

export async function ensureRollupsFormulas(manifest: Manifest): Promise<void> {
  // Due giri: alcuni rollup dipendono da rollup di altri DB creati più avanti (§13.8).
  for (let sweep = 1; sweep <= 2; sweep++) {
    for (const key of buildOrder) {
      await addRollupsAndFormulas(schemaByKey[key], manifest, { logWarnings: sweep === 2 });
    }
  }
}

/** Rimuove (o, in dry-run, elenca) le proprietà non più previste. Mai il titolo. */
export async function pruneOrphans(manifest: Manifest, dryRun = false): Promise<number> {
  let touched = 0;
  for (const key of buildOrder) {
    const def = schemaByKey[key];
    const dataSourceId = getDataSourceId(manifest, key);
    const current = await retrieveProps(dataSourceId, `"${def.title}"`);
    const expected = expectedPropertyNames(def);
    for (const [name, prop] of Object.entries(current)) {
      if (prop.type === "title") continue;
      if (expected.has(name)) continue;
      console.log(`  ${dryRun ? "−" : "✖"} "${def.title}": rimuovo "${name}"`);
      if (!dryRun) {
        await withRetry(
          () =>
            notion.dataSources.update({
              data_source_id: dataSourceId,
              properties: { [name]: null } as never,
            }),
          `rimuovi "${name}" da "${def.title}"`
        );
      }
      touched++;
    }
  }
  return touched;
}

// ── Orchestrazione ───────────────────────────────────────────────────────────

export async function reconcile(
  parentPageId: string,
  manifest: Manifest,
  opts: ReconcileOptions
): Promise<void> {
  console.log("Passo 1 — database (creazione dei mancanti)");
  await ensureDatabases(parentPageId, manifest);

  if (opts.applyRenames) {
    console.log("Passo 2 — rinomine di proprietà");
    const n = await applyRenames(manifest);
    if (n === 0) console.log("  • nessuna rinomina in sospeso");
  }

  console.log("Passo 3 — proprietà base (allineamento additivo)");
  await ensureBaseProperties(manifest);

  console.log("Passo 4 — relazioni");
  await ensureRelations(manifest);

  console.log("Passo 5 — rollup e formule");
  await ensureRollupsFormulas(manifest);

  if (opts.prune) {
    console.log("Passo 6 — rimozione proprietà orfane (prune)");
    const r = await pruneOrphans(manifest, false);
    if (r === 0) console.log("  • nessuna proprietà orfana");
  }
}

// ── Plan (sola lettura): che cosa cambierebbe ───────────────────────────────────

export interface DbPlan {
  title: string;
  missing: boolean;
  toAdd: string[];
  toRename: Array<{ from: string; to: string }>;
  orphans: string[];
}

export function planHasChanges(p: DbPlan): boolean {
  return p.missing || p.toAdd.length > 0 || p.toRename.length > 0 || p.orphans.length > 0;
}

export async function planAll(manifest: Manifest): Promise<DbPlan[]> {
  const plans: DbPlan[] = [];
  for (const key of buildOrder) {
    const def = schemaByKey[key];
    const st = manifest[key];
    if (!st) {
      plans.push({ title: def.title, missing: true, toAdd: [...desiredPropertyNames(def)], toRename: [], orphans: [] });
      continue;
    }
    const current = await retrieveProps(st.dataSourceId, `"${def.title}"`);
    const currentNames = new Set(Object.keys(current));
    const desired = desiredPropertyNames(def);
    const expected = expectedPropertyNames(def);

    plans.push({
      title: def.title,
      missing: false,
      toAdd: [...desired].filter((n) => !currentNames.has(n)),
      toRename: (def.renames ?? []).filter((r) => current[r.from] && !current[r.to]),
      orphans: [...currentNames].filter((n) => current[n].type !== "title" && !expected.has(n)),
    });
  }
  return plans;
}
