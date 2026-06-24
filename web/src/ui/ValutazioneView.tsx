import { useEffect, useState } from "react";
import type { View } from "../App";
import {
  ARROTONDAMENTI,
  FORMULE,
  SCALE_PRESETS,
  calcoloInverso,
  distribuzione,
  maxIndicatore,
  rigaCompilata,
  tabellaConversione,
  votoDisplay,
  votoRiga,
} from "../compute/voto";
import {
  annoCorrente,
  archiviaAnno,
  getSessione,
  newId,
  nuovaGriglia,
  removeSessione,
  sessioniDi,
  upsertSessione,
  useValutazione,
  type Griglia,
  type RigaCorrezione,
  type Sessione,
} from "../store/valutazione";
import { classeInfo, classiAttive, useProfile } from "../store/profile";
import { GrigliaEditor } from "./GrigliaEditor";
import { SchedaStampa } from "./SchedaStampa";
import { VerificaForm } from "./VerificaForm";

const num = (v: number) => v.toLocaleString("it-IT", { maximumFractionDigits: 2 });
const oggi = () => new Date().toISOString().slice(0, 10);
/** Uno scrutinio (burocratico) vs una verifica (didattica), in base alla categoria della griglia. */
const isScrutinio = (s: Sessione) => s.griglia.categoria === "scrutinio-materia" || s.griglia.categoria === "condotta";
const CAT_LABEL: Record<string, string> = { esercizi: "Esercizi", scritto: "Scritto", orale: "Orale", "scrutinio-materia": "Voto di materia", condotta: "Condotta", altro: "Altro" };
const categoriaLabel = (c: Griglia["categoria"]): string => CAT_LABEL[c] ?? c;

