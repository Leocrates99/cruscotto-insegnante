import { useRef, useState } from "react";
import { generateBands, setSettings, useSettings, type TimeBand } from "../store/settings";
import { classeInfo, classiAttive, contiClasse, materieAttive, setProfile, useProfile, type OrarioSlot, type StudenteAnon } from "../store/profile";
import { classeColor, materiaColor } from "./materia";
import { classiFromSlots, mergeSlots, parseOrarioFile } from "../store/orarioImport";
import { classeUnicaPerMateria, materiaUnicaPerClasse, materiePerClasse } from "../store/links";

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

  // Anagrafica classi (per numero di registro)
  const [anag, setAnag] = useState<string>("");
  const anagClasse = anag || profile.classi[0] || "";
  const saveStudenti = (classe: string, studenti: StudenteAnon[]) =>
    setProfile({ classiInfo: { ...(profile.classiInfo ?? {}), [classe]: { studenti } } });
  const setNumStudenti = (classe: string, nRaw: number) => {
    const n = Math.max(0, Math.min(40, nRaw || 0));
    const cur = classeInfo(classe, profile).studenti;
    saveStudenti(classe, Array.from({ length: n }, (_, i) => cur.find((s) => s.n === i + 1) ?? { n: i + 1 }));
  };
  const toggleFlag = (classe: string, n: number, flag: "l104" | "bes" | "dsa") =>
    saveStudenti(classe, classeInfo(classe, profile).studenti.map((s) => (s.n === n ? { ...s, [flag]: !s[flag] } : s)));

  const bands = settings.timeBands;
  const giorni = GIORNI.filter((g) => settings.giorniLezione.includes(g.i));

  // ── Fasce orarie (spostate qui dal calendario, per evitare clic sbagliati) ──
  const [bStart, setBStart] = useState("08:00");
  const [bDur, setBDur] = useState(55);
  const [bCount, setBCount] = useState(6);
  const [bAfter, setBAfter] = useState(0);
  const [bMin, setBMin] = useState(15);
  const genBands = () => setSettings({ timeBands: generateBands(bStart, bDur, bCount, bAfter || undefined, bMin) });
  const editBand = (i: number, patch: Partial<TimeBand>) => setSettings({ timeBands: bands.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const removeBand = (i: number) => setSettings({ timeBands: bands.filter((_, j) => j !== i) });

  const slotAt = (g: number, fascia: string) => profile.orario.find((s) => s.giorno === g && s.fascia === fascia);
  const setSlot = (g: number, fascia: string, patch: Partial<OrarioSlot>) => {
    const others = profile.orario.filter((s) => !(s.giorno === g && s.fascia === fascia));
    const next: OrarioSlot = { giorno: g, fascia, ...slotAt(g, fascia), ...patch };
    // Aggancio automatico materia↔classe (riempie solo il campo ancora vuoto, mai sovrascrive).
    if (patch.classe && !next.materia) { const m = materiaUnicaPerClasse(patch.classe, profile.orario); if (m) next.materia = m; }
    if (patch.materia && !next.classe) { const c = classeUnicaPerMateria(patch.materia, profile.orario); if (c) next.classe = c; }
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
        <h4>Anagrafica classi <em>· per numero di registro, senza nomi</em></h4>
        {profile.classi.length === 0 ? (
          <span className="muted">Aggiungi prima una classe.</span>
        ) : (
          <>
            <div className="ol-anag-top">
              <select value={anagClasse} onChange={(e) => setAnag(e.target.value)}>
                {profile.classi.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="field sm"><span>N° studenti</span>
                <input type="number" min={0} max={40} value={classeInfo(anagClasse, profile).studenti.length} onChange={(e) => setNumStudenti(anagClasse, Number(e.target.value))} />
              </label>
              {(() => { const c = contiClasse(anagClasse, profile); return <span className="ol-conti">L.104 <b>{c.l104}</b> · BES <b>{c.bes}</b> · DSA <b>{c.dsa}</b></span>; })()}
            </div>
            <div className="ol-roster">
              {classeInfo(anagClasse, profile).studenti.length === 0 && <span className="muted">Imposta il numero di studenti.</span>}
              {classeInfo(anagClasse, profile).studenti.map((st) => (
                <div key={st.n} className="ol-stud">
                  <span className="ol-stud-n">{st.n}</span>
                  <label className={st.l104 ? "on" : ""}><input type="checkbox" checked={!!st.l104} onChange={() => toggleFlag(anagClasse, st.n, "l104")} /> 104</label>
                  <label className={st.bes ? "on" : ""}><input type="checkbox" checked={!!st.bes} onChange={() => toggleFlag(anagClasse, st.n, "bes")} /> BES</label>
                  <label className={st.dsa ? "on" : ""}><input type="checkbox" checked={!!st.dsa} onChange={() => toggleFlag(anagClasse, st.n, "dsa")} /> DSA</label>
                </div>
              ))}
            </div>
          </>
        )}
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
        <h4>Fasce orarie <em>· le righe del calendario (1ª ora, 2ª ora…)</em></h4>
        <p className="muted">Genera le ore agganciate all'orologio, poi rifiniscile a mano. Valgono per la vista settimana/giorno del calendario.</p>
        <div className="orario-form">
          <label className="field"><span>Inizio</span><input type="time" value={bStart} onChange={(e) => setBStart(e.target.value)} /></label>
          <label className="field"><span>Durata (min)</span><input type="number" value={bDur} onChange={(e) => setBDur(Number(e.target.value))} /></label>
          <label className="field"><span>N° ore</span><input type="number" value={bCount} onChange={(e) => setBCount(Number(e.target.value))} /></label>
          <label className="field"><span>Pausa dopo la</span><input type="number" placeholder="0 = nessuna" value={bAfter} onChange={(e) => setBAfter(Number(e.target.value))} /></label>
          <label className="field"><span>Pausa (min)</span><input type="number" value={bMin} onChange={(e) => setBMin(Number(e.target.value))} /></label>
          <button className="primary" onClick={genBands}>Genera</button>
        </div>
        <div className="orario-bands">
          {bands.length === 0 ? (
            <p className="muted">Nessuna fascia: usa «Genera».</p>
          ) : (
            bands.map((b, i) => (
              <div key={i} className="orario-band">
                <input value={b.label} onChange={(e) => editBand(i, { label: e.target.value })} />
                <input type="time" value={b.start} onChange={(e) => editBand(i, { start: e.target.value })} />
                <input type="time" value={b.end} onChange={(e) => editBand(i, { end: e.target.value })} />
                <button className="danger" aria-label="Rimuovi" onClick={() => removeBand(i)}>✕</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="ol-sec">
        <h4>Griglia settimanale</h4>
        {bands.length === 0 ? (
          <div className="ol-nobands">
            <span className="muted">Servono le fasce orarie: generale qui sopra.</span>
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
                          {(() => {
                            const inClasse = s?.classe ? materiePerClasse(s.classe, profile.orario) : [];
                            const altre = materie.filter((m) => !inClasse.includes(m));
                            return (
                              <select value={s?.materia ?? ""} onChange={(e) => setSlot(g.i, b.label, { materia: e.target.value || undefined })}>
                                <option value="">—</option>
                                {inClasse.length > 0 && (
                                  <optgroup label="In questa classe">
                                    {inClasse.map((m) => <option key={m} value={m}>{m}</option>)}
                                  </optgroup>
                                )}
                                <optgroup label={inClasse.length > 0 ? "Altre materie" : "Materie"}>
                                  {altre.map((m) => <option key={m} value={m}>{m}</option>)}
                                </optgroup>
                              </select>
                            );
                          })()}
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
