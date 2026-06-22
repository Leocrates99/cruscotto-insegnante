import { getRecord, records, recordTitle, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { udaOrePianificate } from "../compute/computed";

function isoOf(r: Rec): string | undefined {
  const v = r["Data prevista"];
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined;
}

function lessonsOf(uda: Rec): Rec[] {
  const ids = Array.isArray(uda["Lezioni"]) ? (uda["Lezioni"] as string[]) : [];
  return ids
    .map((id) => getRecord("lezioni", id))
    .filter((l): l is Rec => Boolean(l) && Boolean(isoOf(l as Rec)));
}

export function TimelineView({ onOpenUda }: { onOpenUda: (id: string) => void }) {
  useStore();
  const rows = records("uda")
    .map((u) => ({ u, lez: lessonsOf(u) }))
    .filter((x) => x.lez.length > 0);

  const allDates = rows.flatMap((x) => x.lez.map(isoOf).filter((d): d is string => Boolean(d)));
  if (allDates.length === 0) {
    return (
      <section>
        <div className="view-head"><h1>📈 Cronoprogramma</h1></div>
        <p className="muted">Nessuna lezione con «Data prevista»: aggiungine per vedere la distribuzione nel tempo.</p>
      </section>
    );
  }
  const min = allDates.reduce((a, b) => (a < b ? a : b));
  const max = allDates.reduce((a, b) => (a > b ? a : b));
  const t0 = Date.parse(min + "T00:00:00Z");
  const span = Math.max(1, Date.parse(max + "T00:00:00Z") - t0);
  const pct = (d: string) => ((Date.parse(d + "T00:00:00Z") - t0) / span) * 100;

  return (
    <section>
      <div className="view-head"><h1>📈 Cronoprogramma</h1></div>
      <p className="muted">Le lezioni distese nel tempo, una riga per UdA ({min} → {max}).</p>
      <div className="timeline">
        {rows.map(({ u, lez }) => {
          const ds = lez.map(isoOf).filter((d): d is string => Boolean(d)).sort();
          const a = pct(ds[0]);
          const b = pct(ds[ds.length - 1]);
          return (
            <div key={u.id} className="tl-row">
              <button className="tl-label" onClick={() => onOpenUda(u.id)}>
                {recordTitle("uda", u)} <small>{udaOrePianificate(u)} h</small>
              </button>
              <div className="tl-track">
                <div className="tl-bar" style={{ left: `${a}%`, width: `${Math.max(2, b - a)}%` }} />
                {lez.map((l) => {
                  const d = isoOf(l);
                  if (!d) return null;
                  return <span key={l.id} className="tl-dot" style={{ left: `${pct(d)}%` }} title={`${recordTitle("lezioni", l)} · ${d}`} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
