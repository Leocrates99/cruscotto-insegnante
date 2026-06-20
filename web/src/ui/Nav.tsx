import type { DbKey } from "@model";
import { buildOrder, schemaByKey } from "@model";
import type { View } from "../App";

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
  const isEntity = (k: DbKey) => view.kind === "entity" && view.key === k;
  // Cambia vista e chiude il drawer (su mobile).
  const go = (v: View) => {
    onChange(v);
    onNavigate();
  };

  return (
    <nav className={open ? "nav open" : "nav"}>
      <button className={view.kind === "home" ? "active" : ""} onClick={() => go({ kind: "home" })}>
        🏠 Panoramica
      </button>
      <button
        className={view.kind === "programmazione" ? "active" : ""}
        onClick={() => go({ kind: "programmazione" })}
      >
        📊 Sostenibilità oraria
      </button>
      <div className="nav-sep">Database</div>
      {buildOrder.map((k) => (
        <button key={k} className={isEntity(k) ? "active" : ""} onClick={() => go({ kind: "entity", key: k })}>
          {schemaByKey[k].icon} {schemaByKey[k].title}
        </button>
      ))}
    </nav>
  );
}
