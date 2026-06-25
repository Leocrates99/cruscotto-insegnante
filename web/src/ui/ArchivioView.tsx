import { useMemo, useState } from "react";
import {
  cerca, copertura, figli, filtraVoci, obiettiviDiVoce, opzioni, radiciLetteratura, schedaAutore,
  suggerimenti, useArchivio, voce, type ArchivioIndex, type Voce,
} from "../data/archivio";

const u = (s: string) => (s ? s : undefined);
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Archivio didattico-normativo: la «intelligenza sottesa» guidata dai dati.
 * Cascata di filtri data-driven, autocomplete sul testo con auto-tagging, albero
 * della letteratura (epoca→autore→opera + scheda a 5 facet), copertura/gap analysis
 * sugli obiettivi del backbone e suggerimenti trasversali via parallelismi.
 */
export function ArchivioView() {
  const a = useArchivio();
  const [materia, setMateria] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [classe, setClasse] = useState("");
  const [fase, setFase] = useState("");
  const [anno, setAnno] = useState("");
  const [nucleo, setNucleo] = useState("");
  const [blocco, setBlocco] = useState("");
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState("");
  const [scelte, setScelte] = useState<string[]>([]);
  const [radice, setRadice] = useState("");
  const [autore, setAutore] = useState("");

  const materie = useMemo(() => (a ? opzioni(a.voci, "materia") : []), [a]);
  const resetSotto = () => { setIndirizzo(""); setClasse(""); setFase(""); setAnno(""); setNucleo(""); setBlocco(""); setRadice(""); setAutore(""); };

  if (!a) return <section className="archivio"><div className="view-head"><h1>📚 Archivio</h1></div><p className="muted">Carico l'archivio…</p></section>;

  const f = { materia: u(materia), indirizzo: u(indirizzo), classe: u(classe), fase: u(fase), anno: u(anno), nucleo: u(nucleo), blocco: u(blocco) };
  const optsIndir = materia ? opzioni(filtraVoci(a, { materia }), "indirizzo") : [];
  const optsClasse = materia ? opzioni(filtraVoci(a, { materia: u(materia), indirizzo: u(indirizzo) }), "classe") : [];
  const optsFase = materia ? opzioni(filtraVoci(a, { materia: u(materia), indirizzo: u(indirizzo), classe: u(classe) }), "fase") : [];
  const optsAnno = materia ? opzioni(filtraVoci(a, { materia: u(materia), indirizzo: u(indirizzo), classe: u(classe), fase: u(fase) }), "anno") : [];
  const optsNucleo = materia ? opzioni(filtraVoci(a, { materia: u(materia), indirizzo: u(indirizzo), classe: u(classe), fase: u(fase), anno: u(anno) }), "nucleo") : [];
  const optsBlocco = materia ? opzioni(filtraVoci(a, { ...f, blocco: undefined }), "blocco") : [];

  const risultati = materia ? cerca(a, q, f, 60) : [];
  const sel = selId ? voce(a, selId) : undefined;
  const radiciLett = materia ? radiciLetteratura(a, materia) : [];
  const cop = materia ? copertura(a, materia, u(fase), scelte) : null;
  const sugg = sel ? suggerimenti(a, sel.id) : [];

  const toggleScelta = (id: string) => setScelte((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const Sel = ({ label, val, set, opts, dis }: { label: string; val: string; set: (v: string) => void; opts: string[]; dis?: boolean }) => (
    <label className="field sm"><span>{label}</span>
      <select value={val} disabled={dis} onChange={(e) => set(e.target.value)}>
        <option value="">{dis ? "—" : "tutti"}</option>
        {opts.map((o) => <option key={o} value={o}>{cap(o)}</option>)}
      </select>
    </label>
  );

  return (
    <section className="archivio">
      <div className="view-head">
        <h1>📚 Archivio didattico</h1>
        <span className="muted">{a.meta.conteggi.obiettivi} obiettivi · {a.meta.conteggi.voci} voci · {a.meta.conteggi.parallelismi} parallelismi</span>
      </div>

      <div className="arc-filtri">
        <div className="seg">
          {materie.map((m) => <button key={m} className={materia === m ? "active" : ""} onClick={() => { setMateria(m); resetSotto(); setSelId(""); }}>{m}</button>)}
        </div>
        {materia && <>
          <Sel label="Indirizzo" val={indirizzo} set={(v) => { setIndirizzo(v); setClasse(""); }} opts={optsIndir} />
          <Sel label="Classe concorso" val={classe} set={setClasse} opts={optsClasse} />
          <Sel label="Fase" val={fase} set={(v) => { setFase(v); setAnno(""); }} opts={optsFase} />
          <Sel label="Anno" val={anno} set={setAnno} opts={optsAnno} />
          <Sel label="Nucleo" val={nucleo} set={setNucleo} opts={optsNucleo} />
          <Sel label="Blocco" val={blocco} set={setBlocco} opts={optsBlocco} />
        </>}
      </div>

      {!materia ? (
        <p className="muted">Scegli una materia per esplorare l'archivio.</p>
      ) : (
        <div className="arc-body">
          {/* Voci + autocomplete */}
          <div className="arc-col">
            <input className="arc-search" type="text" placeholder="Cerca una voce (testo o tag)…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="arc-count">{risultati.length} voci{q || indirizzo || classe || fase || anno || nucleo || blocco ? " (filtrate)" : ""}</div>
            <ul className="arc-list">
              {risultati.map((v) => (
                <li key={v.id} className={selId === v.id ? "sel" : ""}>
                  <button className="arc-voce" onClick={() => setSelId(v.id)}>
                    <span className={`arc-blocco b-${v.blocco}`}>{v.blocco}</span>
                    <span className="arc-voce-t">{v.testo}</span>
                    {v.peso === "core" && <span className="arc-core">core</span>}
                  </button>
                  <button className={scelte.includes(v.id) ? "arc-pick on" : "arc-pick"} title="Aggiungi alla programmazione (copertura)" onClick={() => toggleScelta(v.id)}>{scelte.includes(v.id) ? "✓" : "+"}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Albero letteratura + dettaglio */}
          <div className="arc-col">
            {radiciLett.length > 0 && (
              <div className="arc-lett">
                <h3>Letteratura</h3>
                <div className="arc-chips">{radiciLett.map((r) => <button key={r.id} className={radice === r.id ? "arc-chip on" : "arc-chip"} onClick={() => { setRadice(r.id); setAutore(""); }}>{r.testo}</button>)}</div>
                {radice && <div className="arc-chips">{figli(a, radice).filter((v) => v.tipo_contenuto === "autore").map((au) => <button key={au.id} className={autore === au.id ? "arc-chip on" : "arc-chip"} onClick={() => { setAutore(au.id); setSelId(au.id); }}>{au.testo}</button>)}</div>}
                {autore && <AutoreScheda a={a} autoreId={autore} onSel={setSelId} />}
              </div>
            )}

            {sel && (
              <div className="arc-dett">
                <h3>{sel.testo}</h3>
                <div className="arc-meta">
                  <span className="chip">{cap(sel.blocco)}</span>
                  <span className="chip">{sel.nucleo}</span>
                  {sel.anno && <span className="chip">cl. {sel.anno}</span>}
                  {sel.bloom && <span className="chip">{cap(sel.bloom)}</span>}
                  {sel.competenza_europea && <span className="chip">{sel.competenza_europea}</span>}
                </div>
                {obiettiviDiVoce(a, sel).length > 0 ? (
                  <>
                    <h4>Riscontro · obiettivi del quadro nazionale</h4>
                    <ul className="arc-ob">{obiettiviDiVoce(a, sel).map((o) => <li key={o.id}><b>{o.argomento}</b> <em>· {o.nucleo} · {o.fase}</em></li>)}</ul>
                  </>
                ) : <p className="muted">Nessun obiettivo agganciato (estensione non ancora normata).</p>}
                {sugg.length > 0 && (
                  <>
                    <h4>Collegamenti trasversali</h4>
                    {sugg.map((s) => (
                      <div key={s.parallelismo.id} className="arc-par">
                        <div className="arc-par-h"><b>{s.parallelismo.titolo}</b> <em>· {s.parallelismo.relazione}</em></div>
                        <p className="muted">{s.parallelismo.descrizione}</p>
                        <div className="arc-chips">{s.collegate.map((c) => <button key={c.id} className="arc-chip" onClick={() => setSelId(c.id)}>{c.materia} · {c.testo}</button>)}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Copertura */}
          {cop && (
            <div className="arc-cop">
              <h3>Copertura {materia}{fase ? ` · ${fase}` : ""}</h3>
              <div className="arc-cop-n"><b>{cop.coperti}</b> / {cop.totali} obiettivi · {scelte.length} voci scelte</div>
              <div className="bar"><div style={{ width: `${cop.pct}%` }} /></div>
              <div className="arc-cop-pct">{cop.pct}%</div>
              {scelte.length > 0 && cop.mancanti.length > 0 && (
                <>
                  <h4>Mancano ({cop.mancanti.length})</h4>
                  <ul className="arc-gap">{cop.mancanti.slice(0, 12).map((o) => <li key={o.id}>{o.argomento}</li>)}{cop.mancanti.length > 12 && <li className="muted">…e altri {cop.mancanti.length - 12}</li>}</ul>
                </>
              )}
              {scelte.length > 0 && <button className="link" onClick={() => setScelte([])}>azzera selezione</button>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AutoreScheda({ a, autoreId, onSel }: { a: ArchivioIndex; autoreId: string; onSel: (id: string) => void }) {
  const opere = figli(a, autoreId).filter((v: Voce) => v.tipo_contenuto === "opera");
  const facet = schedaAutore(a, autoreId);
  return (
    <div className="arc-autore">
      {opere.length > 0 && <><div className="arc-sub">Opere</div><div className="arc-chips">{opere.map((o) => <button key={o.id} className="arc-chip" onClick={() => onSel(o.id)}>{o.testo}</button>)}</div></>}
      {facet.length > 0 && <><div className="arc-sub">Scheda autore</div><div className="arc-chips">{facet.map((fc) => <button key={fc.id} className="arc-chip facet" onClick={() => onSel(fc.id)}>{fc.tipo_contenuto}</button>)}</div></>}
    </div>
  );
}
