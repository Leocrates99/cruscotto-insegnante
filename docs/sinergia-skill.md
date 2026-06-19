# Sinergia con le skill (progettazione-didattica, burocrazia-scolastica)

Il cruscotto non genera prosa: **conserva i dati strutturati**. Le skill di Claude generano
i testi. Questo documento definisce il dialogo a doppio senso, valido sia per il **sistema
vivo** (database Notion) sia per il **sistema statico** (CSV / import).

## La catena dei ruoli

| Strumento | Ruolo | Esempi di output |
|---|---|---|
| **Cruscotto (Notion)** | deposito strutturato e riusabile | UdA, Obiettivi (con Bloom), Materiali, Verifiche, Programmazione |
| **`progettazione-didattica`** | genera *prose didattiche* | domande d'interrogazione, tracce, lezioni, UdA, programmazione annuale |
| **`burocrazia-scolastica`** | genera *atti istituzionali* | verbali del CdC, bozze PEI/PDP, progettazioni formali |
| **Registro Elettronico** | atti ufficiali | voti, assenze, argomenti svolti, scrutini |

Regola di demarcazione (la stessa del §1 del prospetto): **se è preparatorio/riflessivo →
cruscotto; se genera un testo → skill; se è ufficiale o nominativo → RE.** I documenti veri
PEI/PDP e i voti nominativi **non entrano** né in Notion né nei brief (§9, §12).

---

## Senso 1 — Cruscotto → skill (il *brief*)

Si estrae dal cruscotto un **brief**: il contesto strutturato che la skill usa per calibrare
l'output su classe, anno/ciclo e contenuti in uso. Il modulo da compilare è
[`brief-template.md`](brief-template.md).

Cosa pesca il brief dai database:

| Campo del brief | Da dove (cruscotto) |
|---|---|
| Materia · Classe · Anno di corso · Ciclo | UdA / Programmazione / Classi |
| Competenza attesa | UdA |
| Obiettivi (con livello di Bloom) | Obiettivi collegati all'UdA |
| Contenuti / materiali | Materiali collegati alle Lezioni |
| Verifiche già previste | Verifiche collegate (Tipo, Tipologia) |
| Copertura / obiettivi scoperti | rollup `Copertura %` dell'UdA |

Poi, in Claude, si incolla il brief e si chiede alla skill ciò che serve. Esempi:

- **Valutazione (orale/scritto):** «Con la skill *progettazione-didattica*, a partire da
  questo brief, preparami le domande per l'interrogazione orale» / «una traccia di analisi
  del testo (Tipologia A)». La skill è già tarata su italiano/latino/greco/geostoria.
- **Pianificazione:** «…progetta la prossima lezione dell'UdA» / «costruisci un'UdA su…» /
  «imposta la programmazione annuale».
- **Atti (burocrazia):** dal record **Riunioni** (note grezze) → «Con la skill
  *burocrazia-scolastica*, trasforma questi appunti in bozza di verbale del Consiglio di
  Classe».

> Sistema statico: identico, ma il brief lo compili a mano leggendo il foglio/CSV invece di
> filtrarlo in Notion.

---

## Senso 2 — skill → Cruscotto (dove atterra l'output)

L'output della skill si **archivia** nel cruscotto come record strutturato (campi-chiave fra
parentesi):

| Output della skill | Record nel cruscotto | Campi da valorizzare |
|---|---|---|
| Lezione progettata | **Lezioni** | UdA, Classe, Data, Durata, Obiettivi/Fasi, `Origine` testo |
| Domande d'interrogazione | **Materiali** (Tipo `traccia`) + **Verifiche** | Verifiche: `Tipologia` = interrogazione orale; `Origine` = progettazione-didattica |
| Traccia di prova scritta | **Materiali** (Tipo `traccia`) + **Verifiche** | `Tipologia` = analisi del testo / testo argomentativo / versione… |
| UdA completa | **UdA** + **Obiettivi** + **Lezioni** | competenza attesa, anno/ciclo, relazioni |
| Programmazione annuale | **Programmazione** | materia, classe, anno/ciclo, monte ore, competenze |
| Verbale (da Riunioni) | esce verso il canale ufficiale | in Notion resta solo la *bozza/nota grezza* |
| PEI / PDP | **fuori da Notion** | in cruscotto solo *promemoria* di scadenza (§12) |

Il campo **`Origine`** su *Materiali* (manuale / progettazione-didattica / libro di testo /
web) serve proprio a tracciare cosa è stato generato da una skill, così resta riconoscibile.

---

## Il giro completo (un esempio)

1. Nel cruscotto c'è l'UdA **«Leopardi e la poetica dell'infinito»** (Italiano, V, Triennio)
   con i suoi obiettivi e i materiali.
2. Estrai il **brief** (template) e in Claude chiedi a *progettazione-didattica* una **traccia
   di analisi del testo (Tip. A)** su *L'infinito*.
3. Archivi la traccia come **Materiale** (Tipo `traccia`, `Origine` = progettazione-didattica)
   e crei la **Verifica** collegata (`Tipologia` = analisi del testo).
4. Il `rollup` **Copertura %** dell'UdA si aggiorna: l'obiettivo «Analizzare metrica e
   retorica» ora ha una verifica. Il voto, quando ci sarà, va nel **RE**, non qui.
