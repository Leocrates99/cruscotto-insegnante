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
| `npm run template` | Prepara lo spazio per essere pubblicato come **template duplicabile**: allinea, popola di esempio e crea la pagina-guida (vedi Ramo 1). |
| `npm run automate -- <task>` | Esegue un'automazione viva: `reminders`, `annuario <anno>`, `rollover <nuovo> [prec]` (vedi Ramo 3). |
| `npm run reminders` | Scorciatoia per il digest delle scadenze. |
| `npm run export:static` | Genera la cartella `static-template/` (CSV + guide) da importare in Notion senza codice (vedi Modello statico). |
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

## Template duplicabile (Ramo 1)

Il modo più semplice per **condividere** il cruscotto con altri docenti: chi lo riceve
non tocca codice, token né terminale — clicca *Duplicate* e ha tutto nel suo spazio.

### 1) Prepara lo spazio

```bash
npm run template          # allinea lo schema, popola di esempio, crea la pagina-guida
# npm run template -- --refresh   # per rigenerare la pagina-guida
```

Il comando è idempotente: riconosce ciò che esiste, non duplica i dati di esempio se già
presenti, e aggiunge alla pagina-genitore una pagina **«🏠 Inizia da qui»** con istruzioni,
indice dei 17 database, checklist delle rifiniture e promemoria privacy.

### 2) Pubblica come template (passo solo-UI)

Nell'app Notion, sulla **pagina-genitore** (quella che contiene i 17 database e la guida):

1. in alto a destra **Share → Publish**;
2. attiva **«Allow duplicate as template»**;
3. condividi il link pubblico: chi lo apre clicca **Duplicate** e copia l'intero ecosistema.

### Perché le relazioni non si rompono ⚠️

