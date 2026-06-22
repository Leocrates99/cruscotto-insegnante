import type { DbKey } from "@model";
import { getRecord, recordTitle, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { obiettivoVerificato, udaCopertura, udaOrePianificate } from "../compute/computed";
import { asIds, txt } from "./util";

export function UdaDetail({
  id,
  onBack,
  onEdit,
}: {
  id: string;
  onBack: () => void;
  onEdit: (k: DbKey, r?: Rec) => void;
}) {
  useStore();
  const uda = getRecord("uda", id);
  if (!uda) {
    return (
      <section>
        <button onClick={onBack}>← Indietro</button>
        <p className="muted">UdA non trovata.</p>
      </section>
    );
  }
  const c = udaCopertura(uda);
  const ore = udaOrePianificate(uda);
  const obIds = asIds(uda["Obiettivi"]);
  const lezIds = asIds(uda["Lezioni"]);

  return (
    <section>
      <div className="view-head">
        <button onClick={onBack}>← Indietro</button>
        <button className="primary" onClick={() => onEdit("uda", uda)}>
          Modifica UdA
        </button>
      </div>
      <h1>🧩 {recordTitle("uda", uda)}</h1>
      <p className="muted">{txt(uda["Competenza attesa"])}</p>
      <p className="meta">
        {txt(uda["Anno di corso"])} · {txt(uda["Ciclo"])} · {txt(uda["Stato"])}
      </p>

      <div className="metrics">
        <div className="metric">
          <b>{ore}</b>
          <small>ore pianificate</small>
        </div>
        <div className="metric">
          <b>{c.pct}%</b>
          <small>
            copertura ({c.ver}/{c.tot})
          </small>
          <div className="bar">
            <div style={{ width: `${c.pct}%` }} />
          </div>
        </div>
      </div>

      <h2>Obiettivi ({obIds.length})</h2>
      <ul className="checklist-view">
        {obIds.map((oid) => {
          const o = getRecord("obiettivi", oid);
          if (!o) return null;
          const ok = obiettivoVerificato(oid);
          return (
            <li key={oid}>
              <span className={ok ? "ok" : "no"}>{ok ? "✓" : "○"}</span> {recordTitle("obiettivi", o)}{" "}
              <em>{txt(o["Livello cognitivo"])}</em>
            </li>
          );
        })}
        {obIds.length === 0 && <li className="muted">Nessun obiettivo collegato (modifica l'UdA per aggiungerli).</li>}
      </ul>

      <h2>Lezioni ({lezIds.length})</h2>
      <ul className="checklist-view">
        {lezIds.map((lid) => {
          const l = getRecord("lezioni", lid);
          if (!l) return null;
          const ore = typeof l["Durata (ore)"] === "number" ? (l["Durata (ore)"] as number) : 0;
          return (
            <li key={lid}>
              {recordTitle("lezioni", l)} — {txt(l["Stato"])} · {ore} h
            </li>
          );
        })}
        {lezIds.length === 0 && <li className="muted">Nessuna lezione collegata.</li>}
      </ul>
    </section>
  );
}
