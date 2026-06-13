import type { DbKey } from "../types";

// Titoli dell'esempio "Euripide" (§4.4), riusati come testo nelle colonne-relazione.
const ANNO = "2025/2026";
const CLASSE = "IV classico";
const OB_C = "Comprendere la struttura di episodio e stasimo";
const OB_A = "Tradurre una rhesis con apparato";
const OB_AN = "Analizzare la funzione drammaturgica del coro";
const OB_V = 'Valutare la cosiddetta "modernità" euripidea';
const OB_CR = "Rielaborare un frammento in chiave contemporanea (aggancio a Beckett)";
const MAT_TESTO = "Euripide, Medea — testo greco con traduzione a fronte";
const MAT_SCHEDA = "Scheda metrica — il trimetro giambico";
const UDA = "Euripide e la crisi del tragico";
const LEZ1 = "Introduzione a Euripide e al dramma tardo";
const LEZ2 = "Traduzione e analisi di una rhesis";
const LEZ3 = "La funzione del coro: episodio e stasimo";
const TUTTI_OB = [OB_C, OB_A, OB_AN, OB_V, OB_CR].join(", ");

/**
 * Dati di esempio per l'export statico (le stesse pagine del seed, in forma piatta).
 * Le colonne-relazione contengono i TITOLI dei record collegati come testo: dopo
 * l'import vanno riconvertite in vere relazioni (vedi GUIDA-IMPORT.md).
 */
export const dataset: Partial<Record<DbKey, Array<Record<string, string>>>> = {
  anni: [{ Titolo: ANNO, Corrente: "Yes", Inizio: "2025-09-15", Fine: "2026-06-10" }],

  classi: [{ Titolo: CLASSE, Indirizzo: "Classico" }],

  obiettivi: [
    { Enunciato: OB_C, Tipo: "abilità", "Livello cognitivo": "Comprendere", Materia: "Greco", "Classe/anno di corso": CLASSE },
    { Enunciato: OB_A, Tipo: "abilità", "Livello cognitivo": "Applicare", Materia: "Greco", "Classe/anno di corso": CLASSE },
    { Enunciato: OB_AN, Tipo: "abilità", "Livello cognitivo": "Analizzare", Materia: "Greco", "Classe/anno di corso": CLASSE },
    { Enunciato: OB_V, Tipo: "competenza", "Livello cognitivo": "Valutare", Materia: "Greco", "Classe/anno di corso": CLASSE },
    { Enunciato: OB_CR, Tipo: "competenza", "Livello cognitivo": "Creare", Materia: "Greco", "Classe/anno di corso": CLASSE },
  ],

  materiali: [
    {
      Titolo: MAT_TESTO,
      Tipo: "testo",
      Materia: "Greco",
      Argomento: "tragedia, trimetro giambico, rhesis",
      Difficoltà: "alta",
      "Fonte/autore": "Euripide",
      Tag: "tragedia, Euripide, IV classico",
      "Link al file": "https://drive.google.com/",
    },
    {
      Titolo: MAT_SCHEDA,
      Tipo: "scheda",
      Materia: "Greco",
      Argomento: "metrica, trimetro giambico",
      Difficoltà: "media",
      "Fonte/autore": "materiale d'autore",
      Tag: "metrica, tragedia",
    },
  ],

  programmazione: [
    {
      Titolo: "Greco — IV classico — 2025/2026",
      Materia: "Greco",
      "Monte ore": "99",
      "Finalità generali":
        "Sviluppare la competenza traduttiva e interpretativa sui testi della tragedia attica.",
      "Strumenti di verifica": "traduzione, analisi del testo, interrogazione orale",
      Stato: "in svolgimento",
      "Anno scolastico": ANNO,
      Classe: CLASSE,
      "Competenze attese": TUTTI_OB,
      "Moduli/UdA": UDA,
    },
  ],

  uda: [
    {
      Titolo: UDA,
      "Competenza attesa":
        "Interpretare un testo tragico cogliendo il nesso tra forma drammatica e contesto storico-culturale.",
      Stato: "In svolgimento",
      "Data inizio": "2025-11-03",
      "Data fine": "2025-11-28",
      "Anno scolastico": ANNO,
      Obiettivi: TUTTI_OB,
      Lezioni: [LEZ1, LEZ2, LEZ3].join(", "),
    },
  ],

  lezioni: [
    { Titolo: LEZ1, Materia: "Greco", "Data prevista": "2025-11-03", "Durata (ore)": "2", Stato: "Svolta", Sequenza: "1", "Anno scolastico": ANNO, Classe: CLASSE, Materiali: MAT_TESTO },
    { Titolo: LEZ2, Materia: "Greco", "Data prevista": "2025-11-12", "Durata (ore)": "2", Stato: "Svolta", Sequenza: "2", "Anno scolastico": ANNO, Classe: CLASSE, Materiali: MAT_TESTO },
    { Titolo: LEZ3, Materia: "Greco", "Data prevista": "2025-11-21", "Durata (ore)": "2", Stato: "Progettata", Sequenza: "3", "Anno scolastico": ANNO, Classe: CLASSE, Materiali: MAT_SCHEDA },
  ],

  verifiche: [
    { Titolo: "Traduzione guidata a coppie con autocorrezione (rhesis)", Tipo: "formativa", Modalità: "autocorrezione in coppia", "Esito qualitativo": "Buona resa sintattica; da rinforzare il lessico tragico.", "Anno scolastico": ANNO, UdA: UDA, Lezione: LEZ2, "Obiettivi verificati": OB_A },
    { Titolo: "Mappa dei personaggi e delle relazioni drammatiche", Tipo: "formativa", Modalità: "mappa", "Esito qualitativo": "La classe coglie le opposizioni; meno chiara la funzione del coro.", "Anno scolastico": ANNO, UdA: UDA, Lezione: LEZ3, "Obiettivi verificati": OB_AN },
    { Titolo: "Exit ticket di tre domande sul ruolo del coro", Tipo: "formativa", Modalità: "exit ticket", "Esito qualitativo": "Comprensione della struttura episodio/stasimo acquisita.", "Anno scolastico": ANNO, UdA: UDA, Lezione: LEZ3, "Obiettivi verificati": OB_C },
  ],
};
