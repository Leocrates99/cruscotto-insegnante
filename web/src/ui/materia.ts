// Codifica cromatica delle materie, nello spirito di Poetrify/Pinakes
// (Latino rosso mattone, Greco indaco; Italiano verde, Geostoria oro/terra).
import { getProfile } from "../store/profile";

export const MATERIA_COLORS: Record<string, string> = {
  "Lingua e cultura latina": "#a22e37",
  "Lingua e cultura greca": "#1800ac",
  "Lingua e letteratura italiana": "#2f7d5a",
  "Storia e geografia (biennio)": "#9c6b3c",
  "Storia (triennio)": "#9c6b3c",
  Filosofia: "#7c3aed",
};

// Palette di riserva per le materie non mappate (profili diversi dalle lettere classiche).
const PALETTE = ["#1800ac", "#a22e37", "#2f7d5a", "#9c6b3c", "#7c3aed", "#0e7490", "#b45309", "#be185d", "#4d7c0f", "#475569"];

// Palette delle CLASSI: tinte volutamente diverse da quelle delle materie, così
// classe e materia si distinguono a colpo d'occhio quando compaiono insieme.
const PALETTE_CLASSI = ["#0d9488", "#c026d3", "#ea580c", "#2563eb", "#65a30d", "#db2777", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626"];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

/** Colore di una materia: personalizzato nel profilo → noto → deterministico da palette. */
export function materiaColor(materia?: string): string | undefined {
  if (!materia) return undefined;
  const custom = getProfile().coloriMaterie?.[materia];
  if (custom) return custom;
  if (MATERIA_COLORS[materia]) return MATERIA_COLORS[materia];
  return PALETTE[hashIndex(materia, PALETTE.length)];
}

/** Colore di una classe: personalizzato nel profilo → deterministico da palette dedicata. */
export function classeColor(classe?: string): string | undefined {
  if (!classe) return undefined;
  const custom = getProfile().coloriClassi?.[classe];
  if (custom) return custom;
  return PALETTE_CLASSI[hashIndex(classe, PALETTE_CLASSI.length)];
}

// Sigle/trigrammi delle materie (per i pulsanti di Pianifica). Le note esplicite;
// le altre derivate dalle iniziali delle parole significative.
const MATERIA_SIGLE: Record<string, string> = {
  "Lingua e letteratura italiana": "ITA",
  "Lingua e cultura latina": "LAT",
  "Lingua e cultura greca": "GRC",
  "Storia e geografia (biennio)": "STOGEO",
  "Storia (triennio)": "STO",
  Storia: "STO",
  Geografia: "GEO",
  Filosofia: "FIL",
  Matematica: "MATE",
  Fisica: "FIS",
  "Scienze naturali": "SCN",
  "Storia dell'arte": "ARTE",
  "Lingua e cultura straniera": "LING",
  "Lingua e cultura straniera (Inglese)": "ING",
  "Scienze motorie e sportive": "SCM",
  "Religione cattolica o attività alternative": "REL",
};
const STOP = new Set(["e", "di", "del", "della", "dei", "delle", "la", "il", "lo", "le", "o", "ed", "cultura", "lingua"]);
export function materiaSigla(nome: string): string {
  if (MATERIA_SIGLE[nome]) return MATERIA_SIGLE[nome];
  const parole = nome.replace(/\(.*?\)/g, "").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w.toLowerCase()));
  if (parole.length >= 2) return (parole[0].slice(0, 3) + parole[1].slice(0, 3)).toUpperCase();
  return (parole[0] ?? nome).slice(0, 4).toUpperCase();
}
