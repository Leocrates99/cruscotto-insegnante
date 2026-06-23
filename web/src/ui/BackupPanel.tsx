import { exportJson } from "../store/persistence";
import { getState } from "../store/store";
import {
  linkBackupFile,
  listSnapshots,
  markExported,
  restoreSnapshot,
  snapshotNow,
  unlinkBackupFile,
  useBackup,
} from "../store/backup";

const fmt = (iso: string) => new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Pannello "Backup e sicurezza dei dati": file automatico, export manuale, punti di ripristino. */
export function BackupPanel({ onClose }: { onClose: () => void }) {
  const b = useBackup();
  const snaps = listSnapshots();

  const exportNow = () => {
    exportJson(getState());
    markExported();
  };
  const restore = (t: string) => {
    if (confirm("Ripristinare questo punto? I dati attuali verranno sostituiti (ne viene salvato prima un punto di ripristino).")) {
      snapshotNow();
      restoreSnapshot(t);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>💾 Backup e sicurezza dei dati</h2>
        <p className="muted">
          I dati vivono in questo browser. Per non perderli al cambio dispositivo o alla pulizia della
          cache, collega un file di backup (salvataggio automatico) e/o esporta periodicamente.
        </p>

        <section className="backup-sec">
          <h3>Salvataggio automatico su file</h3>
          {b.fileSupported ? (
            b.fileName ? (
              <div className="backup-row">
                <span className="ok">● Attivo</span> ogni modifica viene scritta in <b>{b.fileName}</b>.
                <button className="danger" onClick={() => void unlinkBackupFile()}>Scollega</button>
              </div>
            ) : (
              <div className="backup-row">
                <button className="primary" onClick={() => void linkBackupFile()}>Collega un file di backup…</button>
                <span className="muted">scegli dove salvarlo (anche in una cartella sincronizzata su cloud).</span>
              </div>
            )
          ) : (
            <p className="muted">
              Questo browser non supporta il salvataggio automatico su file. Usa l'export qui sotto a
              intervalli regolari (idealmente su una cartella cloud).
            </p>
          )}
        </section>

        <section className="backup-sec">
          <h3>Export manuale</h3>
          <div className="backup-row">
            <button onClick={exportNow}>⬇️ Esporta backup ora</button>
            <span className="muted">
              {b.lastExport ? `Ultimo backup: ${fmt(b.lastExport)} (${b.daysSince} g fa)` : "Nessun backup ancora effettuato."}
            </span>
          </div>
        </section>

        <section className="backup-sec">
          <h3>Punti di ripristino <em>· locali, ultimi {Math.max(snaps.length, 0)}</em></h3>
          <div className="backup-row">
            <button onClick={() => snapshotNow()}>+ Crea punto di ripristino</button>
            <span className="muted">utile prima di modifiche importanti.</span>
          </div>
          <ul className="snap-list">
            {snaps.length === 0 ? (
              <li className="muted">Nessun punto di ripristino.</li>
            ) : (
              snaps.map((s) => (
                <li key={s.t}>
                  <span>{fmt(s.t)} · {s.records} record</span>
                  <button onClick={() => restore(s.t)}>Ripristina</button>
                </li>
              ))
            )}
          </ul>
        </section>

        <div className="modal-actions">
          <button className="primary" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}
