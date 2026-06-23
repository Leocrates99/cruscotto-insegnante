import { notion, withRetry } from "../lib/notion";
import { ds, queryAll, readCheckbox, readTitle } from "./util";
import { ensureAnnuario } from "./annuario";
import type { Manifest } from "../types";

async function setProp(pageId: string, properties: Record<string, unknown>, label: string): Promise<void> {
  await withRetry(() => notion.pages.update({ page_id: pageId, properties: properties as never }), label);
}

/**
 * Rollover di fine anno (§6) — da lanciare a mano (workflow_dispatch), non a cron.
 *   1) crea il nuovo Anno se manca e lo imposta «Corrente» (togliendo il flag agli altri);
 *   2) marca «archiviata» le Programmazioni dell'anno chiuso;
 *   3) genera l'Annuario dell'anno chiuso.
 * Idempotente: ripeterlo riporta allo stesso stato.
 */
export async function runRollover(manifest: Manifest, newYear: string, prevYearInput?: string): Promise<void> {
  const annoDs = ds(manifest, "anni");
  const anni = await queryAll(annoDs);

  // Anno corrente attuale, letto PRIMA di toccare i flag.
  const currentRow = anni.find((r) => readCheckbox(r, "Corrente"));
  const prevYear = prevYearInput ?? (currentRow ? readTitle(currentRow) : undefined);

  // 1) Assicura il nuovo anno.
  let newRow = anni.find((r) => readTitle(r) === newYear);
  if (!newRow) {
    const res = (await withRetry(
      () =>
        notion.pages.create({
          parent: { type: "data_source_id", data_source_id: annoDs },
          properties: {
            Titolo: { title: [{ type: "text", text: { content: newYear } }] },
            Corrente: { checkbox: true },
          } as never,
        }),
      `crea Anno ${newYear}`
    )) as { id: string };
    console.log(`  ＋ creato Anno ${newYear}`);
    newRow = {
      id: res.id,
      properties: {
        Titolo: { type: "title", title: [{ plain_text: newYear }] },
        Corrente: { type: "checkbox", checkbox: true },
      },
    };
    anni.push(newRow);
  }

  // 2) Corrente = true sul nuovo, false su tutti gli altri (solo dove serve).
  for (const r of anni) {
    const shouldBe = r.id === newRow.id;
    if (readCheckbox(r, "Corrente") !== shouldBe) {
      await setProp(r.id, { Corrente: { checkbox: shouldBe } }, `Corrente=${shouldBe} su ${readTitle(r)}`);
    }
  }
  console.log(`  ✓ anno corrente impostato a ${newYear}`);

  // 3) Archivia le Programmazioni dell'anno chiuso + genera l'Annuario.
  if (prevYear && prevYear !== newYear) {
    const prevRow = anni.find((r) => readTitle(r) === prevYear);
    if (prevRow) {
      const progs = await queryAll(ds(manifest, "programmazione"), {
        property: "Anno scolastico",
        relation: { contains: prevRow.id },
      });
      for (const p of progs) {
        await setProp(p.id, { Stato: { select: { name: "archiviata" } } }, `archivia ${readTitle(p)}`);
      }
      console.log(`  ✓ ${progs.length} programmazioni di ${prevYear} marcate "archiviata"`);
      await ensureAnnuario(manifest, prevYear);
    } else {
      console.log(`  • anno precedente "${prevYear}" non trovato: salto archiviazione e Annuario`);
    }
  }

  console.log(`\n✅ Rollover completato: ${newYear} è il nuovo anno corrente.`);
}
