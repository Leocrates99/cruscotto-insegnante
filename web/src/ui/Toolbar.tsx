import { useRef, useState } from "react";
import { clearState, getState, replaceState, type State } from "../store/store";
import { exportJson, readJsonFile } from "../store/persistence";
import { buildSeedState } from "../store/seed";
import { getTheme, toggleTheme } from "./theme";

export function Toolbar({ onToggleNav }: { onToggleNav: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [theme, setThemeState] = useState(getTheme());

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
        <button
          onClick={() => {
            if (confirm("Caricare i dati di esempio (4 UdA-modello)? Sostituiscono i dati attuali.")) {
              replaceState(buildSeedState());
            }
          }}
        >
          Carica esempio
        </button>
        <button onClick={() => exportJson(getState())}>Esporta</button>
        <button onClick={() => fileRef.current?.click()}>Importa</button>
        <button
          className="danger"
          onClick={() => {
            if (confirm("Azzerare tutti i dati di questo browser?")) clearState();
          }}
        >
          Azzera
        </button>
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
                replaceState((await readJsonFile(f)) as State);
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
