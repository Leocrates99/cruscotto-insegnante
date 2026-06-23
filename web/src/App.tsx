import { useState } from "react";
import type { DbKey } from "@model";
import type { Rec, Value } from "./store/store";
import { Nav } from "./ui/Nav";
import { Toolbar } from "./ui/Toolbar";
import { HomeView } from "./ui/HomeView";
import { EntityTable } from "./ui/EntityTable";
import { UdaDetail } from "./ui/UdaDetail";
import { ProgrammazioneView } from "./ui/ProgrammazioneView";
import { CalendarView } from "./ui/CalendarView";
import { KanbanView } from "./ui/KanbanView";
import { TimelineView } from "./ui/TimelineView";
import { PromemoriaView } from "./ui/PromemoriaView";
import { RecordPanel } from "./ui/RecordPanel";

export type View =
  | { kind: "calendar" }
  | { kind: "kanban" }
  | { kind: "timeline" }
  | { kind: "promemoria" }
  | { kind: "home" }
  | { kind: "programmazione" }
  | { kind: "entity"; key: DbKey }
  | { kind: "uda"; id: string };

interface Editing {
  dbKey: DbKey;
  rec?: Rec;
  prefill?: Record<string, Value>;
}

export function App() {
  const [view, setView] = useState<View>({ kind: "calendar" });
  const [navOpen, setNavOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const onEdit = (dbKey: DbKey, rec?: Rec, prefill?: Record<string, Value>) => setEditing({ dbKey, rec, prefill });
  const openUda = (id: string) => setView({ kind: "uda", id });

  return (
    <div className={editing ? "app panel-open" : "app"}>
      <Toolbar onToggleNav={() => setNavOpen((o) => !o)} />
      <div className="body">
        <Nav view={view} onChange={setView} open={navOpen} onNavigate={() => setNavOpen(false)} />
        {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
        <main className="main">
          {view.kind === "calendar" && <CalendarView onEdit={onEdit} onView={setView} />}
          {view.kind === "kanban" && <KanbanView onEdit={onEdit} onOpenUda={openUda} />}
          {view.kind === "timeline" && <TimelineView onOpenUda={openUda} />}
          {view.kind === "promemoria" && <PromemoriaView onEdit={onEdit} />}
          {view.kind === "home" && (
            <HomeView onSelect={(key) => setView({ kind: "entity", key })} onOpenUda={openUda} />
          )}
          {view.kind === "programmazione" && <ProgrammazioneView />}
          {view.kind === "entity" && <EntityTable dbKey={view.key} onEdit={onEdit} onOpenUda={openUda} />}
          {view.kind === "uda" && (
            <UdaDetail id={view.id} onBack={() => setView({ kind: "entity", key: "uda" })} onEdit={onEdit} />
          )}
        </main>
      </div>
      {editing && (
        <RecordPanel dbKey={editing.dbKey} rec={editing.rec} prefill={editing.prefill} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
