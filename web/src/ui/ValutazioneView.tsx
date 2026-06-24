import { useRef, useState } from "react";
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
  importGriglie,
  newId,
  nuovaGriglia,
  setBozza,
  setConsentiNomi,
  svuotaBozza,
  upsertGriglia,
  useValutazione,
  type Categoria,
  type Griglia,
  type RigaCorrezione,
} from "../store/valutazione";
import { GrigliaEditor } from "./GrigliaEditor";
import { SchedaStampa } from "./SchedaStampa";

const CAT_LABEL: Record<Categoria, string> = {
  esercizi: "Esercizi", scritto: "Scritto", orale: "Orale", "scrutinio-materia": "Scrutinio · materia", condotta: "Condotta", altro: "Altro",
};
const num = (v: number) => v.toLocaleString("it-IT", { maximumFractionDigits: 2 });

export function ValutazioneView() {
  const v = useValutazione();
  const griglie = v.griglie;
  const [grigliaId, setGrigliaId] = useState<string>(() => griglie[0]?.id ?? "");
  const [editing, setEditing] = useState<Griglia | null>(null);
  const [scheda, setScheda] = useState<RigaCorrezione | null>(null);
  const [showTab, setShowTab] = useState(false);
  const [invTarget, setInvTarget] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const griglia = griglie.find((g) => g.id === grigliaId) ?? griglie[0];
  const righe: RigaCorrezione[] = griglia ? (v.bozze[griglia.id] ?? []) : [];

  if (!griglia) {
    return (
      <section><div className="view-head"><h1>🧮 Calcolatore voti</h1></div>
        <p className="muted"><button onClick={() => { const g = nuovaGriglia(); upsertGriglia(g); setGrigliaId(g.id); setEditing(g); }}>+ Nuova griglia</button></p>
      </section>
    );
  }

  const scala = griglia.scala;
  const fasce = scala.tipo === "fasce";
  const indAttivi = griglia.indicatori.filter((i) => i.attivo !== false);
  const maxTot = indAttivi.reduce((s, i) => s + maxIndicatore(i), 0);

  const setScala = (patch: Partial<Griglia["scala"]>) => upsertGriglia({ ...griglia, scala: { ...scala, ...patch } });
  const applyPreset = (id: string) => {
    const p = SCALE_PRESETS[id];
    if (p) setScala({ preset: id, votoMin: p.votoMin, votoMax: p.votoMax, sufficienza: p.sufficienza, arrotondamento: p.arrotondamento, labels: p.labels });
  };

  const setValore = (rigaId: string, indId: string, val: number | undefined) => {
    setBozza(griglia.id, righe.map((r) => {
      if (r.id !== rigaId) return r;
      const valori = { ...r.valori };
      if (val === undefined) delete valori[indId];
      else valori[indId] = val;
      return { ...r, valori };
    }));
  };
  const patchRiga = (rigaId: string, patch: Partial<RigaCorrezione>) =>
    setBozza(griglia.id, righe.map((r) => (r.id === rigaId ? { ...r, ...patch } : r)));
  const addRiga = () => setBozza(griglia.id, [...righe, { id: newId(), valori: {} }]);
  const removeRiga = (id: string) => setBozza(griglia.id, righe.filter((r) => r.id !== id));

  const compilate = righe.filter(rigaCompilata);
  const dist = distribuzione(griglia, compilate);
  const inv = invTarget !== "" ? calcoloInverso(Number(invTarget), scala, maxTot) : null;

  const esportaGriglie = () => {
    const blob = new Blob([JSON.stringify(griglie, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `griglie-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const onImport = async (f: File) => {
    try { const d = JSON.parse(await f.text()); if (Array.isArray(d)) importGriglie(d as Griglia[]); else alert("Il file non contiene griglie."); }
    catch { alert("File JSON non valido."); }
  };
  const esportaCSV = () => {
    const head = ["nome", "classe", "punti", "max", "%", "voto", "esito"].join(";");
    const body = compilate.map((r) => {
      const vr = votoRiga(griglia, r);
      return [r.nome ?? "", r.classe ?? "", num(vr.punti), vr.max, Math.round(vr.pct * 100), votoDisplay(vr.voto, scala), vr.voto >= scala.sufficienza ? "Suff" : "Insuff"].join(";");
    }).join("\n");
    const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `valutazione-${griglia.categoria}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <section className="valutazione">
      <div className="view-head">
        <h1>🧮 Calcolatore voti</h1>
        <div className="vz-tools">
          <select value={griglia.id} onChange={(e) => setGrigliaId(e.target.value)}>
            {griglie.map((g) => <option key={g.id} value={g.id}>{CAT_LABEL[g.categoria]} · {g.nome}</option>)}
          </select>
          <button onClick={() => setEditing(griglia)}>✏️ Modifica</button>
          <button onClick={() => { const g = nuovaGriglia(); upsertGriglia(g); setGrigliaId(g.id); setEditing(g); }}>+ Nuova</button>
          <button onClick={esportaGriglie} title="Esporta griglie (senza voti)">⬇️</button>
          <button onClick={() => fileRef.current?.click()} title="Importa griglie">⬆️</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ""; }} />
        </div>
      </div>

      {/* Config / bilanciamento */}
      <div className="vz-bilancia">
        <label className="field sm"><span>Scala</span>
          <select value={scala.preset ?? "decimi"} onChange={(e) => applyPreset(e.target.value)}>
            {Object.entries(SCALE_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.nome}</option>)}
          </select>
        </label>
        {fasce ? (
          <span className="vz-fasce-note">Scala <b>a fasce di punteggio</b> (totale /{maxTot} → voto). Modifica le fasce dall'editor.</span>
        ) : (
          <>
            <label className="field sm"><span>Formula</span>
              <select value={scala.formula} onChange={(e) => setScala({ formula: e.target.value as Griglia["scala"]["formula"] })}>
                {Object.entries(FORMULE).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
              </select>
            </label>
            <label className="vz-slider">
              <span>Soglia sufficienza: <b>{scala.sogliaSuff}%</b></span>
              <input type="range" min={20} max={90} value={scala.sogliaSuff} onChange={(e) => setScala({ sogliaSuff: Number(e.target.value) })} />
              <em>più bassa = più facile</em>
            </label>
            <label className="field sm"><span>Arrotonda</span>
              <select value={`${scala.arrotondamento}|${scala.arrotondaModo}`} onChange={(e) => { const [st, mo] = e.target.value.split("|"); setScala({ arrotondamento: Number(st), arrotondaModo: mo as Griglia["scala"]["arrotondaModo"] }); }}>
                {[0.25, 0.5, 1].flatMap((st) => (Object.keys(ARROTONDAMENTI) as (keyof typeof ARROTONDAMENTI)[]).map((mo) => (
                  <option key={`${st}|${mo}`} value={`${st}|${mo}`}>{st} · {ARROTONDAMENTI[mo]}</option>
                )))}
              </select>
            </label>
            <label className="field sm chk2"><input type="checkbox" checked={!!scala.quasiSuff} onChange={(e) => setScala({ quasiSuff: e.target.checked })} /> quasi-suff → {scala.sufficienza}</label>
          </>
        )}
      </div>

      {/* Tabella correzione */}
      <div className="table-wrap">
        <table className="vz-table">
          <thead>
            <tr>
              {v.consentiNomi && <th className="vz-lbl">Candidato</th>}
              {v.consentiNomi && <th className="vz-lbl">Classe</th>}
              {indAttivi.map((ind) => <th key={ind.id} title={ind.descrizione}>{ind.nome}{ind.tipo === "punti" ? <small> /{ind.max}</small> : null}</th>)}
              <th>Voto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {righe.length === 0 && <tr><td colSpan={indAttivi.length + (v.consentiNomi ? 4 : 2)} className="muted">Nessun candidato. Usa «+ Riga».</td></tr>}
            {righe.map((r, i) => {
              const vr = votoRiga(griglia, r);
              const suff = vr.voto >= scala.sufficienza;
              return (
                <tr key={r.id}>
                  {v.consentiNomi && <td className="vz-lbl"><input type="text" placeholder={`${i + 1}`} value={r.nome ?? ""} onChange={(e) => patchRiga(r.id, { nome: e.target.value })} /></td>}
                  {v.consentiNomi && <td className="vz-lbl"><input type="text" placeholder="—" value={r.classe ?? ""} onChange={(e) => patchRiga(r.id, { classe: e.target.value })} /></td>}
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
                    <button title="Scheda stampabile" onClick={() => setScheda(r)}>🖨️</button>
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
        <button onClick={() => setShowTab(true)}>📋 Tabella conversione</button>
        {righe.length > 0 && <button className="danger" onClick={() => { if (confirm("Svuotare la correzione corrente?")) svuotaBozza(griglia.id); }}>Svuota</button>}
        <label className="field sm chk2"><input type="checkbox" checked={v.consentiNomi} onChange={(e) => setConsentiNomi(e.target.checked)} /> nomi</label>
        <span className="muted vz-hint">I nomi restano <b>solo su questo dispositivo</b> (fuori dal backup). Usa numeri/iniziali se preferisci.</span>
      </div>

      {/* Strumenti */}
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
            <span className="vz-sum">Candidati <b>{dist.n}</b></span>
            <span className="vz-sum s">Sufficienti <b>{dist.sufficienti}</b> ({dist.pctSuff}%)</span>
            <span className="vz-sum">Media <b>{num(dist.media)}</b></span>
            <span className="vz-sum">Min <b>{num(dist.min)}</b> · Max <b>{num(dist.max)}</b></span>
            <span className="vz-sum">σ <b>{num(dist.devStd)}</b></span>
          </div>
        )}
      </div>

      {editing && <GrigliaEditor griglia={editing} onClose={() => setEditing(null)} />}
      {scheda && <SchedaStampa griglia={griglia} riga={scheda} onClose={() => setScheda(null)} />}
      {showTab && (
        <div className="modal-backdrop" onClick={() => setShowTab(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head"><h2>📋 Tabella di conversione</h2><button className="icon-btn" onClick={() => setShowTab(false)}>✕</button></div>
            <div className="print-area">
              <p className="muted">{griglia.nome} · max {maxTot} punti · {fasce ? "scala a fasce" : FORMULE[scala.formula].nome + ` · soglia ${scala.sogliaSuff}%`}</p>
              <table className="vz-conv">
                <thead><tr><th>Punti</th><th>%</th><th>Voto</th></tr></thead>
                <tbody>
                  {tabellaConversione(maxTot, scala).map((r, i) => (
                    <tr key={i} className={r.suff ? "ok" : "no"}>
                      <td>{num(r.punti)}</td><td>{Math.round(r.pct * 100)}%</td><td><b>{votoDisplay(r.voto, scala)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions no-print">
              <button onClick={() => setShowTab(false)}>Chiudi</button>
              <button className="primary" onClick={() => window.print()}>🖨️ Stampa</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
