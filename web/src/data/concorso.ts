// Catalogo delle classi di concorso e delle materie, per ordine di scuola e indirizzo liceale.
// Fonte: quadro materie ↔ classi di concorso della secondaria di I e II grado (DM 255/2023).
// I sotto-codici per lingua/strumento (AB22, AA22…, A-55 per singolo strumento) sono
// rappresentati a livello di classe di concorso "base"; la materia resta generica
// (es. "Lingua e cultura straniera"). Dati web-local: non toccano lo schema Notion.

export type Ordine = "media" | "liceo";

export interface IndirizzoDef {
  id: string;
  label: string;
}

export interface ConcorsoDef {
  code: string;
  nome: string;
}

/** Una materia insegnabile in un contesto (ordine + eventuale indirizzo) da certe classi di concorso. */
export interface SlotMateria {
  materia: string;
  ordine: Ordine;
  /** Indirizzo/i liceale/i; assente = trasversale a tutti i licei (o, per le medie, sempre). */
  indirizzo?: string | string[];
  cdc: string[];
}

// ── Indirizzi liceali ────────────────────────────────────────────────────────
export const INDIRIZZI_LICEO: IndirizzoDef[] = [
  { id: "classico", label: "Liceo Classico" },
  { id: "scientifico", label: "Liceo Scientifico" },
  { id: "scientifico-sa", label: "Liceo Scientifico – Scienze Applicate" },
  { id: "scientifico-sportivo", label: "Liceo Scientifico – Sportivo" },
  { id: "linguistico", label: "Liceo Linguistico" },
  { id: "scienze-umane", label: "Liceo delle Scienze Umane" },
  { id: "scienze-umane-es", label: "Liceo Scienze Umane – Economico-Sociale" },
  { id: "artistico", label: "Liceo Artistico" },
  { id: "musicale-coreutico", label: "Liceo Musicale e Coreutico" },
];

// ── Classi di concorso ───────────────────────────────────────────────────────
export const CONCORSI: ConcorsoDef[] = [
  { code: "A-01", nome: "Disegno e storia dell'arte (I e II grado)" },
  { code: "A-02", nome: "Design dei metalli, dell'oreficeria, del corallo e delle gemme" },
  { code: "A-03", nome: "Design della ceramica" },
  { code: "A-04", nome: "Design del libro" },
  { code: "A-05", nome: "Design del tessuto e della moda" },
  { code: "A-06", nome: "Design del vetro" },
  { code: "A-07", nome: "Discipline audiovisive e multimediali" },
  { code: "A-08", nome: "Discipline geometriche, architettura, design d'arredamento e scenografia" },
  { code: "A-09", nome: "Discipline grafiche, pittoriche e scenografiche" },
  { code: "A-11", nome: "Discipline letterarie e latino" },
  { code: "A-12", nome: "Discipline letterarie (I e II grado)" },
  { code: "A-13", nome: "Discipline letterarie, latino e greco" },
  { code: "A-14", nome: "Discipline plastiche, scultoree e scenoplastiche" },
  { code: "A-18", nome: "Filosofia e scienze umane" },
  { code: "A-19", nome: "Filosofia e storia" },
  { code: "A-20", nome: "Fisica" },
  { code: "A-22", nome: "Lingue e culture straniere (I e II grado)" },
  { code: "A-26", nome: "Matematica" },
  { code: "A-27", nome: "Matematica e fisica" },
  { code: "A-28", nome: "Matematica e scienze (I grado)" },
  { code: "A-30", nome: "Musica (I e II grado)" },
  { code: "A-41", nome: "Scienze e tecnologie informatiche" },
  { code: "A-46", nome: "Scienze giuridico-economiche" },
  { code: "A-48", nome: "Scienze motorie e sportive (I e II grado)" },
  { code: "A-50", nome: "Scienze naturali, chimiche e biologiche" },
  { code: "A-53", nome: "Storia della musica e della danza" },
  { code: "A-54", nome: "Storia dell'arte" },
  { code: "A-55", nome: "Strumento musicale (II grado)" },
  { code: "A-56", nome: "Strumento musicale (I grado)" },
  { code: "A-57", nome: "Tecnica della danza classica" },
  { code: "A-58", nome: "Tecnica della danza contemporanea" },
  { code: "A-59", nome: "Tecniche di accompagnamento alla danza" },
  { code: "A-60", nome: "Tecnologia (I grado)" },
  { code: "A-63", nome: "Tecnologie musicali" },
  { code: "A-64", nome: "Teoria, analisi e composizione" },
];

