import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { View } from "../App";
import type { DbKey } from "@model";
import { schemaByKey } from "@model";
import { newId, records, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { classiAttive, contiClasse, materieAttive, materieClasseEffettive, scuoleCorrenti, useProfile } from "../store/profile";
import { annoCorrenteId, classeId } from "../store/links";
import { bloomLabel, materieIndirizzo, useTassonomia } from "../data/tassonomia";
import { agenda2030, antenati, arrangiamenti as repArrangiamenti, espandiArrangiamento, faseById, fasi as repFasi, materiaCodice, materiali as repMateriali, metodologie as repMetodologie, metodologieDiFase, misureInclusione as repInclusione, perPeso, prerequisitiDiVoce, useArchivio, valutazioni as repValutazioni, voce, type Metodologia, type PrereqRisolto, type Voce } from "../data/archivio";
import { DESCR_COMPITI, DESCR_EDCIVICA, DESCR_METODOLOGIE, DESCR_STRUMENTI, ICON_COMPITI, ICON_EDCIVICA, ICON_INC_AMBITO, ICON_INCLUSIONE, ICON_MATERIALI, ICON_METODOLOGIE, ICON_STRUMENTI } from "../data/glossario";
import { downloadWord } from "../store/reportFineAnno";
import { getSessione, upsertSessione } from "../store/valutazione";
import { AlberoConoscenze } from "./AlberoConoscenze";
import { VerificaForm } from "./VerificaForm";
import { classeColor, materiaColor, materiaSigla } from "./materia";

const oggi = () => new Date().toISOString().slice(0, 10);
type Tipo = "lezione" | "laboratorio" | "uda";
type CompitoRow = { id: string; tipo: string; testo: string; data: string };
type FaseRow = { id: string; nome: string; minuti: number; metodi: string[]; funzione?: string; centratura?: string };
type StepKey = "conoscenze" | "abilita" | "prerequisiti" | "metodologie" | "strumenti" | "fasi" | "edciv" | "raccordi" | "materiali" | "inclusione" | "compiti" | "dettagli";
const FASI_DEFAULT = ["Apertura", "Sviluppo", "Esercitazione", "Sintesi e verifica"];
const FASE_COLORS = ["#1800ac", "#2f7d5a", "#b9791f", "#a22e37", "#7c3aed", "#0891b2", "#be185d", "#4d7c0f"];

const COMPITO_TIPI = ["esercizio in classe", "esercitazione guidata", "compito per casa", "verifica formativa"];
const MAT_TIPI = ["esercizio", "scheda", "traccia", "versione", "presentazione", "mappa concettuale"];
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
  const [nucleo, setNucleo] = useState("");
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
  const [oraInizio, setOraInizio] = useState("08:00");
  const [faseMetodi, setFaseMetodi] = useState<string | null>(null);
  const [faseEvidenzia, setFaseEvidenzia] = useState<string | null>(null);
  const dragFase = useRef<number | null>(null);
  const [metodologie, setMetodologie] = useState<string[]>([]);
  const [strumenti, setStrumenti] = useState<string[]>([]);
  const [educiv, setEduciv] = useState<string[]>([]);
  const [edcivSkip, setEdcivSkip] = useState(false);
  const [raccordi, setRaccordi] = useState<string[]>([]);
  const [inclusione, setInclusione] = useState("");
  const [verificaF, setVerificaF] = useState("");
  const [compiti, setCompiti] = useState<CompitoRow[]>([]);
  const [matSel, setMatSel] = useState<string[]>([]);
  const [nuovoMat, setNuovoMat] = useState<{ titolo: string; tipo: string }>({ titolo: "", tipo: "esercizio" });
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
  const nucleiPl = useMemo(() => [...new Set(vMatPl.map((v) => v.nucleo).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [vMatPl]);
  const haAbilitaComp = vMatPl.some((v) => v.blocco === "abilita" || v.blocco === "competenza");
  const radici = vMatPl.filter((v) => CONO.has(v.blocco) && !v.parent && (!nucleo || v.nucleo === nucleo)).sort(perPeso);
  const abilitaV = vMatPl.filter((v) => v.blocco === "abilita").sort(perPeso);
  const competenzeV = vMatPl.filter((v) => v.blocco === "competenza").sort(perPeso);

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
    setSelIds(new Set()); setNucleo(""); setStepIdx(0); setTitolo(""); setPrereq(""); setConoscenze(""); setAbilita(""); setCompetenzeTxt("");
    setFasiRows([]); setFaseMetodi(null); setMetodologie([]); setStrumenti([]); setEduciv([]); setEdcivSkip(false); setRaccordi([]); setInclusione(""); setVerificaF("");
    setCompiti([]); setMatSel([]); setCompetenza(""); setProdotto(""); setCompitoRealta(""); setNLezioni(0);
    setShowVerifica(false); setVerificaSessId(null);
  };
  const cambiaMateria = (m: string) => { setMateria(m); setNucleo(""); setSelIds(new Set()); setStepIdx(0); };
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
  const minPrev = Math.round((durata || 0) * 60);
  const fasiMinTot = fasiRows.reduce((a, b) => a + (Number(b.minuti) || 0), 0);
  const minRim = minPrev - fasiMinTot;
  const addFase = () => setFasiRows((r) => [...r, { id: newId(), nome: FASI_DEFAULT[r.length] ?? `Fase ${r.length + 1}`, minuti: 0, metodi: [] }]);
  const addFaseCatalogo = (fid: string) => {
    if (!arch) return;
    const f = faseById(arch, fid); if (!f) return;
    const min = f.perc_monte ? Math.round((minPrev || 60) * f.perc_monte / 100) : (f.dur_min_60 ?? 10);
    setFasiRows((r) => [...r, { id: newId(), nome: f.fase, minuti: min, funzione: f.funzione, centratura: f.centratura, metodi: metodologieDiFase(arch, fid).slice(0, 2).map((m) => m.nome) }]);
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
  // Orari reali delle fasi, calcolati dall'ora di inizio + minuti cumulati.
  const parseOra = (s: string): number => { const [h, m] = s.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const fmtOra = (min: number): string => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(((min % 60) + 60) % 60).padStart(2, "0")}`;
  const inizioFase = (i: number): number => parseOra(oraInizio) + fasiRows.slice(0, i).reduce((a, b) => a + (Number(b.minuti) || 0), 0);
  const fasiText = (): string => fasiRows.filter((f) => f.nome.trim() || f.minuti).map((f) => {
    const i = fasiRows.indexOf(f); const s = inizioFase(i);
    return `${f.nome.trim() || "Fase"} (${f.minuti || 0}', ${fmtOra(s)}–${fmtOra(s + (f.minuti || 0))})${f.metodi.length ? ` · ${f.metodi.map(cap).join(", ")}` : ""}`;
  }).join("\n");

  // ── Repertori del lesson-builder (data-driven dall'archivio) ───────────────
  const metRep: Metodologia[] = arch && code ? repMetodologie(arch) : [];
  const metByGruppo = useMemo(() => { const g: Record<string, Metodologia[]> = {}; for (const m of metRep) (g[m.gruppo] ??= []).push(m); return g; }, [metRep]);
  const metNomi = metRep.length ? metRep.map((m) => m.nome) : METODOLOGIE;
  const arrRep = arch && code ? repArrangiamenti(arch) : [];
  const applicaArrangiamento = (arrId: string) => {
    if (!arch) return;
    const tl = espandiArrangiamento(arch, arrId, minPrev || 60);
    setFasiRows(tl.fasi.map((ft) => ({ id: newId(), nome: ft.fase.fase, minuti: ft.minuti, funzione: ft.fase.funzione, centratura: ft.fase.centratura, metodi: ft.metodologie.slice(0, 2).map((m) => m.nome) })));
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
  const suggInclusione = () => {
    const c = classe ? contiClasse(classe, profile) : { tot: 0, l104: 0, bes: 0, dsa: 0 };
    const parts: string[] = [];
    if (c.dsa) parts.push(`${c.dsa} DSA`);
    if (c.bes) parts.push(`${c.bes} BES`);
    if (c.l104) parts.push(`${c.l104} con L.104`);
    setInclusione(parts.length
      ? `Per ${parts.join(", ")}: misure compensative (mappe, schemi, formulari, dizionario digitale, tempi aggiuntivi) e dispensative (riduzione del carico); per la L.104 secondo PEI.`
      : "Nessun alunno con BES/DSA/L.104 segnalato in anagrafica: si adottano comunque strategie inclusive di classe.");
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

  const materialiDisp = records("materiali").filter((m) => !materia || !m["Materia"] || m["Materia"] === materia);
  const creaDaCatalogo = (m: { tipo: string; categoria: string }) => {
    const id = newId();
    upsert("materiali", { id, Titolo: m.tipo, Tipo: m.categoria, Materia: materia, Ciclo: ciclo } as Rec);
    setMatSel((s) => [...s, id]);
  };
  const creaMateriale = () => {
    const t = nuovoMat.titolo.trim();
    if (!t) return;
    const id = newId();
    upsert("materiali", { id, Titolo: t, Tipo: nuovoMat.tipo, Materia: materia, Ciclo: ciclo } as Rec);
    setMatSel((s) => [...s, id]);
    setNuovoMat({ titolo: "", tipo: nuovoMat.tipo });
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
    metodologie: metodologie.map(cap), strumenti: strumenti.map(cap), educiv: educivView, raccordi,
    compiti: compiti.filter((c) => c.testo.trim()).map((c) => `[${cap(c.tipo)}] ${c.testo.trim()}${c.data ? ` (entro ${fmtIt(c.data)})` : ""}`),
    compitiCal: compitiDaCal.map((c) => `${fmtIt(c.data)} · ${cap(c.tipo)}: ${c.testo.trim()}`),
    prereq, fasi: fasiText(), inclusione, verificaF: verificaF ? cap(verificaF) : "", competenza, prodotto, compitoRealta,
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
      sec("Educazione civica", r.educiv),
      sec("Raccordi interdisciplinari", r.raccordi),
      sec("Compiti ed esercizi", r.compiti),
      sec("Compiti da calendarizzare", r.compitiCal),
      par("Inclusione (misure)", r.inclusione),
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
      Metodologie: metodologie, "Strumenti e spazi": strumenti, "Compiti ed esercizi": compitiText(),
      "Educazione civica": educiv, "Raccordi interdisciplinari": raccordi, "Inclusione (misure)": inclusione,
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
        ...(lezIds.length ? { Lezioni: lezIds } : {}), ...(matSel.length ? { Materiali: matSel } : {}),
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
        Fasi: fasiText(), "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}), ...(matSel.length ? { Materiali: matSel } : {}),
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
      ...(!isUda ? [{ key: "fasi" as StepKey, titolo: "Fasi e tempi", hint: "La timeline della lezione: preset, durate scalate sul monte ore, metodi per fase." }] : []),
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
                  : stepDefs[idx].key === "materiali" ? ((strumenti.length + matSel.length) || "") + "" : stepDefs[idx].key === "inclusione" ? (inclusione.trim() ? "✓" : "")
                  : stepDefs[idx].key === "compiti" ? (compiti.length || "") + "" : undefined}>

                {stepDefs[idx].key === "conoscenze" && (code
                  ? <>
                      {nucleiPl.length > 0 && (
                        <div className="pl-menu">
                          <button className={!nucleo ? "pl-mbtn on" : "pl-mbtn"} onClick={() => setNucleo("")}>Tutti i settori</button>
                          {nucleiPl.map((n) => <button key={n} className={nucleo === n ? "pl-mbtn on" : "pl-mbtn"} onClick={() => setNucleo(n)}>{n}</button>)}
                        </div>
                      )}
                      <AlberoConoscenze a={arch!} radici={radici} selez={selIds} onToggle={toggleAlbero} />
                    </>
                  : <p className="muted">Per <b>{materia}</b> non c'è ancora un archivio: i contenuti si scrivono nello step finale.</p>
                )}

                {stepDefs[idx].key === "abilita" && (
                  <div className="pl-ac">
                    <div className="pl-ac-col">
                      <div className="pl-sub">Abilità <small>{abilitaV.length}</small></div>
                      <AlberoConoscenze a={arch!} radici={abilitaV} selez={selIds} onToggle={toggleVoce} />
                    </div>
                    <div className="pl-ac-col">
                      <div className="pl-sub">Competenze <small>{competenzeV.length}</small></div>
                      <AlberoConoscenze a={arch!} radici={competenzeV} selez={selIds} onToggle={toggleVoce} />
                    </div>
                  </div>
                )}

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
                    <div className="pl-fasi-head">
                      <span>Monte ora <b>{minPrev}′</b></span>
                      <span>· assegnati <b>{fasiMinTot}′</b></span>
                      <span className={minRim < 0 ? "pl-fasi-over" : "pl-fasi-ok"}>{minRim >= 0 ? `${minRim}′ liberi` : `${-minRim}′ in eccesso`}</span>
                      <span className="spacer" />
                      <label className="pl-fasi-ora">inizio <input type="time" value={oraInizio} onChange={(e) => setOraInizio(e.target.value)} /></label>
                      {arrRep.length > 0 && <select className="pl-arr-sel" value="" onChange={(e) => { if (e.target.value) applicaArrangiamento(e.target.value); }}><option value="">↳ preset timeline…</option>{arrRep.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>}
                      <button className="link" onClick={struttFasi}>struttura tipo</button>
                      {arch && repFasi(arch).length > 0
                        ? <select className="pl-arr-sel" value="" onChange={(e) => { if (e.target.value === "__v") addFase(); else if (e.target.value) addFaseCatalogo(e.target.value); }}><option value="">+ fase…</option>{repFasi(arch).map((f) => <option key={f.id} value={f.id}>{f.fase}</option>)}<option value="__v">— fase vuota</option></select>
                        : <button className="link" onClick={addFase}>+ fase</button>}
                    </div>

                    {fasiRows.length > 0 && (
                      <div className="pl-binario" role="img" aria-label={`Ripartizione del tempo: ${fasiRows.map((f) => `${f.nome} ${f.minuti}′`).join(", ")}`}>
                        {fasiRows.map((f, i) => <div key={f.id} className="pl-bin-seg" onClick={() => vaiAFase(f.id)} style={{ flexGrow: Math.max(f.minuti || 0, 0.001), background: FASE_COLORS[i % FASE_COLORS.length] }} title={`${f.nome || `Fase ${i + 1}`} · ${f.minuti || 0}′ — clic per la riga`}>{(f.minuti || 0) >= 8 ? `${f.minuti}′` : ""}</div>)}
                        {minRim < 0 && <div className="pl-bin-over" style={{ flexGrow: -minRim }} title={`${-minRim}′ in eccesso`} />}
                      </div>
                    )}

                    {fasiRows.length === 0 ? <p className="muted">Scegli un preset «timeline» dall'archivio o aggiungi le fasi a mano: per ciascuna durata, orario e metodi.</p> : (
                      <div className="pl-fasi-list">
                        {fasiRows.map((f, i) => { const s = inizioFase(i); const col = FASE_COLORS[i % FASE_COLORS.length]; return (
                          <div key={f.id} id={`pl-fase-${f.id}`} className={faseEvidenzia === f.id ? "pl-fase evidenzia" : "pl-fase"} style={{ borderLeftColor: col }} onDragOver={(e) => e.preventDefault()} onDrop={() => { const from = dragFase.current; if (from != null) spostaFase(from, i); dragFase.current = null; }}>
                            <div className="pl-fase-main">
                              <span className="pl-fase-n" draggable onDragStart={() => { dragFase.current = i; }} onDragEnd={() => { dragFase.current = null; }} title="Trascina per riordinare" style={{ background: col, cursor: "grab" }}>{i + 1}</span>
                              <span className="pl-fase-ora">{fmtOra(s)}–{fmtOra(s + (f.minuti || 0))}</span>
                              <input className="pl-fase-nome" type="text" value={f.nome} placeholder={`Fase ${i + 1}`} onChange={(e) => setFase(f.id, { nome: e.target.value })} />
                              <span className="pl-fase-step">
                                <button onClick={() => setFase(f.id, { minuti: Math.max(0, (f.minuti || 0) - 5) })} aria-label="Meno 5 minuti">−</button>
                                <input type="number" min={0} step={5} value={f.minuti} onChange={(e) => setFase(f.id, { minuti: Number(e.target.value) })} /><em>′</em>
                                <button onClick={() => setFase(f.id, { minuti: (f.minuti || 0) + 5 })} aria-label="Più 5 minuti">+</button>
                              </span>
                              <button className={faseMetodi === f.id ? "pl-fase-met on" : "pl-fase-met"} onClick={() => setFaseMetodi(faseMetodi === f.id ? null : f.id)}>metodi · {f.metodi.length} ▾</button>
                              <button className="danger" onClick={() => removeFase(f.id)} aria-label="Rimuovi">✕</button>
                            </div>
                            {(f.funzione || f.centratura) && <div className="pl-fase-fn">{f.centratura && <span className="pl-fase-cen">{cap(f.centratura)}</span>}{f.funzione}</div>}
                            {f.metodi.length > 0 && faseMetodi !== f.id && <div className="pl-fase-sel">{f.metodi.map((m) => cap(m)).join(" · ")}</div>}
                            {faseMetodi === f.id && <div className="pl-fase-metodi">{metNomi.map((m) => <button key={m} className={f.metodi.includes(m) ? "pl-mbtn xs on" : "pl-mbtn xs"} onClick={() => setFase(f.id, { metodi: toggleIn(f.metodi, m) })}>{cap(m)}</button>)}</div>}
                          </div>
                        ); })}
                      </div>
                    )}
                  </div>
                )}

                {stepDefs[idx].key === "materiali" && (
                  <div className="pl-mat">
                    <div className="pl-sez">🧰 Strumenti e spazi</div>
                    <DrillCards opts={STRUMENTI} val={strumenti} onToggle={(m) => setStrumenti(toggleIn(strumenti, m))} desc={(o) => DESCR_STRUMENTI[o]} icon={(o) => ICON_STRUMENTI[o]} />
                    {matRep.length > 0 && <>
                      <div className="pl-sez">📦 Materiali e supporti</div>
                      {[...new Set(matRep.map((m) => m.categoria))].map((cat) => (
                        <div key={cat}><div className="pl-sub">{ICON_MATERIALI[cat] ?? "📦"} {cap(cat)} <small>{matRep.filter((m) => m.categoria === cat).length}</small></div>
                          <div className="pl-dgrid">{matRep.filter((m) => m.categoria === cat).map((m) => <DCard key={m.id} icon={ICON_MATERIALI[m.categoria] ?? "📦"} title={m.tipo} desc={m.descrizione} onClick={() => creaDaCatalogo(m)} />)}</div>
                        </div>
                      ))}
                    </>}
                    {materialiDisp.length > 0 && <><div className="pl-sub">I tuoi materiali collegati</div><div className="pl-menu">{materialiDisp.map((m) => <button key={m.id} className={matSel.includes(m.id) ? "pl-mbtn on" : "pl-mbtn"} onClick={() => setMatSel((a) => toggleIn(a, m.id))}><span className="pl-mb-tick">{matSel.includes(m.id) ? "✓" : "+"}</span>{String(m["Titolo"] ?? "—")}</button>)}</div></>}
                    <div className="pl-mat-add">
                      <input type="text" value={nuovoMat.titolo} placeholder="Nuovo materiale (titolo)…" onChange={(e) => setNuovoMat((s) => ({ ...s, titolo: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") creaMateriale(); }} />
                      <select value={nuovoMat.tipo} onChange={(e) => setNuovoMat((s) => ({ ...s, tipo: e.target.value }))}>{MAT_TIPI.map((t) => <option key={t} value={t}>{cap(t)}</option>)}</select>
                      <button onClick={creaMateriale}>+ Crea e collega</button>
                    </div>
                  </div>
                )}

                {stepDefs[idx].key === "inclusione" && (
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
                            <div className="pl-dgrid">{inclRep.filter((m) => m.ambito === amb && m.categoria === cat).map((m) => <DCard key={m.id} icon={ICON_INCLUSIONE[m.categoria]} title={m.misura} desc={m.descrizione} onClick={() => setInclusione((t) => [...new Set([...t.split("\n").filter(Boolean), `• [${m.ambito}/${m.categoria}] ${m.misura}`])].join("\n"))} />)}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                    <label className="field"><span>Misure (testo)</span><textarea rows={3} value={inclusione} onChange={(e) => setInclusione(e.target.value)} placeholder="Misure compensative/dispensative (modello anonimo, per situazione)…" /></label>
                  </>
                )}

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
                        <OvTags t="Educazione civica" xs={r.educiv} />
                        <OvTags t="Raccordi" xs={r.raccordi} />
                        <OvList t="Compiti ed esercizi" xs={r.compiti} />
                        <OvList t="📅 Compiti da calendarizzare" xs={r.compitiCal} />
                        <OvList t="Inclusione (misure)" xs={r.inclusione.split("\n").filter(Boolean).map((s) => s.replace(/^•\s*/, ""))} />
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
