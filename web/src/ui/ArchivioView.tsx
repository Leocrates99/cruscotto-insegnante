import { useState } from "react";
import { copertura, obiettiviDiVoce, opzioni, suggerimenti, useArchivio, type Voce } from "../data/archivio";
import { records } from "../store/store";
import { useStore } from "../store/useStore";
import { ArchivioPicker } from "./ArchivioPicker";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const fmtIt = (d: string) => { const [y, m, g] = String(d).split("-"); return g ? `${g}/${m}/${y}` : String(d); };

/** Archivio: il database didattico ad albero + le pianificazioni salvate dal docente. */
export function ArchivioView() {
  const a = useArchivio();
  useStore();
  const [vista, setVista] = useState<"db" | "piani">("db");
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
        <h1>📚 Archivio</h1>
        <div className="seg">
          <button className={vista === "db" ? "active" : ""} onClick={() => setVista("db")}>Database didattico</button>
          <button className={vista === "piani" ? "active" : ""} onClick={() => setVista("piani")}>Le mie pianificazioni</button>
        </div>
      </div>

      {vista === "piani" ? <Pianificazioni /> : (
        <>
          <p className="muted arc-cap">{a.meta.conteggi.obiettivi} obiettivi · {a.meta.conteggi.voci} voci · {a.meta.conteggi.parallelismi} parallelismi</p>
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
        </>
      )}
    </section>
  );
}

// ── Le mie pianificazioni: lezioni/laboratori/UdA salvati dal Planner ──────────
function classeLabel(id: string): string {
  const r = records("classi").find((x) => x.id === id);
  return String(r?.["Nome"] ?? r?.["Titolo"] ?? "");
}
function asArr(v: unknown): string[] { return Array.isArray(v) ? v.map((x) => String(x)) : v ? [String(v)] : []; }

function Pianificazioni() {
  const [aperto, setAperto] = useState<string | null>(null);
  type P = { id: string; tipo: string; r: Record<string, unknown>; data: string };
  const piani: P[] = [
    ...records("uda").map((r) => ({ id: r.id, tipo: "UdA", r, data: String(r["Data inizio"] ?? "") })),
    ...records("lezioni").map((r) => ({ id: r.id, tipo: String(r["Titolo"] ?? "").startsWith("[Laboratorio]") ? "Laboratorio" : "Lezione", r, data: String(r["Data prevista"] ?? "") })),
  ].sort((x, y) => (y.data || "").localeCompare(x.data || ""));

  if (piani.length === 0) return <p className="muted">Nessuna pianificazione salvata. Crea una lezione o UdA in <b>Pianifica</b>: comparirà qui.</p>;

  const campoTxt = (r: Record<string, unknown>, k: string) => String(r[k] ?? "").trim();
  const blocchi: [string, string][] = [["Conoscenze", "Conoscenze"], ["Abilità", "Abilità"], ["Competenze", "Competenze"], ["Fasi", "Fasi"], ["Compiti ed esercizi", "Compiti ed esercizi"], ["Prerequisiti", "Prerequisiti"], ["Inclusione (misure)", "Inclusione"]];
  const tagFields: [string, string][] = [["Metodologie", "Metodologie"], ["Strumenti e spazi", "Strumenti e spazi"], ["Educazione civica", "Educazione civica"], ["Raccordi interdisciplinari", "Raccordi"]];

  return (
    <div className="pian-list">
      {piani.map((p) => {
        const r = p.r;
        const cls = asArr(r["Classe"]).map(classeLabel).filter(Boolean).join(", ");
        const open = aperto === p.id;
        return (
          <div key={p.id} className={open ? "pian-card open" : "pian-card"}>
            <button className="pian-head" onClick={() => setAperto(open ? null : p.id)}>
              <span className="pian-tipo">{p.tipo}</span>
              <span className="pian-titolo">{String(r["Titolo"] ?? "—").replace(/^\[Laboratorio\]\s*/, "")}</span>
              <span className="pian-meta">{[String(r["Materia"] ?? ""), cls, p.data ? fmtIt(p.data) : ""].filter(Boolean).join(" · ")}</span>
              {r["Stato"] ? <span className="pian-stato">{String(r["Stato"])}</span> : null}
              <span className="pian-caret">{open ? "▾" : "▸"}</span>
            </button>
            {open && (
              <div className="pian-body">
                {tagFields.some(([k]) => asArr(r[k]).length > 0) && (
                  <div className="pian-tags">
                    {tagFields.map(([k, lab]) => { const xs = asArr(r[k]); return xs.length ? <div key={k} className="pian-tagrow"><b>{lab}:</b> {xs.map((x, i) => <span key={i} className="chip">{cap(x)}</span>)}</div> : null; })}
                  </div>
                )}
                {blocchi.map(([k, lab]) => { const t = campoTxt(r, k); return t ? <div key={k} className="pian-blk"><b>{lab}</b><pre>{t}</pre></div> : null; })}
                {campoTxt(r, "Competenza attesa") && <div className="pian-blk"><b>Competenza attesa</b><pre>{campoTxt(r, "Competenza attesa")}</pre></div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