export function ValutazioneView({ sessioneId, onView }: { sessioneId?: string; onView: (v: View) => void }) {
  const v = useValutazione();
  const profile = useProfile();
  const classi = classiAttive(profile);
  const anno = annoCorrente();

  const [ambito, setAmbito] = useState<"verifiche" | "scrutini">("verifiche");
  const [selClasse, setSelClasse] = useState<string>(classi[0] ?? "");
  const [selSessId, setSelSessId] = useState<string>("");
  const [editing, setEditing] = useState<{ g: Griglia; onSave?: (g: Griglia) => void } | null>(null);
  const [scheda, setScheda] = useState<RigaCorrezione | null>(null);
  const [showTab, setShowTab] = useState(false);
  const [showVerifica, setShowVerifica] = useState(false);
  const [showModelli, setShowModelli] = useState(false);
  const [riepilogo, setRiepilogo] = useState<Sessione | null>(null);
  const [invTarget, setInvTarget] = useState("");

  useEffect(() => {
    if (sessioneId) {
      const s = getSessione(sessioneId);
      if (s) { setSelClasse(s.classe); setSelSessId(s.id); setAmbito(isScrutinio(s) ? "scrutini" : "verifiche"); }
    }
  }, [sessioneId]);

  const tutte = selClasse ? sessioniDi(selClasse, anno).filter((s) => !s.archiviata) : [];
  const sessioni = tutte.filter((s) => (ambito === "scrutini") === isScrutinio(s));
  const sess = sessioni.find((s) => s.id === selSessId) ?? sessioni[0];
  const scrutinioModelli = v.griglie.filter((g) => g.categoria === "scrutinio-materia" || g.categoria === "condotta");
  const etichetta = ambito === "scrutini" ? "scrutinio" : "verifica";

  const newVerifica = () => setShowVerifica(true);
  const creaScrutinio = (model: Griglia) => {
    if (!selClasse) return;
    const griglia: Griglia = { ...model, id: newId(), indicatori: model.indicatori.map((i) => ({ ...i, id: newId() })), scala: { ...model.scala, fasce: model.scala.fasce?.map((f) => ({ ...f })) } };
    const righe = classeInfo(selClasse, profile).studenti.map((s) => ({ id: newId(), n: s.n, valori: {} }));
    const nuova: Sessione = { id: newId(), classe: selClasse, titolo: model.nome, data: oggi(), annoScolastico: anno, griglia, righe };
    upsertSessione(nuova);
    setSelSessId(nuova.id);
    onView({ kind: "valutazione", sessioneId: nuova.id });
  };
  const archivia = () => {
    if (confirm(`Archiviare le medie di classe dell'${anno}? Le verifiche restano consultabili nei trend; non saranno più modificabili qui.`)) {
      const n = archiviaAnno(anno);
      alert(n ? `Archiviate ${n} voci (medie di classe).` : "Nessuna verifica da archiviare.");
    }
  };

  return (
    <section className="valutazione">
      <div className="view-head">
        <h1>🧮 {ambito === "scrutini" ? "Scrutini" : "Calcolatore voti"}</h1>
        <div className="vz-tools">
          <div className="seg">
            <button className={ambito === "verifiche" ? "active" : ""} onClick={() => { setAmbito("verifiche"); setSelSessId(""); }}>📝 Verifiche</button>
            <button className={ambito === "scrutini" ? "active" : ""} onClick={() => { setAmbito("scrutini"); setSelSessId(""); }}>🗳️ Scrutini</button>
          </div>
          <select value={selClasse} onChange={(e) => { setSelClasse(e.target.value); setSelSessId(""); }}>
            {classi.length === 0 && <option value="">— (aggiungi classi nel profilo)</option>}
            {classi.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {sessioni.length > 0 && (
            <select value={sess?.id ?? ""} onChange={(e) => setSelSessId(e.target.value)}>
              {sessioni.map((s) => <option key={s.id} value={s.id}>{s.titolo} · {s.data}</option>)}
            </select>
          )}
          {ambito === "verifiche" ? (
            <button onClick={newVerifica} disabled={!selClasse}>+ Verifica</button>
          ) : (
            <details className="dropdown dropdown--start">
              <summary className="primary">+ Scrutinio</summary>
              <div className="dropdown-menu">
                {scrutinioModelli.length === 0 ? (
                  <button disabled>Nessun modello (vedi 📐 Modelli)</button>
                ) : scrutinioModelli.map((g) => (
                  <button key={g.id} disabled={!selClasse} onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); creaScrutinio(g); }}>{g.nome}</button>
                ))}
              </div>
            </details>
          )}
          <button onClick={() => setShowModelli(true)} title="Modelli di griglia (template)">📐 Modelli</button>
          <button onClick={archivia} title="Archivia le medie a fine anno">🗄️ Archivia a.s.</button>
        </div>
      </div>

      {!selClasse ? (
        <p className="muted">Aggiungi una classe (e la sua anagrafica) nel <b>Profilo → Orario & classi</b>, poi crea una {etichetta}.</p>
      ) : !sess ? (
        <div className="vz-empty">
          <p className="muted">Nessuna {etichetta} per <b>{selClasse}</b> nell'{anno}.</p>
          {ambito === "verifiche"
            ? <button className="primary" onClick={newVerifica}>+ Nuova verifica</button>
            : <p className="muted">Usa <b>+ Scrutinio</b> per crearne uno dai modelli (voto di materia / condotta).</p>}
        </div>
      ) : (
        <Correzione
          key={sess.id}
          sess={sess}
          selClasse={selClasse}
          invTarget={invTarget}
          setInvTarget={setInvTarget}
          onEditStruttura={() => setEditing({ g: sess.griglia, onSave: (g) => upsertSessione({ ...sess, griglia: g }) })}
          onScheda={setScheda}
          onShowTab={() => setShowTab(true)}
          onConcludi={() => { upsertSessione({ ...sess, conclusa: true }); setRiepilogo({ ...sess, conclusa: true }); }}
          onRiapri={() => upsertSessione({ ...sess, conclusa: false })}
          onRemove={() => { if (confirm(`Eliminare questa ${etichetta} e i suoi punteggi?`)) { removeSessione(sess.id); setSelSessId(""); } }}
        />
      )}

      {editing && <GrigliaEditor griglia={editing.g} onSave={editing.onSave} onClose={() => setEditing(null)} />}
      {scheda && sess && <SchedaStampa griglia={sess.griglia} riga={scheda} onClose={() => setScheda(null)} />}
      {showTab && sess && <TabellaModal sess={sess} onClose={() => setShowTab(false)} />}
      {riepilogo && <RiepilogoModal sess={riepilogo} onClose={() => setRiepilogo(null)} />}
      {showVerifica && <VerificaForm prefill={{ classe: selClasse }} onClose={() => setShowVerifica(false)} onOpen={(id) => { setShowVerifica(false); setAmbito("verifiche"); setSelSessId(id); onView({ kind: "valutazione", sessioneId: id }); }} />}
      {showModelli && <ModelliModal onEdit={(g) => { setShowModelli(false); setEditing({ g }); }} onClose={() => setShowModelli(false)} />}
    </section>
  );
}

