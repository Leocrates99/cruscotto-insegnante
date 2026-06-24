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
