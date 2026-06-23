# Cruscotto del docente

**Sito local-first (SPA)** per la regia didattica del docente: programmazione annuale, UdA,
lezioni, materiali, obiettivi, verifiche, scadenze, con **calendario-agenda** (settimana/mese/
giorno, fasce orarie, linea "adesso"), **kanban**, **promemoria**, **profilazione** per classe
di concorso e **auto-backup**. Funziona nel browser, è **installabile (PWA)** e **offline**, e
non dipende da Notion: i dati restano sul dispositivo (con export/import JSON e backup su file).

🔗 **Online:** <https://leocrates99.github.io/cruscotto-insegnante/>

> Complementare al Registro Elettronico, non una sua copia: niente dati anagrafici o voti
> nominativi degli studenti; le osservazioni restano pseudonime e a livello di classe.

---

## Struttura del repo

- **[`web/`](web/)** — l'applicazione (Vite + React + TypeScript). **È il prodotto.**
- **[`src/`](src/)** — il *modello condiviso*: tipi + schema dei 17 database + dati di esempio,
  riusato dalla SPA tramite alias (`@model`, `@root-src`). `config/buildOrder.ts` ne completa
  l'ordine di costruzione.
- **[`legacy/`](legacy/)** — **archivio** del vecchio costruttore Notion (vedi sotto).

## Sviluppo

```bash
cd web
npm ci
npm run dev      # http://localhost:5173
npm run build    # type-check (tsc) + build di produzione
npm test         # rete di test (vitest)
```

Il deploy su **GitHub Pages** è automatico a ogni push su `main`
([`.github/workflows/pages.yml`](.github/workflows/pages.yml)).

## Dati e sicurezza

Local-first: i dati vivono nel browser (`localStorage`). Usa la sezione **💾 Backup** per non
perderli — salvataggio automatico su un file vero (File System Access API, dove supportato),
**punti di ripristino** locali ed **export JSON**. Idealmente tieni il file di backup in una
cartella sincronizzata su cloud.

---

## Archivio: il costruttore Notion (`legacy/`)

In origine il progetto costruiva lo stesso "cruscotto" come spazio di lavoro **Notion** via API
(schema, relazioni, rollup, formule, automazioni cron, export statico CSV, template duplicabile).
Quella parte è **archiviata** in [`legacy/`](legacy/) e **non è più attiva** (la CI Notion è stata
disattivata spostandone i workflow fuori da `.github/`). Il *modello* che condivideva con la SPA
resta in [`src/`](src/). Dettagli e istruzioni per riattivarla in
[`legacy/README.md`](legacy/README.md).
