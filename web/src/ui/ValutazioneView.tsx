import { useRef, useState } from "react";
import {
  importGriglie,
  newId,
  nuovaGriglia,
  setBozza,
  svuotaBozza,
  upsertGriglia,
  useValutazione,
  type Categoria,
  type Griglia,
  type RigaCorrezione,
} from "../store/valutazione";
import { distribuzione, rigaCompilata, votoRiga } from "../compute/voto";
import { GrigliaEditor } from "./GrigliaEditor";

const CAT_LABEL: Record<Categoria, string> = {
  esercizi: "Esercizi",
  scritto: "Scritto",
  orale: "Orale",
  "scrutinio-materia": "Scrutinio · materia",
  condotta: "Scrutinio · condotta",
  altro: "Altro",
};

const num = (v: number) => v.toLocaleString("it-IT", { maximumFractionDigits: 2 });

export function ValutazioneView() {
  const v = useValutazione();
  const griglie = v.griglie;
  const [grigliaId, setGrigliaId] = useState<string>(() => griglie[0]?.id ?? "");
  const [editing, setEditing] = useState<Griglia | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const griglia = griglie.find((g) => g.id === grigliaId) ?? griglie[0];
  const righe: RigaCorrezione[] = griglia ? (v.bozze[griglia.id] ?? []) : [];

  if (!griglia) {
    return (
      <section><div className="view-head"><h1>🧮 Calcolatore voti</h1></div>
        <p className="muted">Nessuna griglia. <button onClick={() => setEditing(nuovaGriglia())}>+ Nuova griglia</button></p>
      </section>
    );
  }

  const scala = griglia.scala;
  const setScala = (patch: Partial<Griglia["scala"]>) => upsertGriglia({ ...griglia, scala: { ...scala, ...patch } });

  const setValore = (rigaId: string, indId: string, val: number | undefined) => {
    const next = righe.map((r) => {
      if (r.id !== rigaId) return r;
      const valori = { ...r.valori };
      if (val === undefined) delete valori[indId];
      else valori[indId] = val;
      return { ...r, valori };
    });
    setBozza(griglia.id, next);
  };
  const setEtichetta = (rigaId: string, etichetta: string) =>
    setBozza(griglia.id, righe.map((r) => (r.id === rigaId ? { ...r, etichetta } : r)));
  const addRiga = () => setBozza(griglia.id, [...righe, { id: newId(), valori: {} }]);
  const removeRiga = (id: string) => setBozza(griglia.id, righe.filter((r) => r.id !== id));

  const compilate = righe.filter(rigaCompilata);
  const dist = distribuzione(griglia, compilate);
  // istogramma per voto intero
  const hist: { voto: number; n: number }[] = [];
  for (let val = Math.round(scala.votoMin); val <= Math.round(scala.votoMax); val++) {
    hist.push({ voto: val, n: compilate.filter((r) => Math.round(votoRiga(griglia, r).voto) === val).length });
  }
  const histMax = Math.max(1, ...hist.map((h) => h.n));

  const esporta = () => {
    const blob = new Blob([JSON.stringify(griglie, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `griglie-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (Array.isArray(data)) importGriglie(data as Griglia[]);
      else alert("Il file non contiene un elenco di griglie.");
    } catch {
      alert("File JSON non valido.");
    }
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
          <button onClick={esporta} title="Esporta tutte le griglie">⬇️</button>
          <button onClick={() => fileRef.current?.click()} title="Importa griglie">⬆️</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ""; }} />
        </div>
      </div>

      <div className="vz-bilancia">
        <label className="vz-slider">
          <span>Soglia di sufficienza: <b>{scala.sogliaSuff}%</b> dei punti</span>
          <input type="range" min={20} max={90} value={scala.sogliaSuff} onChange={(e) => setScala({ sogliaSuff: Number(e.target.value) })} />
          <em>più bassa = più facile · più alta = più difficile</em>
        </label>
        <label className="field sm"><span>Voto min</span><input type="number" value={scala.votoMin} onChange={(e) => setScala({ votoMin: Number(e.target.value) })} /></label>
        <label className="field sm"><span>Arrotonda</span>
          <select value={scala.arrotondamento} onChange={(e) => setScala({ arrotondamento: Number(e.target.value) })}>
            <option value={0.25}>0,25</option><option value={0.5}>0,5</option><option value={1}>1</option>
          </select>
        </label>
        <label className="field sm"><span>Curva</span>
          <select value={scala.curva} onChange={(e) => setScala({ curva: e.target.value as "sufficienza" | "lineare" })}>
            <option value="sufficienza">a sufficienza</option><option value="lineare">lineare</option>
          </select>
        </label>
      </div>

      {griglia.indicatori.length === 0 ? (
        <p className="muted">La griglia non ha indicatori. <button onClick={() => setEditing(griglia)}>Aprila e aggiungili</button>.</p>
      ) : (
        <div className="table-wrap">
          <table className="vz-table">
            <thead>
              <tr>
                <th className="vz-lbl">Candidato</th>
                {griglia.indicatori.map((ind) => (
                  <th key={ind.id}>{ind.nome}{ind.tipo === "punti" ? <small> /{ind.max}</small> : null}</th>
                ))}
                <th>Voto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {righe.length === 0 && (
                <tr><td colSpan={griglia.indicatori.length + 3} className="muted">Nessun candidato. Usa «+ Riga».</td></tr>
              )}
              {righe.map((r, i) => {
                const vr = votoRiga(griglia, r);
                const suff = vr.voto >= scala.sufficienza;
                return (
                  <tr key={r.id}>
                    <td className="vz-lbl">
                      <input type="text" placeholder={`${i + 1}`} value={r.etichetta ?? ""} onChange={(e) => setEtichetta(r.id, e.target.value)} />
                    </td>
                    {griglia.indicatori.map((ind) => (
                      <td key={ind.id}>
                        {ind.tipo === "punti" ? (
                          <input
                            type="number" min={0} max={ind.max} step="any" className="vz-pt"
                            value={r.valori[ind.id] ?? ""}
                            onChange={(e) => setValore(r.id, ind.id, e.target.value === "" ? undefined : Number(e.target.value))}
                          />
                        ) : (
                          <select value={r.valori[ind.id] ?? ""} onChange={(e) => setValore(r.id, ind.id, e.target.value === "" ? undefined : Number(e.target.value))}>
                            <option value="">—</option>
                            {(ind.descrittori ?? []).map((d, di) => <option key={di} value={di}>{d.etichetta} ({d.punti})</option>)}
                          </select>
                        )}
                      </td>
                    ))}
                    <td className={suff ? "vz-voto ok" : "vz-voto no"}>{num(vr.voto)}</td>
                    <td><button className="danger" aria-label="Rimuovi" onClick={() => removeRiga(r.id)}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="vz-actions">
        <button onClick={addRiga}>+ Riga</button>
        {righe.length > 0 && <button className="danger" onClick={() => { if (confirm("Svuotare la correzione corrente?")) svuotaBozza(griglia.id); }}>Svuota</button>}
        <span className="muted vz-hint">Etichette facoltative: usa numeri o iniziali, <b>non nomi</b>. I dati restano su questo dispositivo.</span>
      </div>

      {dist.n > 0 && (
        <div className="vz-dist">
          <div className="vz-dist-stats">
            <span className="vz-sum">Candidati <b>{dist.n}</b></span>
            <span className="vz-sum s">Sufficienti <b>{dist.sufficienti}</b> ({dist.pctSuff}%)</span>
            <span className="vz-sum">Media <b>{num(dist.media)}</b></span>
            <span className="vz-sum">Min <b>{num(dist.min)}</b> · Max <b>{num(dist.max)}</b></span>
          </div>
          <div className="vz-hist">
            {hist.map((h) => (
              <div key={h.voto} className={`vz-bar${h.voto >= scala.sufficienza ? " ok" : ""}`} title={`${h.n} con voto ~${h.voto}`}>
                <span style={{ height: `${(h.n / histMax) * 100}%` }} />
                <small>{h.voto}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && <GrigliaEditor griglia={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
