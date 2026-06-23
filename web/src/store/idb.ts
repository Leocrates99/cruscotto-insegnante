// Mini-wrapper su IndexedDB per un solo store chiave→valore. Serve a conservare
// oggetti non serializzabili in localStorage (es. il FileSystemFileHandle del backup).

const DB_NAME = "cruscotto-idb";
const STORE = "kv";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const rq = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      rq.onsuccess = () => resolve(rq.result as T | undefined);
      rq.onerror = () => reject(rq.error);
    });
  } catch {
    return undefined;
  }
}

export async function idbSet(key: string, val: unknown): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* IndexedDB non disponibile: il backup su file resta semplicemente assente */
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignora */
  }
}
