import { buildOrder } from "../../config/buildOrder";
import { archivePage, callout, createChildPage, divider, findChildPageByTitle, heading2, linkToDatabase, todo } from "./blocks";
import type { Manifest } from "../types";

/** Titolo (con icona nel testo) della pagina-guida creata dentro la pagina-genitore. */
export const HOME_TITLE = "🏠 Cruscotto del docente — Inizia da qui";

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
  const existing = await findChildPageByTitle(parentPageId, HOME_TITLE);
  if (existing && !refresh) return { created: false, id: existing };
  if (existing && refresh) await archivePage(existing);
  const id = await createChildPage(parentPageId, HOME_TITLE, "🏠", homeBlocks(manifest));
  return { created: existing === null, id };
}
