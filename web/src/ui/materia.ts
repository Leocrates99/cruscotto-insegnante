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

function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Colore di una materia: personalizzato nel profilo → noto → deterministico da palette. */
export function materiaColor(materia?: string): string | undefined {
  if (!materia) return undefined;
  const custom = getProfile().coloriMaterie?.[materia];
  if (custom) return custom;
  if (MATERIA_COLORS[materia]) return MATERIA_COLORS[materia];
  return hashColor(materia);
}
