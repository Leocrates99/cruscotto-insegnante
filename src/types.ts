// ─────────────────────────────────────────────────────────────────────────────
// Modello dichiarativo dello schema.
// Ogni database è descritto come DATO (un oggetto SchemaDef), non come codice
// imperativo: gli helper in src/lib/ traducono questi oggetti in chiamate API.
// Aggiungere un campo = modificare un oggetto, non scrivere logica (§13.9).
// ─────────────────────────────────────────────────────────────────────────────

/** Chiave logica di un database (coincide col nome del file in src/schema/). */
export type DbKey =
  | "anni"
  | "classi"
  | "obiettivi"
  | "materiali"
  | "sapere"
  | "programmazione"
  | "uda"
  | "lezioni"
  | "verifiche"
  | "osservazioni"
  | "idee"
  | "progetti"
  | "task"
  | "scadenze"
  | "formazione"
  | "letture"
  | "riunioni";

/** Formati ammessi per le proprietà numeriche. */
export type NumberFormat = "number" | "number_with_commas" | "percent" | "euro" | "dollar";

/** Colori delle opzioni di select/multi_select (palette Notion). */
export type NotionColor =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export interface OptionDef {
  name: string;
  color?: NotionColor;
}

/**
 * Proprietà "base" creabili nella passata 1 (senza relazioni/rollup/formule).
 * Le relazioni si aggiungono nella passata 2, rollup e formule nella passata 3.
 */
export type BasePropertyDef =
  | { type: "title" }
  | { type: "rich_text" }
  | { type: "number"; format?: NumberFormat }
  | { type: "checkbox" }
  | { type: "url" }
  | { type: "email" }
  | { type: "phone_number" }
  | { type: "files" }
  | { type: "date" }
  | { type: "select"; options: OptionDef[] }
  | { type: "multi_select"; options: OptionDef[] };

/** Funzioni di rollup usate dal progetto (sottoinsieme di quelle Notion). */
export type RollupFunction =
  | "count"
  | "count_values"
  | "sum"
  | "average"
  | "min"
  | "max"
  | "checked"
  | "unchecked"
  | "percent_checked";

/** Relazione verso un altro database (passata 2). */
export interface RelationDef {
  /** Nome della proprietà-relazione su QUESTO database. */
  name: string;
  /** Database di destinazione (chiave logica). */
  target: DbKey;
  /** Se true crea una relazione duale: Notion genera la proprietà inversa sul target. */
  dual?: boolean;
  /** Nome desiderato della proprietà inversa sul target (solo se dual). */
  dualName?: string;
}

/** Rollup (passata 3): aggrega lungo una relazione già creata nella passata 2. */
export interface RollupDef {
  name: string;
  /** Nome della proprietà-relazione (su questo DB) lungo cui aggregare. */
  relation: string;
  /** Proprietà del DB collegato da aggregare; se omessa, conteggio (usa il titolo del target). */
  target?: string;
  function: RollupFunction;
}

/** Formula (passata 3): espressione nella sintassi delle formule Notion. */
export interface FormulaDef {
  name: string;
  expression: string;
}

/** Definizione dichiarativa completa di un database. */
export interface SchemaDef {
  key: DbKey;
  title: string;
  /** Emoji usata come icona del database. */
  icon?: string;
  description?: string;
  /** Documentazione: true se il DB è "anno-neutro" (non porta la relazione Anno, §6). */
  yearNeutral?: boolean;
  properties: Record<string, BasePropertyDef>;
  relations?: RelationDef[];
  rollups?: RollupDef[];
  formulas?: FormulaDef[];
  /**
   * Rinomine di proprietà da applicare in migrazione (vecchio nome → nuovo nome).
   * Senza questo, rinominare la chiave di una proprietà nello schema creerebbe una
   * proprietà nuova e lascerebbe orfana la vecchia (con i suoi dati). Esempio:
   *   renames: [{ from: "Durata", to: "Durata (ore)" }]
   */
  renames?: Array<{ from: string; to: string }>;
}

/** Voce del manifest di idempotenza per un database. */
export interface DbState {
  databaseId: string;
  dataSourceId: string;
}

/** Manifest completo: chiave logica → identificativi Notion. */
export type Manifest = Partial<Record<DbKey, DbState>>;
