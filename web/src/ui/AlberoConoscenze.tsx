import { useState } from "react";
import { figliOrdinati, type ArchivioIndex, type Voce } from "../data/archivio";

/**
 * Albero ramificato delle conoscenze/contenuti, riusabile (Archivio + Planner).
 * Espansione esplicita (pulsante ▸/▾); i figli di un autore escono in ordine
 * didattico: prima la biografia (e la scheda), poi le opere.
 */
export function AlberoConoscenze({ a, radici, selez, onToggle, onDettaglio }: {
  a: ArchivioIndex; radici: Voce[]; selez: Set<string>; onToggle: (v: Voce) => void; onDettaglio?: (v: Voce) => void;
}) {
  const [exp, setExp] = useState<Set<string>>(new Set());
  const toggleExp = (id: string) => setExp((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const Nodo = ({ v, depth }: { v: Voce; depth: number }) => {
    const kids = figliOrdinati(a, v.id);
    const open = exp.has(v.id);
    return (
      <div className="ap-node">
        <div className="ap-row" style={{ paddingLeft: `${depth * 0.9}rem` }}>
          {kids.length > 0
            ? <button className={open ? "ap-tw open" : "ap-tw"} onClick={() => toggleExp(v.id)} aria-label={open ? "Chiudi" : "Apri"}>▸</button>
            : <span className="ap-tw dot" />}
          <button className={selez.has(v.id) ? "ap-leaf on" : "ap-leaf"} onClick={() => { onToggle(v); onDettaglio?.(v); }} title={v.tipo_contenuto ?? v.blocco}>
            <span className="ap-flag">{selez.has(v.id) ? "✓" : "+"}</span>
            <span className="ap-leaf-t">{v.testo}</span>
            {v.tipo_contenuto && v.tipo_contenuto !== "opera" && <span className="ap-tc">{v.tipo_contenuto}</span>}
          </button>
        </div>
        {open && kids.map((k) => <Nodo key={k.id} v={k} depth={depth + 1} />)}
      </div>
    );
  };

  if (radici.length === 0) return <p className="muted">Nessun contenuto per questo filtro.</p>;
  return <div className="ap-tree">{radici.map((v) => <Nodo key={v.id} v={v} depth={0} />)}</div>;
}
