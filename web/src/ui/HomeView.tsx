import type { DbKey } from "@model";
import { buildOrder, schemaByKey } from "@model";
import { records, recordTitle } from "../store/store";
import { useStore } from "../store/useStore";
import { obiettivoVerificato, udaCopertura, udaOrePianificate } from "../compute/computed";
import { txt } from "./util";

export function HomeView({ onSelect, onOpenUda }: { onSelect: (key: DbKey) => void; onOpenUda: (id: string) => void }) {
  useStore();
  const udas = records("uda");
  const scoperti = records("obiettivi").filter((o) => !obiettivoVerificato(o.id));

  return (
    <section>
      <div className="view-head">
        <h1>🏠 Panoramica</h1>
      </div>
      <p className="muted">I dati vivono nel tuo browser. Ricordati di esportare un backup ogni tanto.</p>

      <h2>UdA in corso</h2>
      <div className="cards">
        {udas.length === 0 && <p className="muted">Nessuna UdA: usa «Carica esempio» in alto per partire.</p>}
        {udas.map((u) => {
          const c = udaCopertura(u);
          return (
            <button key={u.id} className="card" onClick={() => onOpenUda(u.id)}>
              <strong>{recordTitle("uda", u)}</strong>
              <small>
                {txt(u["Anno di corso"])} {txt(u["Ciclo"])} · {txt(u["Stato"])}
              </small>
              <div className="bar">
                <div style={{ width: `${c.pct}%` }} />
              </div>
              <small>
                Copertura {c.pct}% ({c.ver}/{c.tot}) · {udaOrePianificate(u)} h
              </small>
            </button>
          );
        })}
      </div>

      <h2>Database</h2>
      <div className="counts">
        {buildOrder.map((k) => (
          <button key={k} className="count" onClick={() => onSelect(k)}>
            <span>{schemaByKey[k].icon}</span>
            <b>{records(k).length}</b>
            <small>{schemaByKey[k].title}</small>
          </button>
        ))}
      </div>

      {scoperti.length > 0 && (
        <>
          <h2>Obiettivi senza verifica ({scoperti.length})</h2>
          <ul className="muted list">
            {scoperti.slice(0, 10).map((o) => (
              <li key={o.id}>
                {recordTitle("obiettivi", o)} <em>{txt(o["Materia"])}</em>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
