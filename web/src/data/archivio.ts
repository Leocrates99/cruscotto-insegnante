// Data layer dell'archivio didattico-normativo (sorgente di verità = web/data/,
// normalizzata in src/data/archivio.json dal build step gen-archivio.mjs).
// Espone tipi, caricamento lazy e gli helper «intelligenti» del contratto-dati:
// cascata filtri, albero letteratura, autocomplete, copertura, parallelismi.
import { useEffect, useState } from "react";

export interface ObiettivoBackbone {
  id: string; materia: string; materia_label: string; nucleo: string; tipo: string; fase: string;
  argomento: string; descrizione: string; bloom: string | null; competenza_europea: string;
  indirizzi: string[]; classi: string[]; keywords: string[];
}
export interface Voce {
  id: string; materia: string; anno: string | null; fase: string; indirizzi: string[]; classi: string[];
  blocco: string; nucleo: string; testo: string; obiettivi_backbone: string[]; tipo_contenuto: string | null;
  parent: string | null; peso: string; tag: string[]; bloom: string | null; competenza_europea: string; fonte: string; stato: string;
}
export interface Parallelismo {
  id: string; asse: string; sotto_tipo: string; titolo: string; descrizione: string; relazione: string;
  materie: string[]; riferimenti: string[]; ambito_culturale: string; discipline_apporto: string[]; tag: string[]; stato: string;
}
// ── Repertori didattici (lesson-builder, 08_) ────────────────────────────────
export interface Prerequisito { id: string; materia: string; scope: string; target: string; prerequisito: string; tipo: string; orizzonte: string; obbligatorio: boolean; nota: string }
export interface Metodologia { id: string; nome: string; gruppo: string; centratura: string; strutturazione: string; raggruppamento: string; logica: string; focus: string; esito: string; tempi: string; tecnologia: string; carico_docente: string; fase_tipica: string[]; aggancio_classico: string }
export interface Fase { id: string; fase: string; modello: string; ordine: number | null; funzione: string; centratura: string; perc_monte: number | null; dur_min_60: number | null; dur_max_60: number | null; attivita_docente: string; attivita_studente: string; metodologie_tipiche: string[]; opzionale: boolean }
export interface Arrangiamento { id: string; nome: string; modello: string; sequenza_fasi: string[]; durata_riferimento_min: number | null; metodologie_tipiche: string[]; calibrazione: string; note: string }
export interface Materiale { id: string; categoria: string; tipo: string; descrizione: string; supporto: string; funzione: string; accessibilita: string; materie: string[]; note: string }
export interface Valutazione { id: string; funzione: string; metodo: string; forma: string; descrizione: string; momento: string; oggetto: string[]; bloom_max: string; descrittore_dublino: string; graduata: boolean; materie: string[] }
export interface MisuraInclusione { id: string; ambito: string; categoria: string; misura: string; descrizione: string; disciplina_o_trasversale: string; riferimento_normativo: string; raccordo_valutazione: string; materie: string[] }
export interface Sdg { id: string; numero: number | null; titolo: string; colore: string; area: string; descrizione: string; keywords: string[] }
export interface Repertori { prerequisiti: Prerequisito[]; metodologie: Metodologia[]; fasi: Fase[]; arrangiamenti: Arrangiamento[]; materiali: Materiale[]; valutazione: Valutazione[]; inclusione: MisuraInclusione[]; agenda: Sdg[] }

export interface ArchivioIndex {
  obiettivi: ObiettivoBackbone[]; voci: Voce[]; parallelismi: Parallelismo[];
  faccette: Record<string, unknown>;
  repertori: Repertori;
  indici: { vociByMateria: Record<string, string[]>; figliByParent: Record<string, string[]>; vociByObiettivo: Record<string, string[]>; parallelismiByRef: Record<string, string[]>; metodologieByFase: Record<string, string[]>; fasiById: Record<string, string>; prerequisitiByNucleo: Record<string, string[]> };
  meta: { conteggi: Record<string, number> };
}

// ── Caricamento lazy (chunk separato) ────────────────────────────────────────
let cache: ArchivioIndex | null = null;
let loading: Promise<ArchivioIndex> | null = null;
export async function loadArchivio(): Promise<ArchivioIndex> {
  if (cache) return cache;
  if (!loading) loading = import("./archivio.json").then((m) => (cache = m.default as unknown as ArchivioIndex));
  return loading;
}
export function useArchivio(): ArchivioIndex | null {
  const [a, setA] = useState<ArchivioIndex | null>(cache);
  useEffect(() => { if (!cache) void loadArchivio().then(setA); }, []);
  return a;
}

