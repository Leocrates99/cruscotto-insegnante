import { buildOrder, schemaByKey } from "@model";
import type { DbKey } from "@model";
import { records, recordTitle, type Rec } from "../store/store";
import { materiaColor } from "../ui/materia";

/** Un evento del calendario: un record con una data. */
export interface CalEvent {
  dbKey: DbKey;
  rec: Rec;
  date: string; // ISO yyyy-mm-dd
  prop: string; // proprietà-data di origine
  title: string;
  color?: string;
}

// Colore di ripiego per database privi di Materia.
const DB_COLOR: Partial<Record<DbKey, string>> = {
  lezioni: "#1800ac",
  uda: "#1800ac",
  verifiche: "#2f7d5a",
  scadenze: "#b9791f",
  riunioni: "#6b6660",
  progetti: "#9c6b3c",
  formazione: "#2f7d5a",
  task: "#6b6660",
  anni: "#6b6660",
};

const isIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);

function dateProps(key: DbKey): string[] {
  return Object.entries(schemaByKey[key].properties)
    .filter(([, p]) => p.type === "date")
    .map(([name]) => name);
}

/** Aggrega ogni record datato (di qualunque DB) in eventi per il calendario. */
export function collectEvents(): CalEvent[] {
  const events: CalEvent[] = [];
  for (const key of buildOrder) {
    const dprops = dateProps(key);
    if (dprops.length === 0) continue;
    for (const rec of records(key)) {
      const materia = typeof rec["Materia"] === "string" ? (rec["Materia"] as string) : undefined;
      const color = materiaColor(materia) ?? DB_COLOR[key];
      for (const prop of dprops) {
        const v = rec[prop];
        if (isIso(v)) {
          events.push({ dbKey: key, rec, date: v.slice(0, 10), prop, title: recordTitle(key, rec), color });
        }
      }
    }
  }
  return events;
}

// ── Promemoria scadenze ─────────────────────────────────────────────────────
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysFromToday(iso: string): number {
  return Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(todayIso() + "T00:00:00Z")) / 86_400_000);
}

export interface Reminder {
  rec: Rec;
  date: string;
  title: string;
  tipo?: string;
  priorita?: string;
  giorni: number;
}

/** Scadenze non "fatte" scadute o entro `windowDays` giorni. */
export function reminderItems(windowDays = 7): { scadute: Reminder[]; imminenti: Reminder[] } {
  const items: Reminder[] = [];
  for (const rec of records("scadenze")) {
    const date = rec["Data"];
    if (!isIso(date)) continue;
    if (rec["Stato"] === "fatto") continue;
    const giorni = daysFromToday(date.slice(0, 10));
    if (giorni > windowDays) continue;
    items.push({
      rec,
      date: date.slice(0, 10),
      title: recordTitle("scadenze", rec),
      tipo: typeof rec["Tipo"] === "string" ? (rec["Tipo"] as string) : undefined,
      priorita: typeof rec["Priorità"] === "string" ? (rec["Priorità"] as string) : undefined,
      giorni,
    });
  }
  items.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { scadute: items.filter((i) => i.giorni < 0), imminenti: items.filter((i) => i.giorni >= 0) };
}

export function reminderCount(): number {
  const { scadute, imminenti } = reminderItems();
  return scadute.length + imminenti.length;
}
