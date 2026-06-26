// Vista "Oggi": la porta d'ingresso del cruscotto. Aggrega ciò che già esiste
// (orario, lezioni, scadenze, sessioni di verifica, avanzamento) in un brief
// giornaliero con scorciatoie ai flussi caldi. Niente nuovo modello dati.
import type { DbKey } from "@model";
import type { View } from "../App";
import { records, recordTitle, type Rec, type Value } from "../store/store";
import { useStore } from "../store/useStore";
import { useProfile, scuoleCorrenti } from "../store/profile";
import { useSettings } from "../store/settings";
import { useValutazione, annoCorrente } from "../store/valutazione";
import { reminderItems } from "../compute/events";
import { lessonStato, classeDiLezione } from "../compute/progress";
import { materiaColor, classeColor } from "./materia";
import { DCard } from "./PlannerView";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const colorStyle = (c?: string) => (c ? { color: c, borderColor: c } : undefined);

function relDays(g: number): string {
  if (g < 0) return `${-g} g fa`;
  if (g === 0) return "oggi";
  if (g === 1) return "domani";
  return `tra ${g} g`;
}
function fmtData(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function ColdStart({ onOpenProfile, onView }: { onOpenProfile: () => void; onView: (v: View) => void }) {
  return (
    <article className="oggi-coldstart">
      <h2>👋 Inizia da qui</h2>
      <p className="muted">
        Bastano tre passi per rendere il cruscotto tuo: poi questa schermata ti mostrerà ogni giorno lezioni, scadenze e verifiche.
      </p>
      <div className="oggi-steps">
        <button className="oggi-step" onClick={onOpenProfile}>
          <span className="oggi-step-n">1</span>
          <strong>Profilo &amp; materie</strong>
          <small>Classi di concorso → le tue materie</small>
        </button>
        <button className="oggi-step" onClick={onOpenProfile}>
          <span className="oggi-step-n">2</span>
          <strong>Orario &amp; classi</strong>
          <small>La tabella oraria e le tue classi</small>
        </button>
        <button className="oggi-step" onClick={() => onView({ kind: "planner" })}>
          <span className="oggi-step-n">3</span>
          <strong>Pianifica la prima lezione</strong>
          <small>Brainstorming → calendario</small>
        </button>
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
  const settings = useSettings();
  const val = useValutazione();

  const now = new Date();
  const oggiIso = now.toISOString().slice(0, 10);
  const wd = (now.getDay() + 6) % 7; // 0 = lunedì
  const dataLunga = cap(now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }));
  const anno = annoCorrente();
  const scuola = scuoleCorrenti(profile)[0];
  const profiloVuoto = !profile.onboarded || (profile.materie.length === 0 && profile.classi.length === 0);
  // Adempimenti d'inizio anno (1 set – 31 ott): programmazione annuale e UdA.
  const oggiMd = (now.getMonth() + 1) * 100 + now.getDate();
  const inizioAnno = !profiloVuoto && oggiMd >= 901 && oggiMd <= 1031;

  // Lezioni di oggi: orario ricorrente del giorno + lezioni datate oggi.
  const bandOrder = new Map(settings.timeBands.map((b, i) => [b.label, i]));
  const bandTime = new Map(settings.timeBands.map((b) => [b.label, b.start]));
  const orarioOggi = profile.orario
    .filter((s) => s.giorno === wd && (s.materia || s.classe))
    .sort((a, b) => (bandOrder.get(a.fascia) ?? 99) - (bandOrder.get(b.fascia) ?? 99));
  const lezioniOggi = records("lezioni").filter(
    (l) => typeof l["Data prevista"] === "string" && (l["Data prevista"] as string).slice(0, 10) === oggiIso
  );

  // Scadenze (riusa il motore dei promemoria).
  const { scadute, imminenti } = reminderItems(7);
  const nScad = scadute.length + imminenti.length;

  // Verifiche imminenti: sessioni non archiviate, da oggi in poi.
  const verifiche = val.sessioni
    .filter((s) => !s.archiviata && s.data && s.data >= oggiIso)
    .sort((a, b) => (a.data < b.data ? -1 : 1))
    .slice(0, 6);

  // Stato a colpo d'occhio.
  const ritardi = records("lezioni").filter((l) => lessonStato(l) === "in_ritardo").length;
  const udaCorso = records("uda").filter((u) => {
    const s = u["Stato"];
    return s === "In svolgimento" || s === "In corso" || s === "Progettata";
  }).length;
  const verificheAperte = val.sessioni.filter((s) => !s.archiviata).length;

  return (
    <section className="oggi">
      <div className="view-head oggi-head">
        <div>
          <h1>☀️ Oggi</h1>
          <p className="muted">
            {dataLunga} · {anno}
            {scuola ? ` · ${scuola.nome}` : ""}
            {profile.docente ? ` · ${profile.docente}` : ""}
          </p>
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

      <div className="oggi-azioni">
        <button className="primary" onClick={() => onView({ kind: "planner" })}>🧠 Pianifica</button>
        <button onClick={() => onView({ kind: "valutazione" })}>🧮 Calcolatore voti</button>
        <button onClick={() => onView({ kind: "calendar" })}>📅 Calendario</button>
        <button onClick={() => onEdit("lezioni", undefined, { "Data prevista": oggiIso })}>＋ Lezione</button>
      </div>

      <div className="oggi-grid">
        {/* In classe oggi */}
        <article className="oggi-card">
          <h2>📚 In classe oggi</h2>
          {orarioOggi.length === 0 && lezioniOggi.length === 0 && (
            <p className="muted">
              Nessuna lezione in orario oggi.{" "}
              {profile.orario.length === 0 && (
                <button className="linklike" onClick={onOpenProfile}>Imposta l'orario →</button>
              )}
            </p>
          )}
          {orarioOggi.length > 0 && (
            <ul className="oggi-orario">
              {orarioOggi.map((s, i) => (
                <li key={i}>
                  <span className="oggi-ora">{bandTime.get(s.fascia) ?? s.fascia}</span>
                  {s.materia && (
                    <span className="chip" style={colorStyle(materiaColor(s.materia))}>{s.materia}</span>
                  )}
                  {s.classe && (
                    <span className="chip" style={colorStyle(classeColor(s.classe))}>{s.classe}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {lezioniOggi.length > 0 && (
            <>
              <h3 className="oggi-sub">Lezioni pianificate</h3>
              <ul className="oggi-list">
                {lezioniOggi.map((l) => {
                  const c = classeDiLezione(l);
                  return (
                    <li key={l.id}>
                      <button className="linklike" onClick={() => onEdit("lezioni", l)}>{recordTitle("lezioni", l)}</button>
                      {c && <span className="chip" style={colorStyle(classeColor(c))}>{c}</span>}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </article>

        {/* In scadenza */}
        <article className="oggi-card">
          <h2>⏰ In scadenza {nScad > 0 && <span className="badge">{nScad}</span>}</h2>
          {nScad === 0 && <p className="muted">Nessuna scadenza nei prossimi 7 giorni.</p>}
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
          {nScad > 0 && (
            <button className="linklike oggi-more" onClick={() => onView({ kind: "promemoria" })}>Tutti i promemoria →</button>
          )}
        </article>

        {/* Verifiche imminenti */}
        <article className="oggi-card">
          <h2>📝 Verifiche imminenti</h2>
          {verifiche.length === 0 && (
            <p className="muted">
              Nessuna verifica in arrivo.{" "}
              <button className="linklike" onClick={() => onView({ kind: "valutazione" })}>Vai al calcolatore →</button>
            </p>
          )}
          {verifiche.length > 0 && (
            <ul className="oggi-list">
              {verifiche.map((s) => (
                <li key={s.id}>
                  <button className="linklike" onClick={() => onView({ kind: "valutazione", sessioneId: s.id })}>{s.titolo}</button>
                  <span className="chip" style={colorStyle(classeColor(s.classe))}>{s.classe}</span>
                  <span className="oggi-when">{fmtData(s.data)}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* A colpo d'occhio */}
        <article className="oggi-card">
          <h2>📈 A colpo d'occhio</h2>
          <div className="oggi-stat">
            <button className="oggi-metric" onClick={() => onView({ kind: "avanzamento" })}>
              <b className={ritardi > 0 ? "warn" : ""}>{ritardi}</b>
              <small>lezioni in ritardo</small>
            </button>
            <button className="oggi-metric" onClick={() => onView({ kind: "timeline" })}>
              <b>{udaCorso}</b>
              <small>UdA in corso</small>
            </button>
            <button className="oggi-metric" onClick={() => onView({ kind: "andamento" })}>
              <b>{verificheAperte}</b>
              <small>verifiche aperte</small>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
