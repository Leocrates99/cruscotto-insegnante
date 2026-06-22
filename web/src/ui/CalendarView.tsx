import { useState } from "react";
import type { DbKey } from "@model";
import type { Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { collectEvents, type CalEvent } from "../compute/events";

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const WD = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function CalendarView({ onEdit }: { onEdit: (dbKey: DbKey, rec: Rec) => void }) {
  useStore();
  const events = collectEvents();
  // All'apertura mostra il mese del primo evento (i dati di esempio sono nel passato).
  const [cursor, setCursor] = useState(() => {
    if (events.length > 0) {
      const first = events.map((e) => e.date).sort()[0];
      const d = new Date(first + "T00:00:00Z");
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    }
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const a = byDay.get(e.date) ?? [];
    a.push(e);
    byDay.set(e.date, a);
  }

  const startWd = (new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay() + 6) % 7; // lunedì = 0
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const cells: ({ date: string; day: number } | null)[] = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: ymd(new Date(Date.UTC(cursor.y, cursor.m, d))), day: d });
  const todayStr = ymd(new Date());

  const prev = () => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  const next = () => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));
  const goToday = () => { const n = new Date(); setCursor({ y: n.getFullYear(), m: n.getMonth() }); };

  return (
    <section>
      <div className="view-head">
        <h1>📅 {MONTHS[cursor.m]} {cursor.y}</h1>
        <div className="seg">
          <button onClick={prev} aria-label="Mese precedente">‹</button>
          <button onClick={goToday}>Oggi</button>
          <button onClick={next} aria-label="Mese successivo">›</button>
        </div>
      </div>
      <div className="cal-grid">
        {WD.map((w) => (
          <div key={w} className="cal-wd">{w}</div>
        ))}
        {cells.map((c, i) =>
          c === null ? (
            <div key={i} className="cal-cell empty" />
          ) : (
            <div key={i} className={c.date === todayStr ? "cal-cell today" : "cal-cell"}>
              <div className="cal-day">{c.day}</div>
              <div className="cal-events">
                {(byDay.get(c.date) ?? []).slice(0, 4).map((e, j) => (
                  <button
                    key={j}
                    className="cal-ev"
                    style={e.color ? { borderLeftColor: e.color } : undefined}
                    title={`${e.title} · ${e.prop}`}
                    onClick={() => onEdit(e.dbKey, e.rec)}
                  >
                    {e.title}
                  </button>
                ))}
                {(byDay.get(c.date)?.length ?? 0) > 4 && (
                  <span className="cal-more">+{(byDay.get(c.date)?.length ?? 0) - 4}</span>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
