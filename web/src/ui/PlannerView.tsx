import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { View } from "../App";
import type { DbKey } from "@model";
import { schemaByKey } from "@model";
import { newId, records, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { classiAttive, contiClasse, materieAttive, materieClasseEffettive, scuoleCorrenti, useProfile } from "../store/profile";
import { unitaOraria, useSettings } from "../store/settings";
import { annoCorrenteId, classeId } from "../store/links";
import { bloomLabel, materieIndirizzo, useTassonomia } from "../data/tassonomia";
import { agenda2030, antenati, arrangiamenti as repArrangiamenti, espandiArrangiamento, faseById, fasi as repFasi, materiaCodice, materiali as repMateriali, metodologie as repMetodologie, metodologieDiFase, misureInclusione as repInclusione, prerequisitiDiVoce, useArchivio, valutazioni as repValutazioni, voce, type ArchivioIndex, type Fase, type Metodologia, type PrereqRisolto, type Voce } from "../data/archivio";
import { findNodo, tassonomiaConoscenze, tassonomiaSkill, type TNodo } from "../data/tassonomia-conoscenze";
import { DESCR_COMPITI, DESCR_EDCIVICA, DESCR_METODOLOGIE, DESCR_STRUMENTI, ICON_COMPITI, ICON_EDCIVICA, ICON_INC_AMBITO, ICON_INCLUSIONE, ICON_MATERIALI, ICON_METODOLOGIE, ICON_STRUMENTI } from "../data/glossario";
import { downloadWord } from "../store/reportFineAnno";
import { getSessione, upsertSessione } from "../store/valutazione";
import { AlberoConoscenze } from "./AlberoConoscenze";
import { VerificaForm } from "./VerificaForm";
import { classeColor, materiaColor, materiaSigla } from "./materia";

const oggi = () => new Date().toISOString().slice(0, 10);
type Tipo = "lezione" | "laboratorio" | "uda";
type CompitoRow = { id: string; tipo: string; testo: string; data: string };
type FaseRow = { id: string; nome: string; minuti: number; metodi: string[]; funzione?: string; centratura?: string; momento?: string; fonte?: string; attDoc?: string; attStu?: string; durMin?: number; durMax?: number; nota?: string };
type StepKey = "conoscenze" | "abilita" | "prerequisiti" | "metodologie" | "strumenti" | "fasi" | "edciv" | "raccordi" | "materiali" | "inclusione" | "compiti" | "dettagli";
const FASI_DEFAULT = ["Apertura", "Sviluppo", "Esercitazione", "Sintesi e verifica"];
const FASE_COLORS = ["#1800ac", "#2f7d5a", "#b9791f", "#a22e37", "#7c3aed", "#0891b2", "#be185d", "#4d7c0f"];
// Centratura della fase: chi è attivo. `peso` = quota di protagonismo studente (0–1),
// usato per la barra "studenti attivi". icona + colore per il pill di riga.
const CENTRATURA: Record<string, { icona: string; col: string; peso: number; lab: string }> = {
  "docente": { icona: "🗣️", col: "#1800ac", peso: 0, lab: "Docente" },
  "docente-studenti": { icona: "🤝", col: "#0891b2", peso: 0.5, lab: "Docente e studenti" },
  "studenti": { icona: "🙋", col: "#2f7d5a", peso: 1, lab: "Studenti" },
  "gruppi": { icona: "👥", col: "#2f7d5a", peso: 1, lab: "Gruppi" },
  "coppie": { icona: "👫", col: "#2f7d5a", peso: 1, lab: "Coppie" },
  "individuale": { icona: "🧑", col: "#7c3aed", peso: 1, lab: "Individuale" },
};
const centr = (c?: string) => (c ? CENTRATURA[c] : undefined);
// Arco narrativo della lezione: i momenti in cui si distribuiscono le fasi.
const MOMENTI: { id: string; label: string; icona: string; desc: string }[] = [
  { id: "inizio", label: "Inizio", icona: "🚀", desc: "Apri la lezione: clima, prerequisiti, dove si va." },
  { id: "sviluppo", label: "Sviluppo", icona: "📖", desc: "Spieghi il nuovo: esponi, fai scoprire, mostri come si ragiona." },
  { id: "apprendimento", label: "Apprendimento", icona: "🛠️", desc: "Si mette in pratica: esercizio, gruppi, laboratorio." },
  { id: "fine", label: "Fine", icona: "🏁", desc: "Chiudi: tiri le fila, verifichi, assegni." },
];
const MOM_ORDER = MOMENTI.map((m) => m.id);
const momIdx = (m?: string) => { const i = m ? MOM_ORDER.indexOf(m) : -1; return i < 0 ? MOM_ORDER.length : i; };
// Durate-tipo della lezione (drill in cima allo step). `h` = ore → monte = h*60′.
const DURATE: { h: number; lab: string; icona: string; desc: string }[] = [
  { h: 1, lab: "1 ora", icona: "🟩", desc: "Una spiegazione e un po' di pratica." },
  { h: 2, lab: "2 ore", icona: "🟦", desc: "C'è spazio per il laboratorio e il confronto." },
  { h: 3, lab: "3 ore", icona: "🟪", desc: "Per progetti, UdA o lavori lunghi." },
];
// Icone dei preset-timeline (per modello di arrangiamento).
const ICON_ARRANGIAMENTO: Record<string, string> = {
  classico: "🗣️", scoperta: "🔍", flipped: "🔄", eas: "🎯", laboratorio: "🔬",
  cooperativo: "🧩", dibattito: "⚖️", "rilascio-graduale": "🪜", testuale: "📖",
};

const COMPITO_TIPI = ["esercizio in classe", "esercitazione guidata", "compito per casa", "verifica formativa"];
const CONO = new Set(["conoscenza", "contenuto"]);
const ROM: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

const MINOR = new Set(["di", "e", "a", "da", "in", "con", "su", "per", "tra", "fra", "la", "il", "lo", "le", "i", "gli", "un", "una", "del", "della", "dei", "delle", "al", "alla", "allo", "dello", "ed", "o"]);
const cap = (s: string): string => s.split(" ").map((w, i) => (!w ? w : i > 0 && MINOR.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
const annoDaClasse = (l: string): number => { const m = l.trim().match(/^(III|II|IV|V|I)\b/i); return m ? ROM[m[0].toUpperCase()] ?? 0 : 0; };
// Porta un colore in una banda di luminanza media: leggibile su sfondo chiaro E scuro.
function coloreLeggibile(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const h = m[1];
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const f = lum > 0.58 ? 0.55 / lum : lum < 0.34 ? 0.42 / lum : 1;
  const cl = (x: number) => Math.max(0, Math.min(255, Math.round(x * f)));
  return `rgb(${cl(r)}, ${cl(g)}, ${cl(b)})`;
}
const cicloDi = (l: string): "Biennio" | "Triennio" => (annoDaClasse(l) >= 3 ? "Triennio" : "Biennio");
const fmtIt = (d: string): string => { const [y, m, g] = d.split("-"); return g ? `${g}/${m}/${y}` : d; };
const escH = (s: string): string => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function optsOf(key: DbKey, prop: string): string[] {
  const p = schemaByKey[key].properties[prop] as { options?: { name: string }[] } | undefined;
  return p?.options?.map((o) => o.name) ?? [];
}
const METODOLOGIE = optsOf("lezioni", "Metodologie");
const STRUMENTI = optsOf("lezioni", "Strumenti e spazi");
const VERIFICHE_F = optsOf("lezioni", "Verifica formativa");
const EDCIVICA = optsOf("lezioni", "Educazione civica");
const AGENDA = "Agenda 2030 e sviluppo sostenibile";

// Riserva di icone per garantire icone DISTINTE in una stessa finestra di menù.
const ICON_POOL = ["🗣️", "💬", "👥", "🔄", "⚖️", "🧩", "💡", "🤝", "🔬", "📖", "🎭", "🎯", "🧠", "📚", "✍️", "🔎", "🗂️", "🧪", "🎬", "🗺️", "📐", "🧭", "🎲", "🏛️", "🌐", "🧰", "📊", "🪄", "🧱", "🪞", "🎙️", "📝", "🧮", "🔭", "🧵", "🎨"];
/** Assegna a ogni chiave un'icona unica: la mappata se libera, altrimenti la prima del pool non ancora usata. */
function iconaUniche(keys: string[], map: Record<string, string>): Record<string, string> {
  const used = new Set<string>(), out: Record<string, string> = {};
  let p = 0;
  for (const k of keys) {
    let ic = map[k] ?? map[k.toLowerCase()] ?? "";
    if (!ic || used.has(ic)) { while (p < ICON_POOL.length && used.has(ICON_POOL[p])) p++; ic = ICON_POOL[p] ?? "•"; }
    used.add(ic); out[k] = ic;
  }
  return out;
}

// ── Mattoni UI a livello di modulo (stabili fra i render) ─────────────────────
function Step({ n, tot, titolo, hint, badge, children }: { n: number; tot: number; titolo: string; hint?: string; badge?: string; children: ReactNode }) {
  return (
    <section className="pl-step">
      <header className="pl-step-h">
        <span className="pl-step-n">{n}<small>/{tot}</small></span>
        <div className="pl-step-tt"><h3>{titolo}</h3>{hint && <p>{hint}</p>}</div>
        {badge && <span className="pl-step-badge">{badge}</span>}
      </header>
      <div className="pl-step-body">{children}</div>
    </section>
  );
}
function DCard({ icon, top, title, desc, on, onClick, accent }: { icon?: ReactNode; top?: ReactNode; title: string; desc?: string; on?: boolean; onClick: () => void; accent?: string }) {
  return (
    <button className={on ? "pl-dcard on" : "pl-dcard"} onClick={onClick}>
      {on !== undefined && <span className="pl-dcard-check">{on ? "✓" : "+"}</span>}
      {top && <span className="pl-dcard-top">{top}</span>}
      <span className="pl-dcard-h">{icon && <span className="pl-dcard-ico">{icon}</span>}<span className="pl-dcard-t" style={accent ? { color: accent } : undefined}>{title}</span></span>
      {desc && <span className="pl-dcard-d">{desc}</span>}
    </button>
  );
}
function DrillCards({ opts, val, onToggle, desc, icon }: { opts: string[]; val: string[]; onToggle: (v: string) => void; desc: (o: string) => string | undefined; icon?: (o: string) => ReactNode }) {
  return <div className="pl-dgrid">{opts.map((o) => <DCard key={o} icon={icon?.(o)} title={cap(o)} desc={desc(o)} on={val.includes(o)} onClick={() => onToggle(o)} />)}</div>;
}
const labelDi = (roots: TNodo[], path: string[]): string => findNodo(roots, path)?.label ?? "";
/**
 * Drill di comando per la tassonomia (conoscenze, abilità/competenze): macro → sotto
 * categorie → foglia. La foglia "ad albero" usa AlberoConoscenze (epoche/correnti →
 * autori), le altre mostrano le voci come card a testo intero (mai troncate).
 */
function DrillTax({ roots, path, setPath, a, selez, onTree, onVoce }: {
  roots: TNodo[]; path: string[]; setPath: (p: string[]) => void; a: ArchivioIndex; selez: Set<string>;
  onTree: (v: Voce) => void; onVoce: (v: Voce) => void;
}) {
  const nodo = findNodo(roots, path);
  const figli = path.length === 0 ? roots : (nodo?.figli ?? []);
  const isLeaf = !!nodo && !nodo.figli;
  return (
    <div className="pl-drill">
      {path.length > 0 && (
        <nav className="pl-bc">
          <button className="pl-bc-i" onClick={() => setPath([])}>↩ Tutte le aree</button>
          {path.map((id, i) => <span key={id} className="pl-bc-seg"><span className="pl-bc-sep">▸</span><button className="pl-bc-i" onClick={() => setPath(path.slice(0, i + 1))}>{labelDi(roots, path.slice(0, i + 1))}</button></span>)}
        </nav>
      )}
      {isLeaf ? (
        nodo!.voci!.length === 0
          ? <p className="muted">Nessuna voce a sorgente per «{nodo!.label}»: la categoria è prevista nella struttura e si popolerà arricchendo l'archivio.</p>
          : nodo!.tree
            ? <AlberoConoscenze a={a} radici={nodo!.voci!.filter((v) => !v.parent)} selez={selez} onToggle={onTree} />
            : <div className="pl-dgrid full">{nodo!.voci!.map((v) => <DCard key={v.id} title={v.testo} on={selez.has(v.id)} onClick={() => onVoce(v)} />)}</div>
      ) : (
        <div className="pl-dgrid">{figli.map((n) => <DCard key={n.id} icon={n.icona} title={n.label} top={<span className={n.count ? "pl-cnt" : "pl-cnt zero"}>{n.count} voci</span>} onClick={() => setPath([...path, n.id])} />)}</div>
      )}
    </div>
  );
}

/**
 * Pianifica: wizard a finestre. Drill di contesto a card (Scuola → Materia → Classe,
 * con icona/sigla/colore coerenti col calendario), poi step con Avanti/Indietro:
 * conoscenze e abilità/competenze (stessa resa ad albero; foglia → flag antenati),
 * metodologie / strumenti / ed. civica / raccordi / compiti come drill a card con
 * icona e descrizione, infine panoramica + export Word + salvataggio.
 */
export function PlannerView({ onView }: { onView: (v: View) => void }) {
  useStore();
  const profile = useProfile();
  const settings = useSettings();
  const unitaOra = unitaOraria(settings);
  const tax = useTassonomia();
  const arch = useArchivio();
  const materie = materieAttive(profile);
  const classi = classiAttive(profile);
  const scuole = profile.scuole;
  const multiScuola = scuole.length >= 2;

  const [tipo, setTipo] = useState<Tipo>("lezione");
  const [scuolaId, setScuolaId] = useState(() => (scuole.length >= 2 ? "" : scuoleCorrenti(profile)[0]?.id ?? ""));
  const [materia, setMateria] = useState("");
  const [classe, setClasse] = useState("");
  const [catCono, setCatCono] = useState<string[]>([]);
  const [catAC, setCatAC] = useState<string[]>([]);
  const [ciclo, setCiclo] = useState<"Biennio" | "Triennio">("Triennio");
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState(oggi());
  const [dataFine, setDataFine] = useState(oggi());
  const [durata, setDurata] = useState(2);
  const [titolo, setTitolo] = useState("");
  const [selIds, setSelIds] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);

  const [prereq, setPrereq] = useState("");
  const [conoscenze, setConoscenze] = useState("");
  const [abilita, setAbilita] = useState("");
  const [competenzeTxt, setCompetenzeTxt] = useState("");
  const [fasiRows, setFasiRows] = useState<FaseRow[]>([]);
  const [faseDett, setFaseDett] = useState<string | null>(null);
  const [faseEvidenzia, setFaseEvidenzia] = useState<string | null>(null);
  const [addFaseOpen, setAddFaseOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [faseMomento, setFaseMomento] = useState<string | null>(null);
  const dragFase = useRef<number | null>(null);
  const [metodologie, setMetodologie] = useState<string[]>([]);
  const [strumenti, setStrumenti] = useState<string[]>([]);
  const [educiv, setEduciv] = useState<string[]>([]);
  const [edcivSkip, setEdcivSkip] = useState(false);
  const [raccordi, setRaccordi] = useState<string[]>([]);
  const [incSel, setIncSel] = useState<string[]>([]);
  const [nuovaInc, setNuovaInc] = useState("");
  const [verificaF, setVerificaF] = useState("");
  const [compiti, setCompiti] = useState<CompitoRow[]>([]);
  const [materiali, setMateriali] = useState<string[]>([]);
  const [nuovoMat, setNuovoMat] = useState("");
  const [competenza, setCompetenza] = useState("");
  const [prodotto, setProdotto] = useState("");
  const [compitoRealta, setCompitoRealta] = useState("");
  const [nLezioni, setNLezioni] = useState(0);
  const [showVerifica, setShowVerifica] = useState(false);
  const [verificaSessId, setVerificaSessId] = useState<string | null>(null);

  const isUda = tipo === "uda";
  const scuolaSel = scuole.find((s) => s.id === scuolaId);
  const indir = (multiScuola ? scuolaSel?.indirizzo : scuoleCorrenti(profile)[0]?.indirizzo);
  const scuolaNome = multiScuola ? scuolaSel?.nome : scuoleCorrenti(profile)[0]?.nome;
  const raccordiOpts = useMemo(() => (tax ? materieIndirizzo(tax, indir).filter((m) => m !== materia) : []), [tax, indir, materia]);

  const code = arch ? materiaCodice(arch, materia) : undefined;
  const vMatPl = useMemo(() => (arch && code ? arch.voci.filter((v) => v.materia === code) : []), [arch, code]);
  const haAbilitaComp = vMatPl.some((v) => v.blocco === "abilita" || v.blocco === "competenza");
  // Ordine sorgente = sequenza curricolare/cronologica (le epoche sono in ordine nell'archivio).
  const vCono = useMemo(() => vMatPl.filter((v) => CONO.has(v.blocco)), [vMatPl]);
  const abilitaV = useMemo(() => vMatPl.filter((v) => v.blocco === "abilita"), [vMatPl]);
  const competenzeV = useMemo(() => vMatPl.filter((v) => v.blocco === "competenza"), [vMatPl]);
  // Tassonomia "a drill di comando" (macro → sotto-categorie → foglia).
  const taxCono = useMemo(() => (arch && code ? tassonomiaConoscenze(code, vCono) : []), [arch, code, vCono]);
  const taxAC = useMemo(() => tassonomiaSkill(abilitaV, competenzeV), [abilitaV, competenzeV]);

  const selVoci: Voce[] = arch ? [...selIds].map((id) => voce(arch, id)).filter((v): v is Voce => !!v) : [];
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const toggleVoce = (v: Voce) => setSelIds((s) => { const n = new Set(s); n.has(v.id) ? n.delete(v.id) : n.add(v.id); return n; });
  // Foglia → flagga anche tutti gli antenati (categorie superiori a cui appartiene).
  const toggleAlbero = (v: Voce) => setSelIds((s) => {
    const n = new Set(s);
    if (n.has(v.id)) n.delete(v.id);
    else { n.add(v.id); if (arch) for (const an of antenati(arch, v.id)) n.add(an.id); }
    return n;
  });

  const resetTutto = () => {
    setSelIds(new Set()); setCatCono([]); setCatAC([]); setStepIdx(0); setTitolo(""); setPrereq(""); setConoscenze(""); setAbilita(""); setCompetenzeTxt("");
    setFasiRows([]); setFaseDett(null); setAddFaseOpen(false); setPresetOpen(false); setFaseMomento(null); setMetodologie([]); setStrumenti([]); setEduciv([]); setEdcivSkip(false); setRaccordi([]); setIncSel([]); setNuovaInc(""); setVerificaF("");
    setCompiti([]); setMateriali([]); setNuovoMat(""); setCompetenza(""); setProdotto(""); setCompitoRealta(""); setNLezioni(0);
    setShowVerifica(false); setVerificaSessId(null);
  };
  const cambiaMateria = (m: string) => { setMateria(m); setCatCono([]); setCatAC([]); setSelIds(new Set()); setStepIdx(0); };
  const cambiaClasse = (c: string) => { setClasse(c); setCiclo(cicloDi(c)); setStepIdx(0); };

  const componi = () => {
    const con = selVoci.filter((v) => CONO.has(v.blocco)).map((v) => `• ${v.testo}`);
    const ab = selVoci.filter((v) => v.blocco === "abilita").map((v) => `• ${v.testo}`);
    const com = selVoci.filter((v) => v.blocco === "competenza").map((v) => `• ${v.testo}`);
    setConoscenze((c) => [...new Set([...c.split("\n").filter(Boolean), ...con])].join("\n"));
    setAbilita((c) => [...new Set([...c.split("\n").filter(Boolean), ...ab])].join("\n"));
    setCompetenzeTxt((c) => [...new Set([...c.split("\n").filter(Boolean), ...com])].join("\n"));
  };
  const derivato = (campo: "con" | "ab" | "com", testo: string): string => {
    if (testo.trim()) return testo;
    const f = campo === "con" ? selVoci.filter((v) => CONO.has(v.blocco)) : selVoci.filter((v) => v.blocco === (campo === "ab" ? "abilita" : "competenza"));
    return f.map((v) => `• ${v.testo}`).join("\n");
  };
  const righe = (campo: "con" | "ab" | "com", testo: string): string[] => derivato(campo, testo).split("\n").filter(Boolean).map((s) => s.replace(/^•\s*/, ""));

  // Fasi della lezione (widget): durata per fase + metodi per fase + barra colorata.
  const minPrev = Math.round((durata || 0) * unitaOra);
  const fasiMinTot = fasiRows.reduce((a, b) => a + (Number(b.minuti) || 0), 0);
  const minRim = minPrev - fasiMinTot;
  // Centratura-mix: quota di tempo a protagonismo studente (per la barra pedagogica).
  const studAttivi = fasiMinTot > 0 ? Math.round(fasiRows.reduce((a, f) => a + (Number(f.minuti) || 0) * (centr(f.centratura)?.peso ?? 0), 0) / fasiMinTot * 100) : 0;
  // Bilancia: riscala le durate proporzionalmente fino a coprire il monte ore.
  const bilanciaFasi = () => setFasiRows((r) => {
    if (r.length === 0 || minPrev <= 0) return r;
    const tot = r.reduce((a, b) => a + (Number(b.minuti) || 0), 0);
    const base = tot > 0 ? r.map((x) => (Number(x.minuti) || 0)) : r.map(() => 1);
    const somma = base.reduce((a, b) => a + b, 0);
    let acc = 0;
    return r.map((x, i) => { const m = i === r.length - 1 ? minPrev - acc : Math.max(0, Math.round(base[i] / somma * minPrev / 5) * 5); acc += m; return { ...x, minuti: Math.max(0, m) }; });
  });
  // dur_min_60/dur_max_60 sono tarate su 60′: si riscalano al monte ore reale.
  const rangeFase = (f: FaseRow): [number, number] | null => {
    if (f.durMin == null || f.durMax == null || minPrev <= 0) return null;
    const k = minPrev / 60;
    return [Math.round(f.durMin * k), Math.round(f.durMax * k)];
  };
  const fuoriRange = (f: FaseRow) => { const r = rangeFase(f); return !!r && f.minuti > 0 && (f.minuti < r[0] || f.minuti > r[1]); };
  const addFase = () => setFasiRows((r) => [...r, { id: newId(), nome: FASI_DEFAULT[r.length] ?? `Fase ${r.length + 1}`, minuti: 0, metodi: [] }]);
  const addFaseCatalogo = (fid: string) => {
    if (!arch) return;
    const f = faseById(arch, fid); if (!f) return;
    const min = f.perc_monte ? Math.round((minPrev || 60) * f.perc_monte / 100) : (f.dur_min_60 ?? 10);
    const riga: FaseRow = { id: newId(), nome: f.fase, minuti: min, funzione: f.funzione, centratura: f.centratura, momento: f.momento, fonte: f.id, attDoc: f.attivita_docente, attStu: f.attivita_studente, durMin: f.dur_min_60 ?? undefined, durMax: f.dur_max_60 ?? undefined, metodi: metodologieDiFase(arch, fid).slice(0, 2).map((m) => m.nome) };
    // Inserisce mantenendo l'arco narrativo (inizio → sviluppo → apprendimento → fine).
    setFasiRows((r) => { const ni = momIdx(f.momento); let pos = r.length; for (let k = 0; k < r.length; k++) if (momIdx(r[k].momento) > ni) { pos = k; break; } const a = [...r]; a.splice(pos, 0, riga); return a; });
  };
  const setFase = (id: string, patch: Partial<FaseRow>) => setFasiRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeFase = (id: string) => setFasiRows((r) => r.filter((x) => x.id !== id));
  const spostaFase = (from: number, to: number) => setFasiRows((r) => { if (from === to || from < 0 || to < 0 || from >= r.length || to >= r.length) return r; const a = [...r]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return a; });
  const vaiAFase = (id: string) => { setFaseEvidenzia(id); document.getElementById(`pl-fase-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); window.setTimeout(() => setFaseEvidenzia((c) => (c === id ? null : c)), 1300); };
  const struttFasi = () => {
    const tot = minPrev || 60;
    const quote = [0.15, 0.4, 0.3, 0.15];
    const mins = quote.map((q) => Math.round(tot * q));
    mins[3] = tot - (mins[0] + mins[1] + mins[2]);
    setFasiRows(FASI_DEFAULT.map((nome, i) => ({ id: newId(), nome, minuti: mins[i], metodi: i === 1 ? metodologie.slice(0, 2) : [] })));
  };
  // Posizione delle fasi nell'arco: minuti cumulati dall'inizio della lezione (no orologio).
  const inizioFase = (i: number): number => fasiRows.slice(0, i).reduce((a, b) => a + (Number(b.minuti) || 0), 0);
  const fasiText = (): string => fasiRows.filter((f) => f.nome.trim() || f.minuti).map((f) => {
    const i = fasiRows.indexOf(f); const s = inizioFase(i);
    const c = centr(f.centratura);
    return `${f.nome.trim() || "Fase"} (${f.minuti || 0}', min ${s}–${s + (f.minuti || 0)})${c ? ` · ${c.lab.toLowerCase()}` : ""}${f.metodi.length ? ` · ${f.metodi.map(cap).join(", ")}` : ""}${f.nota?.trim() ? ` — ${f.nota.trim()}` : ""}`;
  }).join("\n");

  // ── Repertori del lesson-builder (data-driven dall'archivio) ───────────────
  const metRep: Metodologia[] = arch && code ? repMetodologie(arch) : [];
  const metByGruppo = useMemo(() => { const g: Record<string, Metodologia[]> = {}; for (const m of metRep) (g[m.gruppo] ??= []).push(m); return g; }, [metRep]);
  const metNomi = metRep.length ? metRep.map((m) => m.nome) : METODOLOGIE;
  const arrRep = arch && code ? repArrangiamenti(arch) : [];
  const fasiByMomento = useMemo(() => { const g: Record<string, Fase[]> = {}; if (arch) for (const f of repFasi(arch)) (g[f.momento] ??= []).push(f); return g; }, [arch]);
  const applicaArrangiamento = (arrId: string) => {
    if (!arch) return;
    const tl = espandiArrangiamento(arch, arrId, minPrev || 60);
    setFasiRows(tl.fasi.map((ft) => ({ id: newId(), nome: ft.fase.fase, minuti: ft.minuti, funzione: ft.fase.funzione, centratura: ft.fase.centratura, momento: ft.fase.momento, fonte: ft.fase.id, attDoc: ft.fase.attivita_docente, attStu: ft.fase.attivita_studente, durMin: ft.fase.dur_min_60 ?? undefined, durMax: ft.fase.dur_max_60 ?? undefined, metodi: ft.metodologie.slice(0, 2).map((m) => m.nome) })));
  };
  const metIcone = useMemo(() => iconaUniche(metNomi, ICON_METODOLOGIE), [metNomi]);
  const prereqAgg = useMemo(() => {
    const da = new Map<string, PrereqRisolto>(), co = new Map<string, PrereqRisolto>(), ctx = new Map<string, Voce>();
    if (arch) for (const v of selVoci.filter((x) => CONO.has(x.blocco))) {
      const p = prerequisitiDiVoce(arch, v);
      for (const r of p.daAccertare) da.set(r.regola.id, r);
      for (const r of p.consolidate) co.set(r.regola.id, r);
      for (const c of p.contesto) ctx.set(c.id, c);
    }
    return { daAccertare: [...da.values()], consolidate: [...co.values()], contesto: [...ctx.values()] };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arch, [...selIds].join(",")]);
  const inserisciPrereq = () => {
    const righe = [...prereqAgg.daAccertare.map((r) => `• ${r.etichetta}${r.regola.obbligatorio ? " — da accertare (micro-verifica)" : ""}`), ...prereqAgg.consolidate.map((r) => `• ${r.etichetta} (competenza consolidata)`)];
    if (righe.length) setPrereq((t) => [...new Set([...t.split("\n").filter(Boolean), ...righe])].join("\n"));
  };
  const inclRep = arch && code ? repInclusione(arch, { materia: code }) : [];
  const matRep = arch && code ? repMateriali(arch, { materia: code }) : [];
  const verRep = arch && code ? repValutazioni(arch, { graduata: false }).map((v) => v.metodo) : [];
  const verOptions = verRep.length ? [...new Set(verRep)] : VERIFICHE_F;
  const aggiungiIncLibero = () => { const t = nuovaInc.trim(); if (!t) return; setIncSel((s) => (s.includes(t) ? s : [...s, t])); setNuovaInc(""); };
  const suggInclusione = () => {
    const c = classe ? contiClasse(classe, profile) : { tot: 0, l104: 0, bes: 0, dsa: 0 };
    const add: string[] = [];
    if (c.dsa || c.bes) { add.push("Misure compensative: mappe, schemi, formulari, dizionario digitale, tempi aggiuntivi"); add.push("Misure dispensative: riduzione del carico di lavoro"); }
    if (c.l104) add.push("Interventi individualizzati secondo il PEI");
    if (!add.length) add.push("Strategie inclusive di classe (anche senza BES/DSA/L.104 in anagrafica)");
    setIncSel((s) => [...new Set([...s, ...add])]);
  };

  const obiettiviDaVoci = (): string[] => {
    if (!arch) return [];
    const backbone = new Set<string>();
    for (const v of selVoci) for (const ob of v.obiettivi_backbone) backbone.add(ob);
    const ids: string[] = [];
    for (const obId of backbone) {
      const ob = arch.obiettivi.find((o) => o.id === obId);
      if (!ob) continue;
      const exist = records("obiettivi").find((r) => r["Enunciato"] === ob.argomento && r["Materia"] === materia);
      if (exist) { ids.push(exist.id); continue; }
      const id = newId();
      upsert("obiettivi", { id, Enunciato: ob.argomento, Tipo: ob.tipo, Materia: materia, Nucleo: ob.nucleo, "Competenza europea": ob.competenza_europea, ...(bloomLabel(ob.bloom) ? { "Livello cognitivo": bloomLabel(ob.bloom) } : {}), Ciclo: ob.fase === "biennio" ? "Biennio" : ob.fase === "triennio" ? "Triennio" : ciclo } as Rec);
      ids.push(id);
    }
    return ids;
  };

  const addCompito = (t: string) => setCompiti((c) => [...c, { id: newId(), tipo: t, testo: "", data: "" }]);
  const setCompito = (id: string, patch: Partial<CompitoRow>) => setCompiti((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeCompito = (id: string) => setCompiti((c) => c.filter((x) => x.id !== id));

  // Materiali = etichette selezionate (come gli strumenti): flag coerente, niente record duplicati.
  const aggiungiMatLibero = () => {
    const t = nuovoMat.trim();
    if (!t) return;
    setMateriali((s) => (s.includes(t) ? s : [...s, t]));
    setNuovoMat("");
  };
  const compitiText = () => compiti.filter((c) => c.testo.trim()).map((c) => `• [${c.tipo}] ${c.testo.trim()}${c.data ? ` (entro ${fmtIt(c.data)})` : ""}`).join("\n");
  const compitiDaCal = compiti.filter((c) => c.data && c.testo.trim());

  const titoloEff = titolo.trim() || `${tipoLabelDi(tipo)} di ${materia}${selVoci[0] ? " — " + selVoci[0].testo : ""}`;
  const tipoLabel = tipoLabelDi(tipo);

  // Titolo proposto dal tagging quando si arriva alla panoramica (modificabile).
  const cur = stepDefsDi().cur;
  useEffect(() => {
    if (cur.key === "dettagli" && !titolo.trim()) {
      const primo = selVoci.find((v) => v.tipo_contenuto === "autore") || selVoci.find((v) => CONO.has(v.blocco));
      setTitolo(`${tipoLabel} di ${materia}${primo ? ": " + primo.testo : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.key]);

  const educivView = edcivSkip ? ["Nessuna (lezione standard)"] : educiv;
  const riepilogo = () => ({
    titolo: titoloEff, tipoLabel, materia, classe: isUda ? "" : classe, scuola: scuolaNome ?? "",
    quando: isUda ? `${fmtIt(data)} – ${fmtIt(dataFine)}${nLezioni ? ` · ${nLezioni} lezioni` : ""}` : `${fmtIt(data)} · ${durata} ore`,
    conoscenze: righe("con", conoscenze), abilita: righe("ab", abilita), competenze: righe("com", competenzeTxt),
    metodologie: metodologie.map(cap), strumenti: strumenti.map(cap), materiali: materiali.map(cap), educiv: educivView, raccordi,
    compiti: compiti.filter((c) => c.testo.trim()).map((c) => `[${cap(c.tipo)}] ${c.testo.trim()}${c.data ? ` (entro ${fmtIt(c.data)})` : ""}`),
    compitiCal: compitiDaCal.map((c) => `${fmtIt(c.data)} · ${cap(c.tipo)}: ${c.testo.trim()}`),
    prereq, fasi: fasiText(), inclusione: incSel, verificaF: verificaF ? cap(verificaF) : "", competenza, prodotto, compitoRealta,
  });

  const esportaWord = () => {
    const r = riepilogo();
    const ul = (xs: string[]) => (xs.length ? `<ul>${xs.map((x) => `<li>${escH(x)}</li>`).join("")}</ul>` : `<p class="rep-meta">—</p>`);
    const sec = (t: string, xs: string[]) => (xs.length ? `<h2>${t}</h2>${ul(xs)}` : "");
    const par = (t: string, v: string) => (v.trim() ? `<h2>${t}</h2><p>${escH(v).replace(/\n/g, "<br>")}</p>` : "");
    const body = [
      `<h1>${escH(r.titolo)}</h1>`,
      `<p class="rep-sub">${escH([r.tipoLabel, r.materia, r.classe, r.scuola].filter(Boolean).join(" · "))}</p>`,
      `<p class="rep-meta">${escH(r.quando)}</p>`,
      par("Competenza attesa", r.competenza),
      r.prodotto || r.compitoRealta ? `<h2>Prodotto e compito di realtà</h2>${r.prodotto ? `<p><b>Prodotto:</b> ${escH(r.prodotto)}</p>` : ""}${r.compitoRealta ? `<p><b>Compito di realtà:</b> ${escH(r.compitoRealta)}</p>` : ""}` : "",
      par("Prerequisiti", r.prereq),
      sec("Conoscenze e contenuti", r.conoscenze),
      sec("Abilità", r.abilita),
      sec("Competenze", r.competenze),
      par("Fasi e tempi", r.fasi),
      sec("Metodologie", r.metodologie),
      sec("Strumenti e spazi", r.strumenti),
      sec("Materiali e supporti", r.materiali),
      sec("Educazione civica", r.educiv),
      sec("Raccordi interdisciplinari", r.raccordi),
      sec("Compiti ed esercizi", r.compiti),
      sec("Compiti da calendarizzare", r.compitiCal),
      sec("Inclusione (misure)", r.inclusione),
      r.verificaF ? `<h2>Verifica formativa</h2><p>${escH(r.verificaF)}</p>` : "",
    ].filter(Boolean).join("\n");
    const fname = `${tipoLabel}_${materia}${classe ? "_" + classe : ""}_${data}`.replace(/[^\w-]+/g, "-");
    downloadWord(fname, r.titolo, body);
  };

  const salva = () => {
    if (selVoci.length === 0 && !titolo.trim()) { setMsg("Aggiungi un titolo o flagga qualche voce dall'archivio."); return; }
    const tit = titoloEff;
    const cId = classe ? classeId(classe) : undefined;
    const didattica: Rec = {
      id: "", Prerequisiti: prereq, Conoscenze: derivato("con", conoscenze), "Abilità": derivato("ab", abilita), Competenze: derivato("com", competenzeTxt),
      Metodologie: metodologie, "Strumenti e spazi": strumenti, "Materiali e supporti": materiali, "Compiti ed esercizi": compitiText(),
      "Educazione civica": educiv, "Raccordi interdisciplinari": raccordi, "Inclusione (misure)": incSel.join("\n"),
      ...(verificaF ? { "Verifica formativa": verificaF } : {}),
    };
    // Compiti con data → scadenze calendarizzate.
    for (const c of compitiDaCal) {
      upsert("scadenze", { id: newId(), Titolo: `${cap(c.tipo)} ${materia}${classe ? ` · ${classe}` : ""}: ${c.testo.trim().slice(0, 60)}`, Data: c.data, Stato: "da fare", Tipo: "consegna", "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}) } as Rec);
    }
    // Aggancia la verifica pianificata in itinere alla pianificazione appena creata.
    const linkVerifica = (pid: string, ptipo: "lezione" | "uda") => { if (verificaSessId) { const s = getSessione(verificaSessId); if (s && !s.pianoId) upsertSessione({ ...s, pianoId: pid, pianoTipo: ptipo }); } };
    if (isUda) {
      const obIds = obiettiviDaVoci();
      const lezIds: string[] = [];
      const start = Date.parse(`${data}T00:00:00`), end = Date.parse(`${dataFine || data}T00:00:00`);
      for (let i = 0; i < Math.max(0, nLezioni); i++) {
        const t = nLezioni > 1 ? start + (end - start) * (i / (nLezioni - 1)) : start;
        const d = new Date(t).toISOString().slice(0, 10);
        const lid = newId(); lezIds.push(lid);
        upsert("lezioni", { id: lid, Titolo: `${tit} — lezione ${i + 1}`, Materia: materia, "Data prevista": d, Stato: "Calendarizzata", Sequenza: i + 1, "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}) } as Rec);
      }
      const udaId = newId();
      upsert("uda", {
        ...didattica, id: udaId, Titolo: tit, "Competenza attesa": competenza, "Prodotto atteso": prodotto, "Compito di realtà": compitoRealta,
        Ciclo: ciclo, Stato: "Calendarizzata", "Data inizio": data, "Data fine": dataFine, Obiettivi: obIds,
        ...(lezIds.length ? { Lezioni: lezIds } : {}),
      } as Rec);
      linkVerifica(udaId, "uda");
      setMsg(`✓ UdA salvata in archivio${lezIds.length ? ` e ${lezIds.length} lezioni calendarizzate` : ""}: ${tit}`);
    } else {
      const lezId = newId();
      upsert("lezioni", {
        ...didattica, id: lezId,
        Titolo: tipo === "laboratorio" ? `[Laboratorio] ${tit}` : tit,
        Materia: materia, "Data prevista": data, "Durata (ore)": durata, Stato: "Calendarizzata",
        "Obiettivi della lezione": selVoci.map((v) => `• ${v.testo}`).join("\n"),
        Fasi: fasiText(), "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}),
      } as Rec);
      linkVerifica(lezId, "lezione");
      setMsg(`✓ ${tipoLabel} salvata in archivio e calendarizzata: ${tit}`);
    }
    resetTutto();
  };

  // ── Sequenza degli step disponibili ──────────────────────────────────────────
  function stepDefsDi() {
    const defs: { key: StepKey; titolo: string; hint: string }[] = [
      { key: "conoscenze", titolo: "Conoscenze e contenuti", hint: "Espandi i rami e flagga: scegliendo una voce si flaggano da sole le categorie superiori." },
      ...(code && haAbilitaComp ? [{ key: "abilita" as StepKey, titolo: "Abilità e competenze", hint: "Stessa consultazione: ciò che si sa fare e l'agire competente." }] : []),
      ...(code ? [{ key: "prerequisiti" as StepKey, titolo: "Prerequisiti", hint: "Calcolati per prossimità dai contenuti flaggati; modificabili." }] : []),
      { key: "metodologie", titolo: "Metodologie", hint: "La strategia con cui fai apprendere: come organizzi attività, interazione e ruoli per raggiungere gli obiettivi. Scegline una o più, anche combinate." },
      ...(!isUda ? [{ key: "fasi" as StepKey, titolo: "Fasi e tempi", hint: "Dai un ritmo alla lezione: scegli la durata, aggiungi le fasi, regola i minuti. In alto vedi quanto tempo resta." }] : []),
      { key: "edciv", titolo: "Educazione civica", hint: "Ampliamento facoltativo: usa «Nessun apporto» per una lezione standard." },
      ...(raccordiOpts.length ? [{ key: "raccordi" as StepKey, titolo: "Raccordi interdisciplinari", hint: indir ? "Le materie dell'indirizzo con cui dialoga." : "Le altre materie con cui dialoga." }] : []),
      { key: "materiali", titolo: "Strumenti e materiali", hint: "Con cosa e dove: strumenti/spazi e i supporti, dal catalogo o creati al volo." },
      { key: "inclusione", titolo: "Inclusione", hint: "Misure per la classe e i suoi componenti (modello anonimo, per situazione)." },
      { key: "compiti", titolo: "Compiti e verifiche", hint: "Compiti (con data) e la verifica; possono restare vuoti e completarsi dopo." },
      { key: "dettagli", titolo: "Panoramica & convalida", hint: "Quadro finale modificabile: rivedi, esporta in Word, poi convalida nel Cruscotto." },
    ];
    const idx = Math.min(stepIdx, defs.length - 1);
    return { defs, idx, cur: defs[idx] };
  }
  function tipoLabelDi(t: Tipo) { return t === "uda" ? "UdA" : t === "laboratorio" ? "Laboratorio" : "Lezione"; }
  const { defs: stepDefs, idx } = stepDefsDi();

  const scuolaOk = !multiScuola || !!scuolaId;
  const ctxReady = scuolaOk && !!materia && (isUda || !!classe);
  const classiPerMateria = materia ? classi.filter((c) => materieClasseEffettive(c, profile).includes(materia)) : classi;
  const nConoscenze = selVoci.filter((v) => CONO.has(v.blocco)).length;
  const nAbilitaComp = selVoci.filter((v) => v.blocco === "abilita" || v.blocco === "competenza").length;
  const r = riepilogo();

  return (
    <section className="planner pl-wizard">
      <div className="view-head">
        <h1>🧠 Pianifica</h1>
        <div className="seg">
          <button className={tipo === "lezione" ? "active" : ""} onClick={() => { setTipo("lezione"); setStepIdx(0); }}>Lezione</button>
          <button className={tipo === "laboratorio" ? "active" : ""} onClick={() => { setTipo("laboratorio"); setStepIdx(0); }}>Laboratorio</button>
          <button className={tipo === "uda" ? "active" : ""} onClick={() => { setTipo("uda"); setStepIdx(0); }}>UdA</button>
        </div>
      </div>

      {materie.length === 0 ? (
        <p className="muted">Imposta materie e classi nel <b>Profilo</b>, poi torna qui a pianificare.</p>
      ) : (
        <>
          {/* ── DRILL DI CONTESTO ─────────────────────────────────────────── */}
          <div className="pl-drill">
            {multiScuola && (scuolaId
              ? <button className="pl-crumb" onClick={() => setScuolaId("")}><b>Scuola</b> {scuolaSel?.nome} <span>✕</span></button>
              : <div className="pl-pick"><span className="pl-pick-q">Per quale scuola?</span>
                  <div className="pl-dgrid">{scuole.map((s) => <DCard key={s.id} top={<span className="pl-ico">{/lice/i.test(s.ordine) ? "🏛️" : "🏫"}</span>} title={s.nome} desc={s.indirizzo ? cap(s.indirizzo) : cap(s.ordine)} onClick={() => { setScuolaId(s.id); setStepIdx(0); }} />)}</div>
                </div>
            )}

            {scuolaOk && (materia
              ? <button className="pl-crumb" onClick={() => cambiaMateria("")}><b>Materia</b> {materia} <span>✕</span></button>
              : <div className="pl-pick"><span className="pl-pick-q">Quale materia?</span>
                  <div className="pl-dgrid">{materie.map((m) => <DCard key={m} top={<span className="pl-sigla" style={{ background: materiaColor(m) ?? "var(--accent)" }}>{materiaSigla(m)}</span>} title={m} desc={arch && materiaCodice(arch, m) ? "Guidata dall'archivio" : "Compilazione libera"} onClick={() => cambiaMateria(m)} />)}</div>
                </div>
            )}

            {scuolaOk && materia && !isUda && (classe
              ? <button className="pl-crumb" onClick={() => setClasse("")}><b>Classe</b> {classe} <span>✕</span></button>
              : <div className="pl-pick"><span className="pl-pick-q">Quale classe?</span>
                  {classiPerMateria.length === 0 ? <p className="muted">Nessuna classe associata a {materia} (vedi sinolo nel Profilo).</p>
                    : <div className="pl-dgrid">{classiPerMateria.map((c) => <DCard key={c} top={<span className="pl-sigla cls" style={{ background: classeColor(c) ?? "var(--gold)" }}>{c}</span>} title={`Classe ${c}`} desc={cicloDi(c)} onClick={() => cambiaClasse(c)} />)}</div>}
                </div>
            )}
          </div>

          {ctxReady && (
            <div className="pl-steps">
              <ol className="pl-track">
                {stepDefs.map((s, i) => <li key={s.key} className={i === idx ? "on" : i < idx ? "done" : ""} onClick={() => setStepIdx(i)} title={s.titolo}>{i + 1}</li>)}
              </ol>

              <Step n={idx + 1} tot={stepDefs.length} titolo={stepDefs[idx].titolo} hint={stepDefs[idx].hint}
                badge={stepDefs[idx].key === "conoscenze" ? `${nConoscenze} scelte` : stepDefs[idx].key === "abilita" ? `${nAbilitaComp} scelte`
                  : stepDefs[idx].key === "prerequisiti" ? ((prereqAgg.daAccertare.length + prereqAgg.consolidate.length) || "") + ""
                  : stepDefs[idx].key === "metodologie" ? (metodologie.length || "") + ""
                  : stepDefs[idx].key === "fasi" ? (fasiRows.length || "") + ""
                  : stepDefs[idx].key === "edciv" ? (edcivSkip ? "✓" : (educiv.length || "") + "") : stepDefs[idx].key === "raccordi" ? (raccordi.length || "") + ""
                  : stepDefs[idx].key === "materiali" ? ((strumenti.length + materiali.length) || "") + "" : stepDefs[idx].key === "inclusione" ? ((incSel.length || "") + "")
                  : stepDefs[idx].key === "compiti" ? (compiti.length || "") + "" : undefined}>

                {stepDefs[idx].key === "conoscenze" && (code
                  ? <DrillTax roots={taxCono} path={catCono} setPath={setCatCono} a={arch!} selez={selIds} onTree={toggleAlbero} onVoce={toggleAlbero} />
                  : <p className="muted">Per <b>{materia}</b> non c'è ancora un archivio: i contenuti si scrivono nello step finale.</p>
                )}

                {stepDefs[idx].key === "abilita" && <DrillTax roots={taxAC} path={catAC} setPath={setCatAC} a={arch!} selez={selIds} onTree={toggleVoce} onVoce={toggleVoce} />}

                {stepDefs[idx].key === "metodologie" && (metRep.length
                  ? <div className="pl-mgruppi">{Object.entries(metByGruppo).map(([g, ms]) => (
                      <div key={g}><div className="pl-sub">{cap(g)} <small>{ms.length}</small></div>
                        <div className="pl-dgrid">{ms.map((m) => <DCard key={m.id} icon={metIcone[m.nome]} title={m.nome} desc={m.aggancio_classico} on={metodologie.includes(m.nome)} onClick={() => setMetodologie(toggleIn(metodologie, m.nome))} />)}</div>
                      </div>))}</div>
                  : <DrillCards opts={METODOLOGIE} val={metodologie} onToggle={(m) => setMetodologie(toggleIn(metodologie, m))} desc={(o) => DESCR_METODOLOGIE[o]} icon={(o) => ICON_METODOLOGIE[o]} />)}
                {stepDefs[idx].key === "edciv" && (
                  <>
                    <div className="pl-dgrid">
                      <DCard icon="❌" title="Nessun apporto" desc="Lezione standard: non si considera l'Educazione civica." on={edcivSkip} onClick={() => { setEdcivSkip((s) => !s); setEduciv([]); }} />
                      {[AGENDA, ...EDCIVICA.filter((o) => o !== AGENDA)].map((o) => <DCard key={o} icon={ICON_EDCIVICA[o]} title={cap(o)} desc={DESCR_EDCIVICA[o]} on={educiv.includes(o)} onClick={() => {
                        const off = educiv.includes(o);
                        let next = toggleIn(educiv, o);
                        if (o === AGENDA && off) next = next.filter((x) => !x.startsWith("SDG "));
                        setEduciv(next); setEdcivSkip(false);
                      }} />)}
                    </div>
                    {educiv.includes("Agenda 2030 e sviluppo sostenibile") && arch && agenda2030(arch).length > 0 && (
                      <div className="pl-sdg-wrap">
                        <div className="pl-sub">Obiettivi dell'Agenda 2030 <small>{educiv.filter((x) => x.startsWith("SDG ")).length}/17</small> <em>· scegli le missioni pertinenti</em></div>
                        <div className="pl-dgrid">
                          {agenda2030(arch).map((s) => { const lab = `SDG ${s.numero} · ${s.titolo}`; return (
                            <DCard key={s.id} icon={s.icona} title={`${s.numero} · ${s.titolo}`} desc={s.descrizione} accent={coloreLeggibile(s.colore)} on={educiv.includes(lab)} onClick={() => setEduciv(toggleIn(educiv, lab))} />
                          ); })}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {stepDefs[idx].key === "raccordi" && <DrillCards opts={raccordiOpts} val={raccordi} onToggle={(m) => setRaccordi(toggleIn(raccordi, m))} desc={() => undefined} icon={(o) => <span className="pl-sigla mini" style={{ background: materiaColor(o) ?? "var(--ink-muted)" }}>{materiaSigla(o)}</span>} />}

                {stepDefs[idx].key === "prerequisiti" && (
                  <>
                    {(prereqAgg.daAccertare.length + prereqAgg.consolidate.length + prereqAgg.contesto.length > 0)
                      ? <div className="pl-prereq">
                          {prereqAgg.daAccertare.length > 0 && <div className="pl-prereq-grp"><b>Da accertare</b>{prereqAgg.daAccertare.map((r) => <span key={r.regola.id} className={r.regola.obbligatorio ? "chip oblig" : "chip"} title={r.regola.nota || r.regola.tipo}>{r.etichetta}{r.regola.obbligatorio ? " · micro-verifica" : ""}</span>)}</div>}
                          {prereqAgg.consolidate.length > 0 && <div className="pl-prereq-grp"><b>Consolidate</b>{prereqAgg.consolidate.map((r) => <span key={r.regola.id} className="chip ok" title={`orizzonte: ${r.regola.orizzonte}`}>{r.etichetta}</span>)}</div>}
                          {prereqAgg.contesto.length > 0 && <div className="pl-prereq-grp"><b>Contesto</b>{prereqAgg.contesto.map((v) => <span key={v.id} className="chip ctx">{v.testo}</span>)}</div>}
                        </div>
                      : <p className="muted">Flagga prima dei contenuti: qui compaiono i prerequisiti calcolati per prossimità (orizzonte circoscritto).</p>}
                    <label className="field"><span>Prerequisiti da accertare {(prereqAgg.daAccertare.length + prereqAgg.consolidate.length > 0) && <button className="link" onClick={inserisciPrereq}>inserisci i calcolati ↓</button>}</span>
                      <textarea rows={3} value={prereq} onChange={(e) => setPrereq(e.target.value)} placeholder="Cosa serve sapere/saper fare prima…" />
                    </label>
                  </>
                )}

                {stepDefs[idx].key === "fasi" && (
                  <div className="pl-fasi">
                    <div className="pl-fase-blocco">
                      <div className="pl-sub">⏳ Quanto dura la lezione? <small>un'ora qui vale {unitaOra}′ (dal tuo orario)</small></div>
                      <div className="pl-dgrid mini">{DURATE.map((d) => <DCard key={d.h} icon={d.icona} title={d.lab} top={<span className="pl-cnt">{Math.round(d.h * unitaOra)}′</span>} desc={d.desc} on={durata === d.h} onClick={() => setDurata(d.h)} />)}</div>
                    </div>

                    <div className="pl-fase-blocco">
                      <div className="pl-sub">🧭 Come vuoi costruirla?</div>
                      <div className="pl-dgrid mini">
                        {arrRep.length > 0 && <DCard icon="🗂️" title="Parti da un modello" desc="Un impianto già pronto (classica, flipped, debate…) da adattare." on={presetOpen} onClick={() => { setPresetOpen((o) => !o); setAddFaseOpen(false); }} />}
                        <DCard icon="🧩" title="Struttura tipo" desc="Quattro fasi equilibrate, pronte da ritoccare." onClick={() => struttFasi()} />
                        {arch && repFasi(arch).length > 0
                          ? <DCard icon="➕" title="Aggiungi una fase" desc="La costruisci tu, un passo per volta, lungo l'arco della lezione." on={addFaseOpen} onClick={() => { setAddFaseOpen((o) => !o); setFaseMomento(null); setPresetOpen(false); }} />
                          : <DCard icon="➕" title="Aggiungi una fase" desc="Una fase vuota da scrivere a mano." onClick={() => addFase()} />}
                      </div>
                    </div>

                    {presetOpen && arrRep.length > 0 && (
                      <div className="pl-fase-add">
                        <div className="pl-fase-add-hint">Applichi un <b>impianto intero</b>: le fasi che hai ora lasciano il posto a quelle del modello.</div>
                        <div className="pl-dgrid">{arrRep.map((ar) => <DCard key={ar.id} icon={ICON_ARRANGIAMENTO[ar.modello] ?? "🧭"} title={ar.nome} desc={ar.note} top={<span className="pl-cnt">{ar.sequenza_fasi.length} fasi · {ar.durata_riferimento_min}′</span>} onClick={() => { applicaArrangiamento(ar.id); setPresetOpen(false); }} />)}</div>
                      </div>
                    )}

                    {addFaseOpen && arch && (
                      <div className="pl-fase-add">
                        <div className="pl-fase-add-hint">Scegli il <b>momento</b>, poi la fase. Si mettono in ordine da sole: inizio, sviluppo, apprendimento, fine.</div>
                        {faseMomento && <nav className="pl-bc"><button className="pl-bc-i" onClick={() => setFaseMomento(null)}>↩ Momenti</button><span className="pl-bc-seg"><span className="pl-bc-sep">▸</span><button className="pl-bc-i">{MOMENTI.find((m) => m.id === faseMomento)?.label}</button></span></nav>}
                        {!faseMomento
                          ? <div className="pl-dgrid">
                              {MOMENTI.map((m) => <DCard key={m.id} icon={m.icona} title={m.label} desc={m.desc} top={<span className="pl-cnt">{(fasiByMomento[m.id]?.length ?? 0)} fasi</span>} onClick={() => setFaseMomento(m.id)} />)}
                              <DCard icon="➕" title="Fase vuota" desc="Aggiungi una fase senza modello, da compilare a mano." onClick={() => addFase()} />
                            </div>
                          : <div className="pl-dgrid">
                              {(fasiByMomento[faseMomento] ?? []).map((f) => <DCard key={f.id} icon={centr(f.centratura)?.icona} title={f.fase} desc={f.funzione} top={<span className="pl-cnt">{centr(f.centratura)?.lab ?? "—"} · {f.dur_min_60}–{f.dur_max_60}′</span>} onClick={() => addFaseCatalogo(f.id)} />)}
                            </div>}
                      </div>
                    )}

                    <div className={"pl-orario" + (minRim < 0 ? " over" : minRim === 0 && fasiMinTot > 0 ? " ok" : "")}>
                      <div className="pl-orario-head">
                        <span className="pl-orario-tit">⏱ Orario calibrato</span>
                        <span className="pl-orario-read"><b>{fasiMinTot}′</b> <span className="muted">/ {minPrev}′ monte ore</span></span>
                        <span className="spacer" />
                        {fasiRows.length > 0 && minPrev > 0 && minRim !== 0 && <button className="pl-fase-addbtn" onClick={bilanciaFasi} title="Riscala le durate proporzionalmente fino a coprire il monte ore">⚖ bilancia</button>}
                      </div>
                      <div className="pl-orario-meter" role="img" aria-label={`Assegnati ${fasiMinTot} su ${minPrev} minuti`}>
                        <div className="pl-orario-fill" style={{ width: `${minPrev > 0 ? Math.min(100, (fasiMinTot / minPrev) * 100) : 0}%` }} />
                      </div>
                      <div className="pl-orario-msg">{fasiMinTot === 0 ? "Scegli la durata e aggiungi le fasi: qui vedi quanti minuti restano." : minRim > 0 ? `Restano ${minRim}′ da dare alle fasi` : minRim < 0 ? `Hai ${-minRim}′ di troppo: togli qualche minuto o premi «bilancia»` : "Tutti i minuti sono distribuiti ✓"}</div>
                    </div>

                    {fasiRows.length > 0 && (
                      <div className="pl-binario" role="img" aria-label={`Ripartizione del tempo: ${fasiRows.map((f) => `${f.nome} ${f.minuti}′`).join(", ")}`}>
                        {fasiRows.map((f, i) => <div key={f.id} className="pl-bin-seg" onClick={() => vaiAFase(f.id)} style={{ flexGrow: Math.max(f.minuti || 0, 0.001), background: FASE_COLORS[i % FASE_COLORS.length] }} title={`${f.nome || `Fase ${i + 1}`} · ${f.minuti || 0}′ — clic per la riga`}>{(f.minuti || 0) >= 8 ? `${f.minuti}′` : ""}</div>)}
                        {minRim < 0 && <div className="pl-bin-over" style={{ flexGrow: -minRim }} title={`${-minRim}′ in eccesso`} />}
                      </div>
                    )}

                    {fasiRows.length > 0 && fasiMinTot > 0 && (
                      <div className="pl-centmix">
                        <div className="pl-centmix-bar" role="img" aria-label={`Centratura: studenti attivi circa ${studAttivi} per cento`}>
                          {fasiRows.filter((f) => (f.minuti || 0) > 0).map((f) => { const c = centr(f.centratura); return <div key={f.id} style={{ flexGrow: f.minuti, background: c?.col ?? "var(--ink-muted)" }} title={`${c?.lab ?? "—"} · ${f.minuti}′`} />; })}
                        </div>
                        <div className="pl-centmix-lab">Chi è attivo · <b>studenti ~{studAttivi}% del tempo</b> <span className="muted">— il colore va dal docente agli studenti</span></div>
                      </div>
                    )}

                    {fasiRows.length === 0 ? <p className="muted">Parti da un <b>modello</b> oppure <b>aggiungi le fasi</b> per momento, poi regola i minuti di ciascuna.</p> : (
                      <div className="pl-fasi-list">
                        {fasiRows.map((f, i) => { const s = inizioFase(i); const col = FASE_COLORS[i % FASE_COLORS.length]; const c = centr(f.centratura); const rng = rangeFase(f); const fuori = fuoriRange(f); const hasDett = !!(f.attDoc || f.attStu || rng || f.metodi.length); return (
                          <div key={f.id} id={`pl-fase-${f.id}`} className={faseEvidenzia === f.id ? "pl-fase evidenzia" : "pl-fase"} style={{ borderLeftColor: col }} onDragOver={(e) => e.preventDefault()} onDrop={() => { const from = dragFase.current; if (from != null) spostaFase(from, i); dragFase.current = null; }}>
                            <span className="pl-fase-n" draggable onDragStart={() => { dragFase.current = i; }} onDragEnd={() => { dragFase.current = null; }} title="Trascina per riordinare" style={{ background: col, cursor: "grab" }}>{i + 1}</span>
                            <span className={fuori ? "pl-fase-slider warn" : "pl-fase-slider"} title={fuori && rng ? `Durata consigliata ${rng[0]}–${rng[1]}′` : "Trascina per i minuti, oppure scrivi il numero"}>
                              <input type="range" min={0} max={Math.max(minPrev || 60, f.minuti, 60)} step={1} value={f.minuti} onChange={(e) => setFase(f.id, { minuti: Math.max(0, Number(e.target.value)) })} aria-label="Minuti della fase" />
                              <input type="number" className="pl-fase-minval" min={0} value={f.minuti} onChange={(e) => setFase(f.id, { minuti: Math.max(0, Number(e.target.value)) })} aria-label="Minuti (numero)" /><em>′</em>
                            </span>
                            <div className="pl-fase-body">
                              <div className="pl-fase-row1">
                                {f.fonte
                                  ? <span className="pl-fase-titolo" title="Fase dal catalogo: il titolo è fisso">{f.nome}</span>
                                  : <input className="pl-fase-nome" type="text" value={f.nome} placeholder={`Fase ${i + 1}`} onChange={(e) => setFase(f.id, { nome: e.target.value })} />}
                                {c && <span className="pl-fase-cen" style={{ background: c.col }} title={`Centratura: ${c.lab}`}>{c.icona} {c.lab}</span>}
                                <span className="pl-fase-ora" title="Posizione nell'arco della lezione (minuti dall'inizio)">min {s}–{s + (f.minuti || 0)}</span>
                                <span className="spacer" />
                                <span className="pl-fase-rik"><button onClick={() => spostaFase(i, i - 1)} disabled={i === 0} aria-label="Sposta su">▲</button><button onClick={() => spostaFase(i, i + 1)} disabled={i === fasiRows.length - 1} aria-label="Sposta giù">▼</button></span>
                                {hasDett && <button className={faseDett === f.id ? "pl-fase-met on" : "pl-fase-met"} onClick={() => setFaseDett(faseDett === f.id ? null : f.id)}>dettagli ▾</button>}
                                <button className="danger" onClick={() => removeFase(f.id)} aria-label="Rimuovi">✕</button>
                              </div>
                              <textarea className="pl-fase-nota" rows={2} value={f.nota ?? ""} placeholder="Cosa farai, in concreto, in questa fase… (es. testo, esercizio, consegna)" onChange={(e) => setFase(f.id, { nota: e.target.value })} />
                              {faseDett === f.id && <div className="pl-fase-dett">
                                {rng && <div className="pl-fase-dr">⏱ Durata consigliata <b>{rng[0]}–{rng[1]}′</b> <span className="muted">(per {minPrev}′ di lezione)</span>{fuori && <span className="pl-fase-fuori"> · attuale {f.minuti}′ fuori range</span>}</div>}
                                {f.attDoc && <div className="pl-fase-att"><span className="pl-fase-role doc">🗣️ Docente</span>{f.attDoc}</div>}
                                {f.attStu && <div className="pl-fase-att"><span className="pl-fase-role stu">🙋 Studenti</span>{f.attStu}</div>}
                                {f.metodi.length > 0 && <div className="pl-fase-att"><span className="pl-fase-role met">🧭 Metodi</span>{f.metodi.map((m) => cap(m)).join(" · ")}</div>}
                              </div>}
                            </div>
                          </div>
                        ); })}
                      </div>
                    )}
                  </div>
                )}

                {stepDefs[idx].key === "materiali" && (() => {
                  const catTipi = new Set(matRep.map((m) => m.tipo));
                  const customMat = materiali.filter((l) => !catTipi.has(l));
                  return (
                  <div className="pl-mat">
                    <div className="pl-sez">🧰 Strumenti e spazi</div>
                    <DrillCards opts={STRUMENTI} val={strumenti} onToggle={(m) => setStrumenti(toggleIn(strumenti, m))} desc={(o) => DESCR_STRUMENTI[o]} icon={(o) => ICON_STRUMENTI[o]} />
                    {matRep.length > 0 && <>
                      <div className="pl-sez">📦 Materiali e supporti</div>
                      {[...new Set(matRep.map((m) => m.categoria))].map((cat) => (
                        <div key={cat}><div className="pl-sub">{ICON_MATERIALI[cat] ?? "📦"} {cap(cat)} <small>{matRep.filter((m) => m.categoria === cat).length}</small></div>
                          <div className="pl-dgrid">{matRep.filter((m) => m.categoria === cat).map((m) => <DCard key={m.id} icon={ICON_MATERIALI[m.categoria] ?? "📦"} title={m.tipo} desc={m.descrizione} on={materiali.includes(m.tipo)} onClick={() => setMateriali(toggleIn(materiali, m.tipo))} />)}</div>
                        </div>
                      ))}
                    </>}
                    {customMat.length > 0 && <>
                      <div className="pl-sub">📎 Aggiunti da te</div>
                      <div className="pl-dgrid">{customMat.map((l) => <DCard key={l} icon="📎" title={l} on onClick={() => setMateriali(toggleIn(materiali, l))} />)}</div>
                    </>}
                    <div className="pl-mat-add">
                      <input type="text" value={nuovoMat} placeholder="Aggiungi un materiale tuo (titolo)…" onChange={(e) => setNuovoMat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") aggiungiMatLibero(); }} />
                      <button onClick={aggiungiMatLibero}>+ Aggiungi</button>
                    </div>
                  </div>
                ); })()}

                {stepDefs[idx].key === "inclusione" && (() => {
                  const catLabel = (m: { ambito: string; categoria: string; misura: string }) => `[${m.ambito}/${m.categoria}] ${m.misura}`;
                  const catLabels = new Set(inclRep.map(catLabel));
                  const customInc = incSel.filter((l) => !catLabels.has(l));
                  return (
                  <>
                    {(() => {
                      const c = classe ? contiClasse(classe, profile) : { tot: 0, l104: 0, bes: 0, dsa: 0 };
                      const need = c.l104 + c.bes + c.dsa;
                      if (need > 0) return <div className="pl-remind warn">⚠️ <b>{classe}</b> ({c.tot} alunni): {[c.dsa ? `${c.dsa} DSA` : "", c.bes ? `${c.bes} BES` : "", c.l104 ? `${c.l104} con L.104` : ""].filter(Boolean).join(", ")}. Prevedi le misure per situazione (anagrafica nel <b>Profilo</b>). <button className="link" onClick={suggInclusione}>compila in automatico ↓</button></div>;
                      if (classe) return <div className="pl-remind ok">✓ {classe}: nessun alunno con BES/DSA/L.104 in anagrafica. <button className="link" onClick={suggInclusione}>nota inclusiva ↓</button></div>;
                      return <p className="muted">Modello anonimo: le misure si associano a una situazione (es. «PDP per DSA»), mai a un nominativo.</p>;
                    })()}
                    {inclRep.length > 0 && [...new Set(inclRep.map((m) => m.ambito))].map((amb) => (
                      <div key={amb}>
                        <div className="pl-sez">{ICON_INC_AMBITO[amb] ?? "🧩"} {amb} <small>{inclRep.filter((m) => m.ambito === amb).length}</small></div>
                        {[...new Set(inclRep.filter((m) => m.ambito === amb).map((m) => m.categoria))].map((cat) => (
                          <div key={cat}><div className="pl-sub">{ICON_INCLUSIONE[cat] ?? "•"} {cap(cat)}</div>
                            <div className="pl-dgrid">{inclRep.filter((m) => m.ambito === amb && m.categoria === cat).map((m) => <DCard key={m.id} icon={ICON_INCLUSIONE[m.categoria]} title={m.misura} desc={m.descrizione} on={incSel.includes(catLabel(m))} onClick={() => setIncSel(toggleIn(incSel, catLabel(m)))} />)}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                    {customInc.length > 0 && <>
                      <div className="pl-sub">📎 Aggiunte da te</div>
                      <div className="pl-dgrid">{customInc.map((l) => <DCard key={l} icon="♿" title={l} on onClick={() => setIncSel(toggleIn(incSel, l))} />)}</div>
                    </>}
                    <div className="pl-mat-add">
                      <input type="text" value={nuovaInc} placeholder="Aggiungi una misura tua (modello anonimo, per situazione)…" onChange={(e) => setNuovaInc(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") aggiungiIncLibero(); }} />
                      <button onClick={aggiungiIncLibero}>+ Aggiungi</button>
                    </div>
                  </>
                ); })()}

                {stepDefs[idx].key === "compiti" && (
                  <>
                    <div className="pl-sub">Compiti ed esercizi</div>
                    <div className="pl-dgrid">{COMPITO_TIPI.map((t) => <DCard key={t} icon={ICON_COMPITI[t]} title={cap(t)} desc={DESCR_COMPITI[t]} onClick={() => addCompito(t)} />)}</div>
                    {compiti.length > 0 && (
                      <div className="pl-compiti">
                        {compiti.map((c) => (
                          <div key={c.id} className="pl-compito">
                            <span className="pl-compito-tag">{cap(c.tipo)}</span>
                            <input type="text" value={c.testo} placeholder="Es. tradurre vv. 1-20; esercizi p.45…" onChange={(e) => setCompito(c.id, { testo: e.target.value })} />
                            <input className="pl-compito-data" type="date" value={c.data} title="Data per calendarizzare il compito" onChange={(e) => setCompito(c.id, { data: e.target.value })} />
                            <button className="danger" onClick={() => removeCompito(c.id)} aria-label="Rimuovi">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {compitiDaCal.length > 0 && <p className="muted pl-hint">📅 {compitiDaCal.length === 1 ? "1 compito con data: sarà calendarizzato" : `${compitiDaCal.length} compiti con data: saranno calendarizzati`} alla convalida.</p>}

                    <div className="pl-triade pl-verifiche-sec">
                      <label className="field"><span>Verifica formativa <em>· in itinere{verRep.length ? ", dall'archivio" : ""}</em></span>
                        <select value={verificaF} onChange={(e) => setVerificaF(e.target.value)}>
                          <option value="">— (puoi lasciarla vuota)</option>
                          {verOptions.map((v) => <option key={v} value={v}>{cap(v)}</option>)}
                        </select>
                      </label>
                      <div className="field"><span>Verifica sommativa <em>· dialoga col calcolatore</em></span>
                        {verificaSessId
                          ? <div className="pl-remind ok">✓ Verifica pianificata e in calendario. <button className="link" onClick={() => onView({ kind: "valutazione", sessioneId: verificaSessId })}>apri la correzione →</button></div>
                          : <div className="pl-verifica"><button onClick={() => setShowVerifica(true)}>📝 Pianifica verifica da zero…</button><p className="muted pl-hint">Oppure lasciala vuota: componendola dopo (dal calcolatore) potrai agganciarla a questa lezione/UdA in archivio.</p></div>}
                      </div>
                    </div>
                    {showVerifica && <VerificaForm prefill={{ classe, data, materia, titolo: titoloEff }} onClose={() => setShowVerifica(false)} onOpen={(id) => { setVerificaSessId(id); setShowVerifica(false); }} />}
                  </>
                )}

                {stepDefs[idx].key === "dettagli" && (
                  <>
                    <label className="field"><span>Titolo <em>· proposto dal tagging, modificabile</em></span>
                      <input type="text" value={titolo} placeholder={`${tipoLabel} di ${materia}`} onChange={(e) => setTitolo(e.target.value)} style={{ borderLeft: `3px solid ${materiaColor(materia) ?? "var(--rule)"}` }} />
                    </label>
                    <div className="pl-when">
                      {isUda ? (
                        <>
                          <label className="field sm"><span>Da</span><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
                          <label className="field sm"><span>A</span><input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} /></label>
                          <label className="field sm"><span>N° lezioni</span><input type="number" min={0} max={60} value={nLezioni} onChange={(e) => setNLezioni(Number(e.target.value))} /></label>
                        </>
                      ) : (
                        <>
                          <label className="field sm"><span>Data</span><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
                          <label className="field sm"><span>Ore</span><input type="number" min={0} step="0.5" value={durata} onChange={(e) => setDurata(Number(e.target.value))} /></label>
                        </>
                      )}
                    </div>

                    {isUda && (
                      <>
                        <label className="field"><span>Competenza attesa</span><textarea rows={2} value={competenza} onChange={(e) => setCompetenza(e.target.value)} placeholder="La competenza al termine dell'UdA…" /></label>
                        <div className="pl-triade">
                          <label className="field"><span>Prodotto atteso</span><textarea rows={2} value={prodotto} onChange={(e) => setProdotto(e.target.value)} placeholder="L'elaborato finale…" /></label>
                          <label className="field"><span>Compito di realtà</span><textarea rows={2} value={compitoRealta} onChange={(e) => setCompitoRealta(e.target.value)} placeholder="Situazione autentica…" /></label>
                        </div>
                      </>
                    )}

                    <div className="pl-rifinitura">
                      <div className="pl-sub">Rifinitura testuale {selVoci.length > 0 && <button className="link" onClick={componi}>componi dai flag ↓</button>}</div>
                      <div className="pl-triade">
                        <label className="field"><span>Conoscenze</span><textarea rows={3} value={conoscenze} onChange={(e) => setConoscenze(e.target.value)} placeholder={derivato("con", "") || "Contenuti…"} /></label>
                        <label className="field"><span>Abilità</span><textarea rows={3} value={abilita} onChange={(e) => setAbilita(e.target.value)} placeholder={derivato("ab", "") || "Saper fare…"} /></label>
                        <label className="field"><span>Competenze</span><textarea rows={3} value={competenzeTxt} onChange={(e) => setCompetenzeTxt(e.target.value)} placeholder={derivato("com", "") || "Agire competente…"} /></label>
                      </div>
                    </div>

                    {/* Panoramica visiva finale */}
                    <div className="pl-overview">
                      <div className="pl-ov-head"><h3>{r.titolo}</h3><span className="pl-ov-sub">{[r.tipoLabel, r.materia, r.classe, r.scuola].filter(Boolean).join(" · ")} · {r.quando}</span></div>
                      <div className="pl-ov-grid">
                        <OvList t="Conoscenze e contenuti" xs={r.conoscenze} />
                        <OvList t="Abilità" xs={r.abilita} />
                        <OvList t="Competenze" xs={r.competenze} />
                        <OvList t="Prerequisiti" xs={r.prereq.split("\n").filter(Boolean).map((s) => s.replace(/^•\s*/, ""))} />
                        {!isUda && <OvList t="Fasi e tempi" xs={r.fasi.split("\n").filter(Boolean)} />}
                        <OvTags t="Metodologie" xs={r.metodologie} />
                        <OvTags t="Strumenti e spazi" xs={r.strumenti} />
                        <OvTags t="Materiali e supporti" xs={r.materiali} />
                        <OvTags t="Educazione civica" xs={r.educiv} />
                        <OvTags t="Raccordi" xs={r.raccordi} />
                        <OvList t="Compiti ed esercizi" xs={r.compiti} />
                        <OvList t="📅 Compiti da calendarizzare" xs={r.compitiCal} />
                        <OvList t="Inclusione (misure)" xs={r.inclusione} />
                        <OvTags t="Verifica" xs={[r.verificaF, verificaSessId ? "Sommativa pianificata" : ""].filter(Boolean)} />
                      </div>
                    </div>

                    <div className="pl-actions">
                      <button onClick={esportaWord}>📄 Esporta Word</button>
                      <button className="primary pl-convalida" onClick={salva}>✓ Convalida e inserisci nel Cruscotto</button>
                      {msg && <span className="pl-msg">{msg} <button className="link" onClick={() => onView({ kind: "calendar" })}>calendario →</button> <button className="link" onClick={() => onView({ kind: "archivio" })}>archivio →</button></span>}
                    </div>
                  </>
                )}

                <div className="pl-nav">
                  <button className="ghost" disabled={idx === 0} onClick={() => setStepIdx(idx - 1)}>← Indietro</button>
                  <span className="pl-nav-prog">Passo {idx + 1} di {stepDefs.length}</span>
                  {idx < stepDefs.length - 1 ? <button className="primary" onClick={() => setStepIdx(idx + 1)}>Avanti →</button> : <span className="pl-nav-end" />}
                </div>
              </Step>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function OvList({ t, xs }: { t: string; xs: string[] }) {
  return (
    <div className="pl-ov-block">
      <div className="pl-ov-t">{t} {xs.length > 0 && <small>{xs.length}</small>}</div>
      {xs.length === 0 ? <p className="muted">—</p> : <ul className="pl-ov-ul">{xs.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </div>
  );
}
function OvTags({ t, xs }: { t: string; xs: string[] }) {
  return (
    <div className="pl-ov-block">
      <div className="pl-ov-t">{t} {xs.length > 0 && <small>{xs.length}</small>}</div>
      {xs.length === 0 ? <p className="muted">—</p> : <div className="pl-ov-tags">{xs.map((x, i) => <span key={i} className="chip">{x}</span>)}</div>}
    </div>
  );
}
