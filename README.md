# Cruscotto del docente — costruttore Notion

Costruisce via codice l'**officina personale del docente** in Notion: 17 database
collegati (programmazione annuale, UdA, lezioni, materiali, obiettivi, verifiche,
scadenze, progetti, osservazioni, knowledge base, formazione…), con relazioni,
**rollup** e **formule** già pronti, più un **seed di collaudo** (l'UdA "Euripide").

È l'implementazione del brief tecnico (§13) del documento di progettazione, che trovi
integrale in [`docs/prospetto.md`](docs/prospetto.md). Lo schema è tenuto come **dato**
(un file dichiarativo per database in `src/schema/`); gli script lo traducono in
chiamate all'API Notion in modo **ripetibile, versionato e idempotente**.

> **Demarcazione RE ↔ Notion.** Questo spazio è complementare al Registro Elettronico,
> non una sua copia: niente dati anagrafici degli studenti, niente voti nominativi,
> niente dati sensibili. Le osservazioni restano **pseudonime e a livello di classe**
> (§9 del prospetto). Il codice è costruito attorno a questo vincolo.

---

## Cosa fa (e cosa no)

L'API Notion gestisce **dati e schema**, non l'interfaccia. Quindi:

| Costruito dal codice (`npm run build` / `seed`) | Da rifinire a mano nell'app (§14) |
|---|---|
| Database, data source, proprietà | **Viste** (Oggi, Settimana, Cronoprogramma/Timeline, Calendario, Kanban, Previsto vs svolto, Annuari…) |
| Relazioni (anche duali) | **Pulsanti-template** ("Nuova UdA", "Nuova lezione", "Apri nuovo anno") |
| Rollup e formule | **Sync Google Calendar** |
| Icone e dati di esempio | **Condivisione/permessi** e **Notion AI** |

La checklist manuale completa è in fondo a questo file (§ *Rifiniture manuali*).

---

## Prerequisiti (una tantum, a tuo carico)

1. **Node 18+** — verifica con `node --version`.
2. **Integrazione Notion:** su <https://www.notion.so/my-integrations> crea una *internal
   integration* e copia il **secret**.
3. **Pagina-genitore:** crea (o scegli) in Notion una pagina che ospiterà i database e
   **condividila con l'integrazione** (menu `⋯` in alto a destra → *Connections* → la tua
   integrazione).
4. **ID della pagina:** copialo dall'URL della pagina (la stringa esadecimale di 32 caratteri).

> 🔒 **Sicurezza.** Il token è un segreto: va **solo** nel file `.env` locale, mai nei
> commit, mai incollato in chat. Se finisse in un repo, revocalo e rigeneralo in Notion.

---

## Avvio

```bash
# 1) dipendenze
npm install

# 2) configura i segreti
cp .env.example .env        # poi compila NOTION_TOKEN e NOTION_PARENT_PAGE_ID

# 3) costruisci lo schema (database → relazioni → rollup/formule)
npm run build

# 4) inserisci i dati di esempio (UdA "Euripide") — una sola volta
npm run seed

# 5) verifica che lo schema combaci con la specifica
npm run verify
```

Dopo il `seed`, in Notion dovresti vedere calcolare:

- **UdA** → `Ore pianificate` = **6** e `Copertura %` ≈ **60** (3 obiettivi su 5 hanno una verifica);
- **Programmazione** → `Scostamento` = **93** e `Semaforo` = **“○ margine”**.

Gli script disponibili:

| Comando | Effetto |
|---|---|
| `npm run build` | Riconosce i database esistenti, crea i mancanti, allinea schema/relazioni/rollup/formule (additivo, idempotente). |
| `npm run plan` | Mostra il **diff** tra i file e il workspace, senza toccare nulla. |
| `npm run migrate` | Applica il diff: crea, **rinomina**, allinea. Con `-- --prune` rimuove anche le proprietà non più previste (distruttivo). |
| `npm run seed` | Inserisce l'UdA "Euripide" di collaudo (da lanciare una volta). |
| `npm run verify` | Rilegge i 17 database e stampa un riepilogo di controllo. |
| `npm run typecheck` | Type-check TypeScript senza eseguire nulla. |

