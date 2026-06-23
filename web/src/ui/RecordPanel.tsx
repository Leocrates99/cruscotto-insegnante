import { useState } from "react";
import type { BasePropertyDef, DbKey } from "@model";
import { schemaByKey } from "@model";
import { newId, records, recordTitle, upsert, type Rec, type Value } from "../store/store";
import { SearchSelect } from "./SearchSelect";
import { obiettiviPerMateria, type ObiettivoSuggerito } from "../data/catalog";
import { schoolYearOptions, type SchoolYearOption } from "./schoolYear";

const str = (v: Value): string => (typeof v === "string" ? v : v === undefined ? "" : String(v));
const asStrArr = (v: Value): string[] => (Array.isArray(v) ? v : []);

/**
 * Pannello laterale (docked a destra) per creare/modificare un record. Su PC si apre
 * in parallelo senza coprire la vista; su mobile è un overlay a tutta larghezza.
 * Per gli Obiettivi il campo "Enunciato" usa una combobox con suggerimenti per materia.
 */
export function RecordPanel({
  dbKey,
  rec,
  prefill,
  onClose,
}: {
  dbKey: DbKey;
  rec?: Rec;
  prefill?: Record<string, Value>;
  onClose: () => void;
}) {
  const def = schemaByKey[dbKey];
  const [draft, setDraft] = useState<Rec>(() => (rec ? { ...rec } : { id: newId(), ...(prefill ?? {}) }));
  const set = (name: string, v: Value) => setDraft((d) => ({ ...d, [name]: v }));
  const merge = (patch: Record<string, Value>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <aside className="side-panel" role="dialog" aria-label={`${rec ? "Modifica" : "Nuovo"} ${def.title}`}>
        <div className="panel-head">
          <h2>
            {rec ? "Modifica" : "Nuovo"} · {def.icon} {def.title}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        <div className="panel-body">
          <div className="form">
            {Object.entries(def.properties).map(([name, prop]) => {
              // Obiettivi · Enunciato → combobox con suggerimenti per materia
              if (dbKey === "obiettivi" && name === "Enunciato") {
                const materia = str(draft["Materia"]);
                const list: ObiettivoSuggerito[] = (materia && obiettiviPerMateria[materia]) || [];
                return (
                  <label className="field" key={name}>
                    <span>
                      {name} {materia ? <em>· suggerimenti {materia}</em> : <em>· scegli prima la Materia</em>}
                    </span>
                    <SearchSelect<ObiettivoSuggerito>
                      value={str(draft[name])}
                      onChange={(v) => set(name, v)}
                      placeholder="Scrivi o cerca un obiettivo…"
                      options={list.map((s) => ({ label: s.enunciato, data: s }))}
                      onSelect={(opt) => {
                        const s = opt.data;
                        if (!s) return;
                        merge({
                          Enunciato: s.enunciato,
                          ...(s.tipo ? { Tipo: s.tipo } : {}),
                          ...(s.livello ? { "Livello cognitivo": s.livello } : {}),
                          ...(s.ciclo ? { Ciclo: s.ciclo } : {}),
                        });
                      }}
                    />
                  </label>
                );
              }
              // Anni · Titolo → combobox anno scolastico (con date auto-compilate)
              if (dbKey === "anni" && name === "Titolo") {
                return (
                  <label className="field" key={name}>
                    <span>
                      {name} <em>· anno scolastico</em>
                    </span>
                    <SearchSelect<SchoolYearOption>
                      value={str(draft[name])}
                      onChange={(v) => set(name, v)}
                      placeholder="Scrivi o scegli (es. a.s. 24/25)…"
                      options={schoolYearOptions().map((o) => ({ label: o.titolo, data: o }))}
                      onSelect={(opt) => {
                        const o = opt.data;
                        if (!o) return;
                        merge({ Titolo: o.titolo, Inizio: o.inizio, Fine: o.fine });
                      }}
                    />
                  </label>
                );
              }
              return <Field key={name} name={name} prop={prop} value={draft[name]} onChange={(v) => set(name, v)} />;
            })}
            {(def.relations ?? []).map((rel) => (
              <RelationField
                key={rel.name}
                label={rel.name}
                target={rel.target}
                value={asStrArr(draft[rel.name])}
                onChange={(ids) => set(rel.name, ids)}
              />
            ))}
          </div>
        </div>

        <div className="panel-actions">
          <button onClick={onClose}>Annulla</button>
          <button className="primary" onClick={() => { upsert(dbKey, draft); onClose(); }}>
            Salva
          </button>
        </div>
      </aside>
    </>
  );
}

function Field({ name, prop, value, onChange }: { name: string; prop: BasePropertyDef; value: Value; onChange: (v: Value) => void }) {
  switch (prop.type) {
    case "title":
    case "url":
    case "email":
    case "phone_number":
      return (
        <label className="field">
          <span>{name}</span>
          <input type="text" value={str(value)} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    case "rich_text":
      return (
        <label className="field">
          <span>{name}</span>
          <textarea rows={2} value={str(value)} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    case "number":
      return (
        <label className="field">
          <span>{name}</span>
          <input
            type="number"
            value={typeof value === "number" ? String(value) : ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
      );
    case "date":
      return (
        <label className="field">
          <span>{name}</span>
          <input type="date" value={str(value)} onChange={(e) => onChange(e.target.value || undefined)} />
        </label>
      );
    case "checkbox":
      return (
        <label className="field checkbox">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          <span>{name}</span>
        </label>
      );
    case "select":
      return (
        <label className="field">
          <span>{name}</span>
          <select value={str(value)} onChange={(e) => onChange(e.target.value || undefined)}>
            <option value="">—</option>
            {prop.options.map((o) => (
              <option key={o.name} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      );
    case "multi_select":
      return <MultiSelect name={name} options={prop.options.map((o) => o.name)} value={asStrArr(value)} onChange={onChange} />;
    case "files":
      return null;
  }
}

function MultiSelect({ name, options, value, onChange }: { name: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  if (options.length === 0) {
    return (
      <label className="field">
        <span>{name}</span>
        <input
          type="text"
          placeholder="valori separati da virgola"
          value={value.join(", ")}
          onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </label>
    );
  }
  const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="field">
      <span>{name}</span>
      <div className="checklist">
        {options.map((o) => (
          <label key={o} className="chk">
            <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

function RelationField({ label, target, value, onChange }: { label: string; target: DbKey; value: string[]; onChange: (v: string[]) => void }) {
  const opts = records(target);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="field">
      <span>
        {label} <em>(→ {schemaByKey[target].title})</em>
      </span>
      <div className="checklist">
        {opts.length === 0 ? (
          <small>nessun record collegabile</small>
        ) : (
          opts.map((r) => (
            <label key={r.id} className="chk">
              <input type="checkbox" checked={value.includes(r.id)} onChange={() => toggle(r.id)} />
              {recordTitle(target, r)}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
