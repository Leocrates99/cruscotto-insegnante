import type { SchemaDef } from "../types";

/** Mette tra virgolette i campi che contengono virgole, virgolette o a-capo. */
export function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
}

/** Serializza in CSV (CRLF). La PRIMA colonna diventa il titolo all'import in Notion. */
export function toCsv(headers: string[], rows: Array<Record<string, string>>): string {
  const head = headers.map(csvEscape).join(",");
  if (rows.length === 0) return head + "\r\n";
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h] ?? "")).join(",")).join("\r\n");
  return head + "\r\n" + body + "\r\n";
}

/**
 * Colonne CSV per un database: prima il titolo, poi le altre proprietà base,
 * infine le relazioni (che all'import diventano TESTO — vanno riconvertite a mano).
 * Rollup e formule sono esclusi: non sono rappresentabili in un CSV (sono calcolati).
 */
export function columnsFor(def: SchemaDef): string[] {
  const titleKey = Object.entries(def.properties).find(([, p]) => p.type === "title")?.[0];
  const base = Object.keys(def.properties);
  const ordered = titleKey ? [titleKey, ...base.filter((k) => k !== titleKey)] : base;
  const relations = (def.relations ?? []).map((r) => r.name);
  return [...ordered, ...relations];
}
