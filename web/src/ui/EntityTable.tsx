import { useState } from "react";
import type { BasePropertyDef, DbKey } from "@model";
import { schemaByKey } from "@model";
import { records, recordTitle, removeRecord, titleProp, type Rec, type Value } from "../store/store";
import { useStore } from "../store/useStore";
import { RecordForm } from "./RecordForm";
import { materiaColor } from "./materia";

function CellValue({ name, prop, value }: { name: string; prop: BasePropertyDef; value: Value }) {
  if (value === undefined || value === "") return null;
  if (prop.type === "select" && typeof value === "string") {
    const color = name === "Materia" ? materiaColor(value) : undefined;
    return (
      <span className="chip" style={color ? { color, borderColor: color } : undefined}>
        {value}
      </span>
    );
  }
  if (prop.type === "multi_select" && Array.isArray(value)) {
    return (
      <span className="chips">
        {value.map((x) => (
          <span key={x} className="chip">
            {x}
          </span>
        ))}
      </span>
    );
  }
  if (typeof value === "boolean") return value ? <span className="check">✓</span> : null;
  if (prop.type === "url" && typeof value === "string") {
    return (
      <a href={value} target="_blank" rel="noreferrer">
        🔗
      </a>
    );
  }
  if (Array.isArray(value)) return <>{value.join(", ")}</>;
  return <>{String(value)}</>;
}

export function EntityTable({ dbKey, onOpenUda }: { dbKey: DbKey; onOpenUda?: (id: string) => void }) {
  useStore();
  const def = schemaByKey[dbKey];
  const [editing, setEditing] = useState<{ rec?: Rec } | null>(null);
  const rows = records(dbKey);
  const tcol = titleProp(dbKey);
  const baseCols = Object.entries(def.properties).filter(
    ([name, p]) => name !== tcol && p.type !== "rich_text" && p.type !== "files"
  );
  const rels = def.relations ?? [];
  const span = 2 + baseCols.length + rels.length;

  return (
    <section>
      <div className="view-head">
        <h1>
          {def.icon} {def.title} <small>({rows.length})</small>
        </h1>
        <button className="primary" onClick={() => setEditing({})}>
          + Nuovo
        </button>
      </div>
      <p className="muted">{def.description}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{tcol}</th>
              {baseCols.map(([name]) => (
                <th key={name}>{name}</th>
              ))}
              {rels.map((r) => (
                <th key={r.name}>{r.name}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={span} className="muted">
                  Nessun record. Usa «+ Nuovo» oppure «Carica esempio» in alto.
                </td>
              </tr>
            )}
            {rows.map((rec) => (
              <tr key={rec.id}>
                <td className="title-cell">{recordTitle(dbKey, rec)}</td>
                {baseCols.map(([name, p]) => (
                  <td key={name}>
                    <CellValue name={name} prop={p} value={rec[name]} />
                  </td>
                ))}
                {rels.map((r) => (
                  <td key={r.name}>{(Array.isArray(rec[r.name]) ? (rec[r.name] as string[]).length : 0) || ""}</td>
                ))}
                <td className="row-actions">
                  {dbKey === "uda" && onOpenUda && <button onClick={() => onOpenUda(rec.id)}>Dettaglio</button>}
                  <button onClick={() => setEditing({ rec })}>Modifica</button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (confirm("Eliminare questo record?")) removeRecord(dbKey, rec.id);
                    }}
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <RecordForm dbKey={dbKey} rec={editing.rec} onClose={() => setEditing(null)} />}
    </section>
  );
}
