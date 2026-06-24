// Modelli di valutazione portati dagli strumenti HTML del docente (riferimento migliore).
// Sono SEED iniziali, tutti personalizzabili dall'editor (gli indicatori/descrittori dipendono
// dal PTOF d'istituto). Niente dati nominativi qui: solo la struttura delle griglie.

import { newId } from "../store/store";
import type { Descrittore, Fascia, Griglia, Indicatore, ScalaVoto } from "../store/valutazione";

const liv = (pairs: [number, string][]): Descrittore[] => pairs.map(([punti, etichetta]) => ({ punti, etichetta }));
const indL = (nome: string, descrizione: string, peso: number, descrittori: Descrittore[]): Indicatore => ({ id: newId(), nome, descrizione, tipo: "livelli", descrittori, peso, attivo: true });
const indP = (nome: string, max: number, descrizione?: string): Indicatore => ({ id: newId(), nome, max, tipo: "punti", peso: 1, attivo: true, descrizione });

const scalaCurva = (): ScalaVoto => ({
  preset: "decimi", votoMin: 1, votoMax: 10, sufficienza: 6, sogliaSuff: 60,
  arrotondamento: 0.25, arrotondaModo: "vicino", formula: "bilanciata", votoMinGarantito: 1, quasiSuff: false, tipo: "curva",
});

