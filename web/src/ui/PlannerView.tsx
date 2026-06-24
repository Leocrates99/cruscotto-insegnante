import { useMemo, useState } from "react";
import type { View } from "../App";
import type { DbKey } from "@model";
import { schemaByKey } from "@model";
import { newId, records, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { classiAttive, materieAttive, materieClasseEffettive, scuoleCorrenti, useProfile } from "../store/profile";
import { annoCorrenteId, classeId } from "../store/links";
import { bloomLabel, cicloDaFase, materieIndirizzo, nucleiConObiettivi, useTassonomia, type TaxObiettivo } from "../data/tassonomia";
import { materiaColor } from "./materia";

const oggi = () => new Date().toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase();
type Tipo = "lezione" | "laboratorio" | "uda";
type CompitoRow = { id: string; tipo: string; testo: string };

const COMPITO_TIPI = ["esercizio in classe", "esercitazione guidata", "compito per casa", "verifica formativa"];
const MAT_TIPI = ["esercizio", "scheda", "traccia", "versione", "presentazione", "mappa concettuale"];

// Etichette con la maiuscola a inizio parola (minuscole le particelle), solo per la resa.
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

/**
 * Pianifica: composer completo di lezione / laboratorio / UdA, con lo stesso livello di
 * arricchimento didattico (conoscenze/abilità/competenze, metodologie, strumenti, compiti,
 * educazione civica, raccordi interdisciplinari, inclusione, verifica) e calendarizzazione.
 */
export function PlannerView({ onView }: { onView: (v: View) => void }) {
  useStore();
  const profile = useProfile();
  const tax = useTassonomia();
  const materie = materieAttive(profile);
  const classi = classiAttive(profile);
  const indir = scuoleCorrenti(profile)[0]?.indirizzo;

  const [tipo, setTipo] = useState<Tipo>("lezione");
  const [materia, setMateria] = useState(materie[0] ?? "");
  const [classe, setClasse] = useState(classi[0] ?? "");
  const [ciclo, setCiclo] = useState<"Biennio" | "Triennio">("Biennio");
  const [data, setData] = useState(oggi());
  const [dataFine, setDataFine] = useState(oggi());
  const [durata, setDurata] = useState(2);
  const [titolo, setTitolo] = useState("");
  const [sel, setSel] = useState<TaxObiettivo[]>([]);
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  // Composizione didattica (condivisa fra lezione/laboratorio/UdA)
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
  // UdA
  const [competenza, setCompetenza] = useState("");
  const [prodotto, setProdotto] = useState("");
  const [compitoRealta, setCompitoRealta] = useState("");
  const [nLezioni, setNLezioni] = useState(0);

  const isUda = tipo === "uda";
  const materieDisp = !isUda && classe ? materieClasseEffettive(classe, profile) : materie;
  const raccordiOpts = useMemo(() => (tax ? materieIndirizzo(tax, indir).filter((m) => m !== materia) : []), [tax, indir, materia]);

  const aree = useMemo(() => {
    if (!tax || !materia) return [];
    const base = nucleiConObiettivi(tax, materia, { indirizzoId: indir, ciclo });
    return [...new Set(base.flatMap((g) => g.obiettivi.map((o) => o.area)).filter(Boolean))].sort();
  }, [tax, materia, indir, ciclo]);

  const gruppi = useMemo(() => {
    if (!tax || !materia) return [];
    let base = nucleiConObiettivi(tax, materia, { indirizzoId: indir, ciclo });
    if (area) base = base.map((g) => ({ nucleo: g.nucleo, obiettivi: g.obiettivi.filter((o) => o.area === area) })).filter((g) => g.obiettivi.length > 0);
    if (q.trim()) {
      const nq = norm(q);
      base = base.map((g) => ({ nucleo: g.nucleo, obiettivi: g.obiettivi.filter((o) => norm(`${o.argomento} ${o.descrizione} ${o.nucleo} ${(o.keywords ?? []).join(" ")}`).includes(nq)) })).filter((g) => g.obiettivi.length > 0);
    }
    return base;
  }, [tax, materia, indir, ciclo, q, area]);

  const selIds = new Set(sel.map((o) => o.id));
  const toggle = (o: TaxObiettivo) => setSel((s) => (selIds.has(o.id) ? s.filter((x) => x.id !== o.id) : [...s, o]));
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const componiDaObiettivi = () => {
    const con = sel.filter((o) => o.tipo === "conoscenza").map((o) => `• ${o.argomento}`);
    const com = sel.filter((o) => o.tipo === "competenza").map((o) => `• ${o.argomento}`);
    if (con.length) setConoscenze((c) => [c.trim(), ...con].filter(Boolean).join("\n"));
    if (com.length) setCompetenzeTxt((c) => [c.trim(), ...com].filter(Boolean).join("\n"));
  };

  const obiettivoRecId = (o: TaxObiettivo): string => {
    const exist = records("obiettivi").find((r) => r["Enunciato"] === o.argomento && r["Materia"] === materia);
    if (exist) return exist.id;
    const id = newId();
    upsert("obiettivi", {
      id, Enunciato: o.argomento, Tipo: o.tipo, Materia: materia,
      Nucleo: o.nucleo, Area: o.area, "Competenza europea": o.competenza_europea,
      ...(bloomLabel(o.bloom) ? { "Livello cognitivo": bloomLabel(o.bloom) } : {}),
      Ciclo: cicloDaFase(o.fase) ?? ciclo,
    } as Rec);
    return id;
  };

  const addCompito = () => setCompiti((c) => [...c, { id: newId(), tipo: COMPITO_TIPI[0], testo: "" }]);
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

  const reset = () => {
    setSel([]); setTitolo(""); setPrereq(""); setConoscenze(""); setAbilita(""); setCompetenzeTxt("");
    setFasi(""); setMetodologie([]); setStrumenti([]); setEduciv([]); setRaccordi([]); setInclusione(""); setVerificaF("");
    setCompiti([]); setConsegna(""); setMatSel([]); setCompetenza(""); setProdotto(""); setCompitoRealta(""); setNLezioni(0);
  };

  const compitiText = () => compiti.filter((c) => c.testo.trim()).map((c) => `• [${c.tipo}] ${c.testo.trim()}`).join("\n");

  const salva = () => {
    if (sel.length === 0 && !titolo.trim()) { setMsg("Aggiungi un titolo o qualche obiettivo dalla palette."); return; }
    const tit = titolo.trim() || `${materia}${sel[0] ? " — " + sel[0].argomento : ""}`;
    const cId = classe ? classeId(classe) : undefined;
    const didattica: Rec = {
      id: "", Prerequisiti: prereq, Conoscenze: conoscenze, "Abilità": abilita, Competenze: competenzeTxt,
      Metodologie: metodologie, "Strumenti e spazi": strumenti, "Compiti ed esercizi": compitiText(),
      "Educazione civica": educiv, "Raccordi interdisciplinari": raccordi, "Inclusione (misure)": inclusione,
      ...(verificaF ? { "Verifica formativa": verificaF } : {}),
    };

    if (isUda) {
      const obIds = sel.map(obiettivoRecId);
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
        "Obiettivi della lezione": sel.map((o) => `• ${o.argomento}`).join("\n"),
        Fasi: fasi, ...(consegna ? { "Consegna compiti": consegna } : {}),
        "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}), ...(matSel.length ? { Materiali: matSel } : {}),
      } as Rec);
      if (consegna && compiti.some((c) => c.tipo === "compito per casa" && c.testo.trim())) {
        upsert("scadenze", { id: newId(), Titolo: `Compiti ${materia}${classe ? ` · ${classe}` : ""}`, Data: consegna, Stato: "da fare", Tipo: "consegna", "Anno scolastico": [annoCorrenteId()], ...(cId ? { Classe: [cId] } : {}) } as Rec);
      }
      setMsg(`✓ ${tipo === "laboratorio" ? "Laboratorio" : "Lezione"} calendarizzata: ${tit}`);
    }
    reset();
  };

  const Chips = ({ opts, val, set, label }: { opts: string[]; val: string[]; set: (a: string[]) => void; label?: boolean }) => (
    <div className="pl-chips">{opts.map((m) => <button key={m} className={val.includes(m) ? "pl-chip on" : "pl-chip"} onClick={() => set(toggleIn(val, m))}>{label === false ? m : cap(m)}</button>)}</div>
  );

  return (
    <section className="planner">
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
          <div className="pl-ctx">
            <label className="field sm"><span>Materia</span>
              <select value={materieDisp.includes(materia) ? materia : ""} onChange={(e) => { setMateria(e.target.value); setSel([]); setArea(""); }}>
                {!materieDisp.includes(materia) && <option value="">—</option>}
                {materieDisp.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            {!isUda && (
              <label className="field sm"><span>Classe</span>
                <select value={classe} onChange={(e) => { const c = e.target.value; setClasse(c); const ms = materieClasseEffettive(c, profile); if (!ms.includes(materia)) { setMateria(ms[0] ?? ""); setSel([]); } }}>
                  {classi.length === 0 && <option value="">—</option>}
                  {classi.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}
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

          <div className="pl-body">
            <div className="pl-palette">
              <input className="pl-search" type="text" placeholder="Cerca nucleo, argomento, parola chiave…" value={q} onChange={(e) => setQ(e.target.value)} />
              {aree.length > 0 && (
                <select className="pl-area" value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="">Tutte le aree</option>
                  {aree.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              )}
              {!tax ? (
                <p className="muted">Carico il backbone…</p>
              ) : gruppi.length === 0 ? (
                <p className="muted">Nessun obiettivo per {materia} ({ciclo}). Prova l'altro ciclo o un'altra area.</p>
              ) : (
                gruppi.map((g) => (
                  <div key={g.nucleo} className="pl-nucleo">
                    <div className="pl-nucleo-h">{g.nucleo} <small>{g.obiettivi.length}</small></div>
                    {g.obiettivi.map((o) => (
                      <button key={o.id} className={selIds.has(o.id) ? "pl-ob sel" : "pl-ob"} onClick={() => toggle(o)} title={o.descrizione}>
                        <span className="pl-ob-add">{selIds.has(o.id) ? "✓" : "+"}</span>
                        <span className="pl-ob-txt"><b>{o.argomento}</b>{o.descrizione ? <em> — {o.descrizione}</em> : null}</span>
                        <span className={`pl-ob-tipo ${o.tipo === "competenza" ? "com" : "con"}`}>{o.tipo === "competenza" ? (bloomLabel(o.bloom) ?? "COM") : "CON"}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="pl-compose">
              <label className="field"><span>Titolo</span>
                <input type="text" value={titolo} placeholder={`${isUda ? "UdA" : tipo === "laboratorio" ? "Laboratorio" : "Lezione"} di ${materia || "…"}`} onChange={(e) => setTitolo(e.target.value)} style={{ borderLeft: `3px solid ${materiaColor(materia) ?? "var(--parchment-dark)"}` }} />
              </label>

              <div className="pl-sel">
                <div className="pl-sel-h">Obiettivi scelti <b>{sel.length}</b>{sel.length > 0 && <button className="link" onClick={componiDaObiettivi}>componi conoscenze/competenze ↓</button>}</div>
                {sel.length === 0 ? <p className="muted">Pesca gli obiettivi dalla palette a sinistra.</p> : (
                  <ul>{sel.map((o) => <li key={o.id}><span>{o.argomento}</span><button onClick={() => toggle(o)} aria-label="Togli">✕</button></li>)}</ul>
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
              <div className="pl-triade">
                <label className="field"><span>Conoscenze</span><textarea rows={2} value={conoscenze} onChange={(e) => setConoscenze(e.target.value)} placeholder="Contenuti…" /></label>
                <label className="field"><span>Abilità</span><textarea rows={2} value={abilita} onChange={(e) => setAbilita(e.target.value)} placeholder="Saper fare…" /></label>
                <label className="field"><span>Competenze</span><textarea rows={2} value={competenzeTxt} onChange={(e) => setCompetenzeTxt(e.target.value)} placeholder="Agire competente…" /></label>
              </div>
              {!isUda && <label className="field"><span>Fasi e tempi</span><textarea rows={3} value={fasi} onChange={(e) => setFasi(e.target.value)} placeholder="Apertura · sviluppo · esercitazione · sintesi/verifica…" /></label>}

              <div className="field"><span>Metodologie</span><Chips opts={METODOLOGIE} val={metodologie} set={setMetodologie} /></div>
              <div className="field"><span>Strumenti e spazi</span><Chips opts={STRUMENTI} val={strumenti} set={setStrumenti} /></div>
              <div className="field"><span>Educazione civica</span><Chips opts={EDCIVICA} val={educiv} set={setEduciv} /></div>
              {raccordiOpts.length > 0 && <div className="field"><span>Raccordi interdisciplinari <em>· {indir ? "materie dell'indirizzo" : "materie"}</em></span><Chips opts={raccordiOpts} val={raccordi} set={setRaccordi} label={false} /></div>}

              <div className="field"><span>Compiti ed esercizi <em>· anche attività in classe</em></span>
                <div className="pl-compiti">
                  {compiti.map((c) => (
                    <div key={c.id} className="pl-compito">
                      <select value={c.tipo} onChange={(e) => setCompito(c.id, { tipo: e.target.value })}>{COMPITO_TIPI.map((t) => <option key={t} value={t}>{cap(t)}</option>)}</select>
                      <input type="text" value={c.testo} placeholder="Es. tradurre vv. 1-20; esercizi p.45…" onChange={(e) => setCompito(c.id, { testo: e.target.value })} />
                      <button className="danger" onClick={() => removeCompito(c.id)} aria-label="Rimuovi">✕</button>
                    </div>
                  ))}
                  <div className="pl-compiti-foot">
                    <button onClick={addCompito}>+ Attività/compito</button>
                    {!isUda && <label className="field sm inline"><span>Consegna (compiti per casa)</span><input type="date" value={consegna} onChange={(e) => setConsegna(e.target.value)} /></label>}
                  </div>
                </div>
              </div>

              <div className="field"><span>Materiali</span>
                <div className="pl-mat">
                  {materialiDisp.length > 0 && (
                    <div className="pl-chips">{materialiDisp.map((m) => <button key={m.id} className={matSel.includes(m.id) ? "pl-chip on" : "pl-chip"} onClick={() => setMatSel((a) => toggleIn(a, m.id))}>{String(m["Titolo"] ?? "—")}{m["Tipo"] ? ` · ${cap(String(m["Tipo"]))}` : ""}</button>)}</div>
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
            </div>
          </div>
        </>
      )}
    </section>
  );
}
