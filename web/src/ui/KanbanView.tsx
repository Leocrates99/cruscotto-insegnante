import { useState } from "react";
import { STATO_CICLO } from "@model";
import type { DbKey } from "@model";
import { getRecord, records, recordTitle, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { materiaColor } from "./materia";

const ENTITIES: { key: DbKey; label: string }[] = [
  { key: "uda", label: "UdA" },
  { key: "lezioni", label: "Lezioni" },
  { key: "progetti", label: "Progetti" },
];

export function KanbanView({
  onEdit,
  onOpenUda,
}: {
  onEdit: (k: DbKey, r: Rec) => void;
  onOpenUda: (id: string) => void;
}) {
  useStore();
  const [entity, setEntity] = useState<DbKey>("uda");
  const [dragId, setDragId] = useState<string | null>(null);

  const byStato = new Map<string, Rec[]>();
  for (const col of STATO_CICLO) byStato.set(col.name, []);
  let senza = 0;
  for (const r of records(entity)) {
    const s = typeof r["Stato"] === "string" ? (r["Stato"] as string) : "";
    if (byStato.has(s)) byStato.get(s)!.push(r);
    else senza++;
  }

  const drop = (stato: string) => {
    if (!dragId) return;
    const r = getRecord(entity, dragId);
    if (r && r["Stato"] !== stato) upsert(entity, { ...r, Stato: stato });
    setDragId(null);
  };

  const materiaOf = (r: Rec): string | undefined => {
    if (typeof r["Materia"] === "string") return r["Materia"] as string;
    if (entity === "uda" && Array.isArray(r["Obiettivi"])) {
      for (const id of r["Obiettivi"] as string[]) {
        const m = getRecord("obiettivi", id)?.["Materia"];
        if (typeof m === "string") return m;
      }
    }
    return undefined;
  };

  return (
    <section>
      <div className="view-head">
        <h1>🗂️ Kanban</h1>
        <div className="seg">
          {ENTITIES.map((e) => (
            <button key={e.key} className={entity === e.key ? "active" : ""} onClick={() => setEntity(e.key)}>
              {e.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted">Trascina le schede tra le colonne per cambiarne lo stato.</p>
      <div className="kanban">
        {STATO_CICLO.map((col) => {
          const cards = byStato.get(col.name) ?? [];
          return (
            <div key={col.name} className="kan-col" onDragOver={(e) => e.preventDefault()} onDrop={() => drop(col.name)}>
              <div className="kan-col-head">
                <span>{col.name}</span>
                <b>{cards.length}</b>
              </div>
              <div className="kan-cards">
                {cards.map((r) => {
                  const mc = materiaColor(materiaOf(r));
                  return (
                    <div
                      key={r.id}
                      className={dragId === r.id ? "kan-card dragging" : "kan-card"}
                      draggable
                      style={mc ? { borderLeftColor: mc } : undefined}
                      onDragStart={() => setDragId(r.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => (entity === "uda" ? onOpenUda(r.id) : onEdit(entity, r))}
                    >
                      {recordTitle(entity, r)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {senza > 0 && <p className="muted">{senza} record senza stato: aprili per assegnarne uno.</p>}
    </section>
  );
}
