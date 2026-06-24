import { useEffect, useRef, useState, type MouseEvent as RMouseEvent, type DragEvent as RDragEvent } from "react";
import type { DbKey } from "@model";
import { records, upsert, type Rec, type Value } from "../store/store";
import type { View } from "../App";
import { useStore } from "../store/useStore";
import { collectEvents, type CalEvent } from "../compute/events";
import { toMinutes, setSettings, useSettings } from "../store/settings";
import { useProfile } from "../store/profile";
import { classeDiLezione } from "../compute/progress";
import { classeColor, materiaColor } from "./materia";
import { classeId, annoCorrenteId } from "../store/links";
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

// ── Finestra oraria: giornata intera 06:00–21:00, scorrevole, ore comode ─────
const START_H = 6, END_H = 21;
const START_MIN = START_H * 60, END_MIN = END_H * 60, TOTAL = END_MIN - START_MIN;
const HOUR_H = 68; // px per ora: alto a sufficienza perché il testo non si comprima
const GRID_H = (TOTAL / 60) * HOUR_H;
const yOf = (min: number) => ((Math.max(START_MIN, Math.min(END_MIN, min)) - START_MIN) / 60) * HOUR_H;
const fmtMin = (min: number) => `${pad(Math.floor(min / 60))}:${pad(Math.round(min) % 60)}`;

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
function eventColor(e: CalEvent): string | undefined {
  if (e.dbKey === "verifiche") return C_VERIFICA;
  if (isBurocrazia(e)) return C_BUROCRAZIA;
  return e.color;
}
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
          <details className="dropdown dropdown--start">
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
  const bodyRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const todayStr = ymd(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const cols = { gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` } as const;
  const hours: number[] = [];
  for (let h = START_H; h <= END_H; h++) hours.push(h);

  // Indice delle lezioni-record per (data|materia|classe), per agganciarle agli slot dell'orario.
  const lezByKey = new Map<string, Rec>();
  for (const l of records("lezioni")) {
    const dp = l["Data prevista"];
    if (typeof dp !== "string") continue;
    const k = `${dp.slice(0, 10)}|${l["Materia"] ?? ""}|${classeDiLezione(l) ?? ""}`;
    if (!lezByKey.has(k)) lezByKey.set(k, l);
  }

  // Auto-scroll all'avvio: porta in vista la mattina (prima fascia) invece delle 06:00 vuote.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const minStart = bands.length ? Math.min(...bands.map((b) => toMinutes(b.start))) : 8 * 60;
    el.scrollTop = Math.max(0, yOf(minStart) - 14);
  }, [bands.length]);

  // Ora di un evento (campo libero "Ora" o, retrocompatibile, inizio della "Fascia").
  const eventOra = (e: CalEvent): string | undefined => {
    const o = e.rec["Ora"];
    if (typeof o === "string" && /^\d{1,2}:\d{2}/.test(o)) return o;
    const f = e.rec["Fascia"];
    if (typeof f === "string") return bands.find((b) => b.label === f)?.start;
    return undefined;
  };
  const eventMin = (e: CalEvent): number | null => { const o = eventOra(e); return o ? toMinutes(o) : null; };

  const drop = (ds: string, ora?: string) => {
    if (!dragEv) return;
    upsert(dragEv.dbKey, { ...dragEv.rec, [dragEv.prop]: ds, Ora: ora });
    setDragEv(null);
    setOver(null);
  };
  const dragProps = (e: CalEvent) => ({
    draggable: true as const,
    onDragStart: () => setDragEv(e),
    onDragEnd: () => { setDragEv(null); setOver(null); },
  });
  const minFromY = (e: RMouseEvent | RDragEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return Math.round((START_MIN + ((e.clientY - r.top) / HOUR_H) * 60) / 5) * 5;
  };

  // Pre-calcolo per giorno: blocchi-orario (con eventuale lezione agganciata) e lezioni "usate".
  const perDay = days.map((d) => {
    const ds = ymd(d);
    const wd = (d.getDay() + 6) % 7;
    const used = new Set<string>();
    const blocks = bands
      .map((b) => {
        const ov = profile.orario.find((s) => s.giorno === wd && s.fascia === b.label);
        if (!ov || (!ov.materia && !ov.classe)) return null;
        const lez = lezByKey.get(`${ds}|${ov.materia ?? ""}|${ov.classe ?? ""}`);
        if (lez) used.add(lez.id);
        return { b, ov, lez };
      })
      .filter((x): x is { b: typeof bands[number]; ov: NonNullable<ReturnType<typeof profile.orario.find>>; lez: Rec | undefined } => x !== null);
    return { d, ds, wd, blocks, used };
  });

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
        {perDay.map(({ ds, used }, i) => {
          const allday = (byDay.get(ds) ?? []).filter((e) => eventMin(e) === null && !(e.dbKey === "lezioni" && used.has(e.rec.id)));
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
              {allday.map((e, j) => {
                const bg = eventColor(e);
                return (
                  <button key={j} className={bg ? "tg-chip" : "tg-chip plain"} {...dragProps(e)} style={bg ? { background: bg, color: contrastText(bg), borderColor: bg } : undefined} title={`${e.title} · ${e.prop}`} onClick={(ev) => { ev.stopPropagation(); onEdit(e.dbKey, e.rec); }}>
                    {e.title}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {bands.length === 0 ? (
        <div className="tg-empty">Nessuna ora impostata. Definisci le ore (anche pomeridiane) dal <b>Profilo › Orario &amp; classi › Fasce orarie</b>.</div>
      ) : (
        <div className="tg-grid tg-body" ref={bodyRef} style={cols}>
          <div className="tg-axis" style={{ height: GRID_H }}>
            {hours.map((h) => <div key={h} className="tg-hour" style={{ top: yOf(h * 60) }}>{pad(h)}:00</div>)}
          </div>
          {perDay.map(({ ds, blocks, used }, di) => {
            const isToday = ds === todayStr;
            const timed = (byDay.get(ds) ?? []).filter((e) => eventMin(e) !== null && !(e.dbKey === "lezioni" && used.has(e.rec.id)));
            return (
              <div
                key={di}
                className={isToday ? "tg-col today" : "tg-col"}
                style={{ height: GRID_H }}
                onClick={(e) => onEdit("scadenze", undefined, { Data: ds, Ora: fmtMin(minFromY(e, e.currentTarget)), "Anno scolastico": [annoCorrenteId()] })}
                onDragOver={(e) => { e.preventDefault(); setOver(`${di}:col`); }}
                onDrop={(e) => drop(ds, fmtMin(minFromY(e, e.currentTarget)))}
              >
                {hours.map((h) => <div key={h} className="tg-hline" style={{ top: yOf(h * 60) }} />)}

                {blocks.map(({ b, ov, lez }, bi) => {
                  const a = toMinutes(b.start), z = toMinutes(b.end);
                  const bg = materiaColor(ov.materia) ?? classeColor(ov.classe) ?? "#6b6660";
                  const fg = contrastText(bg);
                  const open = (ev: RMouseEvent) => {
                    ev.stopPropagation();
                    if (lez) { onEdit("lezioni", lez); return; }
                    onEdit("lezioni", undefined, {
                      Titolo: [ov.materia, ov.classe].filter(Boolean).join(" · "),
                      Materia: ov.materia,
                      "Data prevista": ds,
                      Ora: b.start,
                      "Anno scolastico": [annoCorrenteId()],
                      ...(ov.classe ? { Classe: [classeId(ov.classe)] } : {}),
                    });
                  };
                  return (
                    <button key={bi} className="tg-slot" style={{ top: yOf(a) + 1, height: Math.max(30, yOf(z) - yOf(a) - 2), background: bg, color: fg }} onClick={open} title={`${[ov.materia, ov.classe].filter(Boolean).join(" · ")} · ${b.start}–${b.end}${lez ? " · " + (lez["Titolo"] as string) : ""}`}>
                      <span className="tg-slot-head">
                        <span>{b.label} · {b.start}</span>
                        {ov.classe && <span className="tg-slot-cls">{ov.classe}</span>}
                      </span>
                      <span className="tg-slot-mat">{lez && lez["Titolo"] ? (lez["Titolo"] as string) : ov.materia}</span>
                    </button>
                  );
                })}

                {timed.map((e, ei) => {
                  const m = eventMin(e)!;
                  const bg = eventColor(e);
                  const o = eventOra(e);
                  return (
                    <button key={ei} className="tg-ev" {...dragProps(e)} style={{ top: yOf(m), background: bg ?? "var(--parchment)", color: bg ? contrastText(bg) : "var(--ink)", borderColor: bg ?? "var(--parchment-dark)" }} title={`${o ? o + " · " : ""}${e.title} · ${e.prop}`} onClick={(ev) => { ev.stopPropagation(); onEdit(e.dbKey, e.rec); }}>
                      {o && <b className="tg-chip-ora">{o}</b>} {e.title}
                    </button>
                  );
                })}

                {isToday && nowMin >= START_MIN && nowMin <= END_MIN && (
                  <div className="tg-now" style={{ top: yOf(nowMin) }}><span className="tg-now-dot" /></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
