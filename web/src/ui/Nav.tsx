import type { DbKey } from "@model";
import { buildOrder, schemaByKey } from "@model";
import type { View } from "../App";

export function Nav({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const isEntity = (k: DbKey) => view.kind === "entity" && view.key === k;
  return (
    <nav className="nav">
      <button className={view.kind === "home" ? "active" : ""} onClick={() => onChange({ kind: "home" })}>
        🏠 Panoramica
      </button>
      <button
        className={view.kind === "programmazione" ? "active" : ""}
        onClick={() => onChange({ kind: "programmazione" })}
      >
        📊 Sostenibilità oraria
      </button>
      <div className="nav-sep">Database</div>
      {buildOrder.map((k) => (
        <button key={k} className={isEntity(k) ? "active" : ""} onClick={() => onChange({ kind: "entity", key: k })}>
          {schemaByKey[k].icon} {schemaByKey[k].title}
        </button>
      ))}
    </nav>
  );
}
