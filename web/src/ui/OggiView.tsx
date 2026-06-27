// Vista "Oggi" = home a due metà: a sinistra il calendario del giorno (riusa il
// TimeGrid del Calendario in vista giornaliera), a destra i comandi principali
// (Pianifica, Correggi le verifiche) e le scadenze. Niente nuovo modello dati.
import type { DbKey } from "@model";
import type { View } from "../App";
import type { Rec, Value } from "../store/store";
import { useStore } from "../store/useStore";
import { useProfile, scuoleCorrenti } from "../store/profile";
import { useValutazione, annoCorrente } from "../store/valutazione";
import { reminderItems, collectEvents, type CalEvent } from "../compute/events";
import { TimeGrid } from "./CalendarView";
import { DCard } from "./PlannerView";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function relDays(g: number): string {
  if (g < 0) return `${-g} g fa`;
  if (g === 0) return "oggi";
  if (g === 1) return "domani";
  return `tra ${g} g`;
}

function ColdStart({ onOpenProfile, onView }: { onOpenProfile: () => void; onView: (v: View) => void }) {
  return (
    <article className="oggi-coldstart">
      <h2>👋 Inizia da qui</h2>
      <p className="muted">Bastano tre passi per rendere il cruscotto tuo: poi questa schermata ti mostrerà ogni giorno lezioni, scadenze e verifiche.</p>
      <div className="oggi-steps">
        <button className="oggi-step" onClick={onOpenProfile}><span className="oggi-step-n">1</span><strong>Profilo &amp; materie</strong><small>Classi di concorso → le tue materie</small></button>
        <button className="oggi-step" onClick={onOpenProfile}><span className="oggi-step-n">2</span><strong>Orario &amp; classi</strong><small>La tabella oraria e le tue classi</small></button>
        <button className="oggi-step" onClick={() => onView({ kind: "planner" })}><span className="oggi-step-n">3</span><strong>Pianifica la prima lezione</strong><small>Brainstorming → calendario</small></button>
      </div>
    </article>
  );
}

export function OggiView({
  onView,
  onEdit,
  onOpenProfile,
}: {
  onView: (v: View) => void;
  onEdit: (k: DbKey, rec?: Rec, prefill?: Record<string, Value>) => void;
  onOpenProfile: () => void;
}) {
  useStore();
  const profile = useProfile();
  const val = useValutazione();

  const now = new Date();
  const oggiIso = now.toISOString().slice(0, 10);
  const dataLunga = cap(now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }));
  const anno = annoCorrente();
  const scuola = scuoleCorrenti(profile)[0];
  const profiloVuoto = !profile.onboarded || (profile.materie.length === 0 && profile.classi.length === 0);
  const oggiMd = (now.getMonth() + 1) * 100 + now.getDate();
  const inizioAnno = !profiloVuoto && oggiMd >= 901 && oggiMd <= 1031;

  // Calendario del giorno: stessi dati del Calendario (eventi datati + sessioni-verifica).
  const byDay = new Map<string, CalEvent[]>();
  for (const e of collectEvents()) { const a = byDay.get(e.date) ?? []; a.push(e); byDay.set(e.date, a); }
  const sessByDay = new Map<string, { id: string; titolo: string }[]>();
  for (const s of val.sessioni) { if (!/^\d{4}-\d{2}-\d{2}/.test(s.data)) continue; const k = s.data.slice(0, 10); const a = sessByDay.get(k) ?? []; a.push({ id: s.id, titolo: s.titolo }); sessByDay.set(k, a); }
  const openSessione = (id: string) => onView({ kind: "valutazione", sessioneId: id });

  const { scadute, imminenti } = reminderItems(14);
  const nScad = scadute.length + imminenti.length;

  return (
    <section className="oggi">
      <div className="view-head oggi-head">
        <div>
          <h1>☀️ Oggi</h1>
          <p className="muted">{dataLunga} · {anno}{scuola ? ` · ${scuola.nome}` : ""}{profile.docente ? ` · ${profile.docente}` : ""}</p>
        </div>
      </div>

      {profiloVuoto && <ColdStart onOpenProfile={onOpenProfile} onView={onView} />}

      {inizioAnno && (
        <article className="oggi-coldstart">
          <h2>🧭 Adempimenti d'inizio anno</h2>
          <p className="muted">All'avvio dell'anno: traccia la programmazione annuale delle classi e progetta le UdA. Si compilano una volta e fanno da bussola.</p>
          <div className="pl-dgrid">
            <DCard icon="🧭" title="Programmazione annuale" desc="La bussola dell'anno: contenuti, competenze e copertura del quadro nazionale." onClick={() => onView({ kind: "progrAnnuale" })} />
            <DCard icon="🧩" title="Unità di Apprendimento" desc="Progetta un'UdA: dalla competenza-traguardo al compito autentico." onClick={() => onView({ kind: "planner" })} />
          </div>
        </article>
      )}

      {!profiloVuoto && (
        <div className="oggi-2col">
          <article className="oggi-cal">
            <TimeGrid days={[now]} byDay={byDay} sessByDay={sessByDay} onEdit={onEdit} onOpenSessione={openSessione} />
          </article>

          <div className="oggi-side">
            <button className="oggi-cta oggi-cta--primary" onClick={() => onView({ kind: "planner" })}>
              <span className="oggi-cta-ic" aria-hidden="true">🧠</span>
              <span className="oggi-cta-tx"><b>Pianifica un'attività</b><small>Lezione, laboratorio o UdA — dal contenuto al calendario.</small></span>
              <span className="oggi-cta-go" aria-hidden="true">→</span>
            </button>
            <button className="oggi-cta oggi-cta--ghost" onClick={() => onView({ kind: "valutazione" })}>
              <span className="oggi-cta-ic" aria-hidden="true">🧮</span>
              <span className="oggi-cta-tx"><b>Correggi le verifiche</b><small>Calcolatore voti: sessioni da correggere e medie.</small></span>
              <span className="oggi-cta-go" aria-hidden="true">→</span>
            </button>

            <article className="oggi-card oggi-scad">
              <h2>⏰ Scadenze {nScad > 0 && <span className="badge">{nScad}</span>}</h2>
              {nScad === 0 && <p className="muted">Nessuna scadenza nei prossimi 14 giorni.</p>}
              {scadute.length > 0 && (
                <ul className="oggi-list">
                  {scadute.map((r) => (
                    <li key={r.rec.id} className="oggi-scaduta">
                      <button className="linklike" onClick={() => onEdit("scadenze", r.rec)}>{r.title}</button>
                      <span className="oggi-when warn">{relDays(r.giorni)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {imminenti.length > 0 && (
                <ul className="oggi-list">
                  {imminenti.map((r) => (
                    <li key={r.rec.id}>
                      <button className="linklike" onClick={() => onEdit("scadenze", r.rec)}>{r.title}</button>
                      <span className="oggi-when">{relDays(r.giorni)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="oggi-scad-foot">
                {nScad > 0 && <button className="linklike" onClick={() => onView({ kind: "promemoria" })}>Tutti i promemoria →</button>}
                <button className="linklike" onClick={() => onEdit("scadenze", undefined, { Data: oggiIso })}>＋ Nuova scadenza</button>
              </div>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
