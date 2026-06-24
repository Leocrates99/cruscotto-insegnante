import { useState } from "react";
import type { Griglia, RigaCorrezione } from "../store/valutazione";
import { maxIndicatore, puntiIndicatore, votoDisplay, votoRiga } from "../compute/voto";

const num = (v: number) => v.toLocaleString("it-IT", { maximumFractionDigits: 2 });

/** Scheda di valutazione stampabile per un candidato (scrutinio/condotta/verifica). */
export function SchedaStampa({ griglia, riga, onClose }: { griglia: Griglia; riga: RigaCorrezione; onClose: () => void }) {
  const [note, setNote] = useState("");
  const vr = votoRiga(griglia, riga);
  const oggi = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>🖨️ Scheda di valutazione</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        <div className="print-area scheda">
          <div className="scheda-head">
            <h3>Scheda di valutazione — {griglia.nome}</h3>
            <p>{oggi}</p>
          </div>
          <div className="scheda-info">
            <div><span>Candidato</span><b>{riga.nome || "________________"}</b></div>
            <div><span>Classe</span><b>{riga.classe || "______"}</b></div>
          </div>

          <div className="scheda-voto">
            <div className="scheda-voto-n">{votoDisplay(vr.voto, griglia.scala)}</div>
            <div>
              {vr.giudizio && <div className="scheda-giud">{vr.giudizio}</div>}
              <div className="muted">{num(vr.punti)} / {vr.max} punti{griglia.scala.tipo === "curva" ? ` · ${Math.round(vr.pct * 100)}%` : ""}</div>
            </div>
          </div>

          <table className="scheda-tab">
            <thead>
              <tr><th>Indicatore</th><th>Livello / punti</th><th>Max</th></tr>
            </thead>
            <tbody>
              {griglia.indicatori.filter((i) => i.attivo !== false).map((ind) => {
                const v = riga.valori[ind.id];
                const dettaglio = ind.tipo === "livelli" ? ((ind.descrittori ?? [])[v]?.etichetta ?? "—") : v === undefined ? "—" : String(v);
                return (
                  <tr key={ind.id}>
                    <td>{ind.nome}</td>
                    <td>{dettaglio} <b>({num(puntiIndicatore(ind, v))})</b></td>
                    <td className="muted">{num(maxIndicatore(ind))}</td>
                  </tr>
                );
              })}
              <tr className="scheda-tot"><td>Totale</td><td><b>{num(vr.punti)}</b></td><td>{vr.max}</td></tr>
            </tbody>
          </table>

          <div className="scheda-note">
            <span>Note</span>
            <textarea className="no-print" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Eventuali annotazioni…" />
            <div className="print-only scheda-note-text">{note}</div>
          </div>

          <div className="scheda-firme">
            <div>Il docente</div>
            <div>Il Dirigente Scolastico</div>
          </div>
        </div>

        <div className="modal-actions no-print">
          <button onClick={onClose}>Chiudi</button>
          <button className="primary" onClick={() => window.print()}>🖨️ Stampa</button>
        </div>
      </div>
    </div>
  );
}
