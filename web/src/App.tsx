import { useEffect, useState } from "react";
import type { DbKey } from "@model";
import type { Rec, Value } from "./store/store";
import { getState, subscribe } from "./store/store";
import { exportJson } from "./store/persistence";
import { initFileBackup, markExported, maybeAutoSnapshot, scheduleFileBackup, useBackup } from "./store/backup";
import { useStore } from "./store/useStore";
import { BackupPanel } from "./ui/BackupPanel";
import { Nav } from "./ui/Nav";
import { Toolbar } from "./ui/Toolbar";
import { HomeView } from "./ui/HomeView";
import { EntityTable } from "./ui/EntityTable";
import { UdaDetail } from "./ui/UdaDetail";
import { ProgrammazioneView } from "./ui/ProgrammazioneView";
import { CalendarView } from "./ui/CalendarView";
import { KanbanView } from "./ui/KanbanView";
import { TimelineView } from "./ui/TimelineView";
import { AvanzamentoView } from "./ui/AvanzamentoView";
import { ValutazioneView } from "./ui/ValutazioneView";
import { AndamentoView } from "./ui/AndamentoView";
import { PlannerView } from "./ui/PlannerView";
import { ArchivioView } from "./ui/ArchivioView";
import { OggiView } from "./ui/OggiView";
import { PromemoriaView } from "./ui/PromemoriaView";
import { RecordPanel } from "./ui/RecordPanel";
import { Onboarding } from "./ui/Onboarding";
import { ExportFineAnno } from "./ui/ExportFineAnno";
import { useProfile } from "./store/profile";
import { annoCorrente } from "./store/valutazione";

export type View =
  | { kind: "oggi" }
  | { kind: "calendar" }
  | { kind: "kanban" }
  | { kind: "timeline" }
  | { kind: "avanzamento" }
  | { kind: "valutazione"; sessioneId?: string }
  | { kind: "andamento" }
  | { kind: "planner" }
  | { kind: "archivio" }
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
  const [view, setView] = useState<View>({ kind: "oggi" });
  const [navOpen, setNavOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const profile = useProfile();
  const [showProfile, setShowProfile] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const showOnboarding = showProfile || (!profile.onboarded && !skipped);
  const [showBackup, setShowBackup] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const state = useStore();
  const backup = useBackup();

  // Reti di sicurezza sul dato: recupera il file collegato e, a ogni modifica,
  // pianifica lo snapshot locale e la scrittura automatica sul file.
  useEffect(() => {
    void initFileBackup();
    return subscribe(() => { maybeAutoSnapshot(); scheduleFileBackup(); });
  }, []);

  const hasData = Object.values(state).some((t) => t && Object.keys(t).length > 0);
  const backupStale = hasData && !backup.fileName && (backup.daysSince === null || backup.daysSince >= 7);
  const exportNow = () => { exportJson(getState()); markExported(); };

  // Promemoria d'inizio anno: tra il 25 agosto e il 15 settembre invita a impostare/confermare
  // l'assetto (orario/classi/materie) una volta per tutto l'anno scolastico.
  const annoCorr = annoCorrente();
  const oggiMd = (() => { const d = new Date(); return (d.getMonth() + 1) * 100 + d.getDate(); })();
  const setupDovuto = profile.onboarded && oggiMd >= 825 && oggiMd <= 915 && profile.assettoConfermato !== annoCorr;
  // Fine anno (giugno): suggerisci di esportare il resoconto della programmazione svolta.
  const exportSuggerito = hasData && oggiMd >= 601 && oggiMd <= 630;

  const onEdit = (dbKey: DbKey, rec?: Rec, prefill?: Record<string, Value>) => setEditing({ dbKey, rec, prefill });
  const openUda = (id: string) => setView({ kind: "uda", id });
  const closeProfile = () => { setShowProfile(false); setSkipped(true); };

  // Viste "dense" (griglie/tabelle): usano tutta la larghezza su PC; quelle testuali restano strette.
  const VISTE_LARGHE = new Set(["oggi", "calendar", "kanban", "timeline", "avanzamento", "valutazione", "andamento", "planner", "archivio", "programmazione", "entity"]);
  const mainWide = VISTE_LARGHE.has(view.kind);

  return (
    <div className={editing ? "app panel-open" : "app"}>
      <Toolbar onToggleNav={() => setNavOpen((o) => !o)} onOpenProfile={() => setShowProfile(true)} onOpenBackup={() => setShowBackup(true)} onOpenExport={() => setShowExport(true)} />
      {exportSuggerito && (
        <div className="setup-banner">
          <span>📦 Fine anno: esporta il resoconto della programmazione svolta (per classe e materia) da rielaborare nella relazione finale.</span>
          <span className="bb-actions">
            <button className="primary" onClick={() => setShowExport(true)}>Esporta</button>
          </span>
        </div>
      )}
      {setupDovuto && (
        <div className="setup-banner">
          <span>📌 Inizio anno: imposta o conferma il tuo orario e le tue classi per l'{annoCorr}. Si fa una volta sola.</span>
          <span className="bb-actions">
            <button className="primary" onClick={() => setShowProfile(true)}>Apri il profilo</button>
          </span>
        </div>
      )}
      {backupStale && (
        <div className="backup-banner">
          <span>⚠️ Nessun backup recente: i dati sono solo in questo browser.</span>
          <span className="bb-actions">
            <button onClick={exportNow}>Esporta ora</button>
            <button className="primary" onClick={() => setShowBackup(true)}>Imposta backup automatico</button>
          </span>
        </div>
      )}
      <div className="body">
        <Nav view={view} onChange={setView} open={navOpen} onNavigate={() => setNavOpen(false)} />
        {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
        <main className={mainWide ? "main main--wide" : "main"}>
          {view.kind === "oggi" && <OggiView onView={setView} onEdit={onEdit} onOpenProfile={() => setShowProfile(true)} />}
          {view.kind === "calendar" && <CalendarView onEdit={onEdit} onView={setView} />}
          {view.kind === "kanban" && <KanbanView onEdit={onEdit} onOpenUda={openUda} />}
          {view.kind === "timeline" && <TimelineView onOpenUda={openUda} />}
          {view.kind === "avanzamento" && <AvanzamentoView onEdit={onEdit} />}
          {view.kind === "valutazione" && <ValutazioneView sessioneId={view.sessioneId} onView={setView} />}
          {view.kind === "andamento" && <AndamentoView />}
          {view.kind === "planner" && <PlannerView onView={setView} />}
          {view.kind === "archivio" && <ArchivioView onView={setView} />}
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
      {showOnboarding && <Onboarding onClose={closeProfile} />}
      {showBackup && <BackupPanel onClose={() => setShowBackup(false)} />}
      {showExport && <ExportFineAnno onClose={() => setShowExport(false)} />}
    </div>
  );
}
