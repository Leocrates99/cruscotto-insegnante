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
export interface ArchivioIndex {
  obiettivi: ObiettivoBackbone[]; voci: Voce[]; parallelismi: Parallelismo[];
  faccette: Record<string, unknown>;
  indici: { vociByMateria: Record<string, string[]>; figliByParent: Record<string, string[]>; vociByObiettivo: Record<string, string[]>; parallelismiByRef: Record<string, string[]> };
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
