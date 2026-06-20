import { useState } from "react";
import type { DbKey } from "@model";
import { Nav } from "./ui/Nav";
import { Toolbar } from "./ui/Toolbar";
import { HomeView } from "./ui/HomeView";
import { EntityTable } from "./ui/EntityTable";
import { UdaDetail } from "./ui/UdaDetail";
import { ProgrammazioneView } from "./ui/ProgrammazioneView";

export type View =
  | { kind: "home" }
  | { kind: "programmazione" }
  | { kind: "entity"; key: DbKey }
  | { kind: "uda"; id: string };

export function App() {
  const [view, setView] = useState<View>({ kind: "home" });
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app">
      <Toolbar onToggleNav={() => setNavOpen((o) => !o)} />
      <div className="body">
        <Nav view={view} onChange={setView} open={navOpen} onNavigate={() => setNavOpen(false)} />
        {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
        <main className="main">
          {view.kind === "home" && (
            <HomeView
              onSelect={(key) => setView({ kind: "entity", key })}
              onOpenUda={(id) => setView({ kind: "uda", id })}
            />
          )}
          {view.kind === "programmazione" && <ProgrammazioneView />}
          {view.kind === "entity" && (
            <EntityTable dbKey={view.key} onOpenUda={(id) => setView({ kind: "uda", id })} />
          )}
          {view.kind === "uda" && <UdaDetail id={view.id} onBack={() => setView({ kind: "entity", key: "uda" })} />}
        </main>
      </div>
    </div>
  );
}
