import { records, recordTitle } from "../store/store";
import { useStore } from "../store/useStore";
import { programmazioneOre } from "../compute/computed";
import { txt } from "./util";
import { materiaColor } from "./materia";

export function ProgrammazioneView() {
  useStore();
  const progs = records("programmazione");

  return (
    <section>
      <div className="view-head">
        <h1>📊 Sostenibilità oraria</h1>
      </div>
      <p className="muted">Monte ore previsto a confronto con le ore pianificate nelle UdA collegate.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Programmazione</th>
              <th>Materia</th>
              <th>Monte ore</th>
              <th>Ore UdA</th>
              <th>Scostamento</th>
              <th>Semaforo</th>
            </tr>
          </thead>
          <tbody>
            {progs.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nessuna programmazione.
                </td>
              </tr>
            )}
            {progs.map((p) => {
              const o = programmazioneOre(p);
              const cls = o.scostamento < 0 ? "bad" : o.scostamento === 0 ? "full" : "ok";
              return (
                <tr key={p.id}>
                  <td className="title-cell">{recordTitle("programmazione", p)}</td>
                  <td>
                    {(() => {
                      const m = txt(p["Materia"]);
                      const c = materiaColor(m);
                      return m ? (
                        <span className="chip" style={c ? { color: c, borderColor: c } : undefined}>
                          {m}
                        </span>
                      ) : null;
                    })()}
                  </td>
                  <td>{o.monte}</td>
                  <td>{o.tot}</td>
                  <td>{o.scostamento}</td>
                  <td>
                    <span className={`pill ${cls}`}>{o.semaforo}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
