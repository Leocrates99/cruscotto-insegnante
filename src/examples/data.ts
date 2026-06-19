import type { DbKey } from "../types";

/**
 * Sorgente UNICA dei dati di esempio: una UdA-modello per ciascuna materia
 * umanistica del liceo, su biennio e triennio. Alimenta sia il seed via API
 * (src/examples/seed.ts) sia l'export statico in CSV (src/exportStatic.ts).
 *
 * Convenzioni:
 *  - le colonne-RELAZIONE contengono i TITOLI dei record collegati;
 *  - più valori in una relazione si separano con " | " (REL_SEP);
 *  - i multi-select si separano con ", ".
 */
export const REL_SEP = " | ";
const J = (...xs: string[]) => xs.join(REL_SEP);

const ANNO = "2025/2026";

// ── Titoli riusati nelle relazioni ───────────────────────────────────────────
// Greco · triennio (IV)
const G_OB = [
  "Comprendere la struttura di episodio e stasimo",
  "Tradurre una rhesis con apparato",
  "Analizzare la funzione drammaturgica del coro",
  'Valutare la cosiddetta "modernità" euripidea',
  "Rielaborare un frammento in chiave contemporanea (aggancio a Beckett)",
];
const G_MAT = ["Euripide, Medea — testo greco con traduzione a fronte", "Scheda metrica — il trimetro giambico"];
const G_UDA = "Euripide e la crisi del tragico";
const G_LEZ = [
  "Introduzione a Euripide e al dramma tardo",
  "Traduzione e analisi di una rhesis",
  "La funzione del coro: episodio e stasimo",
];

// Latino · biennio (II)
const L_OB = [
  "Riconoscere l'ablativo assoluto e la perifrastica attiva",
  "Tradurre un periodo narrativo del De bello Gallico",
  "Analizzare la struttura del periodo tra principale e subordinate",
  "Distinguere le proposizioni completive dalle finali",
];
const L_MAT = ["Cesare, De bello Gallico I — passo con traduzione a fronte", "Scheda — l'ablativo assoluto"];
const L_UDA = "Cesare e la sintassi del periodo";
const L_LEZ = ["L'ablativo assoluto: forma e resa in italiano", "Tradurre Cesare: il periodo narrativo"];

// Italiano · triennio (V)
const I_OB = [
  "Comprendere la teoria del piacere e la poetica del vago",
  "Analizzare metrica e retorica de L'infinito",
  "Valutare lo sviluppo del pessimismo leopardiano",
  "Produrre un testo argomentativo sul rapporto uomo-natura",
];
const I_MAT = ["Leopardi, L'infinito — testo e parafrasi", "Zibaldone — estratti sulla teoria del piacere"];
const I_UDA = "Leopardi e la poetica dell'infinito";
const I_LEZ = ["La teoria del piacere: dallo Zibaldone ai Canti", "Lettura e analisi de L'infinito"];

// Geostoria · biennio (I)
const S_OB = [
  "Collocare nel tempo e nello spazio la nascita della polis",
  "Distinguere le forme di governo della polis",
  "Analizzare una fonte sulla democrazia ateniese",
  "Confrontare Atene e Sparta per istituzioni e società",
];
const S_MAT = ["Carta della Grecia delle poleis", "Tucidide — l'elogio funebre di Pericle (estratto)"];
const S_UDA = "La polis greca: nascita e istituzioni";
const S_LEZ = ["Dalla comunità tribale alla polis", "Atene e Sparta: due modelli a confronto"];

const ob = (Enunciato: string, livello: string, tipo: string, materia: string, anno: string, ciclo: string) => ({
  Enunciato,
  Tipo: tipo,
  "Livello cognitivo": livello,
  Materia: materia,
  "Anno di corso": anno,
  Ciclo: ciclo,
});