// ── Mappe id → record (memoizzate sul singleton) ─────────────────────────────
let _v: Map<string, Voce> | null = null;
let _p: Map<string, Parallelismo> | null = null;
const vMap = (a: ArchivioIndex) => (_v ??= new Map(a.voci.map((v) => [v.id, v])));
const pMap = (a: ArchivioIndex) => (_p ??= new Map(a.parallelismi.map((p) => [p.id, p])));
export const voce = (a: ArchivioIndex, id: string): Voce | undefined => vMap(a).get(id);

// Ponte nome-materia del Cruscotto → codice d'archivio (GRC/LAT/ITA).
const MAT_BRIDGE: Record<string, string> = {
  "Lingua e letteratura italiana": "ITA",
  "Lingua e cultura latina": "LAT",
  "Lingua e cultura greca": "GRC",
};
export function materiaCodice(a: ArchivioIndex, nome: string): string | undefined {
  if (MAT_BRIDGE[nome]) return MAT_BRIDGE[nome];
  return a.indici.vociByMateria[nome] ? nome : undefined;
}
/** Ordinamento per centralità (core prima) poi alfabetico. */
export const perPeso = (x: Voce, y: Voce): number => (x.peso === "core" ? 0 : 1) - (y.peso === "core" ? 0 : 1) || x.testo.localeCompare(y.testo);
const resolveVoci = (a: ArchivioIndex, ids: string[]): Voce[] => ids.map((id) => vMap(a).get(id)).filter((v): v is Voce => !!v);

// ── Gate di pubblicazione (stato) ────────────────────────────────────────────
export type Stato = "bozza" | "revisione" | "consolidato";
const ORD: Record<string, number> = { bozza: 0, revisione: 1, consolidato: 2 };
export const vociPubblicabili = (a: ArchivioIndex, min: Stato = "bozza"): Voce[] => a.voci.filter((v) => (ORD[v.stato] ?? 1) >= (ORD[min] ?? 0));

// ── Cascata filtri (data-driven, §3.1) ───────────────────────────────────────
export interface Filtri { materia?: string; indirizzo?: string; classe?: string; fase?: string; anno?: string; nucleo?: string; blocco?: string }
export function filtraVoci(a: ArchivioIndex, f: Filtri, base?: Voce[]): Voce[] {
  let v = base ?? a.voci;
  if (f.materia) v = v.filter((x) => x.materia === f.materia);
  if (f.indirizzo) v = v.filter((x) => x.indirizzi.includes(f.indirizzo!));
  if (f.classe) v = v.filter((x) => x.classi.includes(f.classe!));
  if (f.fase) v = v.filter((x) => x.fase === f.fase);
  if (f.anno) v = v.filter((x) => x.anno === f.anno);
  if (f.nucleo) v = v.filter((x) => x.nucleo === f.nucleo);
  if (f.blocco) v = v.filter((x) => x.blocco === f.blocco);
  return v;
}
const distinct = (xs: string[]): string[] => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
export type Campo = "materia" | "indirizzo" | "classe" | "fase" | "anno" | "nucleo" | "blocco";
/** Opzioni disponibili per un livello, calcolate dal set di voci già filtrato. */
export function opzioni(voci: Voce[], campo: Campo): string[] {
  if (campo === "indirizzo") return distinct(voci.flatMap((v) => v.indirizzi));
  if (campo === "classe") return distinct(voci.flatMap((v) => v.classi));
  if (campo === "anno") return distinct(voci.map((v) => v.anno ?? ""));
  return distinct(voci.map((v) => v[campo] as string));
}

// ── Albero letteratura (epoca → autore → opera + scheda autore, §3.2) ─────────
const RADICE = new Set(["epoca", "corrente", "genere"]);
const FACET = new Set(["biografia", "stile", "poetica", "ipertestualita"]);
export const radiciLetteratura = (a: ArchivioIndex, materia: string): Voce[] =>
  a.voci.filter((v) => v.materia === materia && !v.parent && v.tipo_contenuto !== null && RADICE.has(v.tipo_contenuto));
export const figli = (a: ArchivioIndex, parentId: string): Voce[] => resolveVoci(a, a.indici.figliByParent[parentId] ?? []);
// Ordine didattico dei figli di un nodo-autore: prima la scheda (biografia → stile →
// poetica → ipertestualità), poi le opere; il resto a seguire, per centralità.
const ORD_FIGLIO: Record<string, number> = { biografia: 0, stile: 1, poetica: 2, ipertestualita: 3, opera: 4 };
export const figliOrdinati = (a: ArchivioIndex, parentId: string): Voce[] =>
  figli(a, parentId).slice().sort((x, y) => {
    const rx = x.tipo_contenuto ? ORD_FIGLIO[x.tipo_contenuto] ?? 9 : 9;
    const ry = y.tipo_contenuto ? ORD_FIGLIO[y.tipo_contenuto] ?? 9 : 9;
    return rx - ry || perPeso(x, y);
  });
