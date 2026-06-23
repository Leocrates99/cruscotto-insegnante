import { notion, withRetry } from "../lib/notion";
import { getDataSourceId } from "../lib/state";
import type { DbKey, Manifest } from "../types";

/** Riga di pagina restituita da una query (proprietà lette in modo lasco). */
export interface PageRow {
  id: string;
  properties: Record<string, any>;
}

/** Risolve il data_source_id di un database dal manifest. */
export function ds(manifest: Manifest, key: DbKey): string {
  return getDataSourceId(manifest, key);
}

/** Esegue una query paginata su una data source e raccoglie tutte le righe. */
export async function queryAll(
  dataSourceId: string,
  filter?: unknown,
  sorts?: unknown
): Promise<PageRow[]> {
  const rows: PageRow[] = [];
  let cursor: string | undefined;
  do {
    const res = (await withRetry(
      () =>
        notion.dataSources.query({
          data_source_id: dataSourceId,
          start_cursor: cursor,
          page_size: 100,
          filter: filter as never,
          sorts: sorts as never,
        }),
      "query data source"
    )) as { results: PageRow[]; has_more: boolean; next_cursor: string | null };
    rows.push(...res.results);
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return rows;
}

// ── Lettori di proprietà ──────────────────────────────────────────────────────
export function readTitle(row: PageRow): string {
  for (const v of Object.values(row.properties)) {
    if (v?.type === "title") {
      const txt = (v.title ?? []).map((t: any) => t.plain_text ?? "").join("");
      return txt || "(senza titolo)";
    }
  }
  return "(senza titolo)";
}
export function readDate(row: PageRow, prop: string): string | null {
  return row.properties[prop]?.date?.start ?? null;
}
export function readSelect(row: PageRow, prop: string): string | null {
  return row.properties[prop]?.select?.name ?? null;
}
export function readCheckbox(row: PageRow, prop: string): boolean {
  return row.properties[prop]?.checkbox ?? false;
}

// ── Date (ISO YYYY-MM-DD, in UTC) ─────────────────────────────────────────────
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
export function shiftISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
/** Giorni interi tra oggi e una data ISO (negativi = passata). */
export function daysFromToday(iso: string): number {
  const ms = Date.parse(iso + "T00:00:00Z") - Date.parse(todayISO() + "T00:00:00Z");
  return Math.round(ms / 86_400_000);
}