// ── Tema (scritto) — 5 criteri × 15 livelli (0,5 → 4) ────────────────────────
const TEMA: Indicatore[] = [
  indL("Comprensione della traccia", "Comprensione del senso della traccia ed elaborazione pertinente.", 1, liv([
    [0.5, "Comprensione quasi assente. Il testo tocca solo marginalmente il tema proposto."],
    [0.75, "Comprensione gravemente insufficiente. Risposta quasi del tutto non pertinente."],
    [1, "Comprensione molto limitata. La risposta è solo in minima parte pertinente alla traccia."],
    [1.25, "Comprensione insufficiente. Pertinenza molto parziale con significative lacune."],
    [1.5, "Comprensione superficiale. Il testo affronta il tema in modo marginale e poco approfondito."],
    [1.75, "Comprensione mediocre. Pertinenza parziale con diverse imprecisioni."],
    [2, "Comprensione sufficiente. Elaborato generalmente pertinente ma con alcune lacune."],
    [2.25, "Comprensione più che sufficiente. Pertinenza accettabile con lievi imprecisioni."],
    [2.5, "Discreta comprensione. L'elaborato risponde in modo adeguato alla traccia con qualche imprecisione."],
    [2.75, "Comprensione discreta-buona. Risposta pertinente con minime imprecisioni."],
    [3, "Buona comprensione. La risposta è pertinente e sviluppa adeguatamente le richieste."],
    [3.25, "Comprensione buona-ottima. Pertinenza piena con sviluppo adeguato."],
    [3.5, "Comprensione approfondita. L'elaborato centra pienamente il tema e ne coglie tutte le sfumature."],
    [3.75, "Comprensione ottima. Piena pertinenza con sviluppo articolato."],
    [4, "Eccellente comprensione. Piena padronanza delle richieste con risposte articolate e ricche di spunti."],
  ])),
  indL("Coerenza e coesione", "Organizzazione logica del testo, connettivi e fluidità espositiva.", 1, liv([
    [0.5, "Organizzazione gravemente compromessa, uso quasi nullo dei connettivi, esposizione frammentaria."],
    [0.75, "Organizzazione molto carente, connettivi quasi assenti, esposizione molto confusa."],
    [1, "Testo disorganizzato, uso scorretto dei connettivi, esposizione confusa e poco fluida."],
    [1.25, "Organizzazione insufficiente, connettivi inadeguati, esposizione difficoltosa."],
    [1.5, "Organizzazione approssimativa, connettivi impropri, esposizione discontinua."],
    [1.75, "Organizzazione mediocre, connettivi poco appropriati, esposizione incerta."],
    [2, "Organizzazione sufficientemente logica, uso basilare dei connettivi, esposizione accettabile."],
    [2.25, "Organizzazione più che sufficiente, connettivi essenziali, esposizione scorrevole."],
    [2.5, "Discreta organizzazione, uso generalmente corretto dei connettivi, esposizione abbastanza fluida."],
    [2.75, "Organizzazione discreta-buona, connettivi appropriati, esposizione fluida."],
    [3, "Buona organizzazione logica, connettivi utilizzati in modo appropriato, esposizione fluida."],
    [3.25, "Organizzazione buona-ottima, connettivi vari e corretti, esposizione scorrevole."],
    [3.5, "Organizzazione molto chiara, uso efficace e vario dei connettivi, esposizione scorrevole."],
    [3.75, "Organizzazione ottima, connettivi precisi e vari, esposizione molto fluida."],
    [4, "Eccellente organizzazione, connettivi precisi e sapientemente utilizzati, esposizione impeccabilmente fluida."],
  ])),
  indL("Argomentazione", "Ragionamento chiaro e convincente, supportato da esempi e riferimenti.", 1, liv([
    [0.5, "Argomentazione gravemente carente, esempi irrilevanti o assenti."],
    [0.75, "Argomentazione quasi nulla, esempi del tutto inadeguati."],
    [1, "Argomentazione debole, esempi scarsi e poco pertinenti, ragionamento confuso."],
    [1.25, "Argomentazione insufficiente, esempi inadeguati, ragionamento incerto."],
    [1.5, "Argomentazione superficiale, esempi limitati e generici, ragionamento poco convincente."],
    [1.75, "Argomentazione mediocre, esempi generici, ragionamento debole."],
    [2, "Argomentazione sufficiente, alcuni esempi basilari e riferimenti semplici."],
    [2.25, "Argomentazione più che sufficiente, esempi accettabili, ragionamento lineare."],
    [2.5, "Discreta argomentazione, esempi pertinenti e riferimenti adeguati."],
    [2.75, "Argomentazione discreta-buona, esempi appropriati, ragionamento chiaro."],
    [3, "Buona argomentazione, esempi significativi e riferimenti appropriati in chiave impersonale."],
    [3.25, "Argomentazione buona-ottima, esempi efficaci, ragionamento convincente."],
    [3.5, "Argomentazione convincente ed efficace, esempi puntuali e riferimenti ben integrati."],
    [3.75, "Argomentazione ottima, esempi calzanti, riferimenti ricchi e ben strutturati."],
    [4, "Eccellente argomentazione, esempi particolarmente pertinenti, riferimenti ricchi e ben articolati."],
  ])),
  indL("Linguaggio e stile", "Sintassi, correttezza grammaticale e ortografica, lessico, stile.", 1, liv([
    [0.5, "Numerosi errori, sintassi molto problematica, lessico estremamente limitato."],
    [0.75, "Errori gravi e diffusi, sintassi compromessa, lessico molto povero."],
    [1, "Diversi errori significativi, sintassi approssimativa, lessico impreciso e ripetitivo."],
    [1.25, "Errori frequenti, sintassi incerta, lessico limitato."],
    [1.5, "Alcuni errori rilevanti, sintassi poco articolata, lessico generico e poco vario."],
    [1.75, "Errori non trascurabili, sintassi semplice, lessico comune."],
    [2, "Sintassi sufficientemente corretta, pochi errori grammaticali e ortografici, lessico basilare."],
    [2.25, "Sintassi accettabile, errori sporadici, lessico essenziale ma corretto."],
    [2.5, "Discreta precisione sintattica, rari errori, lessico adeguato e stile abbastanza efficace."],
    [2.75, "Sintassi corretta, errori minimi, lessico appropriato."],
    [3, "Buona precisione sintattica, assenza di errori significativi, lessico appropriato, stile chiaro."],
    [3.25, "Sintassi curata, nessun errore rilevante, lessico vario, stile efficace."],
    [3.5, "Sintassi articolata e varia, assenza di errori, lessico ricco e accurato, stile espressivo."],
    [3.75, "Sintassi ottima, lessico ricercato, stile personale ed efficace."],
    [4, "Eccellente precisione sintattica, assenza totale di errori, lessico ricercato e preciso, stile efficace."],
  ])),
  indL("Approfondimento", "Pensiero critico personale oltre la semplice esposizione.", 1, liv([
    [0.5, "Approfondimento quasi assente, conoscenze gravemente lacunose e nessuna rielaborazione."],
    [0.75, "Approfondimento nullo, conoscenze molto carenti, pensiero critico assente."],
    [1, "Approfondimento minimo, conoscenze frammentarie e imprecise, pensiero critico assente."],
    [1.25, "Approfondimento insufficiente, conoscenze lacunose, rielaborazione assente."],
    [1.5, "Approfondimento limitato, conoscenze generiche e poco rielaborate."],
    [1.75, "Approfondimento mediocre, conoscenze superficiali, rielaborazione minima."],
    [2, "Approfondimento sufficiente, conoscenze basilari e qualche tentativo di rielaborazione."],
    [2.25, "Approfondimento più che sufficiente, conoscenze essenziali, rielaborazione accennata."],
    [2.5, "Discreto approfondimento, conoscenze adeguate e accettabile rielaborazione personale."],
    [2.75, "Approfondimento discreto-buono, conoscenze appropriate, rielaborazione presente."],
    [3, "Buon approfondimento, conoscenze solide e rielaborazione personale dei concetti."],
    [3.25, "Approfondimento buono-ottimo, conoscenze ampie, pensiero critico evidente."],
    [3.5, "Approfondimento significativo, conoscenze ampie e sicure, pensiero critico sviluppato."],
    [3.75, "Approfondimento ottimo, padronanza dell'argomento, pensiero critico maturo."],
    [4, "Eccellente approfondimento, padronanza completa dell'argomento, pensiero critico personale maturo e originale."],
  ])),
];