export const dataset: Partial<Record<DbKey, Array<Record<string, string>>>> = {
  anni: [{ Titolo: ANNO, Corrente: "Yes", Inizio: "2025-09-15", Fine: "2026-06-10" }],

  classi: [
    { Titolo: "I classico", Indirizzo: "Classico", "Anno di corso": "I", Ciclo: "Biennio" },
    { Titolo: "II classico", Indirizzo: "Classico", "Anno di corso": "II", Ciclo: "Biennio" },
    { Titolo: "IV classico", Indirizzo: "Classico", "Anno di corso": "IV", Ciclo: "Triennio" },
    { Titolo: "V classico", Indirizzo: "Classico", "Anno di corso": "V", Ciclo: "Triennio" },
  ],

  obiettivi: [
    ob(G_OB[0], "Comprendere", "abilità", "Greco", "IV", "Triennio"),
    ob(G_OB[1], "Applicare", "abilità", "Greco", "IV", "Triennio"),
    ob(G_OB[2], "Analizzare", "abilità", "Greco", "IV", "Triennio"),
    ob(G_OB[3], "Valutare", "competenza", "Greco", "IV", "Triennio"),
    ob(G_OB[4], "Creare", "competenza", "Greco", "IV", "Triennio"),
    ob(L_OB[0], "Ricordare", "conoscenza", "Latino", "II", "Biennio"),
    ob(L_OB[1], "Applicare", "abilità", "Latino", "II", "Biennio"),
    ob(L_OB[2], "Analizzare", "abilità", "Latino", "II", "Biennio"),
    ob(L_OB[3], "Comprendere", "abilità", "Latino", "II", "Biennio"),
    ob(I_OB[0], "Comprendere", "abilità", "Italiano", "V", "Triennio"),
    ob(I_OB[1], "Analizzare", "abilità", "Italiano", "V", "Triennio"),
    ob(I_OB[2], "Valutare", "competenza", "Italiano", "V", "Triennio"),
    ob(I_OB[3], "Creare", "competenza", "Italiano", "V", "Triennio"),
    ob(S_OB[0], "Ricordare", "conoscenza", "Geostoria", "I", "Biennio"),
    ob(S_OB[1], "Comprendere", "abilità", "Geostoria", "I", "Biennio"),
    ob(S_OB[2], "Analizzare", "abilità", "Geostoria", "I", "Biennio"),
    ob(S_OB[3], "Valutare", "competenza", "Geostoria", "I", "Biennio"),
  ],

  materiali: [
    { Titolo: G_MAT[0], Tipo: "testo", Materia: "Greco", Ciclo: "Triennio", Argomento: "tragedia, rhesis", Difficoltà: "alta", Origine: "libro di testo", "Fonte/autore": "Euripide", Tag: "tragedia, Euripide" },
    { Titolo: G_MAT[1], Tipo: "scheda", Materia: "Greco", Ciclo: "Triennio", Argomento: "metrica, trimetro giambico", Difficoltà: "media", Origine: "manuale", "Fonte/autore": "materiale d'autore", Tag: "metrica" },
    { Titolo: L_MAT[0], Tipo: "testo", Materia: "Latino", Ciclo: "Biennio", Argomento: "sintassi, prosa narrativa", Difficoltà: "media", Origine: "libro di testo", "Fonte/autore": "Cesare", Tag: "Cesare, prosa" },
    { Titolo: L_MAT[1], Tipo: "scheda", Materia: "Latino", Ciclo: "Biennio", Argomento: "ablativo assoluto", Difficoltà: "bassa", Origine: "manuale", Tag: "sintassi" },
    { Titolo: I_MAT[0], Tipo: "testo", Materia: "Italiano", Ciclo: "Triennio", Argomento: "poesia, idillio", Difficoltà: "media", Origine: "libro di testo", "Fonte/autore": "Leopardi", Tag: "Leopardi, poesia" },
    { Titolo: I_MAT[1], Tipo: "antologia", Materia: "Italiano", Ciclo: "Triennio", Argomento: "teoria del piacere", Difficoltà: "alta", Origine: "libro di testo", "Fonte/autore": "Leopardi", Tag: "Leopardi, prosa" },
    { Titolo: S_MAT[0], Tipo: "carta/atlante", Materia: "Geostoria", Ciclo: "Biennio", Argomento: "geografia storica", Difficoltà: "bassa", Origine: "manuale", Tag: "Grecia, poleis" },
    { Titolo: S_MAT[1], Tipo: "fonte storica", Materia: "Geostoria", Ciclo: "Biennio", Argomento: "democrazia ateniese", Difficoltà: "media", Origine: "libro di testo", "Fonte/autore": "Tucidide", Tag: "Atene, fonte" },
  ],

  sapere: [
    { Titolo: "Rubrica di valutazione della traduzione (latino/greco)", Tipo: "rubrica", Materia: "Greco", Ciclo: "Triennio", Tag: "valutazione" },
    { Titolo: "Rubrica di analisi del testo poetico (italiano)", Tipo: "rubrica", Materia: "Italiano", Ciclo: "Triennio", Tag: "valutazione" },
    { Titolo: "Euripide — profilo d'autore", Tipo: "autore", Materia: "Greco", Ciclo: "Triennio" },
    { Titolo: "Il Romanticismo italiano — quadro d'insieme", Tipo: "corrente/movimento", Materia: "Italiano", Ciclo: "Triennio" },
    { Titolo: "La democrazia ateniese — concetto", Tipo: "istituzione/civiltà", Materia: "Geostoria", Ciclo: "Biennio" },
  ],

  programmazione: [
    { Titolo: "Greco — IV classico — 2025/2026", Materia: "Greco", "Anno di corso": "IV", Ciclo: "Triennio", "Monte ore": "99", "Finalità generali": "Competenza traduttiva e interpretativa sulla tragedia attica.", "Strumenti di verifica": "versione, analisi del testo, interrogazione orale", Stato: "in svolgimento", "Anno scolastico": ANNO, Classe: "IV classico", "Moduli/UdA": G_UDA, "Competenze attese": J(...G_OB), "Criteri/griglie di valutazione": "Rubrica di valutazione della traduzione (latino/greco)" },
    { Titolo: "Latino — II classico — 2025/2026", Materia: "Latino", "Anno di corso": "II", Ciclo: "Biennio", "Monte ore": "132", "Finalità generali": "Consolidamento morfosintattico e avvio alla traduzione d'autore.", "Strumenti di verifica": "versione, questionario, prova strutturata", Stato: "in svolgimento", "Anno scolastico": ANNO, Classe: "II classico", "Moduli/UdA": L_UDA, "Competenze attese": J(...L_OB) },
    { Titolo: "Italiano — V classico — 2025/2026", Materia: "Italiano", "Anno di corso": "V", Ciclo: "Triennio", "Monte ore": "132", "Finalità generali": "Interpretazione del testo letterario e produzione argomentativa (Esame di Stato).", "Strumenti di verifica": "analisi del testo, testo argomentativo, interrogazione orale", Stato: "in svolgimento", "Anno scolastico": ANNO, Classe: "V classico", "Moduli/UdA": I_UDA, "Competenze attese": J(...I_OB), "Criteri/griglie di valutazione": "Rubrica di analisi del testo poetico (italiano)" },
    { Titolo: "Geostoria — I classico — 2025/2026", Materia: "Geostoria", "Anno di corso": "I", Ciclo: "Biennio", "Monte ore": "99", "Finalità generali": "Costruzione del metodo storico e geografico; lettura delle fonti.", "Strumenti di verifica": "questionario, mappa concettuale, interrogazione orale", Stato: "in svolgimento", "Anno scolastico": ANNO, Classe: "I classico", "Moduli/UdA": S_UDA, "Competenze attese": J(...S_OB) },
  ],

  uda: [
    { Titolo: G_UDA, "Competenza attesa": "Interpretare un testo tragico cogliendo il nesso tra forma drammatica e contesto storico-culturale.", "Anno di corso": "IV", Ciclo: "Triennio", Stato: "In svolgimento", "Data inizio": "2025-11-03", "Data fine": "2025-11-28", "Anno scolastico": ANNO, Obiettivi: J(...G_OB), Lezioni: J(...G_LEZ) },
    { Titolo: L_UDA, "Competenza attesa": "Tradurre e analizzare un testo in prosa riconoscendone l'architettura sintattica.", "Anno di corso": "II", Ciclo: "Biennio", Stato: "In svolgimento", "Data inizio": "2025-10-06", "Data fine": "2025-10-31", "Anno scolastico": ANNO, Obiettivi: J(...L_OB), Lezioni: J(...L_LEZ) },
    { Titolo: I_UDA, "Competenza attesa": "Interpretare un testo poetico collegandolo al pensiero dell'autore e produrre un testo argomentativo.", "Anno di corso": "V", Ciclo: "Triennio", Stato: "In svolgimento", "Data inizio": "2025-10-13", "Data fine": "2025-11-14", "Anno scolastico": ANNO, Obiettivi: J(...I_OB), Lezioni: J(...I_LEZ) },
    { Titolo: S_UDA, "Competenza attesa": "Ricostruire un processo storico e leggere una fonte collocandola nel contesto.", "Anno di corso": "I", Ciclo: "Biennio", Stato: "In svolgimento", "Data inizio": "2025-11-10", "Data fine": "2025-12-05", "Anno scolastico": ANNO, Obiettivi: J(...S_OB), Lezioni: J(...S_LEZ) },
  ],

  lezioni: [
    { Titolo: G_LEZ[0], Materia: "Greco", "Data prevista": "2025-11-03", "Durata (ore)": "2", Stato: "Svolta", Sequenza: "1", "Anno scolastico": ANNO, Classe: "IV classico", Materiali: G_MAT[0] },
    { Titolo: G_LEZ[1], Materia: "Greco", "Data prevista": "2025-11-12", "Durata (ore)": "2", Stato: "Svolta", Sequenza: "2", "Anno scolastico": ANNO, Classe: "IV classico", Materiali: G_MAT[0] },
    { Titolo: G_LEZ[2], Materia: "Greco", "Data prevista": "2025-11-21", "Durata (ore)": "2", Stato: "Progettata", Sequenza: "3", "Anno scolastico": ANNO, Classe: "IV classico", Materiali: G_MAT[1] },
    { Titolo: L_LEZ[0], Materia: "Latino", "Data prevista": "2025-10-06", "Durata (ore)": "2", Stato: "Svolta", Sequenza: "1", "Anno scolastico": ANNO, Classe: "II classico", Materiali: L_MAT[1] },
    { Titolo: L_LEZ[1], Materia: "Latino", "Data prevista": "2025-10-20", "Durata (ore)": "2", Stato: "Progettata", Sequenza: "2", "Anno scolastico": ANNO, Classe: "II classico", Materiali: L_MAT[0] },
    { Titolo: I_LEZ[0], Materia: "Italiano", "Data prevista": "2025-10-13", "Durata (ore)": "2", Stato: "Svolta", Sequenza: "1", "Anno scolastico": ANNO, Classe: "V classico", Materiali: I_MAT[1] },
    { Titolo: I_LEZ[1], Materia: "Italiano", "Data prevista": "2025-10-27", "Durata (ore)": "2", Stato: "Svolta", Sequenza: "2", "Anno scolastico": ANNO, Classe: "V classico", Materiali: I_MAT[0] },
    { Titolo: S_LEZ[0], Materia: "Geostoria", "Data prevista": "2025-11-10", "Durata (ore)": "2", Stato: "Svolta", Sequenza: "1", "Anno scolastico": ANNO, Classe: "I classico", Materiali: S_MAT[0] },
    { Titolo: S_LEZ[1], Materia: "Geostoria", "Data prevista": "2025-11-24", "Durata (ore)": "2", Stato: "Progettata", Sequenza: "2", "Anno scolastico": ANNO, Classe: "I classico", Materiali: S_MAT[1] },
  ],

  verifiche: [
    { Titolo: "Traduzione guidata a coppie con autocorrezione (rhesis)", Materia: "Greco", Tipo: "formativa", Tipologia: "versione", Modalità: "autocorrezione in coppia", "Esito qualitativo": "Buona resa sintattica; da rinforzare il lessico tragico.", "Anno scolastico": ANNO, UdA: G_UDA, Lezione: G_LEZ[1], "Obiettivi verificati": G_OB[1] },
    { Titolo: "Exit ticket sul ruolo del coro", Materia: "Greco", Tipo: "formativa", Tipologia: "questionario", Modalità: "exit ticket", "Esito qualitativo": "Struttura episodio/stasimo acquisita.", "Anno scolastico": ANNO, UdA: G_UDA, Lezione: G_LEZ[2], "Obiettivi verificati": J(G_OB[0], G_OB[2]) },
    { Titolo: "Versione dal De bello Gallico (guidata)", Materia: "Latino", Tipo: "formativa", Tipologia: "versione", Modalità: "traduzione guidata", "Esito qualitativo": "L'ablativo assoluto è riconosciuto; resta incerta la consecutio.", "Anno scolastico": ANNO, UdA: L_UDA, Lezione: L_LEZ[1], "Obiettivi verificati": J(L_OB[1], L_OB[2]) },
    { Titolo: "Riconoscimento delle subordinate (domanda flash)", Materia: "Latino", Tipo: "formativa", Tipologia: "questionario", Modalità: "domanda flash", "Esito qualitativo": "Completive e finali distinte dalla maggioranza.", "Anno scolastico": ANNO, UdA: L_UDA, Lezione: L_LEZ[0], "Obiettivi verificati": J(L_OB[0], L_OB[3]) },
    { Titolo: "Analisi del testo: L'infinito (Tipologia A)", Materia: "Italiano", Tipo: "sommativa-bozza", Tipologia: "analisi del testo (Tip. A)", Modalità: "commento orale", "Esito qualitativo": "Bozza di traccia; il voto va nel RE.", "Anno scolastico": ANNO, UdA: I_UDA, Lezione: I_LEZ[1], "Obiettivi verificati": I_OB[1] },
    { Titolo: "Interrogazione: il pessimismo leopardiano", Materia: "Italiano", Tipo: "formativa", Tipologia: "interrogazione orale", Modalità: "commento orale", "Esito qualitativo": "Da consolidare la periodizzazione del pessimismo.", "Anno scolastico": ANNO, UdA: I_UDA, Lezione: I_LEZ[0], "Obiettivi verificati": I_OB[0] },
    { Titolo: "Questionario sulle forme di governo", Materia: "Geostoria", Tipo: "formativa", Tipologia: "questionario", Modalità: "domanda flash", "Esito qualitativo": "Monarchia/oligarchia/democrazia distinte.", "Anno scolastico": ANNO, UdA: S_UDA, Lezione: S_LEZ[0], "Obiettivi verificati": S_OB[1] },
    { Titolo: "Mappa concettuale: Atene vs Sparta", Materia: "Geostoria", Tipo: "formativa", Tipologia: "prova semistrutturata", Modalità: "mappa", "Esito qualitativo": "Il confronto istituzionale è chiaro.", "Anno scolastico": ANNO, UdA: S_UDA, Lezione: S_LEZ[1], "Obiettivi verificati": S_OB[3] },
  ],

  idee: [
    { Spunto: "Aggancio Euripide–Beckett: l'attesa e l'assurdo", Tipo: "aggancio", Materia: "Greco", Stato: "grezza", "Ispirata da (Materiali)": G_MAT[0], "Promossa in UdA": G_UDA },
    { Spunto: "Laboratorio: tradurre Cesare a stazioni", Tipo: "attività", Materia: "Latino", Stato: "in sviluppo" },
  ],
};
