// Backbone dei contenuti didattici: tassonomia 3D (indirizzo × materia × classe di concorso)
// ancorata alle Indicazioni Nazionali. Sorgente: tassonomia_3d.json (372 obiettivi atomici,
// 149 insegnamenti). Caricata in modo LAZY (chunk separato) per non pesare sul bundle iniziale.
// Da qui si alimentano menù a tendina, tag e completamenti automatici della pianificazione.

import { useEffect, useState } from "react";

export interface TaxObiettivo {
  id: string;
  materia: string;
  materia_label: string;
  nucleo: string;
  area: string;
  argomento: string;
  descrizione: string;
  tipo: "conoscenza" | "competenza";
  fase: "biennio" | "triennio" | "quinquennio";
  bloom: string | null;
  competenza_europea: string;
  keywords: string[];
  indirizzi: string[];
  classi: string[];
}
export interface TaxInsegnamento {
  indirizzo: string;
  indirizzo_label: string;
  materia: string;
  materia_label: string;
  classe_concorso: string;
  fasi: string[];
  note?: string;
}
export interface TaxMateria { label: string; maturita: string; note: string }
export interface Tassonomia {
  faccette: {
    indirizzi: Record<string, { label: string; fonte: string }>;
    materie: Record<string, TaxMateria>;
    competenze_europee: Record<string, string>;
  };
  insegnamenti: TaxInsegnamento[];
  obiettivi: TaxObiettivo[];
}

// ── Caricamento lazy + hook ──────────────────────────────────────────────────
let cache: Tassonomia | null = null;
let loading: Promise<Tassonomia> | null = null;

export async function loadTassonomia(): Promise<Tassonomia> {
  if (cache) return cache;
  if (!loading) loading = import("./tassonomia_3d.json").then((m) => (cache = m.default as unknown as Tassonomia));
  return loading;
}

/** Hook: restituisce la tassonomia (null finché non è caricata). */
export function useTassonomia(): Tassonomia | null {
  const [t, setT] = useState<Tassonomia | null>(cache);
  useEffect(() => {
    if (!cache) void loadTassonomia().then(setT);
  }, []);
  return t;
}

// ── Ponti codici ↔ nomi del cruscotto ────────────────────────────────────────
/** id indirizzo del profilo (concorso.ts) → codice tassonomia. */
const INDIR_BRIDGE: Record<string, string> = {
  classico: "LC", scientifico: "LS", "scientifico-sa": "LSA", "scientifico-sportivo": "LSS",
  linguistico: "LL", "scienze-umane": "LSU", "scienze-umane-es": "LES", artistico: "LA", "musicale-coreutico": "LMC",
};
/** nome materia del cruscotto → codici tassonomia (uno può mapparne più d'uno). */
const MATERIA_BRIDGE: Record<string, string[]> = {
  "Lingua e letteratura italiana": ["ITA"],
  "Lingua e cultura latina": ["LAT"],
  "Lingua e cultura greca": ["GRC"],
  "Storia e geografia (biennio)": ["STO", "GEO"],
  "Storia (triennio)": ["STO"],
  Storia: ["STO"],
  Geografia: ["GEO"],
  Filosofia: ["FIL"],
  "Scienze umane": ["SCU"],
  Matematica: ["MAT"],
  Fisica: ["FIS"],
  "Scienze naturali": ["SCN"],
  "Lingua e cultura straniera": ["LIN"],
  "Storia dell'arte": ["ART"],
  "Disegno e storia dell'arte": ["DSA"],
  "Scienze motorie e sportive": ["SMO"],
};

const norm = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function indirizzoCodice(idProfilo?: string): string | undefined {
  return idProfilo ? INDIR_BRIDGE[idProfilo] : undefined;
}

/** Codici-materia della tassonomia corrispondenti a un nome-materia del cruscotto. */
export function materiaCodici(tax: Tassonomia, nome: string): string[] {
  if (MATERIA_BRIDGE[nome]) return MATERIA_BRIDGE[nome];
  const n = norm(nome);
  return Object.entries(tax.faccette.materie)
    .filter(([, m]) => norm(m.label) === n || n.includes(norm(m.label)) || norm(m.label).includes(n))
    .map(([c]) => c);
}

// ── Query ────────────────────────────────────────────────────────────────────
export interface QueryOpts {
  indirizzoId?: string; // id indirizzo del profilo
  ciclo?: string; // "Biennio" | "Triennio"
  classe?: string; // classe di concorso (es. "A-13")
}

function faseDaCiclo(ciclo?: string): string | undefined {
  if (ciclo === "Biennio") return "biennio";
  if (ciclo === "Triennio") return "triennio";
  return undefined;
}

/** Obiettivi della tassonomia per un nome-materia del cruscotto, filtrati per indirizzo/ciclo/classe. */
export function obiettiviPerMateria(tax: Tassonomia, materiaNome: string, opts: QueryOpts = {}): TaxObiettivo[] {
  const codici = materiaCodici(tax, materiaNome);
  if (codici.length === 0) return [];
  const tIndir = indirizzoCodice(opts.indirizzoId);
  const fase = faseDaCiclo(opts.ciclo);
  return tax.obiettivi.filter(
    (o) =>
      codici.includes(o.materia) &&
      (!tIndir || o.indirizzi.includes(tIndir)) &&
      (!fase || o.fase === fase || o.fase === "quinquennio") &&
      (!opts.classe || o.classi.includes(opts.classe))
  );
}

export interface NucleoGruppo {
  nucleo: string;
  obiettivi: TaxObiettivo[];
}
/** Obiettivi di una materia raggruppati per nucleo (palette di pianificazione). */
export function nucleiConObiettivi(tax: Tassonomia, materiaNome: string, opts: QueryOpts = {}): NucleoGruppo[] {
  const list = obiettiviPerMateria(tax, materiaNome, opts);
  const map = new Map<string, TaxObiettivo[]>();
  for (const o of list) {
    const a = map.get(o.nucleo) ?? [];
    a.push(o);
    map.set(o.nucleo, a);
  }
  return [...map.entries()].map(([nucleo, obiettivi]) => ({ nucleo, obiettivi }));
}

/** Materie insegnate da una classe di concorso in un indirizzo (con le fasi). */
export function materieInsegnate(tax: Tassonomia, classe: string, indirizzoId?: string): TaxInsegnamento[] {
  const tIndir = indirizzoCodice(indirizzoId);
  return tax.insegnamenti.filter((i) => i.classe_concorso === classe && (!tIndir || i.indirizzo === tIndir));
}

/** Ricerca testuale per autocomplete: argomento + descrizione + nucleo + keywords. */
export function cercaObiettivi(tax: Tassonomia, query: string, opts: QueryOpts & { materiaNome?: string } = {}): TaxObiettivo[] {
  const base = opts.materiaNome ? obiettiviPerMateria(tax, opts.materiaNome, opts) : tax.obiettivi;
  const q = norm(query);
  if (!q) return base;
  return base.filter((o) => norm(`${o.argomento} ${o.descrizione} ${o.nucleo} ${(o.keywords ?? []).join(" ")}`).includes(q));
}

/** Etichetta del Bloom con iniziale maiuscola (allineata a LIVELLI_BLOOM). */
export function bloomLabel(b: string | null): string | undefined {
  return b ? b.charAt(0).toUpperCase() + b.slice(1) : undefined;
}
/** Ciclo del cruscotto a partire dalla fase. */
export function cicloDaFase(fase: string): string | undefined {
  if (fase === "biennio") return "Biennio";
  if (fase === "triennio") return "Triennio";
  return undefined;
}
