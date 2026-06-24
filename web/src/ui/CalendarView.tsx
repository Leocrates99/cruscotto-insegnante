import { Fragment, useEffect, useState } from "react";
import type { DbKey } from "@model";
import { upsert, type Rec, type Value } from "../store/store";
import type { View } from "../App";
import { useStore } from "../store/useStore";
import { collectEvents, type CalEvent } from "../compute/events";
import { setSettings, toMinutes, useSettings } from "../store/settings";
import { useProfile } from "../store/profile";
import { classeColor, materiaColor } from "./materia";
import { VerificaForm } from "./VerificaForm";
import { useValutazione } from "../store/valutazione";

type Mode = "week" | "month" | "day";
type Edit = (k: DbKey, rec?: Rec, prefill?: Record<string, Value>) => void;
type SessChip = { id: string; titolo: string };
type OpenSess = (id: string) => void;

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const WD = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
const weekDays = (anchor: Date) => { const s = startOfWeek(anchor); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); };

// ── Gerarchia cromatica degli eventi ─────────────────────────────────────────
const C_VERIFICA = "#e11d2b"; // rosso acceso: verifiche
const C_BUROCRAZIA = "#e8770f"; // arancione: consigli, scrutini, collegi…
const BURO_RE = /consigl|scrutin|collegi|dipartiment/i;

function isBurocrazia(e: CalEvent): boolean {
  if (e.dbKey === "riunioni") return true;
  if (BURO_RE.test(e.title)) return true;
  if (e.dbKey === "scadenze" && String(e.rec["Tipo"] ?? "").toLowerCase() === "riunione") return true;
  return false;
}
/** Colore di un evento secondo la gerarchia (verifiche/burocrazia) o materia/DB. */
function eventColor(e: CalEvent): string | undefined {
  if (e.dbKey === "verifiche") return C_VERIFICA;
  if (isBurocrazia(e)) return C_BUROCRAZIA;
  return e.color;
}

/** Testo leggibile su un fondo colorato (bianco su scuro, inchiostro su chiaro). */
function contrastText(hex?: string): string {
  if (!hex || hex[0] !== "#") return "var(--ink)";
  const h = hex.slice(1);
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(f.slice(0, 2), 16), g = parseInt(f.slice(2, 4), 16), b = parseInt(f.slice(4, 6), 16);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.62 ? "#1f2430" : "#ffffff";
}

export function CalendarView({ onEdit, onView }: { onEdit: Edit; onView: (v: View) => void }) {
  useStore();
  const settings = useSettings();
  const mode = settings.calendarMode as Mode;
  const [anchor, setAnchor] = useState(() => new Date());
  const [, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTick((x) => x + 1), 30000); return () => window.clearInterval(t); }, []);

  const byDay = new Map<string, CalEvent[]>();
  for (const e of collectEvents()) { const a = byDay.get(e.date) ?? []; a.push(e); byDay.set(e.date, a); }

  // Sessioni-verifica (layer valutazione) mostrate come eventi.
  const valut = useValutazione();
  const sessByDay = new Map<string, SessChip[]>();
  for (const s of valut.sessioni) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(s.data)) continue;
    const k = s.data.slice(0, 10);
    const a = sessByDay.get(k) ?? [];
    a.push({ id: s.id, titolo: s.titolo });
    sessByDay.set(k, a);
  }
  const [showVerifica, setShowVerifica] = useState(false);
  const openSessione: OpenSess = (id) => onView({ kind: "valutazione", sessioneId: id });
  const closeDd = (el: HTMLElement) => el.closest("details")?.removeAttribute("open");

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
    <section className={mode === "month" ? "cal-view cal-view--month" : "cal-view"}>
      <div className="view-head cal-toolbar">
        <div className="cal-left">
          <details className="dropdown">
            <summary className="primary">+ Nuovo</summary>
            <div className="dropdown-menu">
              <button onClick={(e) => { closeDd(e.currentTarget); onEdit("scadenze", undefined, { Data: ymd(anchor) }); }}>📌 Scadenza</button>
              <button onClick={(e) => { closeDd(e.currentTarget); onEdit("lezioni", undefined, { "Data prevista": ymd(anchor) }); }}>📘 Lezione</button>
              <button onClick={(e) => { closeDd(e.currentTarget); setShowVerifica(true); }}>📝 Verifica</button>
              <button onClick={(e) => { closeDd(e.currentTarget); onView({ kind: "planner" }); }}>🧠 Pianifica</button>
            </div>
          </details>
          <h1>📅 {title}</h1>
        </div>
        <div className="cal-controls">
          <div className="seg">
            <button className={mode === "month" ? "active" : ""} onClick={() => setMode("month")}>Mese</button>
            <button className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>Settimana</button>
            <button className={mode === "day" ? "active" : ""} onClick={() => setMode("day")}>Giorno</button>
          </div>
          <div className="seg">
            <button onClick={() => shift(-1)} aria-label="Precedente">‹</button>
            <button onClick={() => setAnchor(new Date())}>Oggi</button>
            <button onClick={() => shift(1)} aria-label="Successivo">›</button>
          </div>
        </div>
      </div>

      {mode === "month" ? (
        <MonthGrid anchor={anchor} byDay={byDay} sessByDay={sessByDay} onEdit={onEdit} onOpenSessione={openSessione} />
      ) : (
        <TimeGrid days={mode === "day" ? [anchor] : weekDays(anchor).filter((d) => settings.giorniLezione.includes((d.getDay() + 6) % 7))} byDay={byDay} sessByDay={sessByDay} onEdit={onEdit} onOpenSessione={openSessione} />
      )}

      {showVerifica && <VerificaForm prefill={{ data: ymd(anchor) }} onClose={() => setShowVerifica(false)} onOpen={(id) => { setShowVerifica(false); openSessione(id); }} />}
    </section>
  );
}

