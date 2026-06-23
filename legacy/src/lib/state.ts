import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DbKey, DbState, Manifest } from "../types";

const here = dirname(fileURLToPath(import.meta.url));
/** Il manifest vive nella radice del repo, accanto a package.json. */
export const MANIFEST_PATH = resolve(here, "../../notion-state.json");

/**
 * Carica il manifest di idempotenza. Mappa "chiave logica → {databaseId,
 * dataSourceId}". Se assente, restituisce un manifest vuoto.
 */
export function loadManifest(): Manifest {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  } catch {
    console.warn(`  ⚠ Manifest illeggibile (${MANIFEST_PATH}): riparto da vuoto.`);
    return {};
  }
}

export function saveManifest(m: Manifest): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2) + "\n", "utf8");
}

/** Registra lo stato di un database e persiste subito il manifest. */
export function setDbState(m: Manifest, key: DbKey, state: DbState): Manifest {
  m[key] = state;
  saveManifest(m);
  return m;
}

/** Restituisce il data_source_id di un database, o lancia se mancante. */
export function getDataSourceId(m: Manifest, key: DbKey): string {
  const s = m[key];
  if (!s) {
    throw new Error(`Stato mancante per "${key}". Esegui prima la passata 1 con "npm run build".`);
  }
  return s.dataSourceId;
}
