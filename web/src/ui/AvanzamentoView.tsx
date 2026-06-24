import { useState } from "react";
import { records, recordTitle, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { classeDiLezione, lessonStato, lessonsOfUda, udaProgress, type LessonStato } from "../compute/progress";
import { classeColor, materiaColor } from "./materia";

const STATO_META: Record<LessonStato, { t: string; cls: string }> = {
  in_ritardo: { t: "In ritardo", cls: "r" },
  in_anticipo: { t: "In anticipo", cls: "a" },
  svolta: { t: "Svolta", cls: "s" },
  da_svolgere: { t: "Da svolgere", cls: "d" },
  archiviata: { t: "Archiviata", cls: "x" },
};

const oggi = () => new Date().toISOString().slice(0, 10);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function AvanzamentoView({ onEdit }: { onEdit: (k: "lezioni", r?: Rec) => void }) {
  useStore();
  const [showArch, setShowArch] = useState(false);

  const allLez = records("lezioni");
  const summary = { in_ritardo: 0, da_svolgere: 0, svolte: 0 };
  for (const l of allLez) {
    const s = lessonStato(l);
    if (s === "in_ritardo") summary.in_ritardo++;
    else if (s === "da_svolgere") summary.da_svolgere++;
    else if (s === "svolta" || s === "in_anticipo") summary.svolte++;
  }

  const udaRows = records("uda")
    .map((u) => ({ u, lez: lessonsOfUda(u) }))
    .filter((x) => x.lez.length > 0);
  const inUda = new Set(udaRows.flatMap((x) => x.lez.map((l) => l.id)));
  const orfane = allLez.filter((l) => !inUda.has(l.id));

  const segnaSvolta = (l: Rec) => upsert("lezioni", { ...l, Stato: "Svolta", "Data effettiva": oggi() });
  const archivia = (l: Rec) => upsert("lezioni", { ...l, Stato: "Archiviata" });

  const visible = (l: Rec) => showArch || lessonStato(l) !== "archiviata";

  const Riga = ({ l }: { l: Rec }) => {
    const s = lessonStato(l);
    const meta = STATO_META[s];
    const materia = str(l["Materia"]);
    const classe = classeDiLezione(l);
    const mc = materiaColor(materia);
    const cc = classeColor(classe);
    return (
      <div className={`av-row st-${meta.cls}`}>
        <button className="av-titolo" onClick={() => onEdit("lezioni", l)} title="Apri lezione">
          {typeof l["Sequenza"] === "number" && <b className="av-seq">{l["Sequenza"]}</b>}
          {recordTitle("lezioni", l)}
        </button>
        <span className="av-tags">
          {materia && <span className="chip" style={mc ? { color: mc, borderColor: mc } : undefined}>{materia}</span>}
          {classe && <span className="chip" style={cc ? { color: cc, borderColor: cc } : undefined}>{classe}</span>}
        </span>
        <span className="av-data">{str(l["Data prevista"]) || "—"}</span>
        <span className={`av-badge ${meta.cls}`}>{meta.t}</span>
        <span className="av-actions">
          {s !== "svolta" && s !== "in_anticipo" && s !== "archiviata" && (
            <button onClick={() => segnaSvolta(l)} title="Segna come svolta (oggi)">✓ Svolta</button>
          )}
          {s !== "archiviata" && (
            <button onClick={() => archivia(l)} title="Archivia (finita)">🗄️ Archivia</button>
          )}
        </span>
      </div>
    );
  };

  return (
    <section className="avanzamento">
      <div className="view-head">
        <h1>🚦 Avanzamento lezioni</h1>
        <label className="av-toggle">
          <input type="checkbox" checked={showArch} onChange={(e) => setShowArch(e.target.checked)} /> mostra archiviate
        </label>
      </div>

      <div className="av-summary">
        <span className="av-sum r">In ritardo <b>{summary.in_ritardo}</b></span>
        <span className="av-sum d">Da svolgere <b>{summary.da_svolgere}</b></span>
        <span className="av-sum s">Svolte <b>{summary.svolte}</b></span>
      </div>

      {udaRows.length === 0 && orfane.length === 0 && (
        <p className="muted">Nessuna lezione. Aggiungine (con «Data prevista» e «Stato») per monitorare l'avanzamento.</p>
      )}

      {udaRows.map(({ u, lez }) => {
        const p = udaProgress(lez);
        const shown = lez.filter(visible);
        if (shown.length === 0) return null;
        return (
          <div key={u.id} className="av-uda">
            <div className="av-uda-head">
              <h3>{recordTitle("uda", u)}</h3>
              <div className="av-bar" title={`${p.fatte}/${p.totali} svolte`}>
                <span style={{ width: `${p.pct}%` }} />
              </div>
              <span className="av-frac">{p.fatte}/{p.totali}</span>
              {p.ritardi > 0 && <span className="av-badge r">{p.ritardi} in ritardo</span>}
            </div>
            <div className="av-rows">{shown.map((l) => <Riga key={l.id} l={l} />)}</div>
          </div>
        );
      })}

      {orfane.filter(visible).length > 0 && (
        <div className="av-uda">
          <div className="av-uda-head"><h3>Senza UdA</h3></div>
          <div className="av-rows">{orfane.filter(visible).map((l) => <Riga key={l.id} l={l} />)}</div>
        </div>
      )}
    </section>
  );
}
