import { useMemo, useState } from "react";
import { figli, opzioni, perPeso, type ArchivioIndex, type Voce } from "../data/archivio";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const CONO = new Set(["conoscenza", "contenuto"]); // ciò che forma l'albero dei contenuti

/**
 * Navigatore ad albero dell'archivio, riusabile (Archivio standalone + Planner).
 * Menù a pulsanti (fase · anno · settore/nucleo) → albero ramificato delle conoscenze/
 * contenuti (epoca/corrente → autore → opera → facet, via `parent`/`tipo_contenuto`);
 * SOTTO, sempre visibili, abilità e competenze flaggabili di continuo.
 */
export function ArchivioPicker({ a, materia, selez, onToggle, onDettaglio }: {
  a: ArchivioIndex; materia: string; selez: Set<string>; onToggle: (v: Voce) => void; onDettaglio?: (v: Voce) => void;
}) {
  const [fase, setFase] = useState("");
  const [anno, setAnno] = useState("");
  const [nucleo, setNucleo] = useState("");
  const [exp, setExp] = useState<Set<string>>(new Set());
  const toggleExp = (id: string) => setExp((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const vMat = useMemo(() => a.voci.filter((v) => v.materia === materia), [a, materia]);
  const fasi = useMemo(() => opzioni(vMat, "fase"), [vMat]);
  const vFase = useMemo(() => vMat.filter((v) => !fase || v.fase === fase), [vMat, fase]);
  const anni = useMemo(() => opzioni(vFase, "anno"), [vFase]);
  const vAnno = useMemo(() => vFase.filter((v) => !anno || v.anno === anno), [vFase, anno]);
  const nuclei = useMemo(() => opzioni(vAnno, "nucleo"), [vAnno]);
  const ctx = useMemo(() => vAnno.filter((v) => !nucleo || v.nucleo === nucleo), [vAnno, nucleo]);

  const radici = ctx.filter((v) => CONO.has(v.blocco) && !v.parent).sort(perPeso);
  // Abilità e competenze: trasversali (per materia + nucleo, indipendenti dall'anno) → sempre sotto.
  const abilita = vMat.filter((v) => v.blocco === "abilita" && (!nucleo || v.nucleo === nucleo)).sort(perPeso);
  const competenze = vMat.filter((v) => v.blocco === "competenza" && (!nucleo || v.nucleo === nucleo)).sort(perPeso);

  const Nodo = ({ v, depth }: { v: Voce; depth: number }) => {
    const kids = figli(a, v.id);
    const open = exp.has(v.id);
    return (
      <div className="ap-node">
        <div className="ap-row" style={{ paddingLeft: `${depth * 0.9}rem` }}>
          {kids.length > 0 ? <button className="ap-tw" onClick={() => toggleExp(v.id)} aria-label={open ? "Chiudi" : "Apri"}>{open ? "▾" : "▸"}</button> : <span className="ap-tw" />}
          <button className={selez.has(v.id) ? "ap-leaf on" : "ap-leaf"} onClick={() => { onToggle(v); onDettaglio?.(v); }} title={v.tipo_contenuto ?? v.blocco}>
            <span className="ap-flag">{selez.has(v.id) ? "✓" : "+"}</span>
            <span className="ap-leaf-t">{v.testo}</span>
            {v.tipo_contenuto && v.tipo_contenuto !== "opera" && <span className="ap-tc">{v.tipo_contenuto}</span>}
          </button>
        </div>
        {open && kids.slice().sort(perPeso).map((k) => <Nodo key={k.id} v={k} depth={depth + 1} />)}
      </div>
    );
  };

  const Flag = ({ v }: { v: Voce }) => (
    <button className={selez.has(v.id) ? "ap-chip on" : "ap-chip"} onClick={() => { onToggle(v); onDettaglio?.(v); }} title={v.competenza_europea || v.nucleo}>
      <span className="ap-flag">{selez.has(v.id) ? "✓" : "+"}</span>{v.testo}
    </button>
  );

  return (
    <div className="ap">
      <div className="ap-bar">
        <div className="ap-grp"><span className="ap-lab">Fase</span><div className="seg sm">
          <button className={!fase ? "active" : ""} onClick={() => { setFase(""); setAnno(""); setNucleo(""); }}>Tutte</button>
          {fasi.map((f) => <button key={f} className={fase === f ? "active" : ""} onClick={() => { setFase(f); setAnno(""); setNucleo(""); }}>{cap(f)}</button>)}
        </div></div>
        {anni.length > 0 && <div className="ap-grp"><span className="ap-lab">Classe</span><div className="seg sm">
          <button className={!anno ? "active" : ""} onClick={() => setAnno("")}>Tutte</button>
          {anni.map((y) => <button key={y} className={anno === y ? "active" : ""} onClick={() => setAnno(y)}>{y}ª</button>)}
        </div></div>}
        {nuclei.length > 0 && <div className="ap-grp"><span className="ap-lab">Settore</span><div className="ap-settori">
          <button className={!nucleo ? "ap-set on" : "ap-set"} onClick={() => setNucleo("")}>Tutti</button>
          {nuclei.map((n) => <button key={n} className={nucleo === n ? "ap-set on" : "ap-set"} onClick={() => setNucleo(n)}>{n}</button>)}
        </div></div>}
      </div>

      <div className="ap-sec">
        <div className="ap-sec-h">Conoscenze e contenuti <small>{radici.length}</small></div>
        {radici.length === 0 ? <p className="muted">Nessun contenuto per questo filtro.</p> : (
          <div className="ap-tree">{radici.map((v) => <Nodo key={v.id} v={v} depth={0} />)}</div>
        )}
      </div>

      {abilita.length > 0 && (
        <div className="ap-sec ap-ac">
          <div className="ap-sec-h">Abilità <small>{abilita.length}</small> <em>· da flaggare di continuo</em></div>
          <div className="ap-chips">{abilita.map((v) => <Flag key={v.id} v={v} />)}</div>
        </div>
      )}
      {competenze.length > 0 && (
        <div className="ap-sec ap-ac">
          <div className="ap-sec-h">Competenze <small>{competenze.length}</small> <em>· da flaggare di continuo</em></div>
          <div className="ap-chips">{competenze.map((v) => <Flag key={v.id} v={v} />)}</div>
        </div>
      )}
    </div>
  );
}
