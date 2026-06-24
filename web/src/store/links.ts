// Collegamenti automatici tra i record e le entità di riferimento (classi, anni).
// Pattern find-or-create: riusa il record esistente (per Titolo) o lo crea.
import { newId, records, upsert } from "./store";
import { annoCorrente } from "./valutazione";

/** id del record "classi" con quel titolo (lo crea se non esiste). */
export function classeId(label: string): string {
  const ex = records("classi").find((r) => r["Titolo"] === label);
  if (ex) return ex.id;
  const id = newId();
  upsert("classi", { id, Titolo: label });
  return id;
}

/** Anno solare d'avvio dell'a.s. corrente (settembre = nuovo anno). */
function annoAvvio(d = new Date()): number {
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

/** id del record "anni" per l'a.s. corrente (lo crea con date indicative se assente). */
export function annoCorrenteId(): string {
  const tit = annoCorrente();
  const ex = records("anni").find((r) => r["Titolo"] === tit);
  if (ex) return ex.id;
  const y = annoAvvio();
  const id = newId();
  upsert("anni", { id, Titolo: tit, Inizio: `${y}-09-15`, Fine: `${y + 1}-06-10` });
  return id;
}

type OrSlot = { materia?: string; classe?: string };

/** Se nell'orario quella materia è associata a UNA sola classe, restituisce la sua etichetta. */
export function classeUnicaPerMateria(materia: string, orario: OrSlot[]): string | undefined {
  const set = new Set(orario.filter((s) => s.materia === materia && s.classe).map((s) => s.classe as string));
  return set.size === 1 ? [...set][0] : undefined;
}

/** Le materie che (secondo l'orario) si insegnano in quella classe. */
export function materiePerClasse(classe: string, orario: OrSlot[]): string[] {
  return [...new Set(orario.filter((s) => s.classe === classe && s.materia).map((s) => s.materia as string))];
}

/** Se in quella classe si insegna UNA sola materia, restituisce il suo nome (per l'aggancio automatico). */
export function materiaUnicaPerClasse(classe: string, orario: OrSlot[]): string | undefined {
  const m = materiePerClasse(classe, orario);
  return m.length === 1 ? m[0] : undefined;
}
