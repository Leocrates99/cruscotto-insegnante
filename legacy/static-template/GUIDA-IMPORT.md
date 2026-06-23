# Guida all'import

## Come importare

1. In Notion: **Settings → Import** (oppure **Import** dal menu della sidebar).
2. Scegli **Markdown & CSV**.
3. Seleziona **tutta la cartella** `static-template` (o il file `static-template.zip`).
4. Notion crea una pagina con dentro i 17 database (uno per CSV) e i dati di esempio.

La **prima colonna** di ogni CSV diventa il titolo del database.

## Cosa NON sopravvive all'import (e perché)

L'import CSV di Notion ricrea **tabelle, colonne e righe**, ma **non**:

- **Relazioni** → le colonne come *Anno scolastico*, *UdA*, *Obiettivi*, *Materiali*…
  arrivano come **testo** (i titoli dei record collegati), non come vere relazioni.
- **Rollup** → *Ore pianificate*, *Ore UdA totali*, *Obiettivi totali/verificati*: assenti.
- **Formule** → *Copertura %*, *Scostamento*, *Semaforo*, *Verificato*: assenti.

È un limite della funzione *Import* di Notion, non di questi file: relazioni e campi
calcolati non sono rappresentabili in un CSV.

## Due strade per renderlo PIENAMENTE funzionante

### A) Riconnessione manuale (senza codice)
Per ogni colonna-relazione (le trovi elencate sotto), in Notion cambia il **tipo** della
proprietà da *Testo* a *Relation* scegliendo il database giusto, poi riassegna i valori.
Infine ricrea i rollup e le formule come descritto nel `README` del progetto (sezioni §13.8).
È fattibile ma lungo: ha senso solo se vuoi restare del tutto fuori dal codice.

### B) Import + un comando (consigliata)
1. Importa questi CSV **dentro la pagina-genitore** del progetto, in modo che i 17 database
   risultino **figli diretti** di quella pagina (se Notion li annida in una sotto-pagina
   "import", spostali nella pagina-genitore).
2. **Non rinominare** i database: i loro titoli devono restare identici ai nomi dei file
   (è così che vengono riconosciuti).
3. Lancia una volta **`npm run build`**: riconosce i database già importati (per titolo)
   e **aggiunge da solo relazioni, rollup e formule**. In pochi minuti il modello è completo
   e identico a quello costruito via codice. (Le colonne-relazione testuali restano: puoi
   ripopolarle come vere relazioni, oppure cancellarle perché `build` crea quelle giuste.)

> Se invece vuoi una copia **già completa e cliccabile** senza toccare nulla, usa il
> **template duplicabile** (Ramo 1 del README): è l'unico modo in cui Notion preserva
> tutto (relazioni e calcoli) in una sola azione — ma è un *Duplicate*, non un file.

## Colonne-relazione da riconvertire (testo → relation)

- **Programmazione annuale**: `Anno scolastico` → Anni scolastici; `Classe` → Classi; `Competenze attese` → Obiettivi; `Moduli/UdA` → UdA; `Criteri/griglie di valutazione` → Sapere
- **UdA**: `Anno scolastico` → Anni scolastici; `Obiettivi` → Obiettivi; `Lezioni` → Lezioni
- **Lezioni**: `Anno scolastico` → Anni scolastici; `Classe` → Classi; `Materiali` → Materiali
- **Verifiche**: `Anno scolastico` → Anni scolastici; `UdA` → UdA; `Lezione` → Lezioni; `Obiettivi verificati` → Obiettivi
- **Osservazioni**: `Anno scolastico` → Anni scolastici; `Classe` → Classi
- **Idee**: `Ispirata da (Materiali)` → Materiali; `Ispirata da (Sapere)` → Sapere; `Promossa in UdA` → UdA; `Promossa in Lezione` → Lezioni
- **Progetti**: `Anno scolastico` → Anni scolastici; `Task` → Task
- **Scadenze**: `Anno scolastico` → Anni scolastici; `Programmazione` → Programmazione annuale; `Progetto` → Progetti; `Classe` → Classi; `UdA` → UdA
- **Riunioni**: `Anno scolastico` → Anni scolastici