const CONCORSO_NOME = new Map(CONCORSI.map((c) => [c.code, c.nome]));
export function nomeConcorso(code: string): string {
  return CONCORSO_NOME.get(code) ?? code;
}

// ── Materie per contesto ─────────────────────────────────────────────────────
export const SLOT: SlotMateria[] = [
  // Scuola secondaria di I grado (medie)
  { materia: "Italiano", ordine: "media", cdc: ["A-12"] },
  { materia: "Storia", ordine: "media", cdc: ["A-12"] },
  { materia: "Geografia", ordine: "media", cdc: ["A-12"] },
  { materia: "Matematica e scienze", ordine: "media", cdc: ["A-28"] },
  { materia: "Lingua inglese", ordine: "media", cdc: ["A-22"] },
  { materia: "Seconda lingua comunitaria", ordine: "media", cdc: ["A-22"] },
  { materia: "Tecnologia", ordine: "media", cdc: ["A-60"] },
  { materia: "Arte e immagine", ordine: "media", cdc: ["A-01"] },
  { materia: "Musica", ordine: "media", cdc: ["A-30"] },
  { materia: "Scienze motorie e sportive", ordine: "media", cdc: ["A-48"] },
  { materia: "Strumento musicale", ordine: "media", cdc: ["A-56"] },

  // Licei — asse comune / materie trasversali
  { materia: "Lingua e letteratura italiana", ordine: "liceo", cdc: ["A-11", "A-12", "A-13"] },
  { materia: "Storia e geografia (biennio)", ordine: "liceo", cdc: ["A-11", "A-12", "A-13"] },
  { materia: "Storia (triennio)", ordine: "liceo", cdc: ["A-19", "A-11", "A-12", "A-13"] },
  { materia: "Filosofia", ordine: "liceo", cdc: ["A-19"] },
  { materia: "Lingua e cultura straniera", ordine: "liceo", cdc: ["A-22"] },
  { materia: "Matematica", ordine: "liceo", cdc: ["A-26", "A-27"] },
  { materia: "Fisica", ordine: "liceo", cdc: ["A-20", "A-27"] },
  { materia: "Scienze naturali", ordine: "liceo", cdc: ["A-50"] },
  { materia: "Scienze motorie e sportive", ordine: "liceo", cdc: ["A-48"] },

  // Licei — discipline caratterizzanti
  {
    materia: "Lingua e cultura latina",
    ordine: "liceo",
    indirizzo: ["classico", "scientifico", "linguistico", "scienze-umane", "scienze-umane-es"],
    cdc: ["A-11", "A-13"],
  },
  { materia: "Lingua e cultura greca", ordine: "liceo", indirizzo: "classico", cdc: ["A-13"] },

  // Disegno / Storia dell'arte
  { materia: "Disegno e storia dell'arte", ordine: "liceo", indirizzo: ["classico", "scientifico"], cdc: ["A-01"] },
  {
    materia: "Storia dell'arte",
    ordine: "liceo",
    indirizzo: ["linguistico", "scienze-umane", "scienze-umane-es", "musicale-coreutico"],
    cdc: ["A-01"],
  },

  // Liceo Scientifico (opzioni)
  { materia: "Informatica", ordine: "liceo", indirizzo: "scientifico-sa", cdc: ["A-41"] },
  { materia: "Discipline sportive", ordine: "liceo", indirizzo: "scientifico-sportivo", cdc: ["A-48"] },
  { materia: "Diritto ed economia dello sport", ordine: "liceo", indirizzo: "scientifico-sportivo", cdc: ["A-46"] },

  // Liceo delle Scienze Umane
  { materia: "Scienze umane", ordine: "liceo", indirizzo: ["scienze-umane", "scienze-umane-es"], cdc: ["A-18"] },
  { materia: "Diritto ed economia politica", ordine: "liceo", indirizzo: "scienze-umane-es", cdc: ["A-46"] },

  // Liceo Artistico
  { materia: "Storia dell'arte", ordine: "liceo", indirizzo: "artistico", cdc: ["A-54", "A-01"] },
  { materia: "Discipline geometriche", ordine: "liceo", indirizzo: "artistico", cdc: ["A-08"] },
  { materia: "Discipline grafiche e pittoriche", ordine: "liceo", indirizzo: "artistico", cdc: ["A-09"] },
  { materia: "Discipline plastiche e scultoree", ordine: "liceo", indirizzo: "artistico", cdc: ["A-14"] },
  { materia: "Discipline audiovisive e multimediali", ordine: "liceo", indirizzo: "artistico", cdc: ["A-07"] },
  {
    materia: "Discipline progettuali e laboratori di design",
    ordine: "liceo",
    indirizzo: "artistico",
    cdc: ["A-02", "A-03", "A-04", "A-05", "A-06", "A-08", "A-09", "A-14"],
  },

  // Liceo Musicale e Coreutico
  { materia: "Storia della musica", ordine: "liceo", indirizzo: "musicale-coreutico", cdc: ["A-53"] },
  { materia: "Storia della danza", ordine: "liceo", indirizzo: "musicale-coreutico", cdc: ["A-53"] },
  { materia: "Teoria, analisi e composizione", ordine: "liceo", indirizzo: "musicale-coreutico", cdc: ["A-64"] },
  { materia: "Tecnologie musicali", ordine: "liceo", indirizzo: "musicale-coreutico", cdc: ["A-63"] },
  { materia: "Esecuzione e interpretazione (strumento)", ordine: "liceo", indirizzo: "musicale-coreutico", cdc: ["A-55"] },
  { materia: "Tecnica della danza classica", ordine: "liceo", indirizzo: "musicale-coreutico", cdc: ["A-57"] },
  { materia: "Tecnica della danza contemporanea", ordine: "liceo", indirizzo: "musicale-coreutico", cdc: ["A-58"] },
  { materia: "Tecniche di accompagnamento alla danza", ordine: "liceo", indirizzo: "musicale-coreutico", cdc: ["A-59"] },
];

