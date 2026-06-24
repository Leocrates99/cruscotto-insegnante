// Import dell'orario di lavoro da un file tabellare ORDINATO (CSV/TSV o Excel .xlsx).
// Non fa OCR: serve un foglio già a tabella. Riconosce due forme:
//   • LUNGO  → intestazioni: Giorno, Ora, Materia, Classe (una riga per slot)
//   • GRIGLIA→ prima colonna = ora, intestazioni colonne = giorni; cella = "Materia Classe"
// La mappatura è tollerante (giorni in più lingue, fasce per label o orario, materie/classi
// confrontate col profilo) ma best-effort: l'anteprima nell'UI fa confermare prima di applicare.

import type { OrarioSlot } from "./profile";
import { classiAttive, materieAttive } from "./profile";
import { getSettings } from "./settings";

const norm = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const DAY_MAP: Record<string, number> = {
  lun: 0, lunedi: 0, mon: 0, monday: 0,
  mar: 1, martedi: 1, tue: 1, tuesday: 1,
  mer: 2, mercoledi: 2, wed: 2, wednesday: 2,
  gio: 3, giovedi: 3, thu: 3, thursday: 3,
  ven: 4, venerdi: 4, fri: 4, friday: 4,
  sab: 5, sabato: 5, sat: 5, saturday: 5,
  dom: 6, domenica: 6, sun: 6, sunday: 6,
};

function dayIndex(s: string): number | null {
  const n = norm(s);
  for (const k of Object.keys(DAY_MAP)) if (n.startsWith(k)) return DAY_MAP[k];
  return null;
}

function matchFascia(label: string): string {
  const bands = getSettings().timeBands;
  const n = norm(label);
  const exact = bands.find((b) => norm(b.label) === n);
  if (exact) return exact.label;
  const t = label.match(/(\d{1,2})[:.](\d{2})/);
  if (t) {
    const hhmm = `${t[1].padStart(2, "0")}:${t[2]}`;
    const byTime = bands.find((b) => b.start === hhmm);
    if (byTime) return byTime.label;
  }
  return label.trim();
}

function matchFrom(list: string[], text: string): string | undefined {
  const n = norm(text);
  return list.find((x) => n.includes(norm(x)));
}

/** Separa il contenuto di una cella-griglia in materia + classe (best-effort). */
function splitCell(cell: string): { materia?: string; classe?: string } {
  const raw = cell.trim();
  if (!raw) return {};
  const materie = materieAttive();
  const classi = classiAttive();
  let materia = matchFrom(materie, raw);
  let classe = matchFrom(classi, raw);
  if (!classe) {
    // pattern tipico di una classe: numero romano/arabo + eventuale sezione (es. "IV A", "1B")
    const m = raw.match(/\b([IVX]{1,4}|[1-5])\s*[A-H]?\b\s*$/i);
    if (m) classe = m[0].trim();
  }
  if (!materia) {
    let rest = raw;
    if (classe) rest = rest.replace(classe, " ");
    rest = rest.replace(/[|/·,\-–]+/g, " ").replace(/\s+/g, " ").trim();
    materia = rest || undefined;
  }
  return { materia: materia || undefined, classe: classe || undefined };
}

function chooseDelimiter(text: string): string {
  const first = text.split(/\r?\n/)[0] ?? "";
  return [";", "\t", ","]
    .map((d) => [d, first.split(d).length] as [string, number])
    .sort((a, b) => b[1] - a[1])[0][0];
}

export function parseDelimited(text: string): string[][] {
  const delim = chooseDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function rowsToSlots(rows: string[][]): OrarioSlot[] {
  if (rows.length < 2) return [];
  const header = rows[0].map(norm);
  const giCol = header.findIndex((h) => h.startsWith("giorno") || h === "day");
  const oraCol = header.findIndex((h) => h.startsWith("ora") || h === "fascia" || h === "hour");

  // Forma LUNGA: c'è sia "giorno" sia "ora" tra le intestazioni.
  if (giCol >= 0 && oraCol >= 0) {
    const matCol = header.findIndex((h) => h.startsWith("materia") || h === "subject");
    const clsCol = header.findIndex((h) => h.startsWith("classe") || h === "class");
    const out: OrarioSlot[] = [];
    for (const r of rows.slice(1)) {
      const giorno = dayIndex(r[giCol] ?? "");
      const oraRaw = (r[oraCol] ?? "").trim();
      if (giorno === null || !oraRaw) continue;
      out.push({
        giorno,
        fascia: matchFascia(oraRaw),
        materia: matCol >= 0 ? (matchFrom(materieAttive(), r[matCol] ?? "") ?? ((r[matCol] ?? "").trim() || undefined)) : undefined,
        classe: clsCol >= 0 ? (matchFrom(classiAttive(), r[clsCol] ?? "") ?? ((r[clsCol] ?? "").trim() || undefined)) : undefined,
      });
    }
    return out;
  }

  // Forma GRIGLIA: prima colonna = ora, intestazioni = giorni.
  const dayCols: { col: number; giorno: number }[] = [];
  rows[0].forEach((h, i) => {
    if (i === 0) return;
    const d = dayIndex(h);
    if (d !== null) dayCols.push({ col: i, giorno: d });
  });
  if (dayCols.length === 0) return [];
  const out: OrarioSlot[] = [];
  for (const r of rows.slice(1)) {
    const oraRaw = (r[0] ?? "").trim();
    if (!oraRaw) continue;
    const fascia = matchFascia(oraRaw);
    for (const { col, giorno } of dayCols) {
      const cell = (r[col] ?? "").trim();
      if (!cell) continue;
      const { materia, classe } = splitCell(cell);
      out.push({ giorno, fascia, materia, classe });
    }
  }
  return out;
}

export async function parseOrarioFile(file: File): Promise<OrarioSlot[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx"); // caricato solo quando serve (no peso sul bundle iniziale)
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = (XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" }) as unknown[][]).map((r) =>
      r.map((c) => String(c ?? ""))
    );
    return rowsToSlots(rows);
  }
  return rowsToSlots(parseDelimited(await file.text()));
}

/** Fonde gli slot importati con quelli esistenti: l'import vince su (giorno, fascia). */
export function mergeSlots(existing: OrarioSlot[], incoming: OrarioSlot[]): OrarioSlot[] {
  const key = (s: OrarioSlot) => `${s.giorno}:${s.fascia}`;
  const map = new Map(existing.map((s) => [key(s), s]));
  for (const s of incoming) map.set(key(s), s);
  return [...map.values()];
}

/** Le classi citate negli slot, per arricchire l'elenco classi del profilo. */
export function classiFromSlots(slots: OrarioSlot[]): string[] {
  return Array.from(new Set(slots.map((s) => s.classe).filter((c): c is string => Boolean(c))));
}
