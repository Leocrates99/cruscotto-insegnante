import { notion, withRetry } from "./notion";

// ── Costruttori di blocchi (l'array si casta al confine dell'API) ────────────
export const rt = (content: string) => ({ type: "text", text: { content, link: null } });
export const heading2 = (t: string) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [rt(t)] } });
export const paragraph = (t: string) => ({ object: "block", type: "paragraph", paragraph: { rich_text: [rt(t)] } });
export const bullet = (t: string) => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: { rich_text: [rt(t)] },
});
export const todo = (t: string) => ({ object: "block", type: "to_do", to_do: { rich_text: [rt(t)], checked: false } });
export const divider = () => ({ object: "block", type: "divider", divider: {} });
export const callout = (t: string, emoji: string, color: string) => ({
  object: "block",
  type: "callout",
  callout: { rich_text: [rt(t)], icon: { type: "emoji", emoji }, color },
});
export const linkToDatabase = (databaseId: string) => ({
  object: "block",
  type: "link_to_page",
  link_to_page: { type: "database_id", database_id: databaseId },
});

// ── Helper a livello di pagina ───────────────────────────────────────────────

/** Cerca, tra i figli diretti della pagina-genitore, una sotto-pagina per titolo esatto. */
export async function findChildPageByTitle(parentPageId: string, title: string): Promise<string | null> {
  let cursor: string | undefined;
  do {
    const res = (await withRetry(
      () => notion.blocks.children.list({ block_id: parentPageId, start_cursor: cursor, page_size: 100 }),
      `cerca la pagina "${title}"`
    )) as {
      results: Array<{ id: string; type: string; child_page?: { title: string } }>;
      has_more: boolean;
      next_cursor: string | null;
    };
    for (const b of res.results) {
      if (b.type === "child_page" && b.child_page?.title === title) return b.id;
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return null;
}

export async function archivePage(pageId: string): Promise<void> {
  await withRetry(() => notion.pages.update({ page_id: pageId, archived: true } as never), "archivia pagina");
}

export async function createChildPage(
  parentPageId: string,
  title: string,
  emoji: string,
  children: unknown[]
): Promise<string> {
  const res = (await withRetry(
    () =>
      notion.pages.create({
        parent: { type: "page_id", page_id: parentPageId },
        icon: { type: "emoji", emoji: emoji as never },
        properties: { title: { title: [{ type: "text", text: { content: title } }] } } as never,
        children: children as never,
      }),
    `crea la pagina "${title}"`
  )) as { id: string };
  return res.id;
}

/** Crea la pagina; se ne esiste già una con lo stesso titolo, la archivia e la rifà (refresh). */
export async function upsertChildPage(
  parentPageId: string,
  title: string,
  emoji: string,
  children: unknown[]
): Promise<{ created: boolean; id: string }> {
  const existing = await findChildPageByTitle(parentPageId, title);
  if (existing) await archivePage(existing);
  const id = await createChildPage(parentPageId, title, emoji, children);
  return { created: existing === null, id };
}