// ── Storia biennio (scritto) — 5 criteri × 15 livelli ────────────────────────
const STORIA: Indicatore[] = [
  indL("Pertinenza della risposta", "Comprendere la domanda e rispondere in modo centrato.", 1, liv([
    [0.5, "Risposta del tutto fuori tema. Non viene affrontato in alcun modo il quesito proposto."],
    [0.75, "Risposta gravemente non pertinente. Solo un accenno marginale al tema richiesto."],
    [1, "Risposta molto parziale. Solo una minima parte affronta il quesito, con ampie divagazioni."],
    [1.25, "Risposta insufficiente. Pertinenza molto limitata con significative deviazioni dal tema."],
    [1.5, "Risposta poco centrata. Il quesito viene affrontato in modo marginale e superficiale."],
    [1.75, "Risposta mediocre. Pertinenza parziale con diverse imprecisioni nella messa a fuoco."],
    [2, "Risposta sufficientemente pertinente. Il quesito è compreso nelle linee essenziali, con qualche divagazione."],
    [2.25, "Risposta più che sufficiente. Pertinenza accettabile con lievi imprecisioni nella focalizzazione."],
    [2.5, "Risposta discretamente pertinente. Il quesito è affrontato in modo adeguato con qualche imprecisione."],
    [2.75, "Pertinenza discreta-buona. Risposta centrata con minime imprecisioni."],
    [3, "Risposta pertinente e ben focalizzata. Il quesito è compreso e affrontato adeguatamente."],
    [3.25, "Risposta pienamente pertinente con sviluppo adeguato di tutti gli aspetti richiesti."],
    [3.5, "Risposta molto pertinente. Il quesito è colto in tutte le sue sfumature e sviluppato con precisione."],
    [3.75, "Risposta ottimamente centrata. Piena pertinenza con sviluppo articolato e completo."],
    [4, "Risposta eccellente per pertinenza. Piena padronanza del quesito con sviluppo esauriente e puntuale."],
  ])),
  indL("Conoscenza dei contenuti storici", "Fatti, eventi, personaggi, date e processi storici.", 1.2, liv([
    [0.5, "Conoscenze pressoché assenti. Nessun dato storico corretto o rilevante."],
    [0.75, "Conoscenze gravemente lacunose. Solo frammenti isolati e per lo più errati."],
    [1, "Conoscenze molto carenti. Pochi dati storici, in gran parte imprecisi o confusi."],
    [1.25, "Conoscenze insufficienti. Informazioni frammentarie con errori significativi."],
    [1.5, "Conoscenze superficiali. Alcuni dati corretti ma generici, con lacune evidenti."],
    [1.75, "Conoscenze mediocri. Informazioni basilari presenti ma incomplete e talora imprecise."],
    [2, "Conoscenze sufficienti. I fatti essenziali sono noti, pur con qualche imprecisione o lacuna non grave."],
    [2.25, "Conoscenze più che sufficienti. Dati storici essenziali corretti con lievi lacune."],
    [2.5, "Conoscenze discrete. Informazioni corrette e abbastanza complete, con qualche imprecisione."],
    [2.75, "Conoscenze discrete-buone. Informazioni corrette, complete e generalmente precise."],
    [3, "Buone conoscenze. Fatti, date e processi storici esposti con correttezza e completezza."],
    [3.25, "Conoscenze buone-ottime. Informazioni storiche ampie, corrette e ben articolate."],
    [3.5, "Conoscenze approfondite. Padronanza sicura di fatti, processi e contesti storici."],
    [3.75, "Conoscenze ottime. Padronanza completa con riferimenti precisi e dettagliati."],
    [4, "Conoscenze eccellenti. Padronanza esauriente e sicura con ricchezza di riferimenti storici precisi."],
  ])),
  indL("Organizzazione e coerenza espositiva", "Struttura logica, ordinata e coerente, con connettivi.", 0.8, liv([
    [0.5, "Esposizione gravemente disorganizzata, priva di qualsiasi struttura logica."],
    [0.75, "Esposizione molto confusa, quasi priva di ordine e coerenza interna."],
    [1, "Esposizione disordinata e frammentaria, senza un filo logico riconoscibile."],
    [1.25, "Esposizione insufficiente nell'organizzazione, con frequenti salti logici."],
    [1.5, "Esposizione poco ordinata, con passaggi logici deboli e struttura approssimativa."],
    [1.75, "Esposizione mediocre, con qualche tentativo di organizzazione ma risultato incerto."],
    [2, "Esposizione sufficientemente organizzata. La risposta segue un ordine basilare, pur con qualche incertezza."],
    [2.25, "Esposizione più che sufficiente. Ordine accettabile con uso essenziale dei connettivi."],
    [2.5, "Esposizione discretamente organizzata. Struttura chiara con qualche passaggio migliorabile."],
    [2.75, "Esposizione discreta-buona. Struttura coerente con connettivi generalmente appropriati."],
    [3, "Esposizione ben organizzata. Struttura chiara, connettivi appropriati, buona coerenza interna."],
    [3.25, "Esposizione efficace. Struttura solida con connettivi vari e passaggi logici fluidi."],
    [3.5, "Esposizione molto ben strutturata. Ordine logico rigoroso e uso efficace dei connettivi."],
    [3.75, "Esposizione ottima. Struttura impeccabile con passaggi logici precisi e fluidi."],
    [4, "Esposizione eccellente. Struttura rigorosa, connettivi precisi, perfetta coerenza interna."],
  ])),
  indL("Lessico storico specifico", "Terminologia storica e correttezza formale.", 1, liv([
    [0.5, "Linguaggio del tutto inadeguato, assenza di terminologia storica, gravi errori formali."],
    [0.75, "Linguaggio molto povero, terminologia storica assente, numerosi errori."],
    [1, "Linguaggio generico e impreciso, terminologia storica quasi assente, diversi errori formali."],
    [1.25, "Linguaggio insufficiente, uso scorretto o assente del lessico storico, errori frequenti."],
    [1.5, "Linguaggio poco specifico, terminologia storica sporadica e talora impropria."],
    [1.75, "Linguaggio comune con rari tentativi di uso del lessico disciplinare, alcuni errori."],
    [2, "Linguaggio sufficientemente corretto, uso basilare della terminologia storica essenziale."],
    [2.25, "Linguaggio accettabile, uso essenziale del lessico storico con qualche imprecisione."],
    [2.5, "Linguaggio discreto, terminologia storica generalmente appropriata, pochi errori."],
    [2.75, "Linguaggio appropriato con uso corretto del lessico storico, errori minimi."],
    [3, "Buon uso del linguaggio storico specifico. Terminologia appropriata, esposizione formalmente corretta."],
    [3.25, "Linguaggio preciso e curato. Terminologia storica varia e corretta."],
    [3.5, "Linguaggio ricco e accurato. Terminologia storica padroneggiata con sicurezza."],
    [3.75, "Linguaggio ottimo. Lessico storico ricercato e puntuale, forma impeccabile."],
    [4, "Linguaggio eccellente. Piena padronanza del lessico storico disciplinare, forma impeccabile."],
  ])),
  indL("Capacità di ragionamento storico", "Nessi causali, confronti, contestualizzazione, rielaborazione.", 1, liv([
    [0.5, "Nessun tentativo di ragionamento storico. Assenza totale di nessi e contestualizzazione."],
    [0.75, "Ragionamento storico quasi assente. Nessun nesso causale individuato."],
    [1, "Ragionamento storico molto debole. Nessi causali assenti o errati, nessuna contestualizzazione."],
    [1.25, "Ragionamento storico insufficiente. Nessi causali confusi, contestualizzazione assente."],
    [1.5, "Ragionamento storico superficiale. Qualche nesso causale accennato ma non sviluppato."],
    [1.75, "Ragionamento storico mediocre. Nessi causali generici e contestualizzazione debole."],
    [2, "Ragionamento storico sufficiente. Individua i nessi causali essenziali, anche se in modo semplice."],
    [2.25, "Ragionamento più che sufficiente. Nessi causali basilari individuati con qualche contestualizzazione."],
    [2.5, "Ragionamento storico discreto. Nessi causali adeguati, qualche tentativo di contestualizzazione."],
    [2.75, "Ragionamento discreto-buono. Nessi causali corretti, contestualizzazione presente."],
    [3, "Buon ragionamento storico. Individua correttamente cause ed effetti, opera contestualizzazioni adeguate."],
    [3.25, "Ragionamento storico articolato. Nessi causali chiari, confronti e contestualizzazioni efficaci."],
    [3.5, "Ragionamento storico approfondito. Nessi causali complessi, confronti pertinenti, visione d'insieme."],
    [3.75, "Ragionamento storico maturo. Analisi causale complessa, contestualizzazione ampia e precisa."],
    [4, "Ragionamento storico eccellente. Analisi causale rigorosa, confronti originali, piena contestualizzazione."],
  ])),
];

