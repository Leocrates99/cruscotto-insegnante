import { useRef, useState } from "react";
import { generateBands, setSettings, useSettings } from "../store/settings";
import { classiAttive, materieAttive, setProfile, useProfile, type OrarioSlot } from "../store/profile";
import { classeColor, materiaColor } from "./materia";
import { classiFromSlots, mergeSlots, parseOrarioFile } from "../store/orarioImport";

const GIORNI = [
  { i: 0, short: "Lun" },
  { i: 1, short: "Mar" },
  { i: 2, short: "Mer" },
  { i: 3, short: "Gio" },
  { i: 4, short: "Ven" },
  { i: 5, short: "Sab" },
  { i: 6, short: "Dom" },
];

/**
 * Editor dell'orario di lavoro del docente: giorni di lezione, classi (con colore),
 * griglia settimanale (fasce × giorni) e import da CSV/Excel. Scrive direttamente in
 * settings/profile (configurazione, persistita subito). Usato nello step "Orario & classi".
 */
export function OrarioLavoro() {
  const settings = useSettings();
  const profile = useProfile();
  const materie = materieAttive(profile);
  const classi = classiAttive(profile);

  const toggleGiorno = (d: number) => {
    const has = settings.giorniLezione.includes(d);
    const next = has ? settings.giorniLezione.filter((x) => x !== d) : [...settings.giorniLezione, d];
    setSettings({ giorniLezione: next.sort((a, b) => a - b) });
  };

  const [nuovaClasse, setNuovaClasse] = useState("");
  const addClasse = () => {
    const c = nuovaClasse.trim();
    if (c && !profile.classi.includes(c)) setProfile({ classi: [...profile.classi, c] });
    setNuovaClasse("");
  };
  const removeClasse = (c: string) => setProfile({ classi: profile.classi.filter((x) => x !== c) });
  const setColore = (c: string, col: string) => setProfile({ coloriClassi: { ...(profile.coloriClassi ?? {}), [c]: col } });

  const bands = settings.timeBands;
  const giorni = GIORNI.filter((g) => settings.giorniLezione.includes(g.i));

  const slotAt = (g: number, fascia: string) => profile.orario.find((s) => s.giorno === g && s.fascia === fascia);
  const setSlot = (g: number, fascia: string, patch: Partial<OrarioSlot>) => {
    const others = profile.orario.filter((s) => !(s.giorno === g && s.fascia === fascia));
    const next: OrarioSlot = { giorno: g, fascia, ...slotAt(g, fascia), ...patch };
    setProfile({ orario: next.materia || next.classe ? [...others, next] : others });
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<OrarioSlot[] | null>(null);
  const onFile = async (f: File) => {
    try {
      setPreview(await parseOrarioFile(f));
    } catch {
      alert("File non leggibile. Serve un CSV/Excel tabellare ordinato.");
    }
  };
  const applyImport = () => {
    if (!preview) return;
    setProfile({
      orario: mergeSlots(profile.orario, preview),
      classi: Array.from(new Set([...profile.classi, ...classiFromSlots(preview)])),
    });
    setPreview(null);
  };

  return (
    <div className="orario-lavoro">
      <div className="ol-sec">
        <h4>Giorni di lezione <em>· la domenica è esclusa</em></h4>
        <div className="ol-giorni">
          {GIORNI.map((g) => (
            <label key={g.i} className={settings.giorniLezione.includes(g.i) ? "ol-day on" : "ol-day"}>
              <input type="checkbox" checked={settings.giorniLezione.includes(g.i)} onChange={() => toggleGiorno(g.i)} />
              {g.short}
            </label>
          ))}
        </div>
      </div>

      <div className="ol-sec">
        <h4>Le tue classi</h4>
        <div className="ol-classi">
          {profile.classi.length === 0 && <span className="muted">Aggiungi le classi in cui insegni (ognuna avrà un colore).</span>}
          {profile.classi.map((c) => (
            <span key={c} className="ol-classe" style={{ borderColor: classeColor(c) }}>
              <input type="color" value={classeColor(c) ?? "#888888"} onChange={(e) => setColore(c, e.target.value)} title="Colore classe" />
              {c}
              <button onClick={() => removeClasse(c)} aria-label="Rimuovi">✕</button>
            </span>
          ))}
        </div>
        <div className="ol-add">
          <input value={nuovaClasse} placeholder="Es. IV A" onChange={(e) => setNuovaClasse(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addClasse(); }} />
          <button onClick={addClasse}>+ Classe</button>
        </div>
      </div>

      <div className="ol-sec">
        <h4>Importa l'orario (CSV/Excel)</h4>
        <p className="muted">
          File tabellare ordinato. <b>Formato lungo:</b> colonne <code>Giorno, Ora, Materia, Classe</code>.
          <b> Formato griglia:</b> prima colonna = ora, intestazioni = giorni, cella = «Materia Classe».
        </p>
        <button onClick={() => fileRef.current?.click()}>📄 Scegli file…</button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,.xls"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }}
        />
        {preview && (
          <div className="ol-preview">
            <p><b>{preview.length}</b> slot letti — anteprima prima di applicare:</p>
            <ul>
              {preview.slice(0, 12).map((s, i) => (
                <li key={i}>{GIORNI[s.giorno]?.short ?? s.giorno} · {s.fascia} · {s.materia ?? "—"}{s.classe ? ` · ${s.classe}` : ""}</li>
              ))}
              {preview.length > 12 && <li>…e altri {preview.length - 12}</li>}
            </ul>
            <div className="ol-preview-actions">
              <button onClick={() => setPreview(null)}>Annulla</button>
              <button className="primary" onClick={applyImport}>Applica all'orario</button>
            </div>
          </div>
        )}
      </div>

      <div className="ol-sec">
        <h4>Griglia settimanale</h4>
        {bands.length === 0 ? (
          <div className="ol-nobands">
            <span className="muted">Servono le fasce orarie.</span>
            <button onClick={() => setSettings({ timeBands: generateBands("08:00", 55, 6) })}>Genera 6 ore (8:00, 55′)</button>
            <span className="muted">Le rifinisci dal calendario → 🕒 Orario.</span>
          </div>
        ) : giorni.length === 0 ? (
          <span className="muted">Seleziona almeno un giorno di lezione.</span>
        ) : (
          <div className="ol-grid-wrap">
            <table className="ol-grid">
              <thead>
                <tr>
                  <th></th>
                  {giorni.map((g) => <th key={g.i}>{g.short}</th>)}
                </tr>
              </thead>
              <tbody>
                {bands.map((b) => (
                  <tr key={b.label}>
                    <th className="ol-ora">{b.label}<small>{b.start}</small></th>
                    {giorni.map((g) => {
                      const s = slotAt(g.i, b.label);
                      const mc = materiaColor(s?.materia);
                      const cc = classeColor(s?.classe);
                      return (
                        <td key={g.i} style={{ background: mc ? `${mc}1f` : undefined, borderLeft: cc ? `3px solid ${cc}` : undefined }}>
                          <select value={s?.materia ?? ""} onChange={(e) => setSlot(g.i, b.label, { materia: e.target.value || undefined })}>
                            <option value="">—</option>
                            {materie.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <select value={s?.classe ?? ""} onChange={(e) => setSlot(g.i, b.label, { classe: e.target.value || undefined })}>
                            <option value="">—</option>
                            {classi.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
