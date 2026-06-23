import { useState } from "react";
import { generateBands, getSettings, setSettings, type TimeBand } from "../store/settings";

/** Modale per configurare le fasce orarie del giorno scolastico. */
export function OrarioSetup({ onClose }: { onClose: () => void }) {
  const [start, setStart] = useState("08:00");
  const [dur, setDur] = useState(55);
  const [count, setCount] = useState(6);
  const [breakAfter, setBreakAfter] = useState(0);
  const [breakMin, setBreakMin] = useState(15);
  const [bands, setBands] = useState<TimeBand[]>(() => getSettings().timeBands);

  const gen = () => setBands(generateBands(start, dur, count, breakAfter || undefined, breakMin));
  const edit = (i: number, patch: Partial<TimeBand>) =>
    setBands((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = () => {
    setSettings({ timeBands: bands });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>🕒 Configura l'orario scolastico</h2>
        <p className="muted">
          Imposta le fasce agganciate all'orologio: vengono etichettate «1ª ora», «2ª ora»… e usate
          come righe del calendario in vista settimanale e giornaliera.
        </p>

        <div className="orario-form">
          <label className="field">
            <span>Inizio</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>Durata (min)</span>
            <input type="number" value={dur} onChange={(e) => setDur(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>N° ore</span>
            <input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Pausa dopo la</span>
            <input type="number" placeholder="0 = nessuna" value={breakAfter} onChange={(e) => setBreakAfter(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Pausa (min)</span>
            <input type="number" value={breakMin} onChange={(e) => setBreakMin(Number(e.target.value))} />
          </label>
          <button className="primary" onClick={gen}>Genera</button>
        </div>

        <div className="orario-bands">
          {bands.length === 0 ? (
            <p className="muted">Nessuna fascia: usa «Genera» (oppure salva vuoto per togliere le fasce).</p>
          ) : (
            bands.map((b, i) => (
              <div key={i} className="orario-band">
                <input value={b.label} onChange={(e) => edit(i, { label: e.target.value })} />
                <input type="time" value={b.start} onChange={(e) => edit(i, { start: e.target.value })} />
                <input type="time" value={b.end} onChange={(e) => edit(i, { end: e.target.value })} />
                <button className="danger" aria-label="Rimuovi" onClick={() => setBands((bs) => bs.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Annulla</button>
          <button className="primary" onClick={save}>Salva orario</button>
        </div>
      </div>
    </div>
  );
}