// ── Condotta (scrutinio) — 7 componenti a punti, scala a fasce su /60 ─────────
const CONDOTTA_FASCE: Fascia[] = [
  { min: 55, max: 60, voto: 10, giudizio: "Esemplare", colore: "#059669" },
  { min: 48, max: 54, voto: 9, giudizio: "Ottimo", colore: "#0d9488" },
  { min: 41, max: 47, voto: 8, giudizio: "Buono", colore: "#2563eb" },
  { min: 34, max: 40, voto: 7, giudizio: "Discreto", colore: "#7c3aed" },
  { min: 25, max: 33, voto: 6, giudizio: "Sufficiente", colore: "#d97706" },
  { min: 0, max: 24, voto: 5, giudizio: "Non sufficiente", colore: "#dc2626" },
];
const CONDOTTA: Indicatore[] = [
  indP("Partecipazione", 6, "Coinvolgimento alle lezioni e alle iniziative della scuola."),
  indP("Impegno", 6, "Autonomia, puntualità, precisione e regolarità nei compiti."),
  indP("Collaborazione", 6, "Contributo e disponibilità verso il gruppo classe."),
  indP("Dialogo educativo", 12, "Interesse e coinvolgimento nel dialogo educativo."),
  indP("Frequenza", 12, "Regolarità della frequenza (assenze, ritardi, uscite)."),
  indP("Relazioni", 12, "Correttezza con compagni, docenti, personale; rispetto di ambienti e materiali."),
  indP("Regole", 6, "Osservanza delle regole e del Regolamento d'Istituto."),
];

