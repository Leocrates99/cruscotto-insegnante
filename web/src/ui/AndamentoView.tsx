import { useState } from "react";
import { annoCorrente, sessioniDi, useValutazione } from "../store/valutazione";
import { mediaSessione } from "../compute/voto";
import { useProfile } from "../store/profile";
import { classeColor } from "./materia";

const num = (v: number) => v.toLocaleString("it-IT", { maximumFractionDigits: 2 });
const pct10 = (v: number) => `${Math.min(100, Math.max(0, (v / 10) * 100))}%`;

/**
 * Andamento/trend: per classe, le medie delle verifiche dell'anno corrente (live) e le medie
 * generali annuali archiviate negli anni (solo aggregati, nessun dato per-studente).
 */
export function AndamentoView() {
  const v = useValutazione();
  const profile = useProfile();
  const anno = annoCorrente();
  const [filtro, setFiltro] = useState("");

  const classiTutte = Array.from(new Set([...profile.classi, ...v.sessioni.map((s) => s.classe), ...v.archivio.map((a) => a.classe)])).filter(Boolean);
  const classi = filtro ? classiTutte.filter((c) => c === filtro) : classiTutte;

  const generali = v.archivio.filter((a) => !a.titolo); // media generale annuale
  const anniStorico = Array.from(new Set(generali.map((g) => g.annoScolastico))).sort();

  const vuoto = v.sessioni.length === 0 && v.archivio.length === 0;

  return (
    <section className="andamento">
      <div className="view-head">
        <h1>📉 Andamento</h1>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Tutte le classi</option>
          {classiTutte.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {vuoto && <p className="muted">Crea verifiche (dal calendario o dal calcolatore) e usa «Archivia a.s.» a fine anno: qui vedrai le medie e i trend.</p>}

      {/* Anno corrente — medie delle verifiche (live) */}
      {!vuoto && (
        <div className="and-sec">
          <h3>Anno corrente · {anno}</h3>
          {classi.map((c) => {
            const sess = sessioniDi(c, anno).filter((s) => !s.archiviata);
            if (sess.length === 0) return null;
            const col = classeColor(c);
            const medie = sess.map((s) => mediaSessione(s)).filter((m) => m > 0);
            const generale = medie.length ? num(medie.reduce((a, b) => a + b, 0) / medie.length) : "—";
            return (
              <div key={c} className="and-classe">
                <div className="and-classe-head"><span className="and-pill" style={{ background: col }} />{c} <small className="muted">media generale: <b>{generale}</b></small></div>
                <div className="and-bars">
                  {sess.map((s) => {
                    const m = mediaSessione(s);
                    return (
                      <div key={s.id} className="and-bar" title={`${s.titolo} · ${s.data} · media ${num(m)}`}>
                        <span style={{ height: pct10(m), background: col }} />
                        <small>{num(m)}</small>
                        <em>{s.titolo.length > 10 ? s.titolo.slice(0, 9) + "…" : s.titolo}</em>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {classi.every((c) => sessioniDi(c, anno).filter((s) => !s.archiviata).length === 0) && <p className="muted">Nessuna verifica attiva nell'anno corrente.</p>}
        </div>
      )}

      {/* Storico — medie generali annuali tra anni */}
      {anniStorico.length > 0 && (
        <div className="and-sec">
          <h3>Storico · medie generali annuali</h3>
          {classi.map((c) => {
            const voci = anniStorico.map((a) => ({ a, g: generali.find((x) => x.classe === c && x.annoScolastico === a) })).filter((x) => x.g);
            if (voci.length === 0) return null;
            const col = classeColor(c);
            return (
              <div key={c} className="and-classe">
                <div className="and-classe-head"><span className="and-pill" style={{ background: col }} />{c}</div>
                <div className="and-bars">
                  {voci.map(({ a, g }) => (
                    <div key={a} className="and-bar" title={`${a} · media ${num(g!.media)} · ${g!.nVerifiche ?? 0} verifiche`}>
                      <span style={{ height: pct10(g!.media), background: col }} />
                      <small>{num(g!.media)}</small>
                      <em>{a.replace("a.s. ", "")}</em>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
