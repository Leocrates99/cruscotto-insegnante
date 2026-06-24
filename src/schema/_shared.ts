import type { OptionDef } from "../types";

/**
 * Materie di default del docente di lettere classiche, con i nomi formali (allineati
 * al catalogo classi di concorso del sito). Quando il docente compila il profilo, sono
 * le sue materie a guidare i menù; questa lista resta come fallback prima della profilazione.
 */
export const MATERIE: OptionDef[] = [
  { name: "Lingua e letteratura italiana", color: "green" },
  { name: "Lingua e cultura latina", color: "orange" },
  { name: "Lingua e cultura greca", color: "blue" },
  { name: "Storia e geografia (biennio)", color: "brown" },
];

/**
 * Ciclo di vita a stati (§7): la stessa pipeline per Lezioni, UdA e Progetti.
 * IDEA → BOZZA → PROGETTATA → CALENDARIZZATA → IN SVOLGIMENTO → SVOLTA → VALUTATA → ARCHIVIATA
 */
export const STATO_CICLO: OptionDef[] = [
  { name: "Idea", color: "gray" },
  { name: "Bozza", color: "brown" },
  { name: "Progettata", color: "orange" },
  { name: "Calendarizzata", color: "yellow" },
  { name: "In svolgimento", color: "blue" },
  { name: "Svolta", color: "purple" },
  { name: "Valutata", color: "pink" },
  { name: "Archiviata", color: "green" },
];

/** Livelli cognitivi (tassonomia di Bloom rivista, §4.2). */
export const LIVELLI_BLOOM: OptionDef[] = [
  { name: "Ricordare", color: "gray" },
  { name: "Comprendere", color: "brown" },
  { name: "Applicare", color: "yellow" },
  { name: "Analizzare", color: "orange" },
  { name: "Valutare", color: "purple" },
  { name: "Creare", color: "red" },
];

/** Anno di corso (livello del curricolo, I–V), distinto dall'anno scolastico (§6). */
export const ANNI_CORSO: OptionDef[] = [
  { name: "I", color: "blue" },
  { name: "II", color: "blue" },
  { name: "III", color: "green" },
  { name: "IV", color: "green" },
  { name: "V", color: "green" },
];

/** Ciclo del liceo: il biennio e il triennio hanno obiettivi e strumenti diversi. */
export const CICLI: OptionDef[] = [
  { name: "Biennio", color: "yellow" },
  { name: "Triennio", color: "purple" },
];

/** Metodologie didattiche (lezione, laboratorio, UdA). */
export const METODOLOGIE: OptionDef[] = [
  { name: "lezione frontale", color: "gray" },
  { name: "lezione dialogata", color: "blue" },
  { name: "cooperative learning", color: "green" },
  { name: "flipped classroom", color: "purple" },
  { name: "debate", color: "pink" },
  { name: "problem solving", color: "orange" },
  { name: "brainstorming", color: "yellow" },
  { name: "peer tutoring", color: "green" },
  { name: "didattica laboratoriale", color: "orange" },
  { name: "studio guidato", color: "blue" },
  { name: "role playing", color: "pink" },
  { name: "EAS (episodio di apprendimento situato)", color: "purple" },
];

/** Strumenti e spazi della didattica. */
export const STRUMENTI_SPAZI: OptionDef[] = [
  { name: "libro di testo", color: "green" },
  { name: "LIM / monitor", color: "blue" },
  { name: "fotocopie / schede", color: "gray" },
  { name: "dizionario", color: "brown" },
  { name: "dispositivi / BYOD", color: "purple" },
  { name: "laboratorio", color: "orange" },
  { name: "audiovisivi", color: "pink" },
  { name: "mappe / schemi", color: "yellow" },
  { name: "piattaforma e-learning", color: "blue" },
  { name: "biblioteca", color: "brown" },
];

/** Modalità di verifica formativa prevista. */
export const VERIFICA_FORMATIVA: OptionDef[] = [
  { name: "domande flash", color: "yellow" },
  { name: "exit ticket", color: "yellow" },
  { name: "esercitazione", color: "blue" },
  { name: "interrogazione breve", color: "green" },
  { name: "correzione collettiva", color: "green" },
  { name: "prova semistrutturata", color: "orange" },
  { name: "autovalutazione", color: "purple" },
];

/** Nuclei di Educazione civica (L.92/2019): Costituzione, Sviluppo sostenibile, Cittadinanza digitale e temi trasversali. */
export const EDUCAZIONE_CIVICA: OptionDef[] = [
  { name: "Costituzione, diritto e legalità", color: "blue" },
  { name: "Istituzioni dello Stato e Unione Europea", color: "blue" },
  { name: "Diritti umani e pari opportunità", color: "purple" },
  { name: "Agenda 2030 e sviluppo sostenibile", color: "green" },
  { name: "Ambiente, ecologia e territorio", color: "green" },
  { name: "Educazione alla salute e al benessere", color: "pink" },
  { name: "Cittadinanza digitale", color: "orange" },
  { name: "Educazione finanziaria", color: "yellow" },
  { name: "Patrimonio culturale e paesaggio", color: "brown" },
  { name: "Cittadinanza attiva e volontariato", color: "red" },
];