// ── Helper di derivazione ────────────────────────────────────────────────────

/** Riferimento minimo a una scuola del profilo (ordine + eventuale indirizzo). */
export interface ScuolaRef {
  ordine: Ordine;
  indirizzo?: string;
}

function indirizziDi(slot: SlotMateria): string[] | null {
  if (slot.indirizzo === undefined) return null; // trasversale
  return Array.isArray(slot.indirizzo) ? slot.indirizzo : [slot.indirizzo];
}

/** Lo slot è insegnabile nella scuola data? */
export function slotInScuola(slot: SlotMateria, scuola: ScuolaRef): boolean {
  if (slot.ordine !== scuola.ordine) return false;
  if (scuola.ordine === "media") return true;
  const indir = indirizziDi(slot);
  if (indir === null) return true; // trasversale ai licei
  return scuola.indirizzo ? indir.includes(scuola.indirizzo) : false;
}

const uniq = (xs: string[]): string[] => Array.from(new Set(xs));

/** Materie disponibili nelle scuole date (universo per la profilazione). */
export function materieScuola(scuole: ScuolaRef[]): string[] {
  if (!scuole.length) return [];
  return uniq(SLOT.filter((s) => scuole.some((sc) => slotInScuola(s, sc))).map((s) => s.materia));
}

/** Classi di concorso pertinenti alle scuole date (per filtrare il selettore CdC). */
export function concorsiPerScuole(scuole: ScuolaRef[]): string[] {
  if (!scuole.length) return CONCORSI.map((c) => c.code);
  return uniq(SLOT.filter((s) => scuole.some((sc) => slotInScuola(s, sc))).flatMap((s) => s.cdc));
}

/** Materie insegnate dalle classi di concorso date (a prescindere dalla scuola). */
export function materiePerConcorsi(cdc: string[]): string[] {
  if (!cdc.length) return [];
  return uniq(SLOT.filter((s) => s.cdc.some((c) => cdc.includes(c))).map((s) => s.materia));
}

/** Proposta finale: materie delle classi di concorso ∩ contesto delle scuole. */
export function materieProfilo(scuole: ScuolaRef[], cdc: string[]): string[] {
  if (!cdc.length) return [];
  const inter = SLOT.filter(
    (s) => s.cdc.some((c) => cdc.includes(c)) && (scuole.length === 0 || scuole.some((sc) => slotInScuola(s, sc)))
  ).map((s) => s.materia);
  const out = uniq(inter);
  return out.length ? out : materiePerConcorsi(cdc);
}