// ── Correzione di una sessione ───────────────────────────────────────────────
function Correzione({ sess, selClasse, invTarget, setInvTarget, onEditStruttura, onScheda, onShowTab, onConcludi, onRiapri, onRemove }: {
  sess: Sessione;
  selClasse: string;
  invTarget: string;
  setInvTarget: (v: string) => void;
  onEditStruttura: () => void;
  onScheda: (r: RigaCorrezione) => void;
  onShowTab: () => void;
  onConcludi: () => void;
  onRiapri: () => void;
  onRemove: () => void;
}) {
  const profile = useProfile();
  const consentiNomi = useValutazione().consentiNomi;
  const griglia = sess.griglia;
  const scala = griglia.scala;
  const fasce = scala.tipo === "fasce";
  const indAttivi = griglia.indicatori.filter((i) => i.attivo !== false);
  const maxTot = indAttivi.reduce((s, i) => s + maxIndicatore(i), 0);
  const studMap = new Map(classeInfo(selClasse, profile).studenti.map((s) => [s.n, s]));

  const setScala = (patch: Partial<Griglia["scala"]>) => upsertSessione({ ...sess, griglia: { ...griglia, scala: { ...scala, ...patch } } });
  const applyPreset = (id: string) => { const p = SCALE_PRESETS[id]; if (p) setScala({ preset: id, votoMin: p.votoMin, votoMax: p.votoMax, sufficienza: p.sufficienza, arrotondamento: p.arrotondamento, labels: p.labels }); };
  const setValore = (rigaId: string, indId: string, val: number | undefined) =>
    upsertSessione({ ...sess, righe: sess.righe.map((r) => { if (r.id !== rigaId) return r; const valori = { ...r.valori }; if (val === undefined) delete valori[indId]; else valori[indId] = val; return { ...r, valori }; }) });
  const setNome = (rigaId: string, nome: string) => upsertSessione({ ...sess, righe: sess.righe.map((r) => (r.id === rigaId ? { ...r, nome } : r)) });
  const addRiga = () => upsertSessione({ ...sess, righe: [...sess.righe, { id: newId(), n: Math.max(0, ...sess.righe.map((r) => r.n ?? 0)) + 1, valori: {} }] });
  const removeRiga = (id: string) => upsertSessione({ ...sess, righe: sess.righe.filter((r) => r.id !== id) });
  const allinea = () => {
    const studs = classeInfo(selClasse, profile).studenti;
    if (studs.length === 0) { alert("Nessuna anagrafica per questa classe (impostala nel profilo)."); return; }
    const byN = new Map(sess.righe.map((r) => [r.n, r]));
    upsertSessione({ ...sess, righe: studs.map((st) => byN.get(st.n) ?? { id: newId(), n: st.n, valori: {} }) });
  };

  const compilate = sess.righe.filter(rigaCompilata);
  const dist = distribuzione(griglia, compilate);
  const inv = invTarget !== "" ? calcoloInverso(Number(invTarget), scala, maxTot) : null;

  const esportaCSV = () => {
    const head = ["registro", "nome", "punti", "max", "%", "voto", "esito"].join(";");
    const body = compilate.map((r) => { const vr = votoRiga(griglia, r); return [r.n ?? "", r.nome ?? "", num(vr.punti), vr.max, Math.round(vr.pct * 100), votoDisplay(vr.voto, scala), vr.voto >= scala.sufficienza ? "Suff" : "Insuff"].join(";"); }).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + head + "\n" + body], { type: "text/csv" }));
    a.download = `verifica-${selClasse}-${sess.data}.csv`;
    a.click();
  };

  return (
    <>
      <div className="vz-overview">
        <div className="vz-ov-main">
          <h2>{sess.titolo}{sess.conclusa && <span className="vz-conclusa">✔ conclusa</span>}</h2>
          <div className="vz-ov-chips">
            <span className="chip" style={{ borderColor: "var(--accent)" }}>{selClasse}</span>
            {sess.materia && <span className="chip">{sess.materia}</span>}
            <span className="chip">{sess.data}</span>
            <span className="chip">{categoriaLabel(griglia.categoria)}</span>
          </div>
          <div className="bar vz-ov-bar"><div style={{ width: `${sess.righe.length ? Math.round((compilate.length / sess.righe.length) * 100) : 0}%` }} /></div>
        </div>
        <div className="vz-ov-stats">
          <div className="vz-ov-metric"><b>{compilate.length}</b><small>/ {sess.righe.length} corretti</small></div>
          {dist.n > 0 && <div className="vz-ov-metric"><b>{num(dist.media)}</b><small>media</small></div>}
          {dist.n > 0 && <div className="vz-ov-metric"><b>{dist.pctSuff}%</b><small>sufficienti</small></div>}
        </div>
        <div className="vz-sessact">
          <button onClick={onEditStruttura}>✏️ Struttura</button>
          <button onClick={allinea}>👥 Allinea</button>
          {sess.conclusa
            ? <button onClick={onRiapri}>↻ Riapri</button>
            : <button className="primary" onClick={onConcludi} disabled={compilate.length === 0}>✔️ Concludi</button>}
          <button className="danger" onClick={onRemove} title="Elimina">🗑️</button>
        </div>
      </div>

      <div className="vz-bilancia">
        <label className="field sm"><span>Scala</span>
          <select value={scala.preset ?? "decimi"} onChange={(e) => applyPreset(e.target.value)}>
            {Object.entries(SCALE_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.nome}</option>)}
          </select>
        </label>
        {fasce ? <span className="vz-fasce-note">Scala <b>a fasce</b> (totale /{maxTot} → voto).</span> : (
          <>
            <label className="field sm"><span>Formula</span>
              <select value={scala.formula} onChange={(e) => setScala({ formula: e.target.value as Griglia["scala"]["formula"] })}>
                {Object.entries(FORMULE).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
              </select>
            </label>
            <label className="vz-slider"><span>Soglia suff.: <b>{scala.sogliaSuff}%</b></span>
              <input type="range" min={20} max={90} value={scala.sogliaSuff} onChange={(e) => setScala({ sogliaSuff: Number(e.target.value) })} />
            </label>
            <label className="field sm"><span>Arrotonda</span>
              <select value={`${scala.arrotondamento}|${scala.arrotondaModo}`} onChange={(e) => { const [st, mo] = e.target.value.split("|"); setScala({ arrotondamento: Number(st), arrotondaModo: mo as Griglia["scala"]["arrotondaModo"] }); }}>
                {[0.25, 0.5, 1].flatMap((st) => (Object.keys(ARROTONDAMENTI) as (keyof typeof ARROTONDAMENTI)[]).map((mo) => <option key={`${st}|${mo}`} value={`${st}|${mo}`}>{st} · {ARROTONDAMENTI[mo]}</option>))}
              </select>
            </label>
          </>
        )}
      </div>

      <div className="table-wrap">
        <table className="vz-table">
          <thead>
            <tr>
              <th className="vz-reg">Reg.</th>
              {indAttivi.map((ind) => <th key={ind.id} title={ind.descrizione}>{ind.nome}{ind.tipo === "punti" ? <small> /{ind.max}</small> : null}</th>)}
              <th>Voto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sess.righe.length === 0 && <tr><td colSpan={indAttivi.length + 3} className="muted">Nessuno studente. «Allinea anagrafica» o «+ Riga».</td></tr>}
            {sess.righe.map((r) => {
              const st = r.n != null ? studMap.get(r.n) : undefined;
              const vr = votoRiga(griglia, r);
              const suff = vr.voto >= scala.sufficienza;
              return (
                <tr key={r.id}>
                  <td className="vz-reg">
                    <span className="vz-regn">{r.n ?? "—"}</span>
                    {st?.l104 && <span className="vz-badge b104" title="L.104">104</span>}
                    {st?.bes && <span className="vz-badge bbes" title="BES">BES</span>}
                    {st?.dsa && <span className="vz-badge bdsa" title="DSA">DSA</span>}
                    {consentiNomi && <input className="vz-nome" type="text" placeholder="nome (locale)" value={r.nome ?? ""} onChange={(e) => setNome(r.id, e.target.value)} />}
                  </td>
                  {indAttivi.map((ind) => (
                    <td key={ind.id}>
                      {ind.tipo === "punti" ? (
                        <input type="number" min={0} max={ind.max} step="any" className="vz-pt" value={r.valori[ind.id] ?? ""} onChange={(e) => setValore(r.id, ind.id, e.target.value === "" ? undefined : Number(e.target.value))} />
                      ) : (
                        <select value={r.valori[ind.id] ?? ""} onChange={(e) => setValore(r.id, ind.id, e.target.value === "" ? undefined : Number(e.target.value))}>
                          <option value="">—</option>
                          {(ind.descrittori ?? []).map((d, di) => <option key={di} value={di}>{num(d.punti)} — {d.etichetta}</option>)}
                        </select>
                      )}
                    </td>
                  ))}
                  <td className={suff ? "vz-voto ok" : "vz-voto no"}>{votoDisplay(vr.voto, scala)}{vr.giudizio ? <small> {vr.giudizio}</small> : null}</td>
                  <td className="vz-rowact">
                    <button title="Scheda" onClick={() => onScheda(r)}>🖨️</button>
                    <button className="danger" aria-label="Rimuovi" onClick={() => removeRiga(r.id)}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="vz-actions">
        <button onClick={addRiga}>+ Riga</button>
        <button onClick={esportaCSV} disabled={compilate.length === 0}>📊 CSV</button>
        <button onClick={onShowTab}>📋 Tabella conversione</button>
      </div>

      <div className="vz-strumenti">
        {!fasce && (
          <div className="vz-inverso">
            <h4>🎯 Quanti punti per…</h4>
            <div className="vz-inv-row">
              <input type="number" step="any" placeholder={`voto (es. ${scala.sufficienza})`} value={invTarget} onChange={(e) => setInvTarget(e.target.value)} />
              <span>{inv && inv.punti != null ? <b>{num(inv.punti)} / {maxTot} punti</b> : "—"}</span>
              <button onClick={() => setInvTarget(String(scala.sufficienza))}>Sufficienza</button>
              <button onClick={() => setInvTarget(String(scala.votoMax))}>Voto pieno</button>
            </div>
          </div>
        )}
        {dist.n > 0 && (
          <div className="vz-dist">
            <span className="vz-sum big">Media classe <b>{num(dist.media)}</b></span>
            <span className="vz-sum">Valutati <b>{dist.n}</b></span>
            <span className="vz-sum s">Sufficienti <b>{dist.sufficienti}</b> ({dist.pctSuff}%)</span>
            <span className="vz-sum">Min <b>{num(dist.min)}</b> · Max <b>{num(dist.max)}</b></span>
            <span className="vz-sum">σ <b>{num(dist.devStd)}</b></span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Tabella conversione (modale) ─────────────────────────────────────────────
function TabellaModal({ sess, onClose }: { sess: import("../store/valutazione").Sessione; onClose: () => void }) {
  const griglia = sess.griglia;
  const maxTot = griglia.indicatori.filter((i) => i.attivo !== false).reduce((s, i) => s + maxIndicatore(i), 0);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head"><h2>📋 Tabella di conversione</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
        <div className="print-area">
          <p className="muted">{sess.titolo} · {sess.classe} · max {maxTot} punti</p>
          <table className="vz-conv">
            <thead><tr><th>Punti</th><th>%</th><th>Voto</th></tr></thead>
            <tbody>
              {tabellaConversione(maxTot, griglia.scala).map((r, i) => (
                <tr key={i} className={r.suff ? "ok" : "no"}><td>{num(r.punti)}</td><td>{Math.round(r.pct * 100)}%</td><td><b>{votoDisplay(r.voto, griglia.scala)}</b></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal-actions no-print"><button onClick={onClose}>Chiudi</button><button className="primary" onClick={() => window.print()}>🖨️ Stampa</button></div>
      </div>
    </div>
  );
}

// ── Riepilogo di chiusura della correzione ───────────────────────────────────
function RiepilogoModal({ sess, onClose }: { sess: Sessione; onClose: () => void }) {
  const compilate = sess.righe.filter(rigaCompilata);
  const dist = distribuzione(sess.griglia, compilate);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head"><h2>✔️ Riepilogo · {sess.titolo}</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
        <div className="print-area">
          <p className="muted">{sess.classe}{sess.materia ? ` · ${sess.materia}` : ""} · {sess.data} · {categoriaLabel(sess.griglia.categoria)}</p>
          {dist.n === 0 ? (
            <p className="muted">Nessuna riga compilata.</p>
          ) : (
            <div className="vz-riep">
              <div className="vz-riep-cell big"><b>{num(dist.media)}</b><small>media di classe</small></div>
              <div className="vz-riep-cell"><b>{dist.n}</b><small>valutati su {sess.righe.length}</small></div>
              <div className="vz-riep-cell"><b>{dist.sufficienti}</b><small>sufficienti ({dist.pctSuff}%)</small></div>
              <div className="vz-riep-cell"><b>{num(dist.min)}</b><small>minimo</small></div>
              <div className="vz-riep-cell"><b>{num(dist.max)}</b><small>massimo</small></div>
              <div className="vz-riep-cell"><b>{num(dist.devStd)}</b><small>dev. std (σ)</small></div>
            </div>
          )}
          <p className="muted vz-riep-note">Procedura conclusa: la correzione resta consultabile e riapribile dal pulsante «↻ Riapri».</p>
        </div>
        <div className="modal-actions no-print"><button onClick={onClose}>Chiudi</button><button className="primary" onClick={() => window.print()}>🖨️ Stampa</button></div>
      </div>
    </div>
  );
}

// ── Modelli (template) ───────────────────────────────────────────────────────
function ModelliModal({ onEdit, onClose }: { onEdit: (g: Griglia) => void; onClose: () => void }) {
  const { griglie } = useValutazione();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head"><h2>📐 Modelli di griglia</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
        <p className="muted">Strutture riutilizzabili (esercizi, rubriche, scrutinio voto-materia, condotta) da personalizzare col tuo PTOF.</p>
        <ul className="modelli-list">
          {griglie.map((g) => (
            <li key={g.id}><span>{g.nome} <em>· {categoriaLabel(g.categoria)}</em></span><button onClick={() => onEdit(g)}>Modifica</button></li>
          ))}
        </ul>
        <div className="modal-actions">
          <button onClick={onClose}>Chiudi</button>
          <button className="primary" onClick={() => onEdit(nuovaGriglia("scrutinio-materia"))}>+ Nuovo modello</button>
        </div>
      </div>
    </div>
  );
}
