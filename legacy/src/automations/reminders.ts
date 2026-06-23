import { getParentPageId } from "../lib/notion";
import { bullet, callout, divider, heading2, paragraph, upsertChildPage } from "../lib/blocks";
import { ds, queryAll, readDate, readSelect, readTitle, todayISO, shiftISO, daysFromToday } from "./util";
import type { Manifest } from "../types";

const PAGE_TITLE = "📌 Promemoria scadenze";

interface Item {
  title: string;
  data: string;
  tipo: string | null;
  priorita: string | null;
  giorni: number;
}

/**
 * Promemoria scadenze (cron giornaliero). Scorre le Scadenze non "fatte" con data
 * entro la finestra (default 7 giorni) e quelle già scadute, e ne scrive un digest
 * leggibile nella pagina «📌 Promemoria scadenze» dentro la pagina-genitore.
 * Idempotente: la pagina viene rigenerata a ogni esecuzione.
 */
export async function runReminders(manifest: Manifest, windowDays = 7): Promise<number> {
  const until = shiftISO(windowDays);
  const filter = {
    and: [
      { property: "Stato", select: { does_not_equal: "fatto" } },
      { property: "Data", date: { on_or_before: until } },
    ],
  };
  const rows = await queryAll(ds(manifest, "scadenze"), filter, [{ property: "Data", direction: "ascending" }]);

  const items: Item[] = rows
    .map((r) => {
      const data = readDate(r, "Data");
      return data
        ? { title: readTitle(r), data, tipo: readSelect(r, "Tipo"), priorita: readSelect(r, "Priorità"), giorni: daysFromToday(data) }
        : null;
    })
    .filter((x): x is Item => x !== null);

  const scadute = items.filter((i) => i.giorni < 0);
  const imminenti = items.filter((i) => i.giorni >= 0);

  await writeDigest(scadute, imminenti, windowDays);

  console.log(`  ✓ Promemoria aggiornato: ${scadute.length} scadute, ${imminenti.length} entro ${windowDays} giorni.`);
  return items.length;
}

function line(i: Item): string {
  const quando =
    i.giorni < 0 ? `scaduta da ${-i.giorni} g` : i.giorni === 0 ? "oggi" : `tra ${i.giorni} g`;
  const meta = [i.tipo, i.priorita ? `priorità ${i.priorita}` : null].filter(Boolean).join(", ");
  return `${i.data} · ${i.title}${meta ? ` — ${meta}` : ""} (${quando})`;
}

async function writeDigest(scadute: Item[], imminenti: Item[], windowDays: number): Promise<void> {
  const blocks: unknown[] = [
    paragraph(`Aggiornato il ${todayISO()} (finestra: prossimi ${windowDays} giorni).`),
  ];

  blocks.push(heading2(`⚠️ Scadute (${scadute.length})`));
  if (scadute.length) for (const i of scadute) blocks.push(bullet(line(i)));
  else blocks.push(paragraph("Nessuna scadenza arretrata. 👍"));

  blocks.push(divider(), heading2(`⏳ In arrivo (${imminenti.length})`));
  if (imminenti.length) for (const i of imminenti) blocks.push(bullet(line(i)));
  else blocks.push(paragraph("Niente in scadenza nei prossimi giorni."));

  if (!scadute.length && !imminenti.length) {
    blocks.push(divider(), callout("Tutto sotto controllo: nessuna scadenza aperta nella finestra.", "✅", "green_background"));
  }

  await upsertChildPage(getParentPageId(), PAGE_TITLE, "📌", blocks);
}
