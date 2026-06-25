// Tassonomia "a drill di comando" per Conoscenze/contenuti e Abilità/competenze.
// I nuclei dell'archivio sono grossolani (Morfologia, Sintassi, Storia letteraria...):
// qui li ramifichiamo nella tassonomia didattica fine richiesta, classificando le
// voci esistenti per nucleo + parole-chiave sul `testo` (NON si inventa contenuto).
import type { Voce } from "./archivio";

export type TNodo = {
  id: string; label: string; icona: string;
  figli?: TNodo[];     // ramo
  tree?: boolean;      // foglia ad albero (letteratura: epoche/correnti → autori)
  voci?: Voce[];       // foglia: voci classificate (per albero = include anche i figli)
  count: number;       // voci selezionabili nel sottoalbero
};
type Spec = { id: string; label: string; icona: string; tree?: boolean; figli?: Spec[]; match?: (v: Voce) => boolean };

// ---- Classificatore della grammatica (latino/greco e italiano) per parole-chiave ----
const RE = {
  traduzione: /traduzion/i,
  fonologia: /fonolog|ortograf|alfabeto|pronuncia|quantit|spirit|accent|prosodi|punteggiatura/i,
  lessico: /lessico|formazione delle parole|etimolog|famiglie di parole|campi semantici|vocabolario|denotazione|connotazione/i,
  analisiLogica: /analisi logica|complement|frase semplice|\bsoggetto\b|\bpredicato\b|\battribut[oi]\b|apposizion|sintassi della frase|sintassi dei casi|funzioni dei casi/i,
  sintassiPeriodo: /sintassi del periodo|analisi del periodo|\bperiodo\b|coordinazion|subordinazion|proposizion|consecutio|congiuntiv|infinitiv|participi|ablativo assoluto|perifrastica|relativ|completiv|interrogative|cum /i,
  registri: /registr|variet|funzioni della lingua|sociolinguist|storia della lingua|italiano dell'uso|comunicazione/i,
};
const NUCLEI_GRAMM = new Set(["Morfologia", "Sintassi", "Lessico", "Metrica", "Metrica e dialetti"]);

/** Classico: assegna una voce di grammatica a UNA sola sotto-categoria (priorità). */
function classGrammatica(v: Voce): string {
  const t = v.testo || "";
  if (RE.traduzione.test(t)) return "traduzione";
  if (RE.fonologia.test(t)) return "fonologia";
  if (v.nucleo === "Lessico" || RE.lessico.test(t)) return "lessico";
  if (v.nucleo === "Metrica" || v.nucleo === "Metrica e dialetti") return "metrica";
  if (RE.analisiLogica.test(t)) return "analisiLogica";
  if (v.nucleo === "Sintassi" || RE.sintassiPeriodo.test(t)) return "sintassi";
  return "morfologia";
}
const gram = (id: string) => (v: Voce) => NUCLEI_GRAMM.has(v.nucleo) && classGrammatica(v) === id;

/** Italiano: la grammatica vive dentro "Educazione linguistica" → classificata per testo. */
function classEducLing(v: Voce): string {
  const t = v.testo || "";
  if (RE.fonologia.test(t)) return "fonologia";
  if (RE.analisiLogica.test(t)) return "analisiLogica";
  if (RE.sintassiPeriodo.test(t)) return "sintassi";
  if (RE.lessico.test(t)) return "lessico";
  if (/morfolog|parti del discorso|parti variabili|parti invariabili|\bverbo\b|\bnome\b|aggettiv|pronom|articolo|avverbi|preposizion|congiunzion|interiezion|declinazione|coniugazione/i.test(t)) return "morfologia";
  return "altro"; // registri / varietà / funzioni della lingua → confluiscono nell'orale raffinato
}
const el = (id: string) => (v: Voce) => v.nucleo === "Educazione linguistica" && classEducLing(v) === id;
const RE_TIPOLOGIE = /tipolog|testo (narrativ|descrittiv|espositiv|argomentativ|regolativ)|analisi del testo|argoment|espositiv|coerenza|coesion/i;

