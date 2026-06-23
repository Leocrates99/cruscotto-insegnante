// Durabilità del dato local-first. Tre reti di sicurezza, dalla più forte alla più debole:
//  1) Salvataggio automatico su un VERO file (File System Access API, dove supportato):
//     l'unica protezione che sopravvive alla pulizia del browser o al cambio dispositivo.
//  2) Snapshot rotanti in localStorage (ultimi N): proteggono da "Azzera"/import/sovrascritture
//     accidentali, ma non dalla cancellazione dei dati del browser.
//  3) Promemoria di export: se non c'è un file collegato e l'ultimo backup è vecchio, l'app
//     lo segnala (banner) e offre l'export manuale.

import { useSyncExternalStore } from "react";
import { getState, replaceState, type State } from "./store";
import { idbDel, idbGet, idbSet } from "./idb";

export interface Snapshot {
  t: string; // ISO
  records: number;
  state: State;
}

const SNAP_KEY = "cruscotto-backups:v1";
const META_KEY = "cruscotto-backup-meta:v1";
const HANDLE_KEY = "backupFile";
const MAX_SNAP = 8;

let version = 0;
const listeners = new Set<() => void>();
function emit(): void {
  version++;
  listeners.forEach((l) => l());
}

// ── Snapshot rotanti ─────────────────────────────────────────────────────────
function loadSnaps(): Snapshot[] {
  try {
    return JSON.parse(localStorage.getItem(SNAP_KEY) ?? "[]") as Snapshot[];
  } catch {
    return [];
  }
}
let snaps = loadSnaps();
function saveSnaps(): void {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snaps));
  } catch {
    /* storage pieno: si scartano i più vecchi al prossimo giro */
  }
  emit();
}

function countRecords(st: State): number {
  let n = 0;
  for (const k in st) n += Object.keys(st[k as keyof State] ?? {}).length;
  return n;
}

/** Crea uno snapshot dello stato corrente (salta se vuoto o identico all'ultimo). */
export function snapshotNow(): void {
  const st = getState();
  if (countRecords(st) === 0) return;
  const serialized = JSON.stringify(st);
  if (snaps[0] && JSON.stringify(snaps[0].state) === serialized) return;
  snaps = [{ t: new Date().toISOString(), records: countRecords(st), state: st }, ...snaps].slice(0, MAX_SNAP);
  saveSnaps();
}

let lastAuto = 0;
/** Snapshot automatico, al massimo uno ogni 10 minuti. */
export function maybeAutoSnapshot(): void {
  const now = Date.now();
  if (now - lastAuto > 10 * 60 * 1000) {
    lastAuto = now;
    snapshotNow();
  }
}

export function listSnapshots(): Snapshot[] {
  return snaps;
}
export function restoreSnapshot(t: string): void {
  const s = snaps.find((x) => x.t === t);
  if (s) replaceState(s.state);
}

// ── Meta: ultimo export/backup ───────────────────────────────────────────────
interface BackupMeta {
  lastExportAt?: string;
}
function loadMeta(): BackupMeta {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? "{}") as BackupMeta;
  } catch {
    return {};
  }
}
let meta = loadMeta();
function saveMeta(): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* ignora */
  }
  emit();
}
export function markExported(): void {
  meta.lastExportAt = new Date().toISOString();
  saveMeta();
}
export function lastExportAt(): string | undefined {
  return meta.lastExportAt;
}
export function daysSinceExport(): number | null {
  if (!meta.lastExportAt) return null;
  return Math.floor((Date.now() - Date.parse(meta.lastExportAt)) / 86_400_000);
}

// ── Salvataggio automatico su file (File System Access API) ───────────────────
type FileHandle = {
  name: string;
  createWritable: () => Promise<{ write: (d: string) => Promise<void>; close: () => Promise<void> }>;
  queryPermission: (o: { mode: string }) => Promise<string>;
  requestPermission: (o: { mode: string }) => Promise<string>;
};

let fileHandle: FileHandle | null = null;

export function fileBackupSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}
export function backupFileName(): string | null {
  return fileHandle?.name ?? null;
}

/** Recupera il file collegato in una sessione precedente (se c'è). */
export async function initFileBackup(): Promise<void> {
  if (!fileBackupSupported()) return;
  const h = await idbGet<FileHandle>(HANDLE_KEY);
  if (h) {
    fileHandle = h;
    emit();
  }
}

export async function linkBackupFile(): Promise<void> {
  if (!fileBackupSupported()) return;
  const h = (await (window as unknown as { showSaveFilePicker: (o: unknown) => Promise<FileHandle> }).showSaveFilePicker({
    suggestedName: "cruscotto-backup.json",
    types: [{ description: "Backup cruscotto (JSON)", accept: { "application/json": [".json"] } }],
  })) as FileHandle;
  fileHandle = h;
  await idbSet(HANDLE_KEY, h);
  emit();
  await writeFileBackup();
}

export async function unlinkBackupFile(): Promise<void> {
  fileHandle = null;
  await idbDel(HANDLE_KEY);
  emit();
}

async function ensurePermission(): Promise<boolean> {
  if (!fileHandle) return false;
  const opt = { mode: "readwrite" };
  if ((await fileHandle.queryPermission(opt)) === "granted") return true;
  return (await fileHandle.requestPermission(opt)) === "granted";
}

let writing = false;
let pending = false;
/** Scrive lo stato corrente nel file collegato (serializza le scritture concorrenti). */
export async function writeFileBackup(): Promise<void> {
  if (!fileHandle) return;
  if (writing) {
    pending = true;
    return;
  }
  writing = true;
  try {
    if (!(await ensurePermission())) return;
    const w = await fileHandle.createWritable();
    await w.write(JSON.stringify(getState(), null, 2));
    await w.close();
    markExported();
  } catch {
    /* il file potrebbe essere stato spostato/rimosso: il backup locale resta comunque */
  } finally {
    writing = false;
    if (pending) {
      pending = false;
      void writeFileBackup();
    }
  }
}

let fileTimer: number | undefined;
/** Pianifica una scrittura su file (debounce) dopo una modifica dei dati. */
export function scheduleFileBackup(): void {
  if (!fileHandle) return;
  if (fileTimer !== undefined) clearTimeout(fileTimer);
  fileTimer = window.setTimeout(() => void writeFileBackup(), 1500);
}

// ── Hook React ───────────────────────────────────────────────────────────────
export function subscribeBackup(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function useBackup() {
  useSyncExternalStore(subscribeBackup, () => version);
  return {
    fileName: backupFileName(),
    fileSupported: fileBackupSupported(),
    lastExport: meta.lastExportAt,
    daysSince: daysSinceExport(),
    snapshots: snaps,
  };
}
