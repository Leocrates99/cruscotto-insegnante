import { useMemo, useState } from "react";
import type { View } from "../App";
import { newId, records, upsert, type Rec } from "../store/store";
import { useStore } from "../store/useStore";
import { classiAttive, materieAttive, scuoleCorrenti, useProfile } from "../store/profile";
import { bloomLabel, cicloDaFase, nucleiConObiettivi, useTassonomia, type TaxObiettivo } from "../data/tassonomia";
import { materiaColor } from "./materia";

const oggi = () => new Date().toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase();
type Tipo = "lezione" | "laboratorio" | "uda";

/**
 * Pianifica: superficie di brainstorming e compilazione rapida. Pesca obiettivi dalla tassonomia
 * (palette per nucleo), li compone in una lezione / attività laboratoriale / UdA e la calendarizza
 * (crea i record con le date → compaiono nel calendario e nelle viste di pianificazione).
 */
export function PlannerView({ onView }: { onView: (v: View) => void }) {
  useStore();
  const profile = useProfile();
  const tax = useTassonomia();
  const materie = materieAttive(profile);
  const classi = classiAttive(profile);
  const indir = scuoleCorrenti(profile)[0]?.indirizzo;

  const [tipo, setTipo] = useState<Tipo>("lezione");
  const [materia, setMateria] = useState(materie[0] ?? "");
  const [classe, setClasse] = useState(classi[0] ?? "");
  const [ciclo, setCiclo] = useState<"Biennio" | "Triennio">("Biennio");
  const [data, setData] = useState(oggi());
  const [dataFine, setDataFine] = useState(oggi());
  const [durata, setDurata] = useState(2);
  const [titolo, setTitolo] = useState("");
  const [note, setNote] = useState("");
  const [competenza, setCompetenza] = useState("");
  const [sel, setSel] = useState<TaxObiettivo[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const gruppi = useMemo(() => {
    if (!tax || !materia) return [];
    const base = nucleiConObiettivi(tax, materia, { indirizzoId: indir, ciclo });
    if (!q.trim()) return base;
    const nq = norm(q);
    return base
      .map((g) => ({ nucleo: g.nucleo, obiettivi: g.obiettivi.filter((o) => norm(`${o.argomento} ${o.descrizione} ${o.nucleo} ${(o.keywords ?? []).join(" ")}`).includes(nq)) }))
      .filter((g) => g.obiettivi.length > 0);
  }, [tax, materia, indir, ciclo, q]);

  const selIds = new Set(sel.map((o) => o.id));
  const toggle = (o: TaxObiettivo) => setSel((s) => (selIds.has(o.id) ? s.filter((x) => x.id !== o.id) : [...s, o]));

  const obiettivoRecId = (o: TaxObiettivo): string => {
    const exist = records("obiettivi").find((r) => r["Enunciato"] === o.argomento && r["Materia"] === materia);
    if (exist) return exist.id;
    const id = newId();
    upsert("obiettivi", { id, Enunciato: o.argomento, Tipo: o.tipo, ...(bloomLabel(o.bloom) ? { "Livello cognitivo": bloomLabel(o.bloom) } : {}), Materia: materia, Ciclo: cicloDaFase(o.fase) ?? ciclo } as Rec);
    return id;
  };
  const classeRecId = (label: string): string | undefined => {
    if (!label) return undefined;
    const exist = records("classi").find((r) => r["Titolo"] === label);
    if (exist) return exist.id;
    const id = newId();
    upsert("classi", { id, Titolo: label } as Rec);
    return id;
  };

  const salva = () => {
    if (sel.length === 0 && !titolo.trim()) { setMsg("Aggiungi un titolo o qualche obiettivo dalla palette."); return; }
    const tit = titolo.trim() || `${materia}${sel[0] ? " — " + sel[0].argomento : ""}`;
    if (tipo === "uda") {
      const obIds = sel.map(obiettivoRecId);
      upsert("uda", { id: newId(), Titolo: tit, "Competenza attesa": competenza, Ciclo: ciclo, Stato: "Progettata", "Data inizio": data, "Data fine": dataFine, Obiettivi: obIds } as Rec);
    } else {
      const obText = sel.map((o) => `• ${o.argomento}`).join("\n");
      const cId = classeRecId(classe);
      upsert("lezioni", { id: newId(), Titolo: tipo === "laboratorio" ? `[Laboratorio] ${tit}` : tit, Materia: materia, "Data prevista": data, "Durata (ore)": durata, Stato: "Progettata", "Obiettivi della lezione": obText, Fasi: note, ...(cId ? { Classe: [cId] } : {}) } as Rec);
    }
    setMsg(`✓ Creato e calendarizzato: ${tit}`);
    setSel([]); setTitolo(""); setNote(""); setCompetenza("");
  };

  const isUda = tipo === "uda";

  return (
    <section className="planner">
      <div className="view-head">
        <h1>🧠 Pianifica</h1>
        <div className="seg">
          <button className={tipo === "lezione" ? "active" : ""} onClick={() => setTipo("lezione")}>Lezione</button>
          <button className={tipo === "laboratorio" ? "active" : ""} onClick={() => setTipo("laboratorio")}>Laboratorio</button>
          <button className={tipo === "uda" ? "active" : ""} onClick={() => setTipo("uda")}>UdA</button>
        </div>
      </div>

      {materie.length === 0 ? (
        <p className="muted">Imposta materie e classi nel <b>Profilo</b>, poi torna qui a pianificare.</p>
      ) : (
        <>
          <div className="pl-ctx">
            <label className="field sm"><span>Materia</span>
              <select value={materia} onChange={(e) => { setMateria(e.target.value); setSel([]); }}>
                {materie.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            {!isUda && (
              <label className="field sm"><span>Classe</span>
                <select value={classe} onChange={(e) => setClasse(e.target.value)}>
                  {classi.length === 0 && <option value="">—</option>}
                  {classi.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}
            <div className="seg sm">
              <button className={ciclo === "Biennio" ? "active" : ""} onClick={() => setCiclo("Biennio")}>Biennio</button>
              <button className={ciclo === "Triennio" ? "active" : ""} onClick={() => setCiclo("Triennio")}>Triennio</button>
            </div>
            {isUda ? (
              <>
                <label className="field sm"><span>Da</span><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
                <label className="field sm"><span>A</span><input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} /></label>
              </>
            ) : (
              <>
                <label className="field sm"><span>Data</span><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
                <label className="field sm"><span>Ore</span><input type="number" min={0} step="0.5" value={durata} onChange={(e) => setDurata(Number(e.target.value))} /></label>
              </>
            )}
          </div>

          <div className="pl-body">
            {/* Palette */}
            <div className="pl-palette">
              <input className="pl-search" type="text" placeholder="Cerca nucleo, argomento, parola chiave…" value={q} onChange={(e) => setQ(e.target.value)} />
              {!tax ? (
                <p className="muted">Carico il backbone…</p>
              ) : gruppi.length === 0 ? (
                <p className="muted">Nessun obiettivo per {materia} ({ciclo}). Prova l'altro ciclo o un'altra materia.</p>
              ) : (
                gruppi.map((g) => (
                  <div key={g.nucleo} className="pl-nucleo">
                    <div className="pl-nucleo-h">{g.nucleo} <small>{g.obiettivi.length}</small></div>
                    {g.obiettivi.map((o) => (
                      <button key={o.id} className={selIds.has(o.id) ? "pl-ob sel" : "pl-ob"} onClick={() => toggle(o)} title={o.descrizione}>
                        <span className="pl-ob-add">{selIds.has(o.id) ? "✓" : "+"}</span>
                        <span className="pl-ob-txt"><b>{o.argomento}</b>{o.descrizione ? <em> — {o.descrizione}</em> : null}</span>
                        <span className={`pl-ob-tipo ${o.tipo === "competenza" ? "com" : "con"}`}>{o.tipo === "competenza" ? (bloomLabel(o.bloom) ?? "COM") : "CON"}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Composizione */}
            <div className="pl-compose">
              <label className="field"><span>Titolo</span>
                <input type="text" value={titolo} placeholder={`${isUda ? "UdA" : tipo === "laboratorio" ? "Laboratorio" : "Lezione"} di ${materia || "…"}`} onChange={(e) => setTitolo(e.target.value)} style={{ borderLeft: `3px solid ${materiaColor(materia) ?? "var(--parchment-dark)"}` }} />
              </label>

              <div className="pl-sel">
                <div className="pl-sel-h">Obiettivi scelti <b>{sel.length}</b></div>
                {sel.length === 0 ? <p className="muted">Pesca gli obiettivi dalla palette a sinistra.</p> : (
                  <ul>
                    {sel.map((o) => (
                      <li key={o.id}><span>{o.argomento}</span><button onClick={() => toggle(o)} aria-label="Togli">✕</button></li>
                    ))}
                  </ul>
                )}
              </div>

              {isUda ? (
                <label className="field"><span>Competenza attesa</span><textarea rows={2} value={competenza} onChange={(e) => setCompetenza(e.target.value)} placeholder="La competenza al termine dell'UdA…" /></label>
              ) : (
                <label className="field"><span>Contenuti / fasi</span><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Scaletta, attività, materiali…" /></label>
              )}

              <div className="pl-actions">
                <button className="primary" onClick={salva}>📅 Salva & calendarizza</button>
                {msg && <span className="pl-msg">{msg} <button className="link" onClick={() => onView({ kind: "calendar" })}>vai al calendario →</button></span>}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
