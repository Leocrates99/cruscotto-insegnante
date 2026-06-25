import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { View } from "../App";
import type { DbKey } from "@model";
import { schemaByKey } from "@model";
import { newId, records, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { classiAttive, contiClasse, materieAttive, materieClasseEffettive, scuoleCorrenti, useProfile } from "../store/profile";
import { annoCorrenteId, classeId } from "../store/links";
import { bloomLabel, materieIndirizzo, useTassonomia } from "../data/tassonomia";
import { antenati, arrangiamenti as repArrangiamenti, espandiArrangiamento, materiaCodice, materiali as repMateriali, metodologie as repMetodologie, misureInclusione as repInclusione, perPeso, prerequisitiDiVoce, useArchivio, valutazioni as repValutazioni, voce, type Metodologia, type PrereqRisolto, type Voce } from "../data/archivio";
import { DESCR_COMPITI, DESCR_EDCIVICA, DESCR_METODOLOGIE, DESCR_STRUMENTI, ICON_COMPITI, ICON_EDCIVICA, ICON_METODOLOGIE, ICON_STRUMENTI } from "../data/glossario";
import { downloadWord } from "../store/reportFineAnno";
import { AlberoConoscenze } from "./AlberoConoscenze";
import { VerificaForm } from "./VerificaForm";
import { classeColor, materiaColor, materiaSigla } from "./materia";

const oggi = () => new Date().toISOString().slice(0, 10);
type Tipo = "lezione" | "laboratorio" | "uda";
type CompitoRow = { id: string; tipo: string; testo: string; data: string };
type FaseRow = { id: string; nome: string; minuti: number; metodi: string[] };
type StepKey = "conoscenze" | "abilita" | "metodologie" | "strumenti" | "edciv" | "raccordi" | "compiti" | "dettagli";
const FASI_DEFAULT = ["Apertura", "Sviluppo", "Esercitazione", "Sintesi e verifica"];
const FASE_COLORS = ["#1800ac", "#2f7d5a", "#b9791f", "#a22e37", "#7c3aed", "#0891b2", "#be185d", "#4d7c0f"];

const COMPITO_TIPI = ["esercizio in classe", "esercitazione guidata", "compito per casa", "verifica formativa"];
const MAT_TIPI = ["esercizio", "scheda", "traccia", "versione", "presentazione", "mappa concettuale"];
const CONO = new Set(["conoscenza", "contenuto"]);
const ROM: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

const MINOR = new Set(["di", "e", "a", "da", "in", "con", "su", "per", "tra", "fra", "la", "il", "lo", "le", "i", "gli", "un", "una", "del", "della", "dei", "delle", "al", "alla", "allo", "dello", "ed", "o"]);
const cap = (s: string): string => s.split(" ").map((w, i) => (!w ? w : i > 0 && MINOR.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
const annoDaClasse = (l: string): number => { const m = l.trim().match(/^(III|II|IV|V|I)\b/i); return m ? ROM[m[0].toUpperCase()] ?? 0 : 0; };
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
function DCard({ icon, top, title, desc, on, onClick }: { icon?: ReactNode; top?: ReactNode; title: string; desc?: string; on?: boolean; onClick: () => void }) {
  return (
    <button className={on ? "pl-dcard on" : "pl-dcard"} onClick={onClick}>
      {on !== undefined && <span className="pl-dcard-check">{on ? "✓" : "+"}</span>}
      {top && <span className="pl-dcard-top">{top}</span>}
      <span className="pl-dcard-h">{icon && <span className="pl-dcard-ico">{icon}</span>}<span className="pl-dcard-t">{title}</span></span>
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
    setFasiRows([]); setMetodologie([]); setStrumenti([]); setEduciv([]); setEdcivSkip(false); setRaccordi([]); setInclusione(""); setVerificaF("");
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
  const setFase = (id: string, patch: Partial<FaseRow>) => setFasiRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeFase = (id: string) => setFasiRows((r) => r.filter((x) => x.id !== id));
  const struttFasi = () => {
    const tot = minPrev || 60;
    const quote = [0.15, 0.4, 0.3, 0.15];
    const mins = quote.map((q) => Math.round(tot * q));
    mins[3] = tot - (mins[0] + mins[1] + mins[2]);
    setFasiRows(FASI_DEFAULT.map((nome, i) => ({ id: newId(), nome, minuti: mins[i], metodi: i === 1 ? metodologie.slice(0, 2) : [] })));
  };
  const fasiText = (): string => fasiRows.filter((f) => f.nome.trim() || f.minuti).map((f) => `${f.nome.trim() || "Fase"} (${f.minuti || 0}')${f.metodi.length ? ` · ${f.metodi.map(cap).join(", ")}` : ""}`).join("\n");

  // ── Repertori del lesson-builder (data-driven dall'archivio) ───────────────
  const metRep: Metodologia[] = arch && code ? repMetodologie(arch) : [];
  const metByGruppo = useMemo(() => { const g: Record<string, Metodologia[]> = {}; for (const m of metRep) (g[m.gruppo] ??= []).push(m); return g; }, [metRep]);
  const metNomi = metRep.length ? metRep.map((m) => m.nome) : METODOLOGIE;
  const arrRep = arch && code ? repArrangiamenti(arch) : [];
  const applicaArrangiamento = (arrId: string) => {
    if (!arch) return;
    const tl = espandiArrangiamento(arch, arrId, minPrev || 60);
    setFasiRows(tl.fasi.map((ft) => ({ id: newId(), nome: ft.fase.fase, minuti: ft.minuti, metodi: ft.metodologie.slice(0, 2).map((m) => m.nome) })));
  };
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
      upsert("uda", {
        ...didattica, id: newId(), Titolo: tit, "Competenza attesa": competenza, "Prodotto atteso": prodotto, "Compito di realtà": compitoRealta,
        Ciclo: ciclo, Stato: "Calendarizzata", "Data inizio": data, "Data fine": dataFine, Obiettivi: obIds,
        ...(lezIds.length ? { Lezioni: lezIds } : {}), ...(matSel.length ? { Materiali: matSel } : {}),
      } as Rec);
      setMsg(`✓ UdA salvata in archivio${lezIds.length ? ` e ${lezIds.length} lezioni calendarizzate` : ""}: ${tit}`);
    } else {
      upsert("lezioni", {
        ...didattica, id: newId(),
        Titolo: tipo === "laboratorio" ? `[Laboratorio] ${tit}` : tit,
        Materia: materia, "Data prevista": data, "Durata (ore)": durata, Stato: "Calendarizzata",
        "Obiettivi della lezione": selVoci.map((v) => `• ${v.testo}`).join("\n"),
        Fasi: fasiText(), "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}), ...(matSel.length ? { Materiali: matSel } : {}),
      } as Rec);
      setMsg(`✓ ${tipoLabel} salvata in archivio e calendarizzata: ${tit}`);
    }
    resetTutto();
  };

  // ── Sequenza degli step disponibili ──────────────────────────────────────────
  function stepDefsDi() {
    const defs: { key: StepKey; titolo: string; hint: string }[] = [
      { key: "conoscenze", titolo: "Conoscenze e contenuti", hint: "Espandi i rami e flagga: scegliendo una voce si flaggano da sole le categorie superiori." },
      ...(code && haAbilitaComp ? [{ key: "abilita" as StepKey, titolo: "Abilità e competenze", hint: "Stessa consultazione: ciò che si sa fare e l'agire competente." }] : []),
      { key: "metodologie", titolo: "Metodologie", hint: "Come si conduce: scegli i metodi didattici." },
      { key: "strumenti", titolo: "Strumenti e spazi", hint: "Con cosa e dove si svolge l'attività." },
      { key: "edciv", titolo: "Educazione civica", hint: "Ampliamento facoltativo: usa «Nessun apporto» per una lezione standard." },
      ...(raccordiOpts.length ? [{ key: "raccordi" as StepKey, titolo: "Raccordi interdisciplinari", hint: indir ? "Le materie dell'indirizzo con cui dialoga." : "Le altre materie con cui dialoga." }] : []),
      { key: "compiti", titolo: "Compiti ed esercizi", hint: "Scegli il tipo e imposta una data per calendarizzare il compito." },
      { key: "dettagli", titolo: "Panoramica & salvataggio", hint: "Rivedi tutto, esporta in Word, poi salva in archivio e calendarizza." },
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
                  : stepDefs[idx].key === "metodologie" ? (metodologie.length || "") + "" : stepDefs[idx].key === "strumenti" ? (strumenti.length || "") + ""
                  : stepDefs[idx].key === "edciv" ? (edcivSkip ? "✓" : (educiv.length || "") + "") : stepDefs[idx].key === "raccordi" ? (raccordi.length || "") + ""
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
                        <div className="pl-dgrid">{ms.map((m) => <DCard key={m.id} icon={ICON_METODOLOGIE[m.nome.toLowerCase()] ?? "🎓"} title={m.nome} desc={m.aggancio_classico} on={metodologie.includes(m.nome)} onClick={() => setMetodologie(toggleIn(metodologie, m.nome))} />)}</div>
                      </div>))}</div>
                  : <DrillCards opts={METODOLOGIE} val={metodologie} onToggle={(m) => setMetodologie(toggleIn(metodologie, m))} desc={(o) => DESCR_METODOLOGIE[o]} icon={(o) => ICON_METODOLOGIE[o]} />)}
                {stepDefs[idx].key === "strumenti" && <DrillCards opts={STRUMENTI} val={strumenti} onToggle={(m) => setStrumenti(toggleIn(strumenti, m))} desc={(o) => DESCR_STRUMENTI[o]} icon={(o) => ICON_STRUMENTI[o]} />}
                {stepDefs[idx].key === "edciv" && (
                  <div className="pl-dgrid">
                    <DCard icon="🚫" title="Nessun apporto" desc="Lezione standard: non si considera l'Educazione civica." on={edcivSkip} onClick={() => { setEdcivSkip((s) => !s); setEduciv([]); }} />
                    {EDCIVICA.map((o) => <DCard key={o} icon={ICON_EDCIVICA[o]} title={cap(o)} desc={DESCR_EDCIVICA[o]} on={educiv.includes(o)} onClick={() => { setEduciv(toggleIn(educiv, o)); setEdcivSkip(false); }} />)}
                  </div>
                )}
                {stepDefs[idx].key === "raccordi" && <DrillCards opts={raccordiOpts} val={raccordi} onToggle={(m) => setRaccordi(toggleIn(raccordi, m))} desc={(o) => `Aggancio interdisciplinare con ${o}.`} icon={(o) => <span className="pl-sigla mini" style={{ background: materiaColor(o) ?? "var(--ink-muted)" }}>{materiaSigla(o)}</span>} />}

                {stepDefs[idx].key === "compiti" && (
                  <>
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
                    {compitiDaCal.length > 0 && <p className="muted pl-hint">📅 {compitiDaCal.length === 1 ? "1 compito con data: sarà calendarizzato" : `${compitiDaCal.length} compiti con data: saranno calendarizzati`} al salvataggio (conferma nella panoramica).</p>}
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

                    <div className="field"><span>Prerequisiti <em>· regola di prossimità (orizzonte circoscritto)</em> {(prereqAgg.daAccertare.length + prereqAgg.consolidate.length > 0) && <button className="link" onClick={inserisciPrereq}>inserisci nel testo ↓</button>}</span>
                      {(prereqAgg.daAccertare.length + prereqAgg.consolidate.length + prereqAgg.contesto.length > 0) && (
                        <div className="pl-prereq">
                          {prereqAgg.daAccertare.length > 0 && <div className="pl-prereq-grp"><b>Da accertare</b>{prereqAgg.daAccertare.map((r) => <span key={r.regola.id} className={r.regola.obbligatorio ? "chip oblig" : "chip"} title={r.regola.nota || r.regola.tipo}>{r.etichetta}{r.regola.obbligatorio ? " · micro-verifica" : ""}</span>)}</div>}
                          {prereqAgg.consolidate.length > 0 && <div className="pl-prereq-grp"><b>Consolidate</b>{prereqAgg.consolidate.map((r) => <span key={r.regola.id} className="chip ok" title={`orizzonte: ${r.regola.orizzonte}`}>{r.etichetta}</span>)}</div>}
                          {prereqAgg.contesto.length > 0 && <div className="pl-prereq-grp"><b>Contesto</b>{prereqAgg.contesto.map((v) => <span key={v.id} className="chip ctx">{v.testo}</span>)}</div>}
                        </div>
                      )}
                      <textarea rows={2} value={prereq} onChange={(e) => setPrereq(e.target.value)} placeholder="Cosa serve sapere/saper fare prima…" />
                    </div>
                    {!isUda && (
                      <div className="field"><span>Fasi e tempi della lezione</span>
                        <div className="pl-fasi">
                          <div className="pl-fasi-head">
                            <span>Tempo lezione <b>{minPrev}′</b></span>
                            <span>· assegnato <b>{fasiMinTot}′</b></span>
                            <span className={minRim < 0 ? "pl-fasi-over" : "pl-fasi-ok"}>{minRim >= 0 ? `${minRim}′ ancora liberi` : `${-minRim}′ in eccesso`}</span>
                            <span className="spacer" />
                            {arrRep.length > 0 && <select className="pl-arr-sel" value="" onChange={(e) => { if (e.target.value) applicaArrangiamento(e.target.value); }}><option value="">↳ preset timeline…</option>{arrRep.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>}
                            <button className="link" onClick={struttFasi}>struttura tipo</button>
                            <button className="link" onClick={addFase}>+ fase</button>
                          </div>
                          {fasiRows.length === 0 ? <p className="muted">Aggiungi le fasi: per ciascuna durata e metodi; la barra colorata a sinistra la identifica.</p> : (
                            <div className="pl-fasi-list">
                              {fasiRows.map((f, i) => (
                                <div key={f.id} className="pl-fase" style={{ borderLeftColor: FASE_COLORS[i % FASE_COLORS.length] }}>
                                  <div className="pl-fase-main">
                                    <input className="pl-fase-nome" type="text" value={f.nome} placeholder={`Fase ${i + 1}`} onChange={(e) => setFase(f.id, { nome: e.target.value })} />
                                    <span className="pl-fase-dur"><input type="number" min={0} step={5} value={f.minuti} onChange={(e) => setFase(f.id, { minuti: Number(e.target.value) })} />′</span>
                                    <button className="danger" onClick={() => removeFase(f.id)} aria-label="Rimuovi">✕</button>
                                  </div>
                                  <div className="pl-fase-metodi">{metNomi.map((m) => <button key={m} className={f.metodi.includes(m) ? "pl-mbtn xs on" : "pl-mbtn xs"} onClick={() => setFase(f.id, { metodi: toggleIn(f.metodi, m) })}>{cap(m)}</button>)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pl-rifinitura">
                      <div className="pl-sub">Rifinitura testuale {selVoci.length > 0 && <button className="link" onClick={componi}>componi dai flag ↓</button>}</div>
                      <div className="pl-triade">
                        <label className="field"><span>Conoscenze</span><textarea rows={3} value={conoscenze} onChange={(e) => setConoscenze(e.target.value)} placeholder={derivato("con", "") || "Contenuti…"} /></label>
                        <label className="field"><span>Abilità</span><textarea rows={3} value={abilita} onChange={(e) => setAbilita(e.target.value)} placeholder={derivato("ab", "") || "Saper fare…"} /></label>
                        <label className="field"><span>Competenze</span><textarea rows={3} value={competenzeTxt} onChange={(e) => setCompetenzeTxt(e.target.value)} placeholder={derivato("com", "") || "Agire competente…"} /></label>
                      </div>
                    </div>

                    <div className="field"><span>Materiali{matRep.length ? <em> · dall'archivio</em> : null}</span>
                      <div className="pl-mat">
                        {matRep.length > 0 && <div className="pl-menu pl-incl-menu">{matRep.slice(0, 16).map((m) => <button key={m.id} className="pl-mbtn xs" title={`${m.categoria} · ${m.supporto} — ${m.descrizione}`} onClick={() => creaDaCatalogo(m)}>+ {m.tipo}</button>)}</div>}
                        {materialiDisp.length > 0 && (
                          <div className="pl-menu">{materialiDisp.map((m) => <button key={m.id} className={matSel.includes(m.id) ? "pl-mbtn on" : "pl-mbtn"} onClick={() => setMatSel((a) => toggleIn(a, m.id))}><span className="pl-mb-tick">{matSel.includes(m.id) ? "✓" : "+"}</span>{String(m["Titolo"] ?? "—")}</button>)}</div>
                        )}
                        <div className="pl-mat-add">
                          <input type="text" value={nuovoMat.titolo} placeholder="Nuovo materiale (titolo)…" onChange={(e) => setNuovoMat((s) => ({ ...s, titolo: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") creaMateriale(); }} />
                          <select value={nuovoMat.tipo} onChange={(e) => setNuovoMat((s) => ({ ...s, tipo: e.target.value }))}>{MAT_TIPI.map((t) => <option key={t} value={t}>{cap(t)}</option>)}</select>
                          <button onClick={creaMateriale}>+ Crea e collega</button>
                        </div>
                      </div>
                    </div>

                    <div className="field"><span>Inclusione (misure) <button className="link" onClick={suggInclusione}>💡 dall'anagrafica</button></span>
                      {(() => {
                        const c = classe ? contiClasse(classe, profile) : { tot: 0, l104: 0, bes: 0, dsa: 0 };
                        const need = c.l104 + c.bes + c.dsa;
                        if (need > 0) return <div className="pl-remind warn">⚠️ In <b>{classe}</b> ci sono alunni con differenziazioni: {[c.dsa ? `${c.dsa} DSA` : "", c.bes ? `${c.bes} BES` : "", c.l104 ? `${c.l104} con L.104` : ""].filter(Boolean).join(", ")}. Prevedi le misure (anagrafica nel <b>Profilo</b>).</div>;
                        if (classe) return <div className="pl-remind ok">✓ {classe}: nessun alunno con BES/DSA/L.104 in anagrafica.</div>;
                        return null;
                      })()}
                      {inclRep.length > 0 && <div className="pl-menu pl-incl-menu">{inclRep.slice(0, 14).map((m) => <button key={m.id} className="pl-mbtn xs" title={`${m.ambito} · ${m.categoria} — ${m.descrizione}`} onClick={() => setInclusione((t) => [...new Set([...t.split("\n").filter(Boolean), `• [${m.ambito}/${m.categoria}] ${m.misura}`])].join("\n"))}>+ {m.misura}</button>)}</div>}
                      <textarea rows={2} value={inclusione} onChange={(e) => setInclusione(e.target.value)} placeholder="Misure compensative/dispensative (modello anonimo, per situazione)…" />
                    </div>

                    <div className="pl-triade">
                      <label className="field"><span>Verifica formativa <em>· in itinere{verRep.length ? ", dall'archivio" : ""}</em></span>
                        <select value={verificaF} onChange={(e) => setVerificaF(e.target.value)}>
                          <option value="">—</option>
                          {verOptions.map((v) => <option key={v} value={v}>{cap(v)}</option>)}
                        </select>
                      </label>
                      <div className="field"><span>Verifica sommativa <em>· dialoga col calcolatore</em></span>
                        {verificaSessId
                          ? <div className="pl-remind ok">✓ Verifica pianificata e messa in calendario. <button className="link" onClick={() => onView({ kind: "valutazione", sessioneId: verificaSessId })}>apri la correzione →</button></div>
                          : <div className="pl-verifica"><button onClick={() => setShowVerifica(true)}>📝 Pianifica verifica da zero…</button><p className="muted pl-hint">Definisci la prova (struttura mista), va in calendario e si apre poi per la correzione.</p></div>}
                      </div>
                    </div>

                    {/* Panoramica */}
                    <div className="pl-overview">
                      <div className="pl-ov-head"><h3>{r.titolo}</h3><span className="pl-ov-sub">{[r.tipoLabel, r.materia, r.classe, r.scuola].filter(Boolean).join(" · ")} · {r.quando}</span></div>
                      <div className="pl-ov-grid">
                        <OvList t="Conoscenze e contenuti" xs={r.conoscenze} />
                        <OvList t="Abilità" xs={r.abilita} />
                        <OvList t="Competenze" xs={r.competenze} />
                        <OvTags t="Metodologie" xs={r.metodologie} />
                        <OvTags t="Strumenti e spazi" xs={r.strumenti} />
                        <OvTags t="Educazione civica" xs={r.educiv} />
                        <OvTags t="Raccordi" xs={r.raccordi} />
                        <OvList t="Compiti ed esercizi" xs={r.compiti} />
                        <OvList t="📅 Compiti da calendarizzare" xs={r.compitiCal} />
                      </div>
                    </div>

                    <div className="pl-actions">
                      <button onClick={esportaWord}>📄 Esporta Word</button>
                      <button className="primary" onClick={salva}>💾 Salva &amp; calendarizza</button>
                      {msg && <span className="pl-msg">{msg} <button className="link" onClick={() => onView({ kind: "calendar" })}>calendario →</button> <button className="link" onClick={() => onView({ kind: "archivio" })}>archivio →</button></span>}
                    </div>

                    {showVerifica && <VerificaForm prefill={{ classe, data, materia, titolo: titoloEff }} onClose={() => setShowVerifica(false)} onOpen={(id) => { setVerificaSessId(id); setShowVerifica(false); }} />}
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
