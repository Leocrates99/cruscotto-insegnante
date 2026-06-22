import { useState } from "react";

export interface SSOption<T> {
  label: string;
  data?: T;
}

/**
 * Combobox riusabile: input con ricerca + lista filtrata + pulsante. Testo libero
 * sempre consentito (l'utente può scegliere un suggerimento o scrivere il proprio).
 */
export function SearchSelect<T>({
  value,
  onChange,
  options,
  onSelect,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SSOption<T>[];
  onSelect?: (opt: SSOption<T>) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const filtered = (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options).slice(0, 8);

  const pick = (opt: SSOption<T>) => {
    onChange(opt.label);
    onSelect?.(opt);
    setOpen(false);
  };

  return (
    <div className="search-select">
      <div className="ss-input">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
        <button
          type="button"
          className="ss-btn"
          disabled={disabled}
          aria-label="Mostra suggerimenti"
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
          }}
        >
          🔎
        </button>
      </div>
      {open && options.length > 0 && (
        <ul className="ss-list">
          {filtered.length === 0 ? (
            <li className="ss-empty">Nessun suggerimento</li>
          ) : (
            filtered.map((o, i) => (
              <li key={i} onMouseDown={(e) => { e.preventDefault(); pick(o); }}>
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
