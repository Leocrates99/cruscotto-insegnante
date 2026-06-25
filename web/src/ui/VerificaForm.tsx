import { useMemo, useState } from "react";
import { classeInfo, classiAttive, materieAttive, materieClasseEffettive, useProfile } from "../store/profile";
import { records } from "../store/store";
import { useStore } from "../store/useStore";
import { classeId } from "../store/links";
import {
  SCALA_DEFAULT,
  annoCorrente,
  newId,
  upsertSessione,
  useValutazione,
  type Griglia,
  type Indicatore,
  type Sessione,
} from "../store/valutazione";

interface ExRow { nome: string; max: number; }
const oggi = () => new Date().toISOString().slice(0, 10);

/**
 * Pianificazione di una verifica: ne chiede la struttura (esercizi a punti + criteri a risposta
 * aperta = tipologia mista) e crea una Sessione legata alla classe, precompilando le righe dai
 * numeri di registro dell'anagrafica. Si apre poi nel calcolatore.
 */
export function VerificaForm({ prefill, onClose, onOpen }: { prefill?: { classe?: string; data?: string; materia?: string; titolo?: string; pianoId?: string }; onClose: () => void; onOpen: (id: string) => void }) {
  useStore();
  const profile = useProfile();
  const { griglie } = useValutazione();
  const classi = classiAttive(profile);
  const materie = materieAttive(profile);

  const [titolo, setTitolo] = useState(prefill?.titolo ?? "");
  const [classe, setClasse] = useState(prefill?.classe ?? classi[0] ?? "");
  const [materia, setMateria] = useState(prefill?.materia ?? materie[0] ?? "");
  const [data, setData] = useState(prefill?.data ?? oggi());
  const [pianoId, setPianoId] = useState(prefill?.pianoId ?? "");

  // Pianificazioni a cui agganciare la verifica (lezioni della classe + UdA), così i dati si completano.
  const piani = useMemo(() => {
    const cId = classe ? classeId(classe) : undefined;
    const lez = records("lezioni").filter((l) => !cId || (Array.isArray(l["Classe"]) && (l["Classe"] as string[]).includes(cId))).map((l) => ({ id: l.id, tipo: "lezione" as const, titolo: String(l["Titolo"] ?? "—") }));
    const uda = records("uda").map((u) => ({ id: u.id, tipo: "uda" as const, titolo: `[UdA] ${String(u["Titolo"] ?? "—")}` }));
    return [...lez, ...uda];
  }, [classe]);
  const [esercizi, setEsercizi] = useState<ExRow[]>([{ nome: "Esercizio 1", max: 5 }, { nome: "Esercizio 2", max: 5 }]);
  const [includiAperti, setIncludiAperti] = useState(false);
  const [modelloApertiId, setModelloApertiId] = useState("");

  // Modelli che contengono criteri a livelli (per le domande aperte/rubrica).
  const modelliAperti = useMemo(() => griglie.filter((g) => g.indicatori.some((i) => i.tipo === "livelli")), [griglie]);
  const modelloAperti = modelliAperti.find((g) => g.id === modelloApertiId) ?? modelliAperti[0];

  const setEx = (i: number, patch: Partial<ExRow>) => setEsercizi((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addEx = () => setEsercizi((xs) => [...xs, { nome: `Esercizio ${xs.length + 1}`, max: 5 }]);
  const removeEx = (i: number) => setEsercizi((xs) => xs.filter((_, j) => j !== i));

  const studenti = classe ? classeInfo(classe, profile).studenti : [];
  const materieCls = classe ? materieClasseEffettive(classe, profile) : materie; // sinolo classe→materie

  const crea = () => {
    const indEsercizi: Indicatore[] = esercizi
      .filter((e) => e.nome.trim() || e.max)
      .map((e) => ({ id: newId(), nome: e.nome.trim() || "Esercizio", tipo: "punti", max: Number(e.max) || 1, peso: 1, attivo: true }));
    const indAperti: Indicatore[] = includiAperti && modelloAperti
      ? modelloAperti.indicatori.filter((i) => i.tipo === "livelli").map((i) => ({ ...i, id: newId() }))
      : [];
    const indicatori = [...indEsercizi, ...indAperti];
    if (indicatori.length === 0) { alert("Aggiungi almeno un esercizio o i criteri a risposta aperta."); return; }
    const griglia: Griglia = { id: newId(), nome: titolo.trim() || "Verifica", categoria: "scritto", scala: { ...SCALA_DEFAULT }, indicatori };
    const righe = studenti.map((s) => ({ id: newId(), n: s.n, valori: {} }));
    const piano = piani.find((p) => p.id === pianoId);
    const sess: Sessione = {
      id: newId(), classe, materia: materia || undefined, titolo: titolo.trim() || "Verifica",
      data, annoScolastico: annoCorrente(), griglia, righe,
      ...(piano ? { pianoId: piano.id, pianoTipo: piano.tipo } : {}),
    };
    upsertSessione(sess);
    onOpen(sess.id);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wizard" onClick={(e) => e.stopPropagation()}>
        <h2>📝 Nuova verifica</h2>
        <p className="muted">Struttura della prova: il calcolatore si apre già pronto sulla classe.</p>

        <div className="vf-meta">
          <label className="field"><span>Titolo</span><input type="text" value={titolo} placeholder="Es. Verifica di latino" onChange={(e) => setTitolo(e.target.value)} /></label>
          <label className="field"><span>Classe</span>
            <select value={classe} onChange={(e) => { const c = e.target.value; setClasse(c); const ms = materieClasseEffettive(c, profile); if (!ms.includes(materia)) setMateria(ms[0] ?? ""); }}>
              {classi.length === 0 && <option value="">— (aggiungi classi nel profilo)</option>}
              {classi.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field"><span>Materia</span>
            <select value={materieCls.includes(materia) ? materia : ""} onChange={(e) => setMateria(e.target.value)}>
              {!materieCls.includes(materia) && <option value="">—</option>}
              {materieCls.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="field"><span>Data</span><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
          {piani.length > 0 && (
            <label className="field"><span>Aggancia a pianificazione <em>· opzionale</em></span>
              <select value={pianoId} onChange={(e) => setPianoId(e.target.value)}>
                <option value="">— nessuna</option>
                {piani.map((p) => <option key={p.id} value={p.id}>{p.titolo}</option>)}
              </select>
            </label>
          )}
        </div>

        <h3 className="ge-h">Esercizi (a punti)</h3>
        <div className="vf-ex">
          {esercizi.map((e, i) => (
            <div key={i} className="vf-ex-row">
              <input type="text" value={e.nome} onChange={(ev) => setEx(i, { nome: ev.target.value })} />
              <span>max</span>
              <input type="number" min={0} value={e.max} onChange={(ev) => setEx(i, { max: Number(ev.target.value) })} />
              <button className="danger" onClick={() => removeEx(i)}>✕</button>
            </div>
          ))}
          <button onClick={addEx}>+ Esercizio</button>
        </div>

        <h3 className="ge-h">Domande a risposta aperta (rubrica)</h3>
        <label className="chk2"><input type="checkbox" checked={includiAperti} onChange={(e) => setIncludiAperti(e.target.checked)} /> includi criteri a risposta aperta (tipologia mista, da bilanciare)</label>
        {includiAperti && modelliAperti.length > 0 && (
          <label className="field"><span>Modello criteri</span>
            <select value={modelloAperti?.id} onChange={(e) => setModelloApertiId(e.target.value)}>
              {modelliAperti.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </label>
        )}

        <p className="muted vf-note">{studenti.length > 0 ? `Righe precompilate per ${studenti.length} studenti (numeri di registro).` : "Nessuna anagrafica per questa classe: aggiungerai le righe nel calcolatore."}</p>

        <div className="modal-actions wizard-actions">
          <button onClick={onClose}>Annulla</button>
          <span className="spacer" />
          <button className="primary" onClick={crea} disabled={!classe}>Crea e apri nel calcolatore</button>
        </div>
      </div>
    </div>
  );
}
