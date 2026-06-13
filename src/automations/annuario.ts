import { getParentPageId } from "../lib/notion";
import { bullet, callout, divider, heading2, paragraph, upsertChildPage } from "../lib/blocks";
import { ds, queryAll, readTitle, type PageRow } from "./util";
import type { DbKey, Manifest } from "../types";

/** Trova la pagina-Anno con quel titolo; restituisce id e nota di bilancio. */
async function findAnno(manifest: Manifest, yearTitle: string): Promise<{ id: string; bilancio: string } | null> {
  const rows = await queryAll(ds(manifest, "anni"), { property: "Titolo", title: { equals: yearTitle } });
  if (rows.length === 0) return null;
  const row = rows[0];
  const bilancio = (row.properties["Nota di bilancio"]?.rich_text ?? [])
    .map((t: any) => t.plain_text ?? "")
    .join("");
  return { id: row.id, bilancio };
}

/** Elenca i titoli dei record di `key` collegati all'anno (relazione "Anno scolastico"). */
async function titlesForYear(manifest: Manifest, key: DbKey, annoId: string): Promise<string[]> {
  const rows: PageRow[] = await queryAll(ds(manifest, key), {
    property: "Anno scolastico",
    relation: { contains: annoId },
  });
  return rows.map(readTitle);
}

/**
 * Annuario: pagina-indice per anno scolastico (§6). Raccoglie programmazioni,
 * progetti e riunioni di quell'anno e la nota di bilancio. Idempotente: rigenerata
 * a ogni esecuzione (è una vista derivata, non una fonte di dati).
 */
export async function ensureAnnuario(manifest: Manifest, yearTitle: string): Promise<{ id: string }> {
  const anno = await findAnno(manifest, yearTitle);
  if (!anno) {
    throw new Error(`Anno "${yearTitle}" non trovato in «Anni scolastici». Crealo prima (o usa il rollover).`);
  }

  const [programmazioni, progetti, riunioni] = await Promise.all([
    titlesForYear(manifest, "programmazione", anno.id),
    titlesForYear(manifest, "progetti", anno.id),
    titlesForYear(manifest, "riunioni", anno.id),
  ]);

  const section = (emoji: string, label: string, titles: string[]): unknown[] => {
    const out: unknown[] = [heading2(`${emoji} ${label} (${titles.length})`)];
    if (titles.length) for (const t of titles) out.push(bullet(t));
    else out.push(paragraph("—"));
    return out;
  };

  const blocks: unknown[] = [
    callout(
      "Indice cronologico dell'anno: da qui, grazie alle relazioni, scendi a UdA, lezioni e verifiche di allora.",
      "📚",
      "gray_background"
    ),
    ...section("🗂️", "Programmazioni", programmazioni),
    divider(),
    ...section("🎭", "Progetti", progetti),
    divider(),
    ...section("🗣️", "Riunioni", riunioni),
    divider(),
    heading2("📝 Bilancio dell'anno"),
    paragraph(anno.bilancio || "(Compila la «Nota di bilancio» nel record dell'anno: cosa ha funzionato, cosa cambiare.)"),
  ];

  const { id } = await upsertChildPage(getParentPageId(), `📚 Annuario ${yearTitle}`, "📚", blocks);
  console.log(`  ✓ Annuario ${yearTitle}: ${programmazioni.length} programmazioni, ${progetti.length} progetti, ${riunioni.length} riunioni.`);
  return { id };
}
