import { useEffect, useState } from "react";
import type { DbKey } from "@model";
import type { Rec, Value } from "../store/store";
import type { View } from "../App";
import { useStore } from "../store/useStore";
import { collectEvents, type CalEvent } from "../compute/events";
import { setSettings, toMinutes, useSettings, type TimeBand } from "../store/settings";
import { OrarioSetup } from "./OrarioSetup";

type Mode = "week" | "month" | "day";
type Edit = (k: DbKey, rec?: Rec, prefill?: Record<string, Value>) => void;

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const WD = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
const weekDays = (anchor: Date) => { const s = startOfWeek(anchor); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); };

export function CalendarView({ onEdit, onView }: { onEdit: Edit; onView: (v: View) => void }) {
  useStore();
  const settings = useSettings();
  const mode = settings.calendarMode as Mode;
  const [anchor, setAnchor] = useState(() => new Date());
  const [showOrario, setShowOrario] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTick((x) => x + 1), 30000); return () => window.clearInterval(t); }, []);

  const byDay = new Map<string, CalEvent[]>();
  for (const e of collectEvents()) { const a = byDay.get(e.date) ?? []; a.push(e); byDay.set(e.date, a); }

  const setMode = (m: Mode) => setSettings({ calendarMode: m });
  const shift = (dir: number) =>
    setAnchor((a) => {
      if (mode === "month") { const x = new Date(a); x.setMonth(x.getMonth() + dir); return x; }
      return addDays(a, mode === "day" ? dir : dir * 7);
    });

  const title =
    mode === "month"
      ? `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
      : mode === "day"
        ? anchor.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })
        : (() => { const s = startOfWeek(anchor), e = addDays(s, 6); return `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`; })();

  return (
    <section className="cal-view">
      <div className="view-head cal-toolbar">
        <h1>📅 {title}</h1>
        <div className="cal-controls">
          <div className="seg">
            <button className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>Settimana</button>
            <button className={mode === "month" ? "active" : ""} onClick={() => setMode("month")}>Mese</button>
            <button className={mode === "day" ? "active" : ""} onClick={() => setMode("day")}>Giorno</button>
          </div>
          <div className="seg">
            <button onClick={() => shift(-1)} aria-label="Precedente">‹</button>
            <button onClick={() => setAnchor(new Date())}>Oggi</button>
            <button onClick={() => shift(1)} aria-label="Successivo">›</button>
          </div>
          <button onClick={() => setShowOrario(true)}>🕒 Orario</button>
          <button onClick={() => onEdit("scadenze", undefined, { Data: ymd(anchor) })}>+ Scadenza</button>
          <button onClick={() => onEdit("lezioni", undefined, { "Data prevista": ymd(anchor) })}>+ Lezione</button>
          <button onClick={() => onView({ kind: "promemoria" })}>📌 Promemoria</button>
          <button onClick={() => onView({ kind: "programmazione" })}>📊 Sostenibilità</button>
        </div>
      </div>

      {mode === "month" ? (
        <MonthGrid anchor={anchor} byDay={byDay} onEdit={onEdit} />
      ) : (
        <TimeGrid days={mode === "day" ? [anchor] : weekDays(anchor)} byDay={byDay} bands={settings.timeBands} onEdit={onEdit} />
      )}

      {showOrario && <OrarioSetup onClose={() => setShowOrario(false)} />}
    </section>
  );
}

function MonthGrid({ anchor, byDay, onEdit }: { anchor: Date; byDay: Map<string, CalEvent[]>; onEdit: Edit }) {
  const y = anchor.getFullYear(), m = anchor.getMonth();
  const startWd = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d));
  const todayStr = ymd(new Date());

  return (
    <div className="cal-grid">
      {WD.map((w) => <div key={w} className="cal-wd">{w}</div>)}
      {cells.map((c, i) => {
        if (!c) return <div key={i} className="cal-cell empty" />;
        const ds = ymd(c);
        const evs = byDay.get(ds) ?? [];
        return (
          <div key={i} className={ds === todayStr ? "cal-cell today" : "cal-cell"} onClick={() => onEdit("scadenze", undefined, { Data: ds })}>
            <div className="cal-day">{c.getDate()}</div>
            <div className="cal-events">
              {evs.slice(0, 4).map((e, j) => (
                <button key={j} className="cal-ev" style={e.color ? { borderLeftColor: e.color } : undefined} title={`${e.title} · ${e.prop}`} onClick={(ev) => { ev.stopPropagation(); onEdit(e.dbKey, e.rec); }}>
                  {e.title}
                </button>
              ))}
              {evs.length > 4 && <span className="cal-more">+{evs.length - 4}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeGrid({ days, byDay, bands, onEdit }: { days: Date[]; byDay: Map<string, CalEvent[]>; bands: TimeBand[]; onEdit: Edit }) {
  const HOUR_H = 50;
  let startMin = 7 * 60, endMin = 20 * 60;
  if (bands.length) {
    startMin = Math.floor(Math.min(...bands.map((b) => toMinutes(b.start))) / 60) * 60;
    endMin = Math.ceil(Math.max(...bands.map((b) => toMinutes(b.end))) / 60) * 60;
  }
  const total = Math.max(60, endMin - startMin);
  const gridH = (total / 60) * HOUR_H;
  const yOf = (min: number) => ((min - startMin) / 60) * HOUR_H;
  const hours: number[] = [];
  for (let h = startMin / 60; h <= endMin / 60; h++) hours.push(h);
  const bandByLabel = new Map(bands.map((b) => [b.label, b]));

  const now = new Date();
  const todayStr = ymd(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const cols = { gridTemplateColumns: `58px repeat(${days.length}, minmax(0, 1fr))` } as const;

  return (
    <div className="tg-wrap">
      <div className="tg-grid" style={cols}>
        <div className="tg-corner" />
        {days.map((d, i) => (
          <div key={i} className={ymd(d) === todayStr ? "tg-dayhead today" : "tg-dayhead"}>
            {WD[(d.getDay() + 6) % 7]} <b>{d.getDate()}</b>
          </div>
        ))}
      </div>

      <div className="tg-grid tg-allday" style={cols}>
        <div className="tg-axis-label">giornata</div>
        {days.map((d, i) => {
          const ds = ymd(d);
          const allday = (byDay.get(ds) ?? []).filter((e) => !(typeof e.rec["Fascia"] === "string" && bandByLabel.has(e.rec["Fascia"] as string)));
          return (
            <div key={i} className="tg-allday-cell" onClick={() => onEdit("scadenze", undefined, { Data: ds })}>
              {allday.map((e, j) => (
                <button key={j} className="cal-ev" style={e.color ? { borderLeftColor: e.color } : undefined} title={`${e.title} · ${e.prop}`} onClick={(ev) => { ev.stopPropagation(); onEdit(e.dbKey, e.rec); }}>
                  {e.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="tg-grid tg-body" style={cols}>
        <div className="tg-axis" style={{ height: gridH }}>
          {hours.map((h) => <div key={h} className="tg-hour" style={{ top: yOf(h * 60) }}>{pad(h)}:00</div>)}
        </div>
        {days.map((d, di) => {
          const ds = ymd(d);
          const isToday = ds === todayStr;
          const timed = (byDay.get(ds) ?? []).filter((e) => typeof e.rec["Fascia"] === "string" && bandByLabel.has(e.rec["Fascia"] as string));
          return (
            <div key={di} className="tg-col" style={{ height: gridH }} onClick={() => onEdit("scadenze", undefined, { Data: ds })}>
              {hours.map((h) => <div key={h} className="tg-line" style={{ top: yOf(h * 60) }} />)}
              {bands.map((b, bi) => {
                const t = yOf(toMinutes(b.start));
                return (
                  <div key={bi} className="tg-band" style={{ top: t, height: yOf(toMinutes(b.end)) - t }} onClick={(ev) => { ev.stopPropagation(); onEdit("scadenze", undefined, { Data: ds, Fascia: b.label }); }}>
                    <span className="tg-band-label">{b.label}</span>
                  </div>
                );
              })}
              {timed.map((e, ei) => {
                const b = bandByLabel.get(e.rec["Fascia"] as string)!;
                return (
                  <button key={ei} className="cal-ev tg-ev" style={{ top: yOf(toMinutes(b.start)) + 14, borderLeftColor: e.color }} onClick={(ev) => { ev.stopPropagation(); onEdit(e.dbKey, e.rec); }}>
                    {e.title}
                  </button>
                );
              })}
              {isToday && nowMin >= startMin && nowMin <= endMin && (
                <div className="tg-now" style={{ top: yOf(nowMin) }}><span className="tg-now-dot" /></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
