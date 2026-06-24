import { useState } from "react";
import { ARROTONDAMENTI, FORMULE, SCALE_PRESETS } from "../compute/voto";
import { newId, removeGriglia, upsertGriglia, type Categoria, type Fascia, type Griglia, type Indicatore } from "../store/valutazione";

const CATEGORIE: { id: Categoria; label: string }[] = [
  { id: "esercizi", label: "Verifica a esercizi" },
  { id: "scritto", label: "Scritto (tema/risposte aperte)" },
  { id: "orale", label: "Orale / interrogazione" },
  { id: "scrutinio-materia", label: "Scrutinio · voto di materia" },
  { id: "condotta", label: "Scrutinio · condotta" },
  { id: "altro", label: "Altro" },
];

export function GrigliaEditor({ griglia, onClose, onSave }: { griglia: Griglia; onClose: () => void; onSave?: (g: Griglia) => void }) {
  const [g, setG] = useState<Griglia>(() => structuredClone(griglia));
  const s = g.scala;

  const setScala = (patch: Partial<Griglia["scala"]>) => setG((x) => ({ ...x, scala: { ...x.scala, ...patch } }));
  const applyPreset = (id: string) => {
    const p = SCALE_PRESETS[id];
    if (p) setScala({ preset: id, votoMin: p.votoMin, votoMax: p.votoMax, sufficienza: p.sufficienza, arrotondamento: p.arrotondamento, labels: p.labels });
  };

  const setInd = (id: string, patch: Partial<Indicatore>) => setG((x) => ({ ...x, indicatori: x.indicatori.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const removeInd = (id: string) => setG((x) => ({ ...x, indicatori: x.indicatori.filter((i) => i.id !== id) }));
  const addInd = (tipo: "punti" | "livelli") =>
    setG((x) => ({ ...x, indicatori: [...x.indicatori, tipo === "punti"
      ? { id: newId(), nome: "Nuovo indicatore", tipo: "punti", max: 5, peso: 1, attivo: true }
      : { id: newId(), nome: "Nuovo indicatore", tipo: "livelli", peso: 1, attivo: true, descrittori: [{ etichetta: "Insufficiente", punti: 0 }, { etichetta: "Sufficiente", punti: 1 }, { etichetta: "Buono", punti: 2 }] }] }));

  const setDesc = (indId: string, di: number, patch: Partial<{ etichetta: string; punti: number }>) =>
    setG((x) => ({ ...x, indicatori: x.indicatori.map((i) => (i.id === indId ? { ...i, descrittori: (i.descrittori ?? []).map((d, j) => (j === di ? { ...d, ...patch } : d)) } : i)) }));
  const addDesc = (indId: string) => setG((x) => ({ ...x, indicatori: x.indicatori.map((i) => (i.id === indId ? { ...i, descrittori: [...(i.descrittori ?? []), { etichetta: "Livello", punti: 0 }] } : i)) }));
  const removeDesc = (indId: string, di: number) => setG((x) => ({ ...x, indicatori: x.indicatori.map((i) => (i.id === indId ? { ...i, descrittori: (i.descrittori ?? []).filter((_, j) => j !== di) } : i)) }));

  const setFascia = (i: number, patch: Partial<Fascia>) => setScala({ fasce: (s.fasce ?? []).map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const addFascia = () => setScala({ fasce: [...(s.fasce ?? []), { min: 0, max: 0, voto: s.votoMin }] });
  const removeFascia = (i: number) => setScala({ fasce: (s.fasce ?? []).filter((_, j) => j !== i) });

  const save = () => { if (onSave) onSave(g); else upsertGriglia(g); onClose(); };
  const del = () => { if (confirm("Eliminare questa griglia?")) { removeGriglia(g.id); onClose(); } };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wizard" onClick={(e) => e.stopPropagation()}>
        <h2>🧮 Modifica griglia</h2>
        <p className="muted">Indicatori, misuratori e descrittori secondo il tuo PTOF.</p>

        <div className="ge-meta">
          <label className="field"><span>Nome</span><input type="text" value={g.nome} onChange={(e) => setG((x) => ({ ...x, nome: e.target.value }))} /></label>
          <label className="field"><span>Categoria</span>
            <select value={g.categoria} onChange={(e) => setG((x) => ({ ...x, categoria: e.target.value as Categoria }))}>
              {CATEGORIE.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </div>

        <h3 className="ge-h">Scala e bilanciamento</h3>
        <div className="ge-scala">
          <label className="field"><span>Preset</span>
            <select value={s.preset ?? "decimi"} onChange={(e) => applyPreset(e.target.value)}>
              {Object.entries(SCALE_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.nome}</option>)}
            </select>
          </label>
          <label className="field"><span>Tipo</span>
            <select value={s.tipo} onChange={(e) => setScala({ tipo: e.target.value as "curva" | "fasce" })}>
              <option value="curva">a curva (%)</option><option value="fasce">a fasce (punti)</option>
            </select>
          </label>
          <label className="field"><span>Voto min</span><input type="number" value={s.votoMin} onChange={(e) => setScala({ votoMin: Number(e.target.value) })} /></label>
          <label className="field"><span>Sufficienza</span><input type="number" value={s.sufficienza} onChange={(e) => setScala({ sufficienza: Number(e.target.value) })} /></label>
          <label className="field"><span>Voto max</span><input type="number" value={s.votoMax} onChange={(e) => setScala({ votoMax: Number(e.target.value) })} /></label>
          {s.tipo === "curva" && <>
            <label className="field"><span>Formula</span>
              <select value={s.formula} onChange={(e) => setScala({ formula: e.target.value as Griglia["scala"]["formula"] })}>
                {Object.entries(FORMULE).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
              </select>
            </label>
            <label className="field"><span>Soglia suff. %</span><input type="number" value={s.sogliaSuff} onChange={(e) => setScala({ sogliaSuff: Number(e.target.value) })} /></label>
            <label className="field"><span>Arrotonda</span>
              <select value={`${s.arrotondamento}|${s.arrotondaModo}`} onChange={(e) => { const [st, mo] = e.target.value.split("|"); setScala({ arrotondamento: Number(st), arrotondaModo: mo as Griglia["scala"]["arrotondaModo"] }); }}>
                {[0.25, 0.5, 1].flatMap((st) => (Object.keys(ARROTONDAMENTI) as (keyof typeof ARROTONDAMENTI)[]).map((mo) => <option key={`${st}|${mo}`} value={`${st}|${mo}`}>{st} · {ARROTONDAMENTI[mo]}</option>))}
              </select>
            </label>
            <label className="field chk2"><input type="checkbox" checked={!!s.quasiSuff} onChange={(e) => setScala({ quasiSuff: e.target.checked })} /> quasi-suff → sufficienza</label>
          </>}
        </div>

        {s.tipo === "fasce" && (
          <div className="ge-fasce">
            <div className="ge-fasce-head"><span>Fasce di punteggio → voto</span><button onClick={addFascia}>+ Fascia</button></div>
            {(s.fasce ?? []).map((f, i) => (
              <div key={i} className="ge-fascia-row">
                <input type="number" value={f.min} onChange={(e) => setFascia(i, { min: Number(e.target.value) })} title="da" />
                <span>–</span>
                <input type="number" value={f.max} onChange={(e) => setFascia(i, { max: Number(e.target.value) })} title="a" />
                <span>→</span>
                <input type="number" value={f.voto} onChange={(e) => setFascia(i, { voto: Number(e.target.value) })} title="voto" />
                <input type="text" value={f.giudizio ?? ""} placeholder="giudizio" onChange={(e) => setFascia(i, { giudizio: e.target.value })} />
                <button className="danger" onClick={() => removeFascia(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <h3 className="ge-h">Indicatori</h3>
        <div className="ge-inds">
          {g.indicatori.length === 0 && <p className="muted">Nessun indicatore: aggiungine uno.</p>}
          {g.indicatori.map((ind) => (
            <div key={ind.id} className="ge-ind">
              <div className="ge-ind-head">
                <input className="ge-ind-nome" type="text" value={ind.nome} onChange={(e) => setInd(ind.id, { nome: e.target.value })} />
                <select value={ind.tipo} onChange={(e) => setInd(ind.id, { tipo: e.target.value as "punti" | "livelli" })}>
                  <option value="punti">a punti</option><option value="livelli">a livelli</option>
                </select>
                <label className="ge-peso">peso <input type="number" value={ind.peso ?? 1} min={0} step="0.1" onChange={(e) => setInd(ind.id, { peso: Number(e.target.value) })} /></label>
                {ind.tipo === "punti" && <label className="ge-peso">max <input type="number" value={ind.max ?? 0} min={0} onChange={(e) => setInd(ind.id, { max: Number(e.target.value) })} /></label>}
                <label className="ge-peso"><input type="checkbox" checked={ind.attivo !== false} onChange={(e) => setInd(ind.id, { attivo: e.target.checked })} /> attivo</label>
                <button className="danger" aria-label="Rimuovi" onClick={() => removeInd(ind.id)}>✕</button>
              </div>
              <input className="ge-ind-desc" type="text" placeholder="Descrizione (facoltativa)" value={ind.descrizione ?? ""} onChange={(e) => setInd(ind.id, { descrizione: e.target.value })} />
              {ind.tipo === "livelli" && (
                <div className="ge-desc">
                  {(ind.descrittori ?? []).map((d, di) => (
                    <div key={di} className="ge-desc-row">
                      <input type="number" step="0.25" value={d.punti} onChange={(e) => setDesc(ind.id, di, { punti: Number(e.target.value) })} />
                      <input type="text" value={d.etichetta} onChange={(e) => setDesc(ind.id, di, { etichetta: e.target.value })} />
                      <button className="danger" onClick={() => removeDesc(ind.id, di)}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => addDesc(ind.id)}>+ Livello</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="ge-addrow">
          <button onClick={() => addInd("punti")}>+ Indicatore a punti</button>
          <button onClick={() => addInd("livelli")}>+ Indicatore a livelli</button>
        </div>

        <div className="modal-actions wizard-actions">
          {!onSave && <button className="danger" onClick={del}>Elimina</button>}
          <span className="spacer" />
          <button onClick={onClose}>Annulla</button>
          <button className="primary" onClick={save}>Salva griglia</button>
        </div>
      </div>
    </div>
  );
}
