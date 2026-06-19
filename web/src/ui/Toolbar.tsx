import { useRef } from "react";
import { clearState, getState, replaceState, type State } from "../store/store";
import { exportJson, readJsonFile } from "../store/persistence";
import { buildSeedState } from "../store/seed";

export function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <header className="toolbar">
      <div className="brand">
        🏛️ Cruscotto del docente <small>· sito local-first</small>
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
        <button onClick={() => exportJson(getState())}>Esporta JSON</button>
        <button onClick={() => fileRef.current?.click()}>Importa JSON</button>
        <button
          className="danger"
          onClick={() => {
            if (confirm("Azzerare tutti i dati di questo browser?")) clearState();
          }}
        >
          Azzera
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
