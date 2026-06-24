import type { DbKey } from "@model";
import { schemaByKey } from "@model";
import type { View } from "../App";
import { useStore } from "../store/useStore";
import { reminderCount } from "../compute/events";

const VIEWS: { v: View; label: string; icon: string }[] = [
  { v: { kind: "calendar" }, label: "Calendario", icon: "📅" },
  { v: { kind: "planner" }, label: "Pianifica", icon: "🧠" },
  { v: { kind: "kanban" }, label: "Kanban", icon: "🗂️" },
  { v: { kind: "timeline" }, label: "Cronoprogramma", icon: "📈" },
  { v: { kind: "avanzamento" }, label: "Avanzamento", icon: "🚦" },
  { v: { kind: "valutazione" }, label: "Calcolatore voti", icon: "🧮" },
  { v: { kind: "andamento" }, label: "Andamento", icon: "📉" },
  { v: { kind: "promemoria" }, label: "Promemoria", icon: "📌" },
  { v: { kind: "home" }, label: "Panoramica", icon: "🏠" },
  { v: { kind: "programmazione" }, label: "Sostenibilità oraria", icon: "📊" },
];

const GROUPS: { title: string; keys: DbKey[] }[] = [
  { title: "Pianificazione", keys: ["programmazione", "uda", "lezioni", "obiettivi", "verifiche"] },
  { title: "Risorse", keys: ["materiali", "sapere"] },
  { title: "Organizzazione", keys: ["scadenze", "progetti", "task", "riunioni", "osservazioni", "idee"] },
  { title: "Sviluppo", keys: ["formazione", "letture"] },
  { title: "Anagrafica", keys: ["anni", "classi"] },
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
  const go = (v: View) => {
    onChange(v);
    onNavigate();
  };
  const viewActive = (v: View) => v.kind === view.kind && v.kind !== "entity";

  return (
    <nav className={open ? "nav open" : "nav"}>
      <div className="nav-sep">Viste</div>
      {VIEWS.map((it) => (
        <button key={it.label} className={viewActive(it.v) ? "active" : ""} onClick={() => go(it.v)}>
          <span>{it.icon} {it.label}</span>
          {it.v.kind === "promemoria" && promCount > 0 && <span className="badge">{promCount}</span>}
        </button>
      ))}

      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="nav-sep">{g.title}</div>
          {g.keys.map((k) => (
            <button
              key={k}
              className={view.kind === "entity" && view.key === k ? "active" : ""}
              onClick={() => go({ kind: "entity", key: k })}
            >
              <span>{schemaByKey[k].icon} {schemaByKey[k].title}</span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
