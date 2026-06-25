import { useState } from "react";
import { copertura, obiettiviDiVoce, opzioni, suggerimenti, useArchivio, type Voce } from "../data/archivio";
import { ArchivioPicker } from "./ArchivioPicker";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Archivio didattico: navigazione ad albero (ArchivioPicker) + riscontro, copertura e parallelismi. */
export function ArchivioView() {
  const a = useArchivio();
  const [materia, setMateria] = useState("");
  const [selez, setSelez] = useState<Set<string>>(new Set());
  const [dett, setDett] = useState<Voce | null>(null);

  if (!a) return <section className="archivio"><div className="view-head"><h1>📚 Archivio</h1></div><p className="muted">Carico l'archivio…</p></section>;

  const materie = opzioni(a.voci, "materia");
  const toggle = (v: Voce) => setSelez((s) => { const n = new Set(s); n.has(v.id) ? n.delete(v.id) : n.add(v.id); return n; });
  const cop = materia ? copertura(a, materia, undefined, [...selez]) : null;
  const sugg = dett ? suggerimenti(a, dett.id) : [];

  return (
    <section className="archivio">
      <div className="view-head">
        <h1>📚 Archivio didattico</h1>
        <span className="muted">{a.meta.conteggi.obiettivi} obiettivi · {a.meta.conteggi.voci} voci · {a.meta.conteggi.parallelismi} parallelismi</span>
      </div>

      <div className="seg arc-materie">
        {materie.map((m) => <button key={m} className={materia === m ? "active" : ""} onClick={() => { setMateria(m); setSelez(new Set()); setDett(null); }}>{m}</button>)}
      </div>

      {!materia ? (
        <p className="muted">Scegli una materia per esplorare l'archivio ad albero.</p>
      ) : (
        <div className="arc-grid">
          <ArchivioPicker a={a} materia={materia} selez={selez} onToggle={toggle} onDettaglio={setDett} />

          <aside className="arc-side">
            {dett && (
              <div className="arc-dett">
                <h3>{dett.testo}</h3>
                <div className="arc-meta">
                  <span className="chip">{cap(dett.blocco)}</span>
                  <span className="chip">{dett.nucleo}</span>
                  {dett.anno && <span className="chip">cl. {dett.anno}</span>}
                  {dett.bloom && <span className="chip">{cap(dett.bloom)}</span>}
                  {dett.competenza_europea && <span className="chip">{dett.competenza_europea}</span>}
                </div>
                {obiettiviDiVoce(a, dett).length > 0 ? (
                  <><h4>Riscontro · obiettivi del quadro nazionale</h4>
                    <ul className="arc-ob">{obiettiviDiVoce(a, dett).map((o) => <li key={o.id}><b>{o.argomento}</b> <em>· {o.nucleo} · {o.fase}</em></li>)}</ul></>
                ) : <p className="muted">Nessun obiettivo agganciato (estensione non normata).</p>}
                {sugg.length > 0 && (
                  <><h4>Collegamenti trasversali</h4>
                    {sugg.map((s) => (
                      <div key={s.parallelismo.id} className="arc-par">
                        <div className="arc-par-h"><b>{s.parallelismo.titolo}</b> <em>· {s.parallelismo.relazione}</em></div>
                        <p className="muted">{s.parallelismo.descrizione}</p>
                        <div className="arc-chips">{s.collegate.map((c) => <button key={c.id} className="arc-chip" onClick={() => setDett(c)}>{c.materia} · {c.testo}</button>)}</div>
                      </div>
                    ))}</>
                )}
              </div>
            )}

            {cop && (
              <div className="arc-cop">
                <h3>Copertura {materia}</h3>
                <div className="arc-cop-n"><b>{cop.coperti}</b> / {cop.totali} obiettivi · {selez.size} voci flaggate</div>
                <div className="bar"><div style={{ width: `${cop.pct}%` }} /></div>
                <div className="arc-cop-pct">{cop.pct}%</div>
                {selez.size > 0 && <button className="link" onClick={() => setSelez(new Set())}>azzera selezione</button>}
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