/** Catena di antenati (genitore → … → radice) di una voce, dal più vicino al più lontano. */
export function antenati(a: ArchivioIndex, id: string): Voce[] {
  const out: Voce[] = [];
  let cur = voce(a, id);
  const visti = new Set<string>([id]);
  while (cur?.parent && !visti.has(cur.parent)) {
    const p = voce(a, cur.parent);
    if (!p) break;
    out.push(p); visti.add(p.id); cur = p;
  }
  return out;
}
export const autoriDi = (a: ArchivioIndex, radiceId: string): Voce[] => figli(a, radiceId).filter((v) => v.tipo_contenuto === "autore");
export const opereDi = (a: ArchivioIndex, autoreId: string): Voce[] => figli(a, autoreId).filter((v) => v.tipo_contenuto === "opera");
export const schedaAutore = (a: ArchivioIndex, autoreId: string): Voce[] => figli(a, autoreId).filter((v) => v.tipo_contenuto !== null && FACET.has(v.tipo_contenuto));

// ── Autocomplete su voci.testo (§3.3) ────────────────────────────────────────
export function cerca(a: ArchivioIndex, q: string, f: Filtri = {}, limit = 40): Voce[] {
  const nq = q.trim().toLowerCase();
  const base = filtraVoci(a, f);
  const res = nq ? base.filter((v) => v.testo.toLowerCase().includes(nq) || v.tag.some((t) => t.toLowerCase().includes(nq))) : base;
  const w = (v: Voce) => (v.peso === "core" ? 0 : 1);
  return res.slice().sort((x, y) => w(x) - w(y) || x.testo.localeCompare(y.testo)).slice(0, limit);
}

// ── Obiettivi agganciati a una voce (per l'auto-tagging) ─────────────────────
export const obiettiviDiVoce = (a: ArchivioIndex, v: Voce): ObiettivoBackbone[] =>
  v.obiettivi_backbone.map((id) => a.obiettivi.find((o) => o.id === id)).filter((o): o is ObiettivoBackbone => !!o);

// ── Copertura / gap analysis (§3.4) ──────────────────────────────────────────
export interface Copertura { coperti: number; totali: number; pct: number; mancanti: ObiettivoBackbone[] }
export function copertura(a: ArchivioIndex, materia: string, fase: string | undefined, vociScelteIds: string[]): Copertura {
  const totali = a.obiettivi.filter((o) => o.materia === materia && (!fase || o.fase === fase || o.fase === "quinquennio"));
  const set = new Set<string>();
  for (const id of vociScelteIds) { const v = voce(a, id); if (v) for (const ob of v.obiettivi_backbone) set.add(ob); }
  const mancanti = totali.filter((o) => !set.has(o.id));
  const coperti = totali.length - mancanti.length;
  return { coperti, totali: totali.length, pct: totali.length ? Math.round((coperti / totali.length) * 100) : 0, mancanti };
}

// ── Suggerimenti trasversali via parallelismi (§3.5) ─────────────────────────
export interface Suggerimento { parallelismo: Parallelismo; collegate: Voce[] }
export function suggerimenti(a: ArchivioIndex, voceId: string): Suggerimento[] {
  const ids = a.indici.parallelismiByRef[voceId] ?? [];
  return ids
    .map((id) => pMap(a).get(id))
    .filter((p): p is Parallelismo => !!p)
    .map((p) => ({ parallelismo: p, collegate: resolveVoci(a, p.riferimenti.filter((r) => r !== voceId)) }));
}

// ── Repertori didattici (lesson-builder) ─────────────────────────────────────
const matchMaterie = (lista: string[], code: string | undefined): boolean => !code || lista.length === 0 || lista.includes("ALL") || lista.includes(code);
export const metodologie = (a: ArchivioIndex): Metodologia[] => a.repertori.metodologie;
export const metodologiaById = (a: ArchivioIndex, id: string): Metodologia | undefined => a.repertori.metodologie.find((m) => m.id === id);
export const fasi = (a: ArchivioIndex): Fase[] => a.repertori.fasi;
export const faseById = (a: ArchivioIndex, id: string): Fase | undefined => a.repertori.fasi.find((f) => f.id === id);
export const arrangiamenti = (a: ArchivioIndex): Arrangiamento[] => a.repertori.arrangiamenti;
export const metodologieDiFase = (a: ArchivioIndex, fasId: string): Metodologia[] =>
  (a.indici.metodologieByFase[fasId] ?? []).map((id) => metodologiaById(a, id)).filter((m): m is Metodologia => !!m);
export const materiali = (a: ArchivioIndex, f: { materia?: string; categoria?: string; funzione?: string } = {}): Materiale[] =>
  a.repertori.materiali.filter((m) => matchMaterie(m.materie, f.materia) && (!f.categoria || m.categoria === f.categoria) && (!f.funzione || m.funzione === f.funzione));