const SPEC_CLASSICO: Spec[] = [
  { id: "gram", label: "Grammatica", icona: "📐", figli: [
    { id: "fonologia", label: "Fonologia", icona: "🔤", match: gram("fonologia") },
    { id: "morfologia", label: "Morfologia", icona: "🧩", match: gram("morfologia") },
    { id: "analisiLogica", label: "Analisi logica", icona: "🔗", match: gram("analisiLogica") },
    { id: "sintassi", label: "Sintassi", icona: "🪢", match: gram("sintassi") },
    { id: "lessico", label: "Lessico", icona: "📔", match: gram("lessico") },
    { id: "metrica", label: "Metrica", icona: "🎵", match: gram("metrica") },
    { id: "traduzione", label: "Traduzione", icona: "🔁", match: gram("traduzione") },
  ] },
  { id: "lett", label: "Letteratura", icona: "📜", figli: [
    { id: "storia", label: "Storia letteraria", icona: "🏛️", tree: true, match: (v) => v.nucleo === "Storia letteraria" },
    { id: "scienze", label: "Scienze dell'antichità", icona: "🏺", match: (v) => v.nucleo === "Civilta' e ricezione" || v.nucleo === "Scienze dell'antichita'" },
    { id: "strumenti", label: "Strumenti dell'analisi letteraria", icona: "🔎", match: (v) => v.nucleo === "Strumenti dell'analisi letteraria" },
    { id: "teoria", label: "Teoria e critica letteraria", icona: "✒️", match: (v) => v.nucleo === "Teoria e critica letteraria" },
  ] },
];

const SPEC_ITALIANO: Spec[] = [
  { id: "gram", label: "Grammatica", icona: "📐", figli: [
    { id: "fonologia", label: "Fonologia", icona: "🔤", match: el("fonologia") },
    { id: "morfologia", label: "Morfologia", icona: "🧩", match: el("morfologia") },
    { id: "analisiLogica", label: "Analisi logica", icona: "🔗", match: el("analisiLogica") },
    { id: "sintassi", label: "Sintassi", icona: "🪢", match: el("sintassi") },
    { id: "lessico", label: "Lessico", icona: "📔", match: el("lessico") },
  ] },
  { id: "lett", label: "Letteratura", icona: "📜", figli: [
    { id: "storia", label: "Storia ed educazione letteraria", icona: "🏛️", tree: true, match: (v) => v.nucleo === "Storia ed educazione letteraria" },
  ] },
  { id: "analisi", label: "Analisi letteraria", icona: "🔎", figli: [
    { id: "strumenti", label: "Strumenti dell'analisi letteraria", icona: "🧰", match: (v) => v.nucleo === "Strumenti dell'analisi letteraria" },
    { id: "teoria", label: "Teoria e critica letteraria", icona: "✒️", match: (v) => v.nucleo === "Teoria e critica letteraria" },
  ] },
  { id: "prod", label: "Produzione", icona: "✍️", figli: [
    { id: "scritta", label: "Scritta", icona: "📝", figli: [
      { id: "tipologie", label: "Tipologie testuali", icona: "🗂️", match: (v) => v.nucleo === "Testo e tipologie testuali" || (v.nucleo === "Produzione scritta" && RE_TIPOLOGIE.test(v.testo || "")) },
      { id: "esercitazioni", label: "Esercitazioni scritte", icona: "✏️", match: (v) => v.nucleo === "Produzione scritta" && !RE_TIPOLOGIE.test(v.testo || "") },
    ] },
    { id: "orale", label: "Orale", icona: "🗣️", figli: [
      { id: "esposizione", label: "Esposizione e comunicazione", icona: "💬", match: (v) => v.nucleo === "Comunicazione orale" },
      { id: "edling", label: "Educazione linguistica", icona: "🧠", match: (v) => v.nucleo === "Educazione linguistica" && classEducLing(v) === "altro" },
    ] },
  ] },
];

function resolve(spec: Spec, voci: Voce[]): TNodo {
  if (spec.figli) {
    const figli = spec.figli.map((f) => resolve(f, voci));
    return { id: spec.id, label: spec.label, icona: spec.icona, figli, count: figli.reduce((s, f) => s + f.count, 0) };
  }
  const mine = spec.match ? voci.filter(spec.match) : [];
  return { id: spec.id, label: spec.label, icona: spec.icona, tree: spec.tree, voci: mine, count: mine.length };
}

