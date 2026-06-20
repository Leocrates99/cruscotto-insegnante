import type { DbKey } from "@model";
import { buildOrder, schemaByKey } from "@model";
import { getRecord, records, recordTitle, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { obiettivoVerificato, udaCopertura, udaOrePianificate } from "../compute/computed";
import { txt } from "./util";
import { materiaColor } from "./materia";

/** Materia di un'UdA, dedotta dal primo obiettivo collegato (l'UdA non la porta). */
function udaMateria(u: Rec): string | undefined {
  const ids = Array.isArray(u["Obiettivi"]) ? (u["Obiettivi"] as string[]) : [];
  for (const id of ids) {
    const m = getRecord("obiettivi", id)?.["Materia"];
    if (typeof m === "string") return m;
  }
  return undefined;
}

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
          const m = udaMateria(u);
          const mc = materiaColor(m);
          return (
            <button
              key={u.id}
              className="card"
              onClick={() => onOpenUda(u.id)}
              style={mc ? { borderLeftColor: mc } : undefined}
            >
              <strong>{recordTitle("uda", u)}</strong>
              <small>
                {m && (
                  <span className="chip" style={mc ? { color: mc, borderColor: mc } : undefined}>
                    {m}
                  </span>
                )}{" "}
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