// ── Orale — modello generico (livelli) ───────────────────────────────────────
const ORALE: Indicatore[] = [
  indL("Conoscenze", "Padronanza dei contenuti.", 1, liv([[0, "Insufficiente"], [1, "Sufficiente"], [2, "Buono"], [3, "Ottimo"]])),
  indL("Esposizione", "Chiarezza e proprietà espressiva.", 1, liv([[0, "Insufficiente"], [1, "Sufficiente"], [2, "Buono"], [3, "Ottimo"]])),
  indL("Rielaborazione e collegamenti", "Capacità critica e di collegamento.", 1, liv([[0, "Insufficiente"], [1, "Sufficiente"], [2, "Buono"], [3, "Ottimo"]])),
];

/** Seed iniziale: griglie pronte (da personalizzare). */
export function seedGriglie(): Griglia[] {
  return [
    { id: newId(), nome: "Verifica a esercizi", categoria: "esercizi", scala: scalaCurva(), indicatori: [indP("Esercizio 1", 5), indP("Esercizio 2", 5), indP("Esercizio 3", 5)] },
    { id: newId(), nome: "Tema / risposta aperta", categoria: "scritto", scala: scalaCurva(), indicatori: TEMA },
    { id: newId(), nome: "Storia — biennio", categoria: "scritto", scala: scalaCurva(), indicatori: STORIA },
    { id: newId(), nome: "Interrogazione orale", categoria: "orale", scala: scalaCurva(), indicatori: ORALE },
    {
      id: newId(), nome: "Condotta (scrutinio)", categoria: "condotta", indicatori: CONDOTTA,
      scala: { preset: "decimi", votoMin: 5, votoMax: 10, sufficienza: 6, sogliaSuff: 60, arrotondamento: 1, arrotondaModo: "vicino", formula: "bilanciata", votoMinGarantito: 5, quasiSuff: false, tipo: "fasce", fasce: CONDOTTA_FASCE },
    },
  ];
}
