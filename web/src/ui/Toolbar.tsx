import { useRef, useState } from "react";
import { clearState, getState, replaceState, type State } from "../store/store";
import { exportJson, readJsonFile } from "../store/persistence";
import { markExported, snapshotNow } from "../store/backup";
import { buildSeedState } from "../store/seed";
import { getTheme, toggleTheme } from "./theme";

export function Toolbar({
  onToggleNav,
  onOpenProfile,
  onOpenBackup,
  onOpenExport,
}: {
  onToggleNav: () => void;
  onOpenProfile: () => void;
  onOpenBackup: () => void;
  onOpenExport: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [theme, setThemeState] = useState(getTheme());
  const closeDd = (el: HTMLElement) => el.closest("details")?.removeAttribute("open");

  return (
    <header className="masthead">
      <button className="nav-toggle" aria-label="Apri il menu" onClick={onToggleNav}>
        ☰
      </button>
      <div className="brand">
        <span className="brand-mark">🏛️</span>
        <div>
          <h1>
            Cruscotto <strong>del docente</strong>
          </h1>
          <div className="brand-sub">officina didattica · sito local-first</div>
        </div>
      </div>
      <div className="actions">
        <details className="dropdown">
          <summary>📁 Dati</summary>
          <div className="dropdown-menu">
            <button onClick={(e) => { closeDd(e.currentTarget); if (confirm("Caricare i dati di esempio (4 UdA-modello)? Sostituiscono i dati attuali.")) { snapshotNow(); replaceState(buildSeedState()); } }}>Carica esempio</button>
            <button onClick={(e) => { closeDd(e.currentTarget); exportJson(getState()); markExported(); }}>⬇️ Esporta</button>
            <button onClick={(e) => { closeDd(e.currentTarget); fileRef.current?.click(); }}>⬆️ Importa</button>
            <button onClick={(e) => { closeDd(e.currentTarget); onOpenBackup(); }}>💾 Backup</button>
            <button onClick={(e) => { closeDd(e.currentTarget); onOpenExport(); }}>📦 Esporta fine anno</button>
            <hr />
            <button className="danger" onClick={(e) => { closeDd(e.currentTarget); if (confirm("Azzerare tutti i dati di questo browser? (ne viene salvato prima un punto di ripristino)")) { snapshotNow(); clearState(); } }}>Azzera tutto</button>
          </div>
        </details>
        <button title="Profilo docente e scuola" onClick={onOpenProfile}>👤 Profilo</button>
        <button className="theme-toggle" title="Tema chiaro / scuro" onClick={() => setThemeState(toggleTheme())}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              try {
                const data = (await readJsonFile(f)) as State;
                snapshotNow();
                replaceState(data);
              } catch {
                alert("File JSON non valido.");
              }
            }
            e.target.value = "";
          }}
        />
      </div>
    </header>
  );
}