---

## Idempotenza e stato

Il build mantiene un **manifest** `notion-state.json` (chiave logica → `{databaseId,
dataSourceId}`). Rilanciare `npm run build`:

- **salta** i database già presenti (non li ricrea);
- **aggiorna** (PATCH) relazioni, rollup e formule — riscrivere una proprietà con lo
  stesso nome è idempotente.

`notion-state.json` descrive **una specifica istanza Notion** (i tuoi id), perciò è in
`.gitignore`: si versiona il codice, non lo stato. Per ricostruire da zero su uno spazio
nuovo, basta cancellarlo.

> ⚠️ Il `seed`, invece, **non** è idempotente: rilanciarlo crea pagine duplicate. È un
> collaudo, non un'operazione da ripetere.

---

## Limiti noti (e i loro fallback)

Sono i punti in cui l'API Notion è più rigida. Il codice li gestisce con cura e, dove
serve, prosegue segnalando cosa completare a mano.

1. **`Stato` è una proprietà `select`, non `status`.** L'API non può definire le
   opzioni/gruppi di una proprietà *status* in creazione. Per avere gli 8 stati del ciclo
   di vita (Idea → … → Archiviata) **definiti dal codice** si usa `select`. Il kanban
   funziona comunque. Se vuoi i *gruppi* di `status`, converti la proprietà nell'app in 2 minuti.
2. **Rollup-di-rollup** (`Programmazione → Ore UdA totali`, che somma il rollup
   `UdA → Ore pianificate`). Alcune versioni dell'API lo rifiutano: in quel caso `build`
   stampa un avviso e prosegue. *Fallback nell'app:* su UdA crea una formula
   `oreLez = prop("Ore pianificate")` e fai il rollup di quella; oppure crea il rollup
   `Ore UdA totali` a mano (1 clic).
3. **Rollup `checked` su `Verificato`** (formula booleana). Se l'API lo rifiuta, l'avviso
   te lo segnala. *Fallback:* imposta `UdA → Obiettivi verificati` come rollup della
   relazione *Obiettivi* sulla proprietà *Verificato* con funzione *Checked*, oppure usa
   *Percent checked* direttamente come `Copertura %`.

Un avviso in `build`/`verify` su questi tre punti **non** è un errore del progetto: è il
confine noto dell'API. Tutto il resto viene creato automaticamente.

---

## Sistema autonomo (Ramo 2) — Infrastructure-as-Code

Lo schema è codice versionato: lo modifichi nei file di `src/schema/`, fai `push`, e una
**GitHub Action** allinea il workspace Notion da sola. È lo stesso modello "push → deploy"
di un sito statico, ma il bersaglio è il tuo Notion invece di una pagina web.

### Configurazione (una tantum)

1. Crea un repository su GitHub e fai `push` di questa cartella.
2. In **Settings → Secrets and variables → Actions → New repository secret** aggiungi:
   - `NOTION_TOKEN` — il secret dell'integrazione;
   - `NOTION_PARENT_PAGE_ID` — l'ID della pagina-genitore condivisa con l'integrazione.
3. Fatto. Da qui in poi:
   - apri una **pull request** → la Action esegue **`plan`** e ti mostra in chiaro cosa
     cambierebbe (sola lettura, nessuna modifica al workspace);
   - fai **merge / push su `main`** → la Action esegue **`migrate`** e applica lo schema;
   - dalla scheda **Actions → Run workflow** puoi lanciarlo a mano, con la spunta *prune*
     se vuoi anche rimuovere le proprietà non più previste.

### Perché non duplica nulla (discovery)

Il file di stato `notion-state.json` è locale e non versionato, quindi in CI non esiste.
Per non ricreare database già presenti, all'avvio `build`/`migrate` **riconoscono i
database esistenti** leggendo i figli della pagina-genitore e abbinandoli per titolo agli
schemi: ricostruiscono lo stato dal workspace vivo. Risultato: la stessa Action è sicura
sia sul primo run (spazio vuoto → crea tutto) sia sui successivi (allinea soltanto).