/** Tassonomia "conoscenze" per la materia (code = GRC/LAT/ITA). Voci già filtrate ai blocchi C. */
export function tassonomiaConoscenze(code: string, vociCono: Voce[]): TNodo[] {
  const specs = code === "ITA" ? SPEC_ITALIANO : (code === "LAT" || code === "GRC") ? SPEC_CLASSICO : genericoSpec(vociCono);
  return specs.map((s) => resolve(s, vociCono));
}

// Fallback per eventuali altre materie: una macro "Contenuti" con un nodo per nucleo.
function genericoSpec(voci: Voce[]): Spec[] {
  const nuclei = [...new Set(voci.map((v) => v.nucleo).filter(Boolean))];
  return [{ id: "tutti", label: "Contenuti", icona: "📚", figli: nuclei.map((n) => ({ id: n, label: n, icona: ICON_NUCLEO[n] ?? "•", match: (v: Voce) => v.nucleo === n })) }];
}

// Icone stabili per i nuclei (foglie di abilità/competenze).
export const ICON_NUCLEO: Record<string, string> = {
  "Traduzione e analisi del testo": "🔁", "Educazione linguistica": "🧠",
  "Storia letteraria": "🏛️", "Storia ed educazione letteraria": "🏛️", "Metrica": "🎵", "Metrica e dialetti": "🎵",
  "Scienze dell'antichita'": "🏺", "Civilta' e ricezione": "🏺",
  "Strumenti dell'analisi letteraria": "🧰", "Teoria e critica letteraria": "✒️",
  "Produzione scritta": "📝", "Comunicazione orale": "🗣️", "Testo e tipologie testuali": "🗂️",
};
const MACRO = [
  { id: "gram", label: "Lingua e traduzione", icona: "📐", nuclei: ["Traduzione e analisi del testo", "Educazione linguistica"] },
  { id: "lett", label: "Letteratura", icona: "📜", nuclei: ["Storia letteraria", "Storia ed educazione letteraria", "Metrica", "Metrica e dialetti", "Scienze dell'antichita'", "Civilta' e ricezione"] },
  { id: "analisi", label: "Analisi letteraria", icona: "🔎", nuclei: ["Strumenti dell'analisi letteraria", "Teoria e critica letteraria"] },
  { id: "prod", label: "Produzione", icona: "✍️", nuclei: ["Produzione scritta", "Comunicazione orale", "Testo e tipologie testuali"] },
];

/** Raggruppa le voci di un blocco (abilità o competenza) in macro → nucleo. */
function macroLeaves(voci: Voce[]): TNodo[] {
  return MACRO.map((m) => {
    const nuclei = [...new Set(voci.filter((v) => m.nuclei.includes(v.nucleo)).map((v) => v.nucleo))];
    const figli: TNodo[] = nuclei.map((n) => { const vs = voci.filter((v) => v.nucleo === n); return { id: n, label: n, icona: ICON_NUCLEO[n] ?? "•", voci: vs, count: vs.length }; });
    return { id: m.id, label: m.label, icona: m.icona, figli, count: figli.reduce((s, f) => s + f.count, 0) };
  }).filter((m) => m.count > 0);
}

/** Tassonomia "abilità e competenze": due rami (Abilità / Competenze) → macro → nucleo. */
export function tassonomiaSkill(abilita: Voce[], competenze: Voce[]): TNodo[] {
  return [
    { id: "abilita", label: "Abilità", icona: "🛠️", figli: macroLeaves(abilita), count: abilita.length },
    { id: "competenza", label: "Competenze", icona: "🎯", figli: macroLeaves(competenze), count: competenze.length },
  ];
}

/** Naviga la foresta lungo `path` di id; ritorna il nodo corrente (o null se a livello radice). */
export function findNodo(roots: TNodo[], path: string[]): TNodo | null {
  let cur: TNodo | null = null;
  let level = roots;
  for (const id of path) { const n = level.find((x) => x.id === id); if (!n) return cur; cur = n; level = n.figli ?? []; }
  return cur;
}
