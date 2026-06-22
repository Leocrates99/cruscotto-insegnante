import type { DbKey } from "@model";
import type { Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { reminderItems, type Reminder } from "../compute/events";

const line = (i: Reminder) =>
  `${i.date} · ${i.title}${i.tipo ? ` — ${i.tipo}` : ""}${i.priorita ? ` · priorità ${i.priorita}` : ""}`;

export function PromemoriaView({ onEdit }: { onEdit: (k: DbKey, r: Rec) => void }) {
  useStore();
  const { scadute, imminenti } = reminderItems(7);

  return (
    <section>
      <div className="view-head"><h1>📌 Promemoria scadenze</h1></div>
      <p className="muted">Scadenze non concluse, scadute o in arrivo nei prossimi 7 giorni.</p>

      <h2>⚠️ Scadute ({scadute.length})</h2>
      <ul className="checklist-view">
        {scadute.length === 0 ? (
          <li className="muted">Nessuna scadenza arretrata 👍</li>
        ) : (
          scadute.map((i, k) => (
            <li key={k}>
              <button className="link-row" onClick={() => onEdit("scadenze", i.rec)}>
                {line(i)} <em>(scaduta da {-i.giorni} g)</em>
              </button>
            </li>
          ))
        )}
      </ul>

      <h2>⏳ In arrivo ({imminenti.length})</h2>
      <ul className="checklist-view">
        {imminenti.length === 0 ? (
          <li className="muted">Niente in scadenza a breve.</li>
        ) : (
          imminenti.map((i, k) => (
            <li key={k}>
              <button className="link-row" onClick={() => onEdit("scadenze", i.rec)}>
                {line(i)} <em>({i.giorni === 0 ? "oggi" : `tra ${i.giorni} g`})</em>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
