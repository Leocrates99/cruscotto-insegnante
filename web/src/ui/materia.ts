// Codifica cromatica delle materie, nello spirito di Poetrify/Pinakes
// (Latino rosso mattone, Greco indaco; Italiano verde, Geostoria oro/terra).
export const MATERIA_COLORS: Record<string, string> = {
  Latino: "#a22e37",
  Greco: "#1800ac",
  Italiano: "#2f7d5a",
  Geostoria: "#9c6b3c",
};

export function materiaColor(materia?: string): string | undefined {
  return materia ? MATERIA_COLORS[materia] : undefined;
}
