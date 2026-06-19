const KEY = "cruscotto-docente:v1";

/** Carica lo stato grezzo da localStorage, o null se assente/illeggibile. */
export function loadRaw(): unknown | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

let timer: number | undefined;
/** Salva lo stato su localStorage, con debounce (300ms). */
export function saveRaw(state: unknown): void {
  if (timer !== undefined) clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage piena o non disponibile: si ignora */
    }
  }, 300);
}

/** Scarica lo stato come file JSON (backup / trasferimento tra dispositivi). */
export function exportJson(state: unknown): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cruscotto-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Legge un file JSON scelto dall'utente. */
export async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text());
}
