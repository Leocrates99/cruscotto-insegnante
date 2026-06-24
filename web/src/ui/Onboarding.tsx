import { useState } from "react";
import { newId } from "../store/store";
import {
  CONCORSI,
  INDIRIZZI_LICEO,
  concorsiPerScuole,
  materieProfilo,
  nomeConcorso,
  type Ordine,
  type ScuolaRef,
} from "../data/concorso";
import { getProfile, setProfile, type ScuolaProfilo } from "../store/profile";
import { annoCorrente } from "../store/valutazione";
import { SearchSelect } from "./SearchSelect";
import { OrarioLavoro } from "./OrarioLavoro";

interface MateriaRow {
  label: string;
  on: boolean;
}

const STEPS = ["Scuole", "Classi di concorso", "Materie", "Orario & classi"];

/**
 * Scheda di profilazione del docente e della/e scuola/e. Compare al primo avvio e
 * si riapre dal pulsante «Profilo». Le materie confermate filtrano i menù a tendina.
 */
export function Onboarding({ onClose }: { onClose: () => void }) {
  const existing = getProfile();
  const [step, setStep] = useState(0);
  const [docente, setDocente] = useState(existing.docente);
  const [scuole, setScuole] = useState<ScuolaProfilo[]>(existing.scuole);
  const [concorsi, setConcorsi] = useState<string[]>(existing.concorsi);
  const [cdcQuery, setCdcQuery] = useState("");
  const [materie, setMaterie] = useState<MateriaRow[]>(existing.materie.map((l) => ({ label: l, on: true })));
  const annoCorr = annoCorrente();
  const [conferma, setConferma] = useState(existing.assettoConfermato === annoCorr);

  const refs: ScuolaRef[] = (() => {
    const cur = scuole.filter((s) => s.corrente);
    return (cur.length ? cur : scuole).map((s) => ({ ordine: s.ordine, indirizzo: s.indirizzo }));
  })();

  // ── Scuole ──
  const addScuola = () =>
    setScuole((xs) => [...xs, { id: newId(), nome: "", ordine: "liceo", indirizzo: "classico", corrente: true }]);
  const editScuola = (id: string, patch: Partial<ScuolaProfilo>) =>
    setScuole((xs) => xs.map((s) => (s.id === id ? normalizza({ ...s, ...patch }) : s)));
  const removeScuola = (id: string) => setScuole((xs) => xs.filter((s) => s.id !== id));

  // ── Classi di concorso ──
  const codici = concorsiPerScuole(refs);
  const cdcOptions = CONCORSI.filter((c) => codici.includes(c.code)).map((c) => ({
    label: `${c.code} · ${c.nome}`,
    data: c.code,
  }));
  const addConcorso = (code?: string) => {
    if (code && !concorsi.includes(code)) setConcorsi((cs) => [...cs, code]);
    setCdcQuery("");
  };
  const removeConcorso = (code: string) => setConcorsi((cs) => cs.filter((c) => c !== code));

  // ── Materie (step 3) ──
  const proponiMaterie = () => {
    const prop = materieProfilo(refs, concorsi);
    setMaterie((prev) => {
      const have = new Set(prev.map((r) => r.label));
      const merged = [...prev, ...prop.filter((m) => !have.has(m)).map((m) => ({ label: m, on: true }))];
      return merged.length ? merged : prop.map((m) => ({ label: m, on: true }));
    });
  };
  const [materiaNuova, setMateriaNuova] = useState("");
  const addMateria = () => {
    const l = materiaNuova.trim();
    if (l) setMaterie((xs) => [...xs, { label: l, on: true }]);
    setMateriaNuova("");
  };

  const goNext = () => {
    if (step === 1) proponiMaterie();
    // Entrando nell'orario, rendi disponibili le materie confermate nei menù della griglia.
    if (step === 2) {
      const list = materie.filter((r) => r.on).map((r) => r.label.trim()).filter(Boolean);
      setProfile({ materie: Array.from(new Set(list)) });
    }
    setStep((s) => Math.min(3, s + 1));
  };
  const save = () => {
    const list = materie.filter((r) => r.on).map((r) => r.label.trim()).filter(Boolean);
    setProfile({
      onboarded: true,
      docente,
      scuole,
      concorsi,
      materie: Array.from(new Set(list)),
      assettoConfermato: conferma ? annoCorr : existing.assettoConfermato,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wizard" onClick={(e) => e.stopPropagation()}>
        <h2>👤 Profilo docente &amp; scuola</h2>
        <ol className="wizard-steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? "active" : i < step ? "done" : ""}>
              <b>{i + 1}</b> {s}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="wizard-body">
            <label className="field">
              <span>Docente</span>
              <input type="text" value={docente} placeholder="Nome e cognome (facoltativo)" onChange={(e) => setDocente(e.target.value)} />
            </label>
            <p className="muted">
              Aggiungi la/le scuola/e in cui insegni. Più scuole nello stesso anno = più «correnti»;
              le scuole passate restano in elenco (deseleziona «corrente»).
            </p>
            <div className="scuola-rows">
              {scuole.length === 0 && <p className="muted">Nessuna scuola: usa «+ Aggiungi scuola».</p>}
              {scuole.map((s) => (
                <div key={s.id} className="scuola-row">
                  <input
                    type="text"
                    className="sc-nome"
                    value={s.nome}
                    placeholder="Nome scuola"
                    onChange={(e) => editScuola(s.id, { nome: e.target.value })}
                  />
                  <select value={s.ordine} onChange={(e) => editScuola(s.id, { ordine: e.target.value as Ordine })}>
                    <option value="liceo">Liceo</option>
                    <option value="media">Scuola media</option>
                  </select>
                  {s.ordine === "liceo" && (
                    <select value={s.indirizzo ?? ""} onChange={(e) => editScuola(s.id, { indirizzo: e.target.value })}>
                      {INDIRIZZI_LICEO.map((i) => (
                        <option key={i.id} value={i.id}>{i.label}</option>
                      ))}
                    </select>
                  )}
                  <label className="chk sc-cur">
                    <input type="checkbox" checked={s.corrente} onChange={(e) => editScuola(s.id, { corrente: e.target.checked })} />
                    corrente
                  </label>
                  <button className="danger" aria-label="Rimuovi scuola" onClick={() => removeScuola(s.id)}>✕</button>
                </div>
              ))}
            </div>
            <button onClick={addScuola}>+ Aggiungi scuola</button>
          </div>
        )}

        {step === 1 && (
          <div className="wizard-body">
            <p className="muted">
              Seleziona la/le tua/e classe/i di concorso. I suggerimenti sono filtrati in base alle scuole indicate.
            </p>
            <SearchSelect<string>
              value={cdcQuery}
              onChange={setCdcQuery}
              placeholder="Cerca classe di concorso (es. A-13)…"
              options={cdcOptions}
              onSelect={(opt) => addConcorso(opt.data)}
            />
            <div className="cdc-chips">
              {concorsi.length === 0 ? (
                <span className="muted">Nessuna classe di concorso selezionata.</span>
              ) : (
                concorsi.map((c) => (
                  <span key={c} className="cdc-chip">
                    <b>{c}</b> {nomeConcorso(c)}
                    <button aria-label="Rimuovi" onClick={() => removeConcorso(c)}>✕</button>
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-body">
            <p className="muted">
              Queste sono le materie pertinenti al tuo profilo. Spunta quelle che insegni, rinominale
              se preferisci (es. unire Storia e Geografia in «Geostoria») o aggiungine altre.
            </p>
            <div className="materia-rows">
              {materie.length === 0 && <p className="muted">Nessuna materia: torna indietro o aggiungine una.</p>}
              {materie.map((r, i) => (
                <div key={i} className="materia-row">
                  <input type="checkbox" checked={r.on} onChange={(e) => setMaterie((xs) => xs.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
                  <input
                    type="text"
                    value={r.label}
                    onChange={(e) => setMaterie((xs) => xs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  />
                  <button className="danger" aria-label="Rimuovi" onClick={() => setMaterie((xs) => xs.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            <div className="materia-add">
              <input
                type="text"
                value={materiaNuova}
                placeholder="Aggiungi una materia…"
                onChange={(e) => setMateriaNuova(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addMateria(); }}
              />
              <button onClick={addMateria}>+ Aggiungi</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-body">
            <p className="muted">
              La tua tabella oraria di lavoro: scegli i giorni, le classi (con colore) e compila o
              importa la griglia. Comparirà sotto agli eventi del calendario.
            </p>
            <OrarioLavoro />
            <label className="field checkbox conferma-assetto">
              <input type="checkbox" checked={conferma} onChange={(e) => setConferma(e.target.checked)} />
              <span>
                <b>Conferma definitiva l'assetto dell'{annoCorr}</b> <em>· consolida orario, classi e materie per tutto l'anno (resta sempre modificabile)</em>
              </span>
            </label>
          </div>
        )}

        <div className="modal-actions wizard-actions">
          <button onClick={onClose}>{existing.onboarded ? "Annulla" : "Salta"}</button>
          <span className="spacer" />
          {step > 0 && <button onClick={() => setStep((s) => s - 1)}>‹ Indietro</button>}
          {step < 3 ? (
            <button className="primary" onClick={goNext}>Avanti ›</button>
          ) : (
            <button className="primary" onClick={save}>Salva profilo</button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Coerenza scuola: le medie non hanno indirizzo; passando a liceo si dà un indirizzo di default. */
function normalizza(s: ScuolaProfilo): ScuolaProfilo {
  if (s.ordine === "media") return { ...s, indirizzo: undefined };
  return { ...s, indirizzo: s.indirizzo ?? INDIRIZZI_LICEO[0].id };
}
