import { useMemo, useState } from "react";
import type { View } from "../App";
import { useProfile, materieAttive, classiAttive } from "../store/profile";
import { annoCorrente } from "../store/valutazione";
import { useArchivio, materiaCodice, copertura, antenati, voce, type Voce } from "../data/archivio";
import { tassonomiaConoscenze, tassonomiaSkill } from "../data/tassonomia-conoscenze";
import { DrillTax, DCard } from "./PlannerView";
import { downloadWord } from "../store/reportFineAnno";
import { materiaSigla, classeColor } from "./materia";
import { getBussola, upsertBussola, bussolaId, useProgrammazione } from "../store/programmazione";

const CONO = new Set(["conoscenza", "contenuto"]);
const ROM: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
const annoDaClasse = (l: string): number => { const m = l.trim().match(/^(III|II|IV|V|I)\b/i); return m ? ROM[m[0].toUpperCase()] ?? 0 : 0; };
const escH = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] || c));

/**
 * Programmazione annuale (la "bussola"): per materia × classe si scelgono — con lo
 * stesso drill di comando del Planner — i contenuti e le competenze dell'anno; in
 * alto la copertura del backbone con gap analysis. Si conferma e si esporta.
 */
export function ProgrammazioneAnnualeView({ onView }: { onView: (v: View) => void }) {
  const profile = useProfile();
  const arch = useArchivio();
  useProgrammazione(); // subscribe agli aggiornamenti della bussola
  const materie = materieAttive(profile);
  const classi = classiAttive(profile);
  const annoScol = annoCorrente();

  const [materia, setMateria] = useState("");
  const [classe, setClasse] = useState("");
  const [catCono, setCatCono] = useState<string[]>([]);
  const [catAC, setCatAC] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const code = arch ? materiaCodice(arch, materia) : undefined;
  const anno = annoDaClasse(classe);
  const fase = anno >= 3 ? "triennio" : "biennio";
  const bus = materia && classe ? getBussola(materia, classe, annoScol) : undefined;
  const sel = useMemo(() => new Set(bus?.vociIds ?? []), [bus]);

  const salva = (vociIds: string[], patch: Partial<{ note: string; confermata: boolean }> = {}) =>
    upsertBussola({ id: bussolaId(materia, classe, annoScol), materia, classe, annoScol, vociIds, note: bus?.note ?? "", confermata: bus?.confermata ?? false, data: "", ...patch });

  const vMat = useMemo(() => (arch && code ? arch.voci.filter((v) => v.materia === code) : []), [arch, code]);
  const vCono = useMemo(() => vMat.filter((v) => CONO.has(v.blocco)), [vMat]);
  const abil = useMemo(() => vMat.filter((v) => v.blocco === "abilita"), [vMat]);
  const comp = useMemo(() => vMat.filter((v) => v.blocco === "competenza"), [vMat]);
  const taxCono = useMemo(() => (arch && code ? tassonomiaConoscenze(code, vCono) : []), [arch, code, vCono]);
  const taxAC = useMemo(() => tassonomiaSkill(abil, comp), [abil, comp]);
  const cop = arch && code ? copertura(arch, code, fase, [...sel]) : null;

  const toggleAlbero = (v: Voce) => { const n = new Set(sel); if (n.has(v.id)) n.delete(v.id); else { n.add(v.id); if (arch) for (const a of antenati(arch, v.id)) n.add(a.id); } salva([...n]); };
  const toggleVoce = (v: Voce) => { const n = new Set(sel); n.has(v.id) ? n.delete(v.id) : n.add(v.id); salva([...n]); };

  const cambiaContesto = () => { setMateria(""); setClasse(""); setCatCono([]); setCatAC([]); setMsg(null); };

  const esporta = () => {
    if (!arch) return;
    const lab = (id: string) => voce(arch, id)?.testo ?? id;
    const blocco = (pred: (v: Voce) => boolean) => [...sel].map((id) => voce(arch, id)).filter((v): v is Voce => !!v && pred(v)).map((v) => `<li>${escH(v.testo)}</li>`).join("");
    const cono = blocco((v) => CONO.has(v.blocco));
    const ab = blocco((v) => v.blocco === "abilita");
    const co = blocco((v) => v.blocco === "competenza");
    const sec = (t: string, lis: string) => (lis ? `<h2>${t}</h2><ul>${lis}</ul>` : "");
    const gap = cop && cop.mancanti.length ? `<h2>Obiettivi ancora scoperti (${cop.mancanti.length})</h2><ul>${cop.mancanti.map((o) => `<li>${escH(o.argomento || o.descrizione)}</li>`).join("")}</ul>` : "";
    const titolo = `Programmazione annuale · ${materia} · ${classe} · ${annoScol}`;
    const body = [
      `<h1>${escH(titolo)}</h1>`,
      cop ? `<p class="rep-meta">Copertura del quadro nazionale: ${cop.coperti}/${cop.totali} obiettivi (${cop.pct}%).</p>` : "",
      sec("Conoscenze e contenuti", cono), sec("Abilità", ab), sec("Competenze", co), gap,
      bus?.note?.trim() ? `<h2>Note</h2><p>${escH(bus.note).replace(/\n/g, "<br>")}</p>` : "",
    ].filter(Boolean).join("\n");
    downloadWord(`Programmazione_${materia}_${classe}_${annoScol}`.replace(/[^\w-]+/g, "-"), titolo, body);
  };

  // ── Scelta del contesto (materia → classe) ──────────────────────────────────
  if (!materia || !classe) {
    return (
      <section className="pl pa">
        <div className="view-head"><h1>🧭 Programmazione annuale</h1><p className="muted">La bussola dell'anno: scegli la materia e la classe, poi i contenuti e le competenze. · {annoScol}</p></div>
        {!materia ? (
          <><div className="pl-sub">Per quale materia?</div>
            <div className="pl-dgrid">{materie.map((m) => <DCard key={m} top={<span className="pl-sigla" style={{ background: "var(--accent)" }}>{materiaSigla(m)}</span>} title={m} onClick={() => setMateria(m)} />)}</div></>
        ) : (
          <><div className="pl-bc"><button className="pl-bc-i" onClick={() => setMateria("")}>↩ Materia</button><span className="pl-bc-seg"><span className="pl-bc-sep">▸</span><button className="pl-bc-i">{materia}</button></span></div>
            <div className="pl-sub">Per quale classe?</div>
            <div className="pl-dgrid">{classi.map((c) => <DCard key={c} top={<span className="pl-sigla cls" style={{ background: classeColor(c) ?? "var(--gold)" }}>{c}</span>} title={`Classe ${c}`} desc={annoDaClasse(c) >= 3 ? "Triennio" : "Biennio"} onClick={() => setClasse(c)} />)}</div></>
        )}
      </section>
    );
  }

  return (
    <section className="pl pa">
      <div className="view-head pa-head">
        <div><h1>🧭 Programmazione annuale</h1><p className="muted">{materia} · {classe} · {annoScol}{bus?.confermata ? " · ✓ confermata" : ""}</p></div>
        <button className="ghost" onClick={cambiaContesto}>↩ Cambia materia/classe</button>
      </div>

      {!arch || !code ? <p className="muted">Per <b>{materia}</b> non c'è ancora un archivio di voci.</p> : (
        <>
          {cop && (
            <div className={"pl-orario" + (cop.pct >= 80 ? " ok" : "")}>
              <div className="pl-orario-head">
                <span className="pl-orario-tit">📊 Copertura del quadro nazionale</span>
                <span className="pl-orario-read"><b>{cop.coperti}</b> <span className="muted">/ {cop.totali} obiettivi · {cop.pct}%</span></span>
                <span className="spacer" />
                <span className="pl-cnt">{sel.size} voci scelte</span>
              </div>
              <div className="pl-orario-meter"><div className="pl-orario-fill" style={{ width: `${cop.pct}%` }} /></div>
              {cop.mancanti.length > 0
                ? <div className="pa-gap"><span className="muted">Ancora da coprire:</span> {cop.mancanti.slice(0, 10).map((o) => <span key={o.id} className="chip">{o.argomento || o.descrizione}</span>)}{cop.mancanti.length > 10 && <span className="muted"> +{cop.mancanti.length - 10}</span>}</div>
                : <div className="pl-orario-msg">Tutti gli obiettivi della fase sono coperti ✓</div>}
            </div>
          )}

          <div className="pl-sez">📚 Conoscenze e contenuti dell'anno</div>
          <DrillTax roots={taxCono} path={catCono} setPath={setCatCono} a={arch} selez={sel} onTree={toggleAlbero} onVoce={toggleAlbero} />

          <div className="pl-sez">🛠️ Abilità e competenze</div>
          <DrillTax roots={taxAC} path={catAC} setPath={setCatAC} a={arch} selez={sel} onTree={toggleVoce} onVoce={toggleVoce} />

          <label className="field"><span>Note alla programmazione</span>
            <textarea rows={3} value={bus?.note ?? ""} placeholder="Scansione in moduli, criteri, raccordi, osservazioni…" onChange={(e) => salva([...sel], { note: e.target.value })} />
          </label>

          {msg && <p className="pl-msg ok">{msg}</p>}
          <div className="pl-nav">
            <button className="ghost" onClick={esporta}>📄 Esporta bussola (Word)</button>
            {bus?.confermata
              ? <button className="ghost" onClick={() => { salva([...sel], { confermata: false }); setMsg(null); }}>Riapri (rimuovi conferma)</button>
              : <button className="primary" onClick={() => { salva([...sel], { confermata: true }); setMsg(`Programmazione confermata per ${classe} (${annoScol}).`); }} disabled={sel.size === 0}>✓ Conferma programmazione</button>}
          </div>
        </>
      )}
    </section>
  );
}
