import { useState } from "react";
import { newId, removeGriglia, upsertGriglia, type Categoria, type Griglia, type Indicatore } from "../store/valutazione";

const CATEGORIE: { id: Categoria; label: string }[] = [
  { id: "esercizi", label: "Verifica a esercizi" },
  { id: "scritto", label: "Scritto (tema/risposte aperte)" },
  { id: "orale", label: "Orale / interrogazione" },
  { id: "scrutinio-materia", label: "Scrutinio · voto di materia" },
  { id: "condotta", label: "Scrutinio · condotta" },
  { id: "altro", label: "Altro" },
];

/** Editor di una griglia: nome, categoria, scala e indicatori (punti o livelli). Personalizzabile (PTOF). */
export function GrigliaEditor({ griglia, onClose }: { griglia: Griglia; onClose: () => void }) {
  const [g, setG] = useState<Griglia>(() => structuredClone(griglia));

  const setScala = (patch: Partial<Griglia["scala"]>) => setG((x) => ({ ...x, scala: { ...x.scala, ...patch } }));
  const setInd = (id: string, patch: Partial<Indicatore>) => setG((x) => ({ ...x, indicatori: x.indicatori.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const removeInd = (id: string) => setG((x) => ({ ...x, indicatori: x.indicatori.filter((i) => i.id !== id) }));
  const addInd = (tipo: "punti" | "livelli") =>
    setG((x) => ({
      ...x,
      indicatori: [
        ...x.indicatori,
        tipo === "punti"
          ? { id: newId(), nome: "Nuovo indicatore", tipo: "punti", max: 5, peso: 1 }
          : { id: newId(), nome: "Nuovo indicatore", tipo: "livelli", peso: 1, descrittori: [{ etichetta: "Insufficiente", punti: 0 }, { etichetta: "Sufficiente", punti: 1 }, { etichetta: "Buono", punti: 2 }] },
      ],
    }));

  const setDesc = (indId: string, di: number, patch: Partial<{ etichetta: string; punti: number }>) =>
    setG((x) => ({
      ...x,
      indicatori: x.indicatori.map((i) => (i.id === indId ? { ...i, descrittori: (i.descrittori ?? []).map((d, j) => (j === di ? { ...d, ...patch } : d)) } : i)),
    }));
  const addDesc = (indId: string) =>
    setG((x) => ({ ...x, indicatori: x.indicatori.map((i) => (i.id === indId ? { ...i, descrittori: [...(i.descrittori ?? []), { etichetta: "Livello", punti: 0 }] } : i)) }));
  const removeDesc = (indId: string, di: number) =>
    setG((x) => ({ ...x, indicatori: x.indicatori.map((i) => (i.id === indId ? { ...i, descrittori: (i.descrittori ?? []).filter((_, j) => j !== di) } : i)) }));

  const save = () => { upsertGriglia(g); onClose(); };
  const del = () => { if (confirm("Eliminare questa griglia?")) { removeGriglia(g.id); onClose(); } };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wizard" onClick={(e) => e.stopPropagation()}>
        <h2>🧮 Modifica griglia</h2>
        <p className="muted">Personalizza indicatori, misuratori e descrittori secondo il tuo PTOF.</p>

        <div className="ge-meta">
          <label className="field">
            <span>Nome</span>
            <input type="text" value={g.nome} onChange={(e) => setG((x) => ({ ...x, nome: e.target.value }))} />
          </label>
          <label className="field">
            <span>Categoria</span>
            <select value={g.categoria} onChange={(e) => setG((x) => ({ ...x, categoria: e.target.value as Categoria }))}>
              {CATEGORIE.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </div>

        <h3 className="ge-h">Scala e bilanciamento</h3>
        <div className="ge-scala">
          <label className="field"><span>Voto min</span><input type="number" value={g.scala.votoMin} onChange={(e) => setScala({ votoMin: Number(e.target.value) })} /></label>
          <label className="field"><span>Sufficienza</span><input type="number" value={g.scala.sufficienza} onChange={(e) => setScala({ sufficienza: Number(e.target.value) })} /></label>
          <label className="field"><span>Voto max</span><input type="number" value={g.scala.votoMax} onChange={(e) => setScala({ votoMax: Number(e.target.value) })} /></label>
          <label className="field"><span>Soglia suff. %</span><input type="number" value={g.scala.sogliaSuff} onChange={(e) => setScala({ sogliaSuff: Number(e.target.value) })} /></label>
          <label className="field"><span>Arrotonda</span>
            <select value={g.scala.arrotondamento} onChange={(e) => setScala({ arrotondamento: Number(e.target.value) })}>
              <option value={0.25}>0,25</option><option value={0.5}>0,5</option><option value={1}>1</option>
            </select>
          </label>
          <label className="field"><span>Curva</span>
            <select value={g.scala.curva} onChange={(e) => setScala({ curva: e.target.value as "sufficienza" | "lineare" })}>
              <option value="sufficienza">a sufficienza</option><option value="lineare">lineare</option>
            </select>
          </label>
        </div>

        <h3 className="ge-h">Indicatori</h3>
        <div className="ge-inds">
          {g.indicatori.length === 0 && <p className="muted">Nessun indicatore: aggiungine uno.</p>}
          {g.indicatori.map((ind) => (
            <div key={ind.id} className="ge-ind">
              <div className="ge-ind-head">
                <input className="ge-ind-nome" type="text" value={ind.nome} onChange={(e) => setInd(ind.id, { nome: e.target.value })} />
                <select value={ind.tipo} onChange={(e) => setInd(ind.id, { tipo: e.target.value as "punti" | "livelli" })}>
                  <option value="punti">a punti</option>
                  <option value="livelli">a livelli</option>
                </select>
                <label className="ge-peso">peso <input type="number" value={ind.peso ?? 1} min={1} onChange={(e) => setInd(ind.id, { peso: Number(e.target.value) })} /></label>
                {ind.tipo === "punti" && <label className="ge-peso">max <input type="number" value={ind.max ?? 0} min={0} onChange={(e) => setInd(ind.id, { max: Number(e.target.value) })} /></label>}
                <button className="danger" aria-label="Rimuovi indicatore" onClick={() => removeInd(ind.id)}>✕</button>
              </div>
              {ind.tipo === "livelli" && (
                <div className="ge-desc">
                  {(ind.descrittori ?? []).map((d, di) => (
                    <div key={di} className="ge-desc-row">
                      <input type="text" value={d.etichetta} onChange={(e) => setDesc(ind.id, di, { etichetta: e.target.value })} />
                      <input type="number" value={d.punti} onChange={(e) => setDesc(ind.id, di, { punti: Number(e.target.value) })} />
                      <button className="danger" aria-label="Rimuovi livello" onClick={() => removeDesc(ind.id, di)}>✕</button>
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
          <button className="danger" onClick={del}>Elimina griglia</button>
          <span className="spacer" />
          <button onClick={onClose}>Annulla</button>
          <button className="primary" onClick={save}>Salva griglia</button>
        </div>
      </div>
    </div>
  );
}
