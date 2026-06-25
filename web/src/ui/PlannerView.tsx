import { useMemo, useState, type ReactNode } from "react";
import type { View } from "../App";
import type { DbKey } from "@model";
import { schemaByKey } from "@model";
import { newId, records, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { classiAttive, materieAttive, materieClasseEffettive, scuoleCorrenti, useProfile } from "../store/profile";
import { annoCorrenteId, classeId } from "../store/links";
import { bloomLabel, materieIndirizzo, useTassonomia } from "../data/tassonomia";
import { antenati, materiaCodice, perPeso, useArchivio, voce, type Voce } from "../data/archivio";
import { DESCR_COMPITI, DESCR_EDCIVICA, DESCR_METODOLOGIE, DESCR_STRUMENTI } from "../data/glossario";
import { downloadWord } from "../store/reportFineAnno";
import { AlberoConoscenze } from "./AlberoConoscenze";
import { materiaColor } from "./materia";

const oggi = () => new Date().toISOString().slice(0, 10);
type Tipo = "lezione" | "laboratorio" | "uda";
type CompitoRow = { id: string; tipo: string; testo: string };
type StepKey = "conoscenze" | "abilita" | "metodologie" | "strumenti" | "edciv" | "raccordi" | "compiti" | "dettagli";

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
function DCard({ top, title, desc, on, onClick }: { top?: ReactNode; title: string; desc?: string; on?: boolean; onClick: () => void }) {
  return (
    <button className={on ? "pl-dcard on" : "pl-dcard"} onClick={onClick}>
      {on !== undefined && <span className="pl-dcard-check">{on ? "✓" : "+"}</span>}
      {top && <span className="pl-dcard-top">{top}</span>}
      <span className="pl-dcard-t">{title}</span>
      {desc && <span className="pl-dcard-d">{desc}</span>}
    </button>
  );
}
function DrillCards({ opts, val, onToggle, desc }: { opts: string[]; val: string[]; onToggle: (v: string) => void; desc: (o: string) => string | undefined }) {
  return <div className="pl-dgrid">{opts.map((o) => <DCard key={o} title={cap(o)} desc={desc(o)} on={val.includes(o)} onClick={() => onToggle(o)} />)}</div>;
}
function FlagVoce({ v, on, onToggle }: { v: Voce; on: boolean; onToggle: (v: Voce) => void }) {
  return <button className={on ? "pl-mbtn on" : "pl-mbtn"} onClick={() => onToggle(v)} title={v.competenza_europea || v.nucleo}><span className="pl-mb-tick">{on ? "✓" : "+"}</span>{v.testo}</button>;
}

/**
 * Pianifica: wizard a finestre. Drill di contesto a card (Scuola → Materia → Classe),
 * poi step navigabili con Avanti/Indietro: conoscenze/contenuti e abilità/competenze
 * (clic sulla foglia → flag automatico degli antenati), poi i drill a card di
 * metodologie / strumenti / ed. civica / raccordi / compiti, infine panoramica +
 * export Word + salvataggio (che archivia e calendarizza la lezione).
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
  const [fasi, setFasi] = useState("");
  const [metodologie, setMetodologie] = useState<string[]>([]);
  const [strumenti, setStrumenti] = useState<string[]>([]);
  const [educiv, setEduciv] = useState<string[]>([]);
  const [raccordi, setRaccordi] = useState<string[]>([]);
  const [inclusione, setInclusione] = useState("");
  const [verificaF, setVerificaF] = useState("");
  const [compiti, setCompiti] = useState<CompitoRow[]>([]);
  const [consegna, setConsegna] = useState("");
  const [matSel, setMatSel] = useState<string[]>([]);
  const [nuovoMat, setNuovoMat] = useState<{ titolo: string; tipo: string }>({ titolo: "", tipo: "esercizio" });
  const [competenza, setCompetenza] = useState("");
  const [prodotto, setProdotto] = useState("");
  const [compitoRealta, setCompitoRealta] = useState("");
  const [nLezioni, setNLezioni] = useState(0);

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
  const abilitaV = vMatPl.filter((v) => v.blocco === "abilita" && (!nucleo || v.nucleo === nucleo)).sort(perPeso);
  const competenzeV = vMatPl.filter((v) => v.blocco === "competenza" && (!nucleo || v.nucleo === nucleo)).sort(perPeso);

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
    setFasi(""); setMetodologie([]); setStrumenti([]); setEduciv([]); setRaccordi([]); setInclusione(""); setVerificaF("");
    setCompiti([]); setConsegna(""); setMatSel([]); setCompetenza(""); setProdotto(""); setCompitoRealta(""); setNLezioni(0);
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

  const addCompito = (t: string) => setCompiti((c) => [...c, { id: newId(), tipo: t, testo: "" }]);
  const setCompito = (id: string, patch: Partial<CompitoRow>) => setCompiti((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeCompito = (id: string) => setCompiti((c) => c.filter((x) => x.id !== id));

  const materialiDisp = records("materiali").filter((m) => !materia || !m["Materia"] || m["Materia"] === materia);
  const creaMateriale = () => {
    const t = nuovoMat.titolo.trim();
    if (!t) return;
    const id = newId();
    upsert("materiali", { id, Titolo: t, Tipo: nuovoMat.tipo, Materia: materia, Ciclo: ciclo } as Rec);
    setMatSel((s) => [...s, id]);
    setNuovoMat({ titolo: "", tipo: nuovoMat.tipo });
  };
  const compitiText = () => compiti.filter((c) => c.testo.trim()).map((c) => `• [${c.tipo}] ${c.testo.trim()}`).join("\n");

  const titoloEff = titolo.trim() || `${materia}${selVoci[0] ? " — " + selVoci[0].testo : ""}`;
  const tipoLabel = isUda ? "UdA" : tipo === "laboratorio" ? "Laboratorio" : "Lezione";

  // Riepilogo strutturato (usato da panoramica e da export Word).
  const riepilogo = () => ({
    titolo: titoloEff, tipoLabel, materia, classe: isUda ? "" : classe, scuola: scuolaNome ?? "",
    quando: isUda ? `${fmtIt(data)} – ${fmtIt(dataFine)}${nLezioni ? ` · ${nLezioni} lezioni` : ""}` : `${fmtIt(data)} · ${durata} ore`,
    conoscenze: righe("con", conoscenze), abilita: righe("ab", abilita), competenze: righe("com", competenzeTxt),
    metodologie: metodologie.map(cap), strumenti: strumenti.map(cap), educiv, raccordi,
    compiti: compiti.filter((c) => c.testo.trim()).map((c) => `[${cap(c.tipo)}] ${c.testo.trim()}`),
    prereq, fasi, inclusione, verificaF: verificaF ? cap(verificaF) : "", competenza, prodotto, compitoRealta,
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
    if (isUda) {
      const obIds = obiettiviDaVoci();
      const lezIds: string[] = [];
      const start = Date.parse(`${data}T00:00:00`), end = Date.parse(`${dataFine || data}T00:00:00`);
      for (let i = 0; i < Math.max(0, nLezioni); i++) {
        const t = nLezioni > 1 ? start + (end - start) * (i / (nLezioni - 1)) : start;
        const d = new Date(t).toISOString().slice(0, 10);
        const lid = newId(); lezIds.push(lid);
        upsert("lezioni", { id: lid, Titolo: `${tit} — lezione ${i + 1}`, Materia: materia, "Data prevista": d, Stato: "Progettata", Sequenza: i + 1, "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}) } as Rec);
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
        Fasi: fasi, ...(consegna ? { "Consegna compiti": consegna } : {}),
        "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}), ...(matSel.length ? { Materiali: matSel } : {}),
      } as Rec);
      if (consegna && compiti.some((c) => c.tipo === "compito per casa" && c.testo.trim())) {
        upsert("scadenze", { id: newId(), Titolo: `Compiti ${materia}${classe ? ` · ${classe}` : ""}`, Data: consegna, Stato: "da fare", Tipo: "consegna", "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}) } as Rec);
      }
      setMsg(`✓ ${tipoLabel} salvata in archivio e calendarizzata: ${tit}`);
    }
    resetTutto();
  };

  // ── Sequenza degli step disponibili ──────────────────────────────────────────
  const stepDefs: { key: StepKey; titolo: string; hint: string }[] = [
    { key: "conoscenze", titolo: "Conoscenze e contenuti", hint: "Espandi i rami e flagga: scegliendo una voce si flaggano da sole le categorie superiori." },
    ...(code && haAbilitaComp ? [{ key: "abilita" as StepKey, titolo: "Abilità e competenze", hint: "Il completamento: ciò che si sa fare e l'agire competente." }] : []),
    { key: "metodologie", titolo: "Metodologie", hint: "Come si conduce: scegli i metodi didattici." },
    { key: "strumenti", titolo: "Strumenti e spazi", hint: "Con cosa e dove si svolge l'attività." },
    { key: "edciv", titolo: "Educazione civica", hint: "Ampliamento facoltativo di cittadinanza: può anche restare vuoto." },
    ...(raccordiOpts.length ? [{ key: "raccordi" as StepKey, titolo: "Raccordi interdisciplinari", hint: indir ? "Le materie dell'indirizzo con cui dialoga." : "Le altre materie con cui dialoga." }] : []),
    { key: "compiti", titolo: "Compiti ed esercizi", hint: "Scegli la tipologia: aggiunge una riga da descrivere." },
    { key: "dettagli", titolo: "Panoramica & salvataggio", hint: "Rivedi tutto, esporta in Word, poi salva in archivio e calendarizza." },
  ];
  const idx = Math.min(stepIdx, stepDefs.length - 1);
  const cur = stepDefs[idx];

  const scuolaOk = !multiScuola || !!scuolaId;
  const ctxReady = scuolaOk && !!materia && (isUda || !!classe);
  const classiPerMateria = materia ? classi.filter((c) => materieClasseEffettive(c, profile).includes(materia)) : classi;
  const sigla = (m: string): string => (arch && materiaCodice(arch, m)) || m.split(/\s+/).filter((w) => w.length > 2).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
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
                  <div className="pl-dgrid">{materie.map((m) => <DCard key={m} top={<span className="pl-sigla" style={{ background: materiaColor(m) ?? "var(--accent)" }}>{sigla(m)}</span>} title={m} desc={arch && materiaCodice(arch, m) ? "Guidata dall'archivio" : "Compilazione libera"} onClick={() => cambiaMateria(m)} />)}</div>
                </div>
            )}

            {scuolaOk && materia && !isUda && (classe
              ? <button className="pl-crumb" onClick={() => setClasse("")}><b>Classe</b> {classe} <span>✕</span></button>
              : <div className="pl-pick"><span className="pl-pick-q">Quale classe?</span>
                  {classiPerMateria.length === 0 ? <p className="muted">Nessuna classe associata a {materia} (vedi sinolo nel Profilo).</p>
                    : <div className="pl-dgrid">{classiPerMateria.map((c) => <DCard key={c} top={<span className="pl-sigla cls" style={{ background: "var(--gold)" }}>{c}</span>} title={`Classe ${c}`} desc={cicloDi(c)} onClick={() => cambiaClasse(c)} />)}</div>}
                </div>
            )}
          </div>

          {ctxReady && (
            <div className="pl-steps">
              <ol className="pl-track">
                {stepDefs.map((s, i) => <li key={s.key} className={i === idx ? "on" : i < idx ? "done" : ""} onClick={() => setStepIdx(i)} title={s.titolo}>{i + 1}</li>)}
              </ol>

              <Step n={idx + 1} tot={stepDefs.length} titolo={cur.titolo} hint={cur.hint}
                badge={cur.key === "conoscenze" ? `${nConoscenze} scelte` : cur.key === "abilita" ? `${nAbilitaComp} scelte`
                  : cur.key === "metodologie" ? (metodologie.length || "") + "" : cur.key === "strumenti" ? (strumenti.length || "") + ""
                  : cur.key === "edciv" ? (educiv.length || "") + "" : cur.key === "raccordi" ? (raccordi.length || "") + ""
                  : cur.key === "compiti" ? (compiti.length || "") + "" : undefined}>

                {cur.key === "conoscenze" && (code
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

                {cur.key === "abilita" && (
                  <>
                    {abilitaV.length > 0 && <><div className="pl-sub">Abilità</div><div className="pl-menu">{abilitaV.map((v) => <FlagVoce key={v.id} v={v} on={selIds.has(v.id)} onToggle={toggleVoce} />)}</div></>}
                    {competenzeV.length > 0 && <><div className="pl-sub">Competenze</div><div className="pl-menu">{competenzeV.map((v) => <FlagVoce key={v.id} v={v} on={selIds.has(v.id)} onToggle={toggleVoce} />)}</div></>}
                  </>
                )}

                {cur.key === "metodologie" && <DrillCards opts={METODOLOGIE} val={metodologie} onToggle={(m) => setMetodologie(toggleIn(metodologie, m))} desc={(o) => DESCR_METODOLOGIE[o]} />}
                {cur.key === "strumenti" && <DrillCards opts={STRUMENTI} val={strumenti} onToggle={(m) => setStrumenti(toggleIn(strumenti, m))} desc={(o) => DESCR_STRUMENTI[o]} />}
                {cur.key === "edciv" && <DrillCards opts={EDCIVICA} val={educiv} onToggle={(m) => setEduciv(toggleIn(educiv, m))} desc={(o) => DESCR_EDCIVICA[o]} />}
                {cur.key === "raccordi" && <DrillCards opts={raccordiOpts} val={raccordi} onToggle={(m) => setRaccordi(toggleIn(raccordi, m))} desc={(o) => `Aggancio interdisciplinare con ${o}.`} />}

                {cur.key === "compiti" && (
                  <>
                    <div className="pl-dgrid">{COMPITO_TIPI.map((t) => <DCard key={t} top={<span className="pl-ico">＋</span>} title={cap(t)} desc={DESCR_COMPITI[t]} onClick={() => addCompito(t)} />)}</div>
                    {compiti.length > 0 && (
                      <div className="pl-compiti">
                        {compiti.map((c) => (
                          <div key={c.id} className="pl-compito">
                            <span className="pl-compito-tag">{cap(c.tipo)}</span>
                            <input type="text" value={c.testo} placeholder="Es. tradurre vv. 1-20; esercizi p.45…" onChange={(e) => setCompito(c.id, { testo: e.target.value })} />
                            <button className="danger" onClick={() => removeCompito(c.id)} aria-label="Rimuovi">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isUda && <label className="field sm inline"><span>Consegna (compiti per casa)</span><input type="date" value={consegna} onChange={(e) => setConsegna(e.target.value)} /></label>}
                  </>
                )}

                {cur.key === "dettagli" && (
                  <>
                    <label className="field"><span>Titolo</span>
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

                    <label className="field"><span>Prerequisiti</span><textarea rows={2} value={prereq} onChange={(e) => setPrereq(e.target.value)} placeholder="Cosa serve sapere/saper fare prima…" /></label>
                    {!isUda && <label className="field"><span>Fasi e tempi</span><textarea rows={2} value={fasi} onChange={(e) => setFasi(e.target.value)} placeholder="Apertura · sviluppo · esercitazione · sintesi/verifica…" /></label>}

                    <div className="pl-rifinitura">
                      <div className="pl-sub">Rifinitura testuale {selVoci.length > 0 && <button className="link" onClick={componi}>componi dai flag ↓</button>}</div>
                      <div className="pl-triade">
                        <label className="field"><span>Conoscenze</span><textarea rows={3} value={conoscenze} onChange={(e) => setConoscenze(e.target.value)} placeholder={derivato("con", "") || "Contenuti…"} /></label>
                        <label className="field"><span>Abilità</span><textarea rows={3} value={abilita} onChange={(e) => setAbilita(e.target.value)} placeholder={derivato("ab", "") || "Saper fare…"} /></label>
                        <label className="field"><span>Competenze</span><textarea rows={3} value={competenzeTxt} onChange={(e) => setCompetenzeTxt(e.target.value)} placeholder={derivato("com", "") || "Agire competente…"} /></label>
                      </div>
                      <p className="muted pl-hint">Vuoti = compilati in automatico dalle voci flaggate.</p>
                    </div>

                    <div className="field"><span>Materiali</span>
                      <div className="pl-mat">
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

                    <div className="pl-triade">
                      <label className="field"><span>Inclusione (misure)</span><textarea rows={2} value={inclusione} onChange={(e) => setInclusione(e.target.value)} placeholder="Misure compensative/dispensative (a livello di classe)…" /></label>
                      <label className="field"><span>Verifica formativa</span>
                        <select value={verificaF} onChange={(e) => setVerificaF(e.target.value)}>
                          <option value="">—</option>
                          {VERIFICHE_F.map((v) => <option key={v} value={v}>{cap(v)}</option>)}
                        </select>
                      </label>
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
                      </div>
                    </div>

                    <div className="pl-actions">
                      <button onClick={esportaWord}>📄 Esporta Word</button>
                      <button className="primary" onClick={salva}>💾 Salva &amp; calendarizza</button>
                      {msg && <span className="pl-msg">{msg} <button className="link" onClick={() => onView({ kind: "calendar" })}>calendario →</button> <button className="link" onClick={() => onView({ kind: "archivio" })}>archivio →</button></span>}
                    </div>
                  </>
                )}

                {/* navigazione fra gli step */}
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
