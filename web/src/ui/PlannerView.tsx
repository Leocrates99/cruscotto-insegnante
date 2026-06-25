import { useMemo, useState, type ReactNode } from "react";
import type { View } from "../App";
import type { DbKey } from "@model";
import { schemaByKey } from "@model";
import { newId, records, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { classiAttive, materieAttive, materieClasseEffettive, scuoleCorrenti, useProfile } from "../store/profile";
import { annoCorrenteId, classeId } from "../store/links";
import { bloomLabel, materieIndirizzo, useTassonomia } from "../data/tassonomia";
import { materiaCodice, perPeso, useArchivio, voce, type Voce } from "../data/archivio";
import { AlberoConoscenze } from "./AlberoConoscenze";
import { materiaColor } from "./materia";

const oggi = () => new Date().toISOString().slice(0, 10);
type Tipo = "lezione" | "laboratorio" | "uda";
type CompitoRow = { id: string; tipo: string; testo: string };

const COMPITO_TIPI = ["esercizio in classe", "esercitazione guidata", "compito per casa", "verifica formativa"];
const MAT_TIPI = ["esercizio", "scheda", "traccia", "versione", "presentazione", "mappa concettuale"];
const CONO = new Set(["conoscenza", "contenuto"]);

const MINOR = new Set(["di", "e", "a", "da", "in", "con", "su", "per", "tra", "fra", "la", "il", "lo", "le", "i", "gli", "un", "una", "del", "della", "dei", "delle", "al", "alla", "allo", "dello", "ed", "o"]);
const cap = (s: string): string => s.split(" ").map((w, i) => (!w ? w : i > 0 && MINOR.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");

function optsOf(key: DbKey, prop: string): string[] {
  const p = schemaByKey[key].properties[prop] as { options?: { name: string }[] } | undefined;
  return p?.options?.map((o) => o.name) ?? [];
}
const METODOLOGIE = optsOf("lezioni", "Metodologie");
const STRUMENTI = optsOf("lezioni", "Strumenti e spazi");
const VERIFICHE_F = optsOf("lezioni", "Verifica formativa");
const EDCIVICA = optsOf("lezioni", "Educazione civica");

// Mattoni UI a livello di modulo: stabili fra i render (niente remount → l'albero
// non si richiude e i campi non perdono il focus).
function Step({ n, titolo, hint, badge, children }: { n: number; titolo: string; hint?: string; badge?: string; children: ReactNode }) {
  return (
    <section className="pl-step">
      <header className="pl-step-h">
        <span className="pl-step-n">{n}</span>
        <div className="pl-step-tt"><h3>{titolo}</h3>{hint && <p>{hint}</p>}</div>
        {badge && <span className="pl-step-badge">{badge}</span>}
      </header>
      <div className="pl-step-body">{children}</div>
    </section>
  );
}
function Menu({ opts, val, onToggle, label }: { opts: string[]; val: string[]; onToggle: (v: string) => void; label?: boolean }) {
  return <div className="pl-menu">{opts.map((m) => <button key={m} className={val.includes(m) ? "pl-mbtn on" : "pl-mbtn"} onClick={() => onToggle(m)}><span className="pl-mb-tick">{val.includes(m) ? "✓" : "+"}</span>{label === false ? m : cap(m)}</button>)}</div>;
}
function FlagVoce({ v, on, onToggle }: { v: Voce; on: boolean; onToggle: (v: Voce) => void }) {
  return <button className={on ? "pl-mbtn on" : "pl-mbtn"} onClick={() => onToggle(v)} title={v.competenza_europea || v.nucleo}><span className="pl-mb-tick">{on ? "✓" : "+"}</span>{v.testo}</button>;
}

/**
 * Pianifica: composer guidato a «menù di pulsanti». Drill di contesto
 * (Scuola → Materia → Classe), poi i passaggi in sequenza: Settore + albero
 * conoscenze/contenuti → Abilità/Competenze → Metodologie → Strumenti/Spazi →
 * Educazione civica → Raccordi → Compiti → Dettagli & salva.
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
  const raccordiOpts = useMemo(() => (tax ? materieIndirizzo(tax, indir).filter((m) => m !== materia) : []), [tax, indir, materia]);

  const code = arch ? materiaCodice(arch, materia) : undefined;
  const vMatPl = useMemo(() => (arch && code ? arch.voci.filter((v) => v.materia === code) : []), [arch, code]);
  const nucleiPl = useMemo(() => [...new Set(vMatPl.map((v) => v.nucleo).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [vMatPl]);
  const radici = vMatPl.filter((v) => CONO.has(v.blocco) && !v.parent && (!nucleo || v.nucleo === nucleo)).sort(perPeso);
  const abilitaV = vMatPl.filter((v) => v.blocco === "abilita" && (!nucleo || v.nucleo === nucleo)).sort(perPeso);
  const competenzeV = vMatPl.filter((v) => v.blocco === "competenza" && (!nucleo || v.nucleo === nucleo)).sort(perPeso);

  const selVoci: Voce[] = arch ? [...selIds].map((id) => voce(arch, id)).filter((v): v is Voce => !!v) : [];
  const toggleVoce = (v: Voce) => setSelIds((s) => { const n = new Set(s); n.has(v.id) ? n.delete(v.id) : n.add(v.id); return n; });
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const resetTutto = () => {
    setSelIds(new Set()); setNucleo(""); setTitolo(""); setPrereq(""); setConoscenze(""); setAbilita(""); setCompetenzeTxt("");
    setFasi(""); setMetodologie([]); setStrumenti([]); setEduciv([]); setRaccordi([]); setInclusione(""); setVerificaF("");
    setCompiti([]); setConsegna(""); setMatSel([]); setCompetenza(""); setProdotto(""); setCompitoRealta(""); setNLezioni(0);
  };
  const cambiaMateria = (m: string) => { setMateria(m); setNucleo(""); setSelIds(new Set()); };

  // Le voci flaggate compongono i tre campi (per blocco): si possono poi rifinire a mano.
  const componi = () => {
    const con = selVoci.filter((v) => CONO.has(v.blocco)).map((v) => `• ${v.testo}`);
    const ab = selVoci.filter((v) => v.blocco === "abilita").map((v) => `• ${v.testo}`);
    const com = selVoci.filter((v) => v.blocco === "competenza").map((v) => `• ${v.testo}`);
    setConoscenze((c) => [...new Set([...c.split("\n").filter(Boolean), ...con])].join("\n"));
    setAbilita((c) => [...new Set([...c.split("\n").filter(Boolean), ...ab])].join("\n"));
    setCompetenzeTxt((c) => [...new Set([...c.split("\n").filter(Boolean), ...com])].join("\n"));
  };
  // Testo effettivo del campo (esplicito, altrimenti derivato dai flag) per il salvataggio.
  const derivato = (campo: "con" | "ab" | "com", testo: string): string => {
    if (testo.trim()) return testo;
    const f = campo === "con" ? selVoci.filter((v) => CONO.has(v.blocco)) : selVoci.filter((v) => v.blocco === (campo === "ab" ? "abilita" : "competenza"));
    return f.map((v) => `• ${v.testo}`).join("\n");
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

  const salva = () => {
    if (selVoci.length === 0 && !titolo.trim()) { setMsg("Aggiungi un titolo o flagga qualche voce dall'archivio."); return; }
    const tit = titolo.trim() || `${materia}${selVoci[0] ? " — " + selVoci[0].testo : ""}`;
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
        Ciclo: ciclo, Stato: "Progettata", "Data inizio": data, "Data fine": dataFine, Obiettivi: obIds,
        ...(lezIds.length ? { Lezioni: lezIds } : {}), ...(matSel.length ? { Materiali: matSel } : {}),
      } as Rec);
      setMsg(`✓ UdA creata${lezIds.length ? ` con ${lezIds.length} lezioni calendarizzate` : ""}: ${tit}`);
    } else {
      upsert("lezioni", {
        ...didattica, id: newId(),
        Titolo: tipo === "laboratorio" ? `[Laboratorio] ${tit}` : tit,
        Materia: materia, "Data prevista": data, "Durata (ore)": durata, Stato: "Progettata",
        "Obiettivi della lezione": selVoci.map((v) => `• ${v.testo}`).join("\n"),
        Fasi: fasi, ...(consegna ? { "Consegna compiti": consegna } : {}),
        "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}), ...(matSel.length ? { Materiali: matSel } : {}),
      } as Rec);
      if (consegna && compiti.some((c) => c.tipo === "compito per casa" && c.testo.trim())) {
        upsert("scadenze", { id: newId(), Titolo: `Compiti ${materia}${classe ? ` · ${classe}` : ""}`, Data: consegna, Stato: "da fare", Tipo: "consegna", "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}) } as Rec);
      }
      setMsg(`✓ ${tipo === "laboratorio" ? "Laboratorio" : "Lezione"} calendarizzata: ${tit}`);
    }
    resetTutto();
  };

  const scuolaOk = !multiScuola || !!scuolaId;
  const ctxReady = scuolaOk && !!materia && (isUda || !!classe);
  const classiPerMateria = materia ? classi.filter((c) => materieClasseEffettive(c, profile).includes(materia)) : classi;

  return (
    <section className="planner pl-wizard">
      <div className="view-head">
        <h1>🧠 Pianifica</h1>
        <div className="seg">
          <button className={tipo === "lezione" ? "active" : ""} onClick={() => setTipo("lezione")}>Lezione</button>
          <button className={tipo === "laboratorio" ? "active" : ""} onClick={() => setTipo("laboratorio")}>Laboratorio</button>
          <button className={tipo === "uda" ? "active" : ""} onClick={() => setTipo("uda")}>UdA</button>
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
              : <div className="pl-pick"><span className="pl-pick-q">Per quale scuola?</span><div className="pl-menu lg">{scuole.map((s) => <button key={s.id} className="pl-mcard" onClick={() => setScuolaId(s.id)}><b>{s.nome}</b><em>{s.indirizzo ?? s.ordine}</em></button>)}</div></div>
            )}

            {scuolaOk && (materia
              ? <button className="pl-crumb" onClick={() => cambiaMateria("")}><b>Materia</b> {materia} <span>✕</span></button>
              : <div className="pl-pick"><span className="pl-pick-q">Quale materia?</span><div className="pl-menu lg">{materie.map((m) => <button key={m} className="pl-mcard" onClick={() => cambiaMateria(m)} style={{ borderLeft: `4px solid ${materiaColor(m) ?? "var(--rule)"}` }}><b>{m}</b>{arch && materiaCodice(arch, m) ? <em>in archivio</em> : <em>compilazione libera</em>}</button>)}</div></div>
            )}

            {scuolaOk && materia && !isUda && (classe
              ? <button className="pl-crumb" onClick={() => setClasse("")}><b>Classe</b> {classe} <span>✕</span></button>
              : <div className="pl-pick"><span className="pl-pick-q">Quale classe?</span><div className="pl-menu lg">{classiPerMateria.length === 0 ? <p className="muted">Nessuna classe associata a {materia} (vedi sinolo nel Profilo).</p> : classiPerMateria.map((c) => <button key={c} className="pl-mcard" onClick={() => setClasse(c)}><b>{c}</b></button>)}</div></div>
            )}
          </div>

          {ctxReady && (
            <div className="pl-steps">
              {/* ① Conoscenze e contenuti */}
              {code ? (
                <Step n={1} titolo="Conoscenze e contenuti" hint="Scegli il settore, poi espandi i rami: prima la biografia, poi le opere." badge={`${selVoci.filter((v) => CONO.has(v.blocco)).length} scelte`}>
                  {nucleiPl.length > 0 && (
                    <div className="pl-menu" role="tablist">
                      <button className={!nucleo ? "pl-mbtn on" : "pl-mbtn"} onClick={() => setNucleo("")}>Tutti i settori</button>
                      {nucleiPl.map((n) => <button key={n} className={nucleo === n ? "pl-mbtn on" : "pl-mbtn"} onClick={() => setNucleo(n)}>{n}</button>)}
                    </div>
                  )}
                  <AlberoConoscenze a={arch!} radici={radici} selez={selIds} onToggle={toggleVoce} />
                </Step>
              ) : (
                <Step n={1} titolo="Conoscenze e contenuti" hint="Materia senza archivio: scrivi i contenuti nei Dettagli, in fondo.">
                  <p className="muted">Per <b>{materia}</b> non c'è ancora un archivio: i campi si compilano a mano nello step finale.</p>
                </Step>
              )}

              {/* ② Abilità e competenze */}
              {code && (abilitaV.length > 0 || competenzeV.length > 0) && (
                <Step n={2} titolo="Abilità e competenze" hint="Il completamento: ciò che si sa fare e l'agire competente. Si flaggano di continuo." badge={`${selVoci.filter((v) => v.blocco === "abilita" || v.blocco === "competenza").length} scelte`}>
                  {abilitaV.length > 0 && <><div className="pl-sub">Abilità</div><div className="pl-menu">{abilitaV.map((v) => <FlagVoce key={v.id} v={v} on={selIds.has(v.id)} onToggle={toggleVoce} />)}</div></>}
                  {competenzeV.length > 0 && <><div className="pl-sub">Competenze</div><div className="pl-menu">{competenzeV.map((v) => <FlagVoce key={v.id} v={v} on={selIds.has(v.id)} onToggle={toggleVoce} />)}</div></>}
                </Step>
              )}

              {/* ③ Metodologie */}
              <Step n={3} titolo="Metodologie" hint="Come si conduce: i metodi didattici dell'attività." badge={metodologie.length ? `${metodologie.length}` : undefined}>
                <Menu opts={METODOLOGIE} val={metodologie} onToggle={(m) => setMetodologie(toggleIn(metodologie, m))} />
              </Step>

              {/* ④ Strumenti e spazi */}
              <Step n={4} titolo="Strumenti e spazi" hint="Con cosa e dove: supporti, ambienti, tecnologie." badge={strumenti.length ? `${strumenti.length}` : undefined}>
                <Menu opts={STRUMENTI} val={strumenti} onToggle={(m) => setStrumenti(toggleIn(strumenti, m))} />
              </Step>

              {/* ⑤ Educazione civica */}
              <Step n={5} titolo="Educazione civica" hint="L'eventuale ampliamento trasversale di cittadinanza." badge={educiv.length ? `${educiv.length}` : undefined}>
                <Menu opts={EDCIVICA} val={educiv} onToggle={(m) => setEduciv(toggleIn(educiv, m))} />
              </Step>

              {/* ⑥ Raccordi interdisciplinari */}
              {raccordiOpts.length > 0 && (
                <Step n={6} titolo="Raccordi interdisciplinari" hint={indir ? "Le materie dell'indirizzo con cui dialoga." : "Le altre materie con cui dialoga."} badge={raccordi.length ? `${raccordi.length}` : undefined}>
                  <Menu opts={raccordiOpts} val={raccordi} onToggle={(m) => setRaccordi(toggleIn(raccordi, m))} label={false} />
                </Step>
              )}

              {/* ⑦ Compiti ed esercizi */}
              <Step n={7} titolo="Compiti ed esercizi" hint="Aggiungi attività in classe e a casa scegliendo il tipo." badge={compiti.length ? `${compiti.length}` : undefined}>
                <div className="pl-menu">{COMPITO_TIPI.map((t) => <button key={t} className="pl-mbtn add" onClick={() => addCompito(t)}>+ {cap(t)}</button>)}</div>
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
              </Step>

              {/* ⑧ Dettagli & salva */}
              <Step n={8} titolo="Dettagli & salva" hint="Titolo, tempi e rifinitura; poi salva e calendarizza.">
                <label className="field"><span>Titolo</span>
                  <input type="text" value={titolo} placeholder={`${isUda ? "UdA" : tipo === "laboratorio" ? "Laboratorio" : "Lezione"} di ${materia}`} onChange={(e) => setTitolo(e.target.value)} style={{ borderLeft: `3px solid ${materiaColor(materia) ?? "var(--rule)"}` }} />
                </label>

                <div className="pl-when">
                  <div className="seg sm">
                    <button className={ciclo === "Biennio" ? "active" : ""} onClick={() => setCiclo("Biennio")}>Biennio</button>
                    <button className={ciclo === "Triennio" ? "active" : ""} onClick={() => setCiclo("Triennio")}>Triennio</button>
                  </div>
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
                    <p className="muted pl-hint">Con «N° lezioni» &gt; 0 vengono create e calendarizzate le lezioni (sequenza + date distribuite).</p>
                  </>
                )}

                <label className="field"><span>Prerequisiti</span><textarea rows={2} value={prereq} onChange={(e) => setPrereq(e.target.value)} placeholder="Cosa serve sapere/saper fare prima…" /></label>
                {!isUda && <label className="field"><span>Fasi e tempi</span><textarea rows={3} value={fasi} onChange={(e) => setFasi(e.target.value)} placeholder="Apertura · sviluppo · esercitazione · sintesi/verifica…" /></label>}

                <div className="pl-rifinitura">
                  <div className="pl-sub">Rifinitura testuale {selVoci.length > 0 && <button className="link" onClick={componi}>componi dai flag ↓</button>}</div>
                  <div className="pl-triade">
                    <label className="field"><span>Conoscenze</span><textarea rows={3} value={conoscenze} onChange={(e) => setConoscenze(e.target.value)} placeholder={derivato("con", "") || "Contenuti…"} /></label>
                    <label className="field"><span>Abilità</span><textarea rows={3} value={abilita} onChange={(e) => setAbilita(e.target.value)} placeholder={derivato("ab", "") || "Saper fare…"} /></label>
                    <label className="field"><span>Competenze</span><textarea rows={3} value={competenzeTxt} onChange={(e) => setCompetenzeTxt(e.target.value)} placeholder={derivato("com", "") || "Agire competente…"} /></label>
                  </div>
                  <p className="muted pl-hint">Vuoti = compilati in automatico dalle voci flaggate. Scrivi per rifinire.</p>
                </div>

                <div className="field"><span>Materiali</span>
                  <div className="pl-mat">
                    {materialiDisp.length > 0 && (
                      <div className="pl-menu">{materialiDisp.map((m) => <button key={m.id} className={matSel.includes(m.id) ? "pl-mbtn on" : "pl-mbtn"} onClick={() => setMatSel((a) => toggleIn(a, m.id))}><span className="pl-mb-tick">{matSel.includes(m.id) ? "✓" : "+"}</span>{String(m["Titolo"] ?? "—")}{m["Tipo"] ? ` · ${cap(String(m["Tipo"]))}` : ""}</button>)}</div>
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

                <div className="pl-actions">
                  <button className="primary" onClick={salva}>📅 Salva &amp; calendarizza</button>
                  {msg && <span className="pl-msg">{msg} <button className="link" onClick={() => onView({ kind: "calendar" })}>vai al calendario →</button></span>}
                </div>
              </Step>
            </div>
          )}
        </>
      )}
    </section>
  );
}
