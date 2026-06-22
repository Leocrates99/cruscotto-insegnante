// Catalogo di suggerimenti per la compilazione rapida delle componenti didattiche,
// categorizzato per materia. I menu a tendina con ricerca (SearchSelect) vi attingono.
//
// TODO: POPOLARE dalle Indicazioni Nazionali / normative scolastiche. Per ora pochi
// esempi segnaposto, giusto per dimostrare il meccanismo. Aggiungere qui le voci
// reali per materia (ed eventualmente per ciclo/anno) man mano che si ricavano.

export interface ObiettivoSuggerito {
  enunciato: string;
  tipo?: "conoscenza" | "abilità" | "competenza";
  livello?: string; // livello di Bloom
  ciclo?: "Biennio" | "Triennio";
}

export const obiettiviPerMateria: Record<string, ObiettivoSuggerito[]> = {
  Latino: [
    { enunciato: "Riconoscere le cinque declinazioni e le funzioni dei casi", tipo: "conoscenza", livello: "Ricordare", ciclo: "Biennio" },
    { enunciato: "Tradurre un periodo con subordinate dal latino", tipo: "abilità", livello: "Applicare", ciclo: "Biennio" },
    { enunciato: "Analizzare lo stile e i temi di un autore in prosa", tipo: "abilità", livello: "Analizzare", ciclo: "Triennio" },
  ],
  Greco: [
    { enunciato: "Riconoscere le forme dell'aoristo", tipo: "conoscenza", livello: "Ricordare", ciclo: "Triennio" },
    { enunciato: "Tradurre una rhesis con apparato", tipo: "abilità", livello: "Applicare", ciclo: "Triennio" },
    { enunciato: "Confrontare due rese traduttive di uno stesso passo", tipo: "competenza", livello: "Valutare", ciclo: "Triennio" },
  ],
  Italiano: [
    { enunciato: "Parafrasare e analizzare un testo poetico", tipo: "abilità", livello: "Applicare", ciclo: "Triennio" },
    { enunciato: "Analizzare struttura metrica e retorica di un testo", tipo: "abilità", livello: "Analizzare", ciclo: "Triennio" },
    { enunciato: "Produrre un testo argomentativo (Tipologia B)", tipo: "competenza", livello: "Creare", ciclo: "Triennio" },
  ],
  Geostoria: [
    { enunciato: "Collocare eventi e processi nel tempo e nello spazio", tipo: "conoscenza", livello: "Ricordare", ciclo: "Biennio" },
    { enunciato: "Analizzare una fonte storica e ricavarne informazioni", tipo: "abilità", livello: "Analizzare", ciclo: "Biennio" },
  ],
};
