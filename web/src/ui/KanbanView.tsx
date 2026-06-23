import { useState } from "react";
import { STATO_CICLO, schemaByKey } from "@model";
import type { DbKey } from "@model";
import { getRecord, newId, records, recordTitle, titleProp, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { materiaColor } from "./materia";

const ENTITIES: { key: DbKey; label: string }[] = [
  { key: "uda", label: "UdA" },
  { key: "lezioni", label: "Lezioni" },
  { key: "progetti", label: "Progetti" },
];

// Colori dei nomi-colore Notion → tinte reali (gerarchia degli stati).
const NOTION_HEX: Record<string, string> = {
  gray: "#9aa3af", brown: "#9c6b3c", orange: "#d97706", yellow: "#caa43c",
  blue: "#3b6fe0", purple: "#7c3aed", pink: "#db2777", green: "#2f855a", red: "#c53030", default: "#6b7280",
};

export function KanbanView({
  onEdit,
  onOpenUda,
}: {
  onEdit: (k: DbKey, r?: Rec) => void;
  onOpenUda: (id: string) => void;
}) {
  useStore();
  const [entity, setEntity] = useState<DbKey>("uda");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [quick, setQuick] = useState("");

  const byStato = new Map<string, Rec[]>();
  for (const col of STATO_CICLO) byStato.set(col.name, []);
  let senza = 0;
  for (const r of records(entity)) {
    const s = typeof r["Stato"] === "string" ? (r["Stato"] as string) : "";
    if (byStato.has(s)) byStato.get(s)!.push(r);
    else senza++;
  }

  const drop = (stato: string) => {
    if (dragId) {
      const r = getRecord(entity, dragId);
      if (r && r["Stato"] !== stato) upsert(entity, { ...r, Stato: stato });
    }
    setDragId(null);
    setOverCol(null);
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

  const addQuick = () => {
    const t = quick.trim();
    if (!t) return;
    upsert(entity, { id: newId(), [titleProp(entity)]: t, Stato: STATO_CICLO[0].name } as Rec);
    setQuick("");
  };

  return (
    <section className="kanban-view">
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

      <div className="kan-quick">
        <input
          value={quick}
          placeholder={`Nuova attività in «${schemaByKey[entity].title}»…`}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addQuick(); }}
        />
        <button className="primary" onClick={addQuick}>+ Aggiungi</button>
        <button onClick={() => onEdit(entity)}>Con dettagli…</button>
      </div>

      <div className="kanban">
        {STATO_CICLO.map((col) => {
          const hex = NOTION_HEX[col.color ?? "default"] ?? NOTION_HEX.default;
          const cards = byStato.get(col.name) ?? [];
          return (
            <div
              key={col.name}
              className={overCol === col.name ? "kan-col over" : "kan-col"}
              style={{ borderTopColor: hex }}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.name); }}
              onDragLeave={() => setOverCol((c) => (c === col.name ? null : c))}
              onDrop={() => drop(col.name)}
            >
              <div className="kan-col-head">
                <span style={{ color: hex }}>● {col.name}</span>
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
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
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