function MonthGrid({ anchor, byDay, sessByDay, onEdit, onOpenSessione }: { anchor: Date; byDay: Map<string, CalEvent[]>; sessByDay: Map<string, SessChip[]>; onEdit: Edit; onOpenSessione: OpenSess }) {
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
        const sess = sessByDay.get(ds) ?? [];
        return (
          <div key={i} className={ds === todayStr ? "cal-cell today" : "cal-cell"} onClick={() => onEdit("scadenze", undefined, { Data: ds })}>
            <div className="cal-day">{c.getDate()}</div>
            <div className="cal-events">
              {sess.map((s) => (
                <button key={s.id} className="cal-ev filled" style={{ background: C_VERIFICA, color: contrastText(C_VERIFICA), borderColor: C_VERIFICA }} title={`Verifica · ${s.titolo}`} onClick={(ev) => { ev.stopPropagation(); onOpenSessione(s.id); }}>
                  📝 {s.titolo}
                </button>
              ))}
              {evs.slice(0, 4).map((e, j) => {
                const bg = eventColor(e);
                const strong = e.dbKey === "verifiche" || isBurocrazia(e);
                return (
                  <button
                    key={j}
                    className={strong ? "cal-ev filled" : "cal-ev"}
                    style={strong && bg ? { background: bg, color: contrastText(bg), borderColor: bg } : bg ? { borderLeftColor: bg } : undefined}
                    title={`${e.title} · ${e.prop}`}
                    onClick={(ev) => { ev.stopPropagation(); onEdit(e.dbKey, e.rec); }}
                  >
                    {e.title}
                  </button>
                );
              })}
              {evs.length > 4 && <span className="cal-more">+{evs.length - 4}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeGrid({ days, byDay, sessByDay, onEdit, onOpenSessione }: { days: Date[]; byDay: Map<string, CalEvent[]>; sessByDay: Map<string, SessChip[]>; onEdit: Edit; onOpenSessione: OpenSess }) {
  const [dragEv, setDragEv] = useState<CalEvent | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const profile = useProfile();
  const settings = useSettings();
  const bands = settings.timeBands;
  const bandLabels = new Set(bands.map((b) => b.label));
  const orarioByKey = new Map(profile.orario.map((s) => [`${s.giorno}:${s.fascia}`, s] as const));

  const now = new Date();
  const todayStr = ymd(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // Periodo (fascia) corrente, per evidenziare la riga di "oggi".
  const curBand = bands.find((b) => toMinutes(b.start) <= nowMin && nowMin < toMinutes(b.end))?.label;
  const cols = { gridTemplateColumns: `86px repeat(${days.length}, minmax(0, 1fr))` } as const;
  const bodyStyle = { ...cols, gridTemplateRows: `repeat(${Math.max(1, bands.length)}, minmax(58px, 1fr))` } as const;

  const isFascia = (e: CalEvent) => typeof e.rec["Fascia"] === "string" && bandLabels.has(e.rec["Fascia"] as string);
  // Drop su una cella → giorno + fascia (in giornata se fascia assente).
  const drop = (ds: string, fascia?: string) => {
    if (!dragEv) return;
    upsert(dragEv.dbKey, { ...dragEv.rec, [dragEv.prop]: ds, Fascia: fascia });
    setDragEv(null);
    setOver(null);
  };
  const dragProps = (e: CalEvent) => ({
    draggable: true as const,
    onDragStart: () => setDragEv(e),
    onDragEnd: () => { setDragEv(null); setOver(null); },
  });
  const chip = (e: CalEvent, j: number) => {
    const bg = eventColor(e);
    return (
      <button key={j} className={bg ? "tg-chip" : "tg-chip plain"} {...dragProps(e)} style={bg ? { background: bg, color: contrastText(bg), borderColor: bg } : undefined} title={`${e.title} · ${e.prop}`} onClick={(ev) => { ev.stopPropagation(); onEdit(e.dbKey, e.rec); }}>
        {e.title}
      </button>
    );
  };

  return (
    <div className="tg-wrap">
      <div className="tg-grid tg-head" style={cols}>
        <div className="tg-corner" />
        {days.map((d, i) => (
          <div key={i} className={ymd(d) === todayStr ? "tg-dayhead today" : "tg-dayhead"}>
            <span className="tg-dh-wd">{WD[(d.getDay() + 6) % 7]}</span> <b>{d.getDate()}</b>
          </div>
        ))}
      </div>

      <div className="tg-grid tg-allday" style={cols}>
        <div className="tg-axis-label">giornata</div>
        {days.map((d, i) => {
          const ds = ymd(d);
          const allday = (byDay.get(ds) ?? []).filter((e) => !isFascia(e));
          const sess = sessByDay.get(ds) ?? [];
          const key = `${i}:allday`;
          return (
            <div
              key={i}
              className={over === key ? "tg-allday-cell over" : "tg-allday-cell"}
              onClick={() => onEdit("scadenze", undefined, { Data: ds })}
              onDragOver={(ev) => { ev.preventDefault(); setOver(key); }}
              onDrop={() => drop(ds, undefined)}
            >
              {sess.map((s) => (
                <button key={s.id} className="tg-chip" style={{ background: C_VERIFICA, color: contrastText(C_VERIFICA), borderColor: C_VERIFICA }} title={`Verifica · ${s.titolo}`} onClick={(ev) => { ev.stopPropagation(); onOpenSessione(s.id); }}>
                  📝 {s.titolo}
                </button>
              ))}
              {allday.map((e, j) => chip(e, j))}
            </div>
          );
        })}
      </div>

      {bands.length === 0 ? (
        <div className="tg-empty">Nessuna ora impostata. Definisci le ore (anche pomeridiane) dal <b>Profilo › Orario &amp; classi › Fasce orarie</b>.</div>
      ) : (
        <div className="tg-body" style={bodyStyle}>
          {bands.map((b) => (
            <Fragment key={b.label}>
              <div className="pg-axis">
                <span className="pg-ora">{b.label}</span>
                <span className="pg-time">{b.start}–{b.end}</span>
              </div>
              {days.map((d, di) => {
                const ds = ymd(d);
                const wd = (d.getDay() + 6) % 7;
                const isToday = ds === todayStr;
                const ov = orarioByKey.get(`${wd}:${b.label}`);
                const lessonBg = ov && (ov.materia || ov.classe) ? (materiaColor(ov.materia) ?? classeColor(ov.classe) ?? "#6b6660") : undefined;
                const evs = (byDay.get(ds) ?? []).filter((e) => e.rec["Fascia"] === b.label);
                const key = `${di}:${b.label}`;
                const cls = ["pg-cell"];
                if (isToday) cls.push("today");
                if (isToday && curBand === b.label) cls.push("now");
                if (over === key) cls.push("over");
                return (
                  <div
                    key={di}
                    className={cls.join(" ")}
                    onClick={() => onEdit("scadenze", undefined, { Data: ds, Fascia: b.label })}
                    onDragOver={(ev) => { ev.preventDefault(); setOver(key); }}
                    onDrop={(ev) => { ev.stopPropagation(); drop(ds, b.label); }}
                  >
                    {lessonBg && (
                      <div className="pg-lesson" style={{ background: lessonBg, color: contrastText(lessonBg) }} title={`${[ov?.materia, ov?.classe].filter(Boolean).join(" · ")} · ${b.start}–${b.end}`}>
                        {ov?.materia && <span className="pg-l-mat">{ov.materia}</span>}
                        {ov?.classe && <span className="pg-l-cls">{ov.classe}</span>}
                      </div>
                    )}
                    {evs.map((e, j) => chip(e, j))}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
