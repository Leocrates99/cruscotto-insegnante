import type { DbKey, SchemaDef } from "@model";
import { schemaByKey } from "@model";
import { loadRaw, saveRaw } from "./persistence";

/** Valori ammessi in un record (le relazioni sono array di id). */
export type Value = string | number | boolean | string[] | undefined;
export interface Rec {
  id: string;
  [prop: string]: Value;
}
/** Stato globale: per ciascun database una mappa id → record. */
export type State = Partial<Record<DbKey, Record<string, Rec>>>;

let state: State = (loadRaw() as State | null) ?? {};
const listeners = new Set<() => void>();

function commit(next: State): void {
  state = next;
  saveRaw(state);
  listeners.forEach((l) => l());
}

export function getState(): State {
  return state;
}
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function records(key: DbKey): Rec[] {
  return Object.values(state[key] ?? {});
}
export function getRecord(key: DbKey, id: string): Rec | undefined {
  return state[key]?.[id];
}

export function upsert(key: DbKey, rec: Rec): void {
  commit({ ...state, [key]: { ...(state[key] ?? {}), [rec.id]: rec } });
}
export function removeRecord(key: DbKey, id: string): void {
  const bucket = { ...(state[key] ?? {}) };
  delete bucket[id];
  commit({ ...state, [key]: bucket });
}
export function replaceState(next: State | null | undefined): void {
  commit(next ?? {});
}
export function clearState(): void {
  commit({});
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Nome della proprietà-titolo di un database. */
export function titleProp(key: DbKey): string {
  const def: SchemaDef = schemaByKey[key];
  const entry = Object.entries(def.properties).find(([, p]) => p.type === "title");
  return entry ? entry[0] : "id";
}
/** Titolo leggibile di un record. */
export function recordTitle(key: DbKey, rec: Rec): string {
  const v = rec[titleProp(key)];
  return typeof v === "string" && v ? v : "(senza titolo)";
}
