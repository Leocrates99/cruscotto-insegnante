import { useMemo, useState } from "react";
import {
  buildProgrammazione,
  buildValutazione,
  downloadMarkdown,
  downloadWord,
  progToHtml,
  progToMarkdown,
  valToHtml,
  valToMarkdown,
} from "../store/reportFineAnno";

/**
 * Esportazione di fine anno: il resoconto della programmazione svolta e il quadro
 * valutativo (con infografiche), per classe × materia, in Markdown, Word e PDF
 * (vettoriale via stampa del browser). Utile per relazione finale e resoconto.
 */
export function ExportFineAnno({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"prog" | "val">("prog");
  const prog = useMemo(() => buildProgrammazione(), []);
  const val = useMemo(() => buildValutazione(), []);
  const anno = prog.anno;
  const annoSlug = anno.replace(/[^\d]/g, "").replace(/^(\d\d)(\d\d)$/, "$1-$2");

  const titolo = tab === "prog" ? `Programmazione svolta — ${anno}` : `Quadro valutativo — ${anno}`;
  const nameBase = `${tab === "prog" ? "programmazione-svolta" : "quadro-valutativo"}-${annoSlug}`;
  const html = tab === "prog" ? progToHtml(prog) : valToHtml(val);
  const md = tab === "prog" ? progToMarkdown(prog) : valToMarkdown(val);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head no-print">
          <h2>📦 Esporta fine anno</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        <div className="export-bar no-print">
          <div className="seg">
            <button className={tab === "prog" ? "active" : ""} onClick={() => setTab("prog")}>📚 Programmazione svolta</button>
            <button className={tab === "val" ? "active" : ""} onClick={() => setTab("val")}>📊 Infografiche valutazione</button>
          </div>
          <span className="spacer" />
          <button onClick={() => downloadMarkdown(nameBase, md)}>📝 Markdown</button>
          <button onClick={() => downloadWord(nameBase, titolo, html)}>📄 Word</button>
          <button className="primary" onClick={() => window.print()}>🖨️ PDF / Stampa</button>
        </div>
        <p className="muted export-hint no-print">
          Dati per classe e materia dell'{anno}, da rielaborare nella relazione finale / resoconto della programmazione.
          Per il <b>PDF vettoriale</b> scegli «Salva come PDF» nella finestra di stampa.
        </p>

        <div className="print-area export-preview" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