Un template Notion è uno **snapshot** (è l'Opzione 2 del §6 del prospetto). Il punto critico:
**duplica sempre la pagina-genitore INTERA**, mai un singolo database. Duplicando il
contenitore con dentro tutti i 17 database, Notion **rimappa le relazioni** ai database
copiati, e così rollup e formule continuano a calcolare. Duplicando un database isolato, le
sue relazioni verso gli altri si spezzerebbero.

### Ramo 1 vs Ramo 2 — quando usare cosa

| | **Ramo 1 — Template** | **Ramo 2 — Infrastructure-as-Code** |
|---|---|---|
| A cosa serve | **condividere** una copia con altri | **mantenere vivo** e aggiornare il tuo |
| Per chi riceve | zero codice, un clic | (è per te) |
| Natura | snapshot congelato | sorgente di verità versionata |
| Aggiornamenti | si ri-pubblica | `push` → la CI allinea |

Non sono alternativi: puoi gestire il **tuo** spazio col Ramo 2 e, quando vuoi, generare un
**template** col Ramo 1 da regalare ai colleghi.

---

## Automazioni vive (Ramo 3)

Sopra l'Infrastructure-as-Code, alcune azioni che il sistema svolge **da solo** —
non solo struttura, ma comportamento. Girano nella GitHub Action
`.github/workflows/automations.yml`: un **cron giornaliero** per i promemoria e
l'**avvio manuale** (Actions → Run workflow) per Annuario e rollover.

| Automazione | Comando | Quando | Cosa fa |
|---|---|---|---|
| **Promemoria** | `npm run automate -- reminders` | cron giornaliero | Scrive/aggiorna la pagina «📌 Promemoria scadenze»: scadute + in arrivo (finestra `GIORNI`, default 7), leggendo le Scadenze non «fatte». |
| **Annuario** | `npm run automate -- annuario 2025/2026` | a mano | (Ri)genera l'Annuario dell'anno (§6): programmazioni, progetti, riunioni di quell'anno + nota di bilancio. |
| **Rollover** | `npm run automate -- rollover 2026/2027 2025/2026` | fine anno, a mano | Crea il nuovo anno e lo imposta «Corrente», marca «archiviata» le programmazioni dell'anno chiuso e ne genera l'Annuario (§6). |

Tutte e tre sono **idempotenti** (le pagine derivate si rigenerano, gli stati si
reimpostano) e restano dentro il paletto privacy: nessun dato sensibile, nessun voto.

### In CI

- **Cron** (`0 6 * * *`): ogni mattina esegue `reminders` → il tuo «📌 Promemoria
  scadenze» è sempre aggiornato quando apri Notion.
- **Run workflow** (manuale): scegli `task` = `annuario` o `rollover` e compila
  `anno` (ed `anno_precedente` per il rollover).

Richiede gli stessi Secret del Ramo 2 (`NOTION_TOKEN`, `NOTION_PARENT_PAGE_ID`).

> Locale: per provarle senza CI, basta `npm run reminders` oppure
> `npm run automate -- annuario 2025/2026`.

---

## Modello statico (import CSV, senza codice)

Per chi vuole partire **senza terminale né token**: `npm run export:static` genera la
cartella `static-template/` (già presente nel repo) con un **CSV per ciascuno dei 17
database** + due guide, e si crea anche `static-template.zip`. In Notion:
**Import → Markdown & CSV → seleziona la cartella (o lo zip)** → ottieni i 17 database con
le colonne e i dati di esempio.

### ⚠️ Il limite onesto

L'import CSV di Notion ricrea **tabelle, colonne e righe**, ma **non** relazioni, rollup e
formule: una colonna che punta a un altro database arriva come **testo**, e i campi
calcolati (`Copertura %`, `Semaforo`, `Ore pianificate`…) non esistono nei CSV. È un limite
della funzione *Import* di Notion, non di questi file.

### Due strade per la piena funzionalità

| | Come | Risultato |
|---|---|---|
| **A — manuale** | Converti a mano le colonne-relazione (testo → *relation*) e ricrea rollup/formule (§13.8). | Resti del tutto senza codice, ma è lungo. |
| **B — import + 1 comando** *(consigliata)* | Importa i CSV **dentro la pagina-genitore**, poi lancia una volta `npm run build`: riconosce i database per titolo e **aggiunge da solo relazioni, rollup e formule**. | Completo in pochi minuti. |

> Se vuoi una copia **già completa e cliccabile** in un solo gesto, l'unica via *lossless*
> è il **template duplicabile** (Ramo 1): Notion preserva tutto solo con *Duplicate*, non
> con un import di file. Il dettaglio è in `static-template/GUIDA-IMPORT.md`.

---

## Tutte le materie umanistiche (biennio e triennio)

Lo schema copre **italiano, geostoria, latino, greco** su **biennio e triennio**, con opzioni
tarate per materia:

- dimensione **`Anno di corso`** (I–V) e **`Ciclo`** (Biennio/Triennio) su Classi, Obiettivi,
  UdA e Programmazione;
- **Materiali** e **Sapere** con tipi per tutte le materie (analisi del testo, traccia,
  carta/atlante, fonte storica, linea del tempo, corrente/movimento, evento storico…);
- **Verifiche** con `Tipologia` allineata alla valutazione liceale (interrogazione, versione,
  analisi del testo Tip. A, testo argomentativo Tip. B, tema Tip. C, prova esperta…).

I dati di esempio (`npm run seed` o l'export statico) includono **quattro UdA-modello**, una
per materia: *Euripide* (Greco, IV) · *Cesare e la sintassi* (Latino, II) · *Leopardi e
l'infinito* (Italiano, V) · *La polis greca* (Geostoria, I). Sorgente unica in
`src/examples/data.ts`, condivisa da seed e CSV.

## Sinergia con le skill di Claude

Il cruscotto conserva i **dati strutturati**; le skill generano i **testi**:
`progettazione-didattica` (domande, tracce, lezioni, UdA, programmazione) e
`burocrazia-scolastica` (verbali, atti). Il dialogo è a doppio senso:

- **Cruscotto → skill:** compili il *brief* ([`docs/brief-template.md`](docs/brief-template.md))
  con materia, classe, anno/ciclo, obiettivi (Bloom), contenuti e verifiche, e lo incolli in
  Claude per attivare la skill, già calibrata sulla classe.
- **skill → cruscotto:** l'output torna come record (lezione → Lezioni; traccia → Materiali
  `traccia` + Verifiche; UdA → UdA…), tracciato dal campo `Origine`.

Vale identico per il **sistema statico** (il brief si compila a mano dai CSV). La mappa
completa e i confini di privacy (PEI/PDP e voti restano fuori) sono in
[`docs/sinergia-skill.md`](docs/sinergia-skill.md).

---

## Cruscotto come sito (local-first, senza Notion)

Nella cartella [`web/`](web/) c'è una **versione sito** del cruscotto, **indipendente da
Notion**: una SPA (Vite + React) che **riusa lo stesso modello** (`src/schema/*`,
`src/examples/data.ts`) ma tiene i dati **nel browser** e calcola da sé relazioni, rollup e
formule. È il "Poetrify" del cruscotto: statica, gratuita su GitHub Pages, pienamente
funzionante.

```bash
cd web
npm install
npm run dev      # sviluppo, su http://localhost:5173
npm run build    # build statico in web/dist
```

- **Dati local-first:** vivono in `localStorage`; **Esporta/Importa JSON** per backup e per
  spostarli tra dispositivi. *Limite onesto:* i dati sono per-dispositivo, niente sync
  automatica — esporta un backup ogni tanto.
- **Funzioni:** «Carica esempio» (le 4 UdA-modello), tabella e form **schema-driven** per
  tutti i 17 database, vista **UdA** (copertura % e ore) e **Sostenibilità oraria** (semaforo
  Monte ore vs ore pianificate) — gli stessi calcoli del modello Notion, qui eseguiti dall'app.
- **Deploy:** la Action `.github/workflows/pages.yml` costruisce `web/` e pubblica su Pages a
  ogni push. **Passo una-tantum tuo:** *Settings → Pages → Source: "GitHub Actions"*. Il sito
  sarà su `https://leocrates99.github.io/notion-cruscotto-docente/`.

> È una strada **parallela**: chi preferisce Notion continua con build/template/CSV; chi vuole
> un sito autonomo usa questo. Stesso modello, due mondi.

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
    blocks.ts         # costruttori di blocchi + helper di pagina (Home, digest, Annuario)
    homepage.ts       # pagina-guida «Inizia da qui» per il template (Ramo 1)
    state.ts          # manifest di idempotenza
  automations/        # Ramo 3: util.ts, reminders.ts, annuario.ts, rollover.ts
  examples/           # sorgente unica esempi: data.ts (4 UdA-modello) + seed.ts (seeder generico)
  staticExport/       # Modello statico: csv.ts
  build.ts migrate.ts template.ts automate.ts exportStatic.ts seedRun.ts verify.ts
config/buildOrder.ts  # ordine topologico di creazione (§13.6)
static-template/      # output importabile: 17 CSV + guide + brief-template (+ .zip)
.github/workflows/
  notion.yml          # CI Ramo 2: plan sui PR, apply sui push
  automations.yml     # CI Ramo 3: cron promemoria + dispatch annuario/rollover
  pages.yml           # CI Sito: build di web/ e deploy su GitHub Pages
web/                  # versione SITO local-first (SPA React, riusa il modello)
  src/store · compute · ui · model
docs/
  prospetto.md        # il documento di progettazione completo
  sinergia-skill.md   # ponte verso le skill (progettazione-didattica, burocrazia-scolastica)
  brief-template.md   # modulo di brief da compilare per le skill
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
