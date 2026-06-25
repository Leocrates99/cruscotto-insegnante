import type { DbKey } from "@model";
import { schemaByKey } from "@model";
import type { View } from "../App";
import { useStore } from "../store/useStore";
import { reminderCount } from "../compute/events";

interface ViewItem { v: View; label: string; icon: string }
type Sezione = { titolo: string; viste?: ViewItem[]; entita?: DbKey[] };

// Navigazione raggruppata per funzione (non più una lista piatta).
const SEZIONI: Sezione[] = [
  {
    titolo: "Lavoro",
    viste: [
      { v: { kind: "oggi" }, label: "Oggi", icon: "☀️" },
      { v: { kind: "calendar" }, label: "Calendario", icon: "📅" },
      { v: { kind: "planner" }, label: "Pianifica", icon: "🧠" },
      { v: { kind: "kanban" }, label: "Kanban", icon: "🗂️" },
    ],
  },
  {
    titolo: "Strumenti",
    viste: [
      { v: { kind: "archivio" }, label: "Archivio", icon: "📚" },
      { v: { kind: "valutazione" }, label: "Calcolatore voti", icon: "🧮" },
      { v: { kind: "avanzamento" }, label: "Avanzamento", icon: "🚦" },
      { v: { kind: "andamento" }, label: "Andamento", icon: "📉" },
      { v: { kind: "programmazione" }, label: "Sostenibilità oraria", icon: "📊" },
      { v: { kind: "timeline" }, label: "Cronoprogramma", icon: "📈" },
    ],
  },
  {
    titolo: "Quadro",
    viste: [
      { v: { kind: "home" }, label: "Panoramica", icon: "🏠" },
      { v: { kind: "promemoria" }, label: "Promemoria", icon: "📌" },
    ],
  },
  { titolo: "Pianificazione", entita: ["programmazione", "uda", "lezioni", "obiettivi", "verifiche"] },
  { titolo: "Risorse", entita: ["materiali", "sapere"] },
  { titolo: "Organizzazione", entita: ["scadenze", "progetti", "task", "riunioni", "osservazioni", "idee"] },
  { titolo: "Sviluppo", entita: ["formazione", "letture"] },
  { titolo: "Anagrafica", entita: ["anni", "classi"] },
];

export function Nav({
  view,
  onChange,
  open,
  onNavigate,
}: {
  view: View;
  onChange: (v: View) => void;
  open: boolean;
  onNavigate: () => void;
}) {
  useStore();
  const promCount = reminderCount();
  const go = (v: View) => { onChange(v); onNavigate(); };
  const viewActive = (v: View) => v.kind === view.kind && v.kind !== "entity";

  return (
    <nav className={open ? "nav open" : "nav"}>
      {SEZIONI.map((s) => (
        <details key={s.titolo} className="nav-group" open>
          <summary className="nav-sep">{s.titolo}</summary>
          {s.viste?.map((it) => (
            <button key={it.label} className={viewActive(it.v) ? "active" : ""} onClick={() => go(it.v)}>
              <span>{it.icon} {it.label}</span>
              {it.v.kind === "promemoria" && promCount > 0 && <span className="badge">{promCount}</span>}
            </button>
          ))}
          {s.entita?.map((k) => (
            <button key={k} className={view.kind === "entity" && view.key === k ? "active" : ""} onClick={() => go({ kind: "entity", key: k })}>
              <span>{schemaByKey[k].icon} {schemaByKey[k].title}</span>
            </button>
          ))}
        </details>
      ))}
    </nav>
  );
}
