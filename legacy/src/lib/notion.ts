import "dotenv/config";
import { Client } from "@notionhq/client";

// Versione dell'API Notion che introduce il modello "data source" (§13.2).
export const NOTION_VERSION = "2025-09-03";

const token = process.env.NOTION_TOKEN?.trim();
if (!token) {
  throw new Error(
    'NOTION_TOKEN mancante. Copia ".env.example" in ".env" e inserisci il token dell\'integrazione ' +
      "(https://www.notion.so/my-integrations)."
  );
}

/** Client Notion condiviso, fissato alla versione 2025-09-03 (SDK v5). */
export const notion = new Client({ auth: token, notionVersion: NOTION_VERSION });

/** ID della pagina-genitore che ospita i database. Letto da .env, mai dal codice. */
export function getParentPageId(): string {
  const id = process.env.NOTION_PARENT_PAGE_ID?.trim();
  if (!id) {
    throw new Error(
      "NOTION_PARENT_PAGE_ID mancante in .env (ID della pagina-genitore condivisa con l'integrazione)."
    );
  }
  return id;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Esegue una chiamata API con retry su rate-limit (429) ed errori transitori.
 * Le chiamate del build sono sequenziali, quindi questo è sufficiente a restare
 * entro i limiti (~3 richieste/secondo).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label = "chiamata Notion",
  maxRetries = 5
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      if (!isRetriable(err) || attempt > maxRetries) throw err;
      const wait = retryDelayMs(err, attempt);
      console.warn(`  ↻ ${label}: tentativo ${attempt}/${maxRetries} tra ${wait}ms (${describeError(err)})`);
      await sleep(wait);
    }
  }
}

function isRetriable(err: unknown): boolean {
  const status = (err as { status?: number }).status;
  const code = (err as { code?: string }).code;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  if (code === "rate_limited" || code === "internal_server_error" || code === "service_unavailable") return true;
  // Errori di rete (fetch) senza status/code → ritentabili.
  if (status === undefined && code === undefined) return true;
  return false;
}

function retryDelayMs(err: unknown, attempt: number): number {
  const headers = (err as { headers?: Record<string, string> }).headers;
  const retryAfter = headers?.["retry-after"];
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (!Number.isNaN(secs)) return secs * 1000;
  }
  return Math.min(1000 * 2 ** (attempt - 1), 15000); // backoff esponenziale, tetto 15s
}

/** Estrae un messaggio leggibile da un errore Notion o generico. */
export function describeError(err: unknown): string {
  const e = err as { body?: string; message?: string; code?: string };
  return e.body ?? e.message ?? e.code ?? String(err);
}
