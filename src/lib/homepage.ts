import { notion, withRetry } from "./notion";
import { buildOrder } from "../../config/buildOrder";
import type { Manifest } from "../types";

/** Titolo (con icona nel testo) della pagina-guida creata dentro la pagina-genitore. */
export const HOME_TITLE = "🏠 Cruscotto del docente — Inizia da qui";

// ── Costruttori di blocchi (cast al confine dell'API, come per le proprietà) ──
const rt = (content: string) => ({ type: "text", text: { content, link: null } });
const heading2 = (t: string) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [rt(t)] } });
const todo = (t: string) => ({ object: "block", type: "to_do", to_do: { rich_text: [rt(t)], checked: false } });
const divider = () => ({ object: "block", type: "divider", divider: {} });
const callout = (t: string, emoji: string, color: string) => ({
  object: "block",
  type: "callout",
  callout: { rich_text: [rt(t)], icon: { type: "emoji", emoji }, color },
});
const linkToDatabase = (databaseId: string) => ({
  object: "block",
  type: "link_to_page",
  link_to_page: { type: "database_id", database_id: databaseId },
});

/** Cerca, tra i figli della pagina-genitore, la pagina Home già creata. */
export async function findHomePage(parentPageId: string): Promise<string | null> {
  let cursor: string | undefined;
  do {
    const res = (await withRetry(
      () => notion.blocks.children.list({ block_id: parentPageId, start_cursor: cursor, page_size: 100 }),
      "cerca la pagina Home"
    )) as {
      results: Array<{ id: string; type: string; child_page?: { title: string } }>;
      has_more: boolean;
      next_cursor: string | null;
    };
    for (const b of res.results) {
      if (b.type === "child_page" && b.child_page?.title === HOME_TITLE) return b.id;
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return null;
}

function homeBlocks(manifest: Manifest): unknown[] {
  const blocks: unknown[] = [
    callout(
      "La tua officina didattica: complementare al Registro Elettronico, non una sua copia. " +
        "Qui vive la preparazione — progettazione, materiali, idee, scadenze; nel RE restano gli atti ufficiali.",
      "🏛️",
      "blue_background"
    ),
    heading2("🚀 Come iniziare"),
    todo("In «Anni scolastici» rinomina l'anno corrente e spunta la casella «Corrente»."),
    todo("Inserisci le tue «Classi»."),
    todo("Esplora i dati di esempio «Euripide» per vedere come tutto si collega tra i database…"),
    todo("…poi eliminali quando inizi a usare il cruscotto sul serio."),
    heading2("🗂️ I tuoi database"),
  ];
  for (const key of buildOrder) {
    const st = manifest[key];
    if (st) blocks.push(linkToDatabase(st.databaseId));
  }
  blocks.push(
    divider(),
    heading2("✅ Rifiniture consigliate (nell'app)"),
    todo("Viste: Oggi, Settimana, Anno corrente, Cronoprogramma (Timeline sulle Lezioni per UdA)."),
    todo("Kanban dei Progetti per «Stato»; vista «Previsto vs svolto» su UdA/Obiettivi."),
    todo("Pulsanti-template: «Nuova UdA», «Nuova lezione», «Apri nuovo anno scolastico»."),
    todo("Sync Google Calendar su scadenze e lezioni calendarizzate."),
    divider(),
    heading2("🔒 Privacy — il paletto da non superare"),
    callout(
      "Mai in Notion: dati anagrafici degli studenti, voti nominativi, diagnosi, contenuti di PEI/PDP. " +
        "Le osservazioni restano pseudonime e a livello di classe. Il Registro Elettronico resta l'unica fonte ufficiale.",
      "🔒",
      "red_background"
    )
  );
  return blocks;
}

/**
 * Crea (o, con refresh, rigenera) la pagina-guida dentro la pagina-genitore.
 * Idempotente: se la pagina esiste già e non si chiede il refresh, la lascia com'è.
 */
export async function ensureHomePage(
  parentPageId: string,
  manifest: Manifest,
  refresh: boolean
): Promise<{ created: boolean; id: string }> {
  const existing = await findHomePage(parentPageId);
  if (existing && !refresh) return { created: false, id: existing };
  if (existing && refresh) {
    await withRetry(
      () => notion.pages.update({ page_id: existing, archived: true } as never),
      "archivia la vecchia Home"
    );
  }

  const res = (await withRetry(
    () =>
      notion.pages.create({
        parent: { type: "page_id", page_id: parentPageId },
        icon: { type: "emoji", emoji: "🏠" as never },
        properties: { title: { title: [{ type: "text", text: { content: HOME_TITLE } }] } } as never,
        children: homeBlocks(manifest) as never,
      }),
    "crea la pagina Home"
  )) as { id: string };
  return { created: true, id: res.id };
}
