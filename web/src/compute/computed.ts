import { getRecord, records, type Rec } from "../store/store";

const toNum = (v: unknown): number => (typeof v === "number" ? v : 0);
const toIds = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

/** UdA → somma delle ore delle Lezioni collegate (rollup "Ore pianificate"). */
export function udaOrePianificate(uda: Rec): number {
  return toIds(uda["Lezioni"]).reduce(
    (sum, id) => sum + toNum(getRecord("lezioni", id)?.["Durata (ore)"]),
    0
  );
}

/** Un obiettivo è "verificato" se almeno una Verifica lo richiama. */
export function obiettivoVerificato(obId: string): boolean {
  return records("verifiche").some((v) => toIds(v["Obiettivi verificati"]).includes(obId));
}

export interface Copertura {
  tot: number;
  ver: number;
  pct: number;
}
/** UdA → copertura: obiettivi totali, verificati e percentuale. */
export function udaCopertura(uda: Rec): Copertura {
  const obs = toIds(uda["Obiettivi"]);
  const tot = obs.length;
  const ver = obs.filter(obiettivoVerificato).length;
  return { tot, ver, pct: tot === 0 ? 0 : Math.round((ver / tot) * 100) };
}

export interface OreProgrammazione {
  monte: number;
  tot: number;
  scostamento: number;
  semaforo: string;
}
/** Programmazione → sostenibilità oraria: Monte ore vs somma delle Ore delle UdA. */
export function programmazioneOre(prog: Rec): OreProgrammazione {
  const monte = toNum(prog["Monte ore"]);
  const tot = toIds(prog["Moduli/UdA"]).reduce((sum, id) => {
    const u = getRecord("uda", id);
    return sum + (u ? udaOrePianificate(u) : 0);
  }, 0);
  const scostamento = monte - tot;
  const semaforo =
    scostamento < 0 ? "⚠ oltre il monte ore" : scostamento === 0 ? "● pieno" : "○ margine";
  return { monte, tot, scostamento, semaforo };
}
