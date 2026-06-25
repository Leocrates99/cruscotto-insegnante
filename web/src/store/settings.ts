import { useSyncExternalStore } from "react";

/** Una fascia oraria della giornata scolastica (etichetta + ore di inizio/fine). */
export interface TimeBand {
  label: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface Settings {
  timeBands: TimeBand[];
  calendarMode: "week" | "month" | "day";
  /** Giorni con lezione (0=lun … 6=dom). Default lun–sab: le scuole sono chiuse di domenica. */
  giorniLezione: number[];
}

const KEY = "cruscotto-settings:v1";
const DEFAULTS: Settings = { timeBands: [], calendarMode: "week", giorniLezione: [0, 1, 2, 3, 4, 5] };

function load(): Settings {
  try {
    const s = localStorage.getItem(KEY);
    return s ? { ...DEFAULTS, ...(JSON.parse(s) as Partial<Settings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let settings = load();
const listeners = new Set<() => void>();

function commit(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage non disponibile */
  }
  listeners.forEach((l) => l());
}

export function getSettings(): Settings {
  return settings;
}
export function setSettings(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch };
  commit();
}
export function subscribeSettings(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings);
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
function plus(h: number, m: number, min: number): [number, number] {
  const t = h * 60 + m + min;
  return [Math.floor(t / 60), t % 60];
}

/**
 * Genera le fasce orarie agganciate all'orologio, etichettate "1ª ora", "2ª ora"…
 * Opzionale: una pausa di `breakMin` minuti dopo la `breakAfter`-esima ora.
 */
export function generateBands(
  start: string,
  durationMin: number,
  count: number,
  breakAfter = 0,
  breakMin = 0
): TimeBand[] {
  const parts = start.split(":").map(Number);
  let h = parts[0] || 0;
  let m = parts[1] || 0;
  const bands: TimeBand[] = [];
  for (let i = 1; i <= count; i++) {
    const [eh, em] = plus(h, m, durationMin);
    bands.push({ label: `${i}ª ora`, start: fmt(h, m), end: fmt(eh % 24, em) });
    h = eh % 24;
    m = em;
    if (breakAfter && breakMin && i === breakAfter) {
      const [bh, bm] = plus(h, m, breakMin);
      h = bh % 24;
      m = bm;
    }
  }
  return bands;
}

/** Minuti dall'inizio della giornata per "HH:MM". */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Durata (in minuti) di un'ora di lezione, dedotta dalle fasce dell'orario
 * (raramente 60′ piena). Usa la durata più frequente fra le fasce; default 60.
 */
export function unitaOraria(s: Settings = settings): number {
  const durate = s.timeBands.map((b) => toMinutes(b.end) - toMinutes(b.start)).filter((d) => d > 0);
  if (!durate.length) return 60;
  const freq = new Map<number, number>();
  for (const d of durate) freq.set(d, (freq.get(d) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