> ⚠️ Non rinominare i **titoli dei database** direttamente nell'app: il riconoscimento è
> per titolo, e un titolo cambiato verrebbe visto come un database nuovo (doppione).

### Far evolvere lo schema (migrazioni)

| Tipo di modifica | Cosa fare |
|---|---|
| Aggiungere un campo / un'opzione / un rollup | Modifica lo schema, `push`. Viene aggiunto (additivo). |
| **Rinominare** una proprietà | Aggiorna il nome **e** dichiara la rinomina, così non si crea un doppione e i dati restano: `renames: [{ from: "Durata", to: "Durata (ore)" }]` nel file del DB. |
| **Rimuovere** una proprietà | Toglila dallo schema; comparirà come *orfana* in `plan`. Si elimina solo eseguendo `migrate -- --prune` (o la Action con *prune*). |

Il flusso consigliato prima di ogni modifica importante: `npm run plan` in locale per
vedere il diff, poi `npm run migrate`. In team, lo fa la pull request al posto tuo.

---

## Struttura del repository

```
src/
  types.ts            # modello dichiarativo (SchemaDef, RelationDef, RollupDef, …)
  schema/             # una definizione per database (+ _shared.ts, index.ts)
  lib/
    notion.ts         # client SDK v5 (versione 2025-09-03) + retry/rate-limit
    props.ts          # traduzione proprietà-base → schema API
    createDatabase.ts # passata 1: database + proprietà base
    addRelations.ts   # passata 2: relazioni (duali una volta sola)
    addRollupsFormulas.ts # passata 3: rollup e formule
    discover.ts       # riconosce i database esistenti nello spazio (idempotenza in CI)
    pipeline.ts       # allineamento: base/relazioni/rollup, rinomine, prune, plan
    state.ts          # manifest di idempotenza
  seed/euripide.ts    # dati di esempio (§4.4)
  build.ts migrate.ts seedRun.ts verify.ts
config/buildOrder.ts  # ordine topologico di creazione (§13.6)
.github/workflows/notion.yml  # CI: plan sui PR, apply sui push (Ramo 2)
docs/prospetto.md     # il documento di progettazione completo
```

Per cambiare lo schema: modifica l'oggetto in `src/schema/<db>.ts` e rilancia
`npm run build`. Niente logica imperativa da toccare.

---

## Rifiniture manuali nell'app (§14 del prospetto)

Da fare una volta, dopo `build` + `seed`:

1. **Viste** su ciascuna data source: *Oggi*, *Settimana*, **Anno corrente** (filtro
   `Anno = corrente`), **Cronoprogramma** (Timeline sulle Lezioni, raggruppate per UdA),
   *Calendario*, **Kanban progetti** (per *Stato*), **Previsto vs svolto**, *Idee grezze*,
   *Per classe*, *Per materia*, *Annuari*.
2. **Pulsanti-template:** "Nuova UdA", "Nuova lezione", "Apri nuovo anno scolastico"
   (procedura di rollover, §6 del prospetto).
3. **Sync Google Calendar** su scadenze e lezioni calendarizzate.
4. **Condivisione/permessi:** mantieni lo spazio personale; nessuna condivisione automatica.
5. **Notion AI** dove utile: bozze di verbale, sviluppo di un'idea grezza in scaletta di UdA.

> I moduli M10 (template/modulistica) e M12 (BES/DSA: promemoria e bozze) del prospetto
> **non** sono database: il primo è una raccolta di *template* di pagina (manuale), il
> secondo si gestisce con *Scadenze* + note, sempre **senza** dati identificativi né
> diagnosi (§9, §12).

---

## Note tecniche

- **SDK:** `@notionhq/client` v5, namespace `databases`, `dataSources`, `pages`.
- **Versione API:** fissata a `2025-09-03` (modello *data source*). Non adottare
  `2026-03-11` salvo necessità.
- **Riferimenti:** [Upgrade guide 2025-09-03](https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03)
  · [FAQ data sources](https://developers.notion.com/docs/upgrade-faqs-2025-09-03)
  · [SDK ufficiale](https://github.com/makenotion/notion-sdk-js)