export const valutazioni = (a: ArchivioIndex, f: { materia?: string; funzione?: string; graduata?: boolean } = {}): Valutazione[] =>
  a.repertori.valutazione.filter((v) => matchMaterie(v.materie, f.materia) && (!f.funzione || v.funzione === f.funzione) && (f.graduata === undefined || v.graduata === f.graduata));
export const misureInclusione = (a: ArchivioIndex, f: { materia?: string; ambito?: string; categoria?: string } = {}): MisuraInclusione[] =>
  a.repertori.inclusione.filter((i) => matchMaterie(i.materie, f.materia) && (!f.ambito || i.ambito === f.ambito) && (!f.categoria || i.categoria === f.categoria));
/** I 17 obiettivi dell'Agenda 2030 (espansione di «Agenda 2030 e sviluppo sostenibile»). */
export const agenda2030 = (a: ArchivioIndex): Sdg[] => a.repertori.agenda;

// Mappe nucleo: codice (segmento ID backbone) ↔ etichetta leggibile, per materia.
let _nuc: { codeByLabel: Record<string, Record<string, string>>; labelByCode: Record<string, Record<string, string>> } | null = null;
function nucleoMaps(a: ArchivioIndex) {
  if (_nuc) return _nuc;
  const codeByLabel: Record<string, Record<string, string>> = {}, labelByCode: Record<string, Record<string, string>> = {};
  for (const o of a.obiettivi) { const code = o.id.split(".")[2]; if (!code) continue; (codeByLabel[o.materia] ??= {})[o.nucleo] = code; (labelByCode[o.materia] ??= {})[code] = o.nucleo; }
  return (_nuc = { codeByLabel, labelByCode });
}
/** Codice-nucleo di una voce: dai suoi obiettivi backbone, altrimenti dall'etichetta. */
export function nucleoCodeDiVoce(a: ArchivioIndex, v: Voce): string | undefined {
  for (const ob of v.obiettivi_backbone) { const c = ob.split(".")[2]; if (c) return c; }
  return nucleoMaps(a).codeByLabel[v.materia]?.[v.nucleo];
}

// ── Prerequisiti con regola di prossimità (orizzonte circoscritto, §7-bis) ────
export interface PrereqRisolto { regola: Prerequisito; etichetta: string; consolidata: boolean }
export interface PrerequisitiVoce { daAccertare: PrereqRisolto[]; consolidate: PrereqRisolto[]; contesto: Voce[] }
const ANTERIORE = new Set(["biennio", "quinquennio"]); // orizzonti che indicano competenza già consolidata
export function prerequisitiDiVoce(a: ArchivioIndex, v: Voce): PrerequisitiVoce {
  const code = nucleoCodeDiVoce(a, v);
  const lab = nucleoMaps(a).labelByCode[v.materia] ?? {};
  const regole = code ? a.repertori.prerequisiti.filter((p) => p.materia === v.materia && p.scope === "nucleo" && p.target === code) : [];
  const daAccertare: PrereqRisolto[] = [], consolidate: PrereqRisolto[] = [];
  for (const r of regole) {
    const ris: PrereqRisolto = { regola: r, etichetta: lab[r.prerequisito] ?? r.prerequisito, consolidata: ANTERIORE.has(r.orizzonte) };
    (ris.consolidata ? consolidate : daAccertare).push(ris);
  }
  daAccertare.sort((x, y) => Number(y.regola.obbligatorio) - Number(x.regola.obbligatorio));
  return { daAccertare, consolidate, contesto: antenati(a, v.id) };
}

// ── Timeline della lezione: arrangiamento → fasi scalate sul monte minuti ─────
export interface FaseTimeline { fase: Fase; minuti: number; metodologie: Metodologia[] }
export interface Timeline { fasi: FaseTimeline[]; totMin: number; monteMin: number; sfora: boolean }
export function espandiArrangiamento(a: ArchivioIndex, arrId: string, monteMin: number): Timeline {
  const arr = a.repertori.arrangiamenti.find((x) => x.id === arrId);
  const fasiT: FaseTimeline[] = [];
  if (arr) for (const fid of arr.sequenza_fasi) {
    const f = faseById(a, fid); if (!f) continue;
    const minuti = f.perc_monte ? Math.round((monteMin * f.perc_monte) / 100) : (f.dur_min_60 ?? 0);
    fasiT.push({ fase: f, minuti, metodologie: metodologieDiFase(a, fid) });
  }
  const totMin = fasiT.reduce((s, x) => s + x.minuti, 0);
  return { fasi: fasiT, totMin, monteMin, sfora: totMin > monteMin };
}
