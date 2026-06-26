// Test di import dell'archivio — la rete di sicurezza del «riscontro».
// Rilegge i CSV sorgente (web/data/) in modo indipendente dal build step e
// verifica le 4 invarianti del contratto: una violazione → build/test rosso.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const read = (f: string) => readFileSync(join(DATA, f), "utf8");

function parseCSV(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false, i = 0;
  const endF = () => { row.push(field); field = ""; };
  const endR = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { endF(); i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { endF(); endR(); i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { endF(); endR(); }
  return rows;
}
function toObjects(text: string): Record<string, string>[] {
  const rows = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ""));
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => { const o: Record<string, string> = {}; header.forEach((h, j) => (o[h] = (r[j] ?? "").trim())); return o; });
}
const pipe = (s?: string): string[] => (s ? s.split("|").map((x) => x.trim()).filter(Boolean) : []);

const obiettivi = toObjects(read("obiettivi_3d.csv"));
const vociFiles = { GRC: "voci-GRC.csv", LAT: "voci-LAT.csv", ITA: "voci-ITA.csv" } as const;
const vociByFile = Object.fromEntries(Object.entries(vociFiles).map(([m, f]) => [m, toObjects(read(f))]));
const voci = Object.values(vociByFile).flat();
const parallelismi = toObjects(read("voci-parallelismi.csv"));
const obIds = new Set(obiettivi.map((o) => o.id));
const vById = new Map(voci.map((v) => [v.id, v]));

const rep = (f: string) => toObjects(read(`repertori/${f}`));
const prerequisiti = rep("prerequisiti.csv");
const metodologie = rep("metodologie.csv");
const fasi = rep("fasi-lezione.csv");
const arrangiamenti = rep("arrangiamenti-lezione.csv");
const materiali = rep("materiali.csv");
const valutazione = rep("valutazione.csv");
const inclusione = rep("misure-inclusione.csv");
const agenda = rep("agenda-2030.csv");
const profili = toObjects(read("rete/profili-dipartimentali.csv"));
const progetti = toObjects(read("rete/progetti-interdipartimentali.csv"));
const pipeRef = (s?: string): string[] => pipe(s).filter((x) => x !== "-");
const nucleoCodici: Record<string, Set<string>> = {};
for (const o of obiettivi) { const c = o.id.split(".")[2]; if (c) (nucleoCodici[o.materia] ??= new Set()).add(c); }

describe("Archivio · invarianti di import (rete di sicurezza)", () => {
  it("0 obiettivi orfani: ogni obiettivi_backbone risolve nel backbone", () => {
    const bad = voci.flatMap((v) => pipe(v.obiettivi_backbone).filter((ob) => !obIds.has(ob)).map((ob) => `${v.id} → ${ob}`));
    expect(bad).toEqual([]);
  });
  it("0 parent irrisolti: ogni parent risolve nella stessa materia", () => {
    const bad = voci.filter((v) => v.parent).flatMap((v) => {
      const p = vById.get(v.parent); if (!p) return [`${v.id} → ${v.parent} (inesistente)`];
      return p.materia !== v.materia ? [`${v.id} → ${v.parent} (altra materia)`] : [];
    });
    expect(bad).toEqual([]);
  });
  it("0 riferimenti-parallelismi rotti, e ognuno punta a una voce con blocco=contenuto", () => {
    const bad = parallelismi.flatMap((par) => pipe(par.riferimenti).flatMap((r) => {
      const v = vById.get(r); if (!v) return [`${par.id} → ${r} (inesistente)`];
      return v.blocco !== "contenuto" ? [`${par.id} → ${r} (blocco=${v.blocco})`] : [];
    }));
    expect(bad).toEqual([]);
  });
  it("0 residui verifica/griglia nei blocchi", () => {
    const bad = voci.filter((v) => ["verifica", "griglia", "ed_civica"].includes(v.blocco)).map((v) => v.id);
    expect(bad).toEqual([]);
  });
});

describe("Repertori didattici · invarianti di import", () => {
  const metIds = new Set(metodologie.map((m) => m.id));
  const fasIds = new Set(fasi.map((f) => f.id));

  it("0 metodologie inesistenti referenziate da fasi/arrangiamenti", () => {
    const bad = [
      ...fasi.flatMap((f) => pipeRef(f.metodologie_tipiche).filter((m) => !metIds.has(m)).map((m) => `${f.id} → ${m}`)),
      ...arrangiamenti.flatMap((a) => pipeRef(a.metodologie_tipiche).filter((m) => !metIds.has(m)).map((m) => `${a.id} → ${m}`)),
    ];
    expect(bad).toEqual([]);
  });
  it("0 fasi inesistenti in arrangiamenti", () => {
    const bad = arrangiamenti.flatMap((a) => pipeRef(a.sequenza_fasi).filter((s) => !fasIds.has(s)).map((s) => `${a.id} → ${s}`));
    expect(bad).toEqual([]);
  });
  it("0 regole-prerequisiti con nucleo inesistente (per materia)", () => {
    const bad = prerequisiti.filter((p) => p.scope === "nucleo").flatMap((p) => {
      const set = nucleoCodici[p.materia] ?? new Set<string>();
      const out: string[] = [];
      if (!set.has(p.target)) out.push(`${p.id} → target ${p.materia}:${p.target}`);
      if (!set.has(p.prerequisito)) out.push(`${p.id} → prereq ${p.materia}:${p.prerequisito}`);
      return out;
    });
    expect(bad).toEqual([]);
  });
});

describe("Archivio · sanità dei conteggi", () => {
  it("backbone e parallelismi stabili; repertori e voci presenti", () => {
    expect(obiettivi.length).toBe(408);
    expect(parallelismi.length).toBe(47);
    expect(voci.length).toBe(vociByFile.GRC.length + vociByFile.LAT.length + vociByFile.ITA.length);
    expect(voci.length).toBeGreaterThanOrEqual(698); // 698 da contratto + estensioni-autore in coda
    for (const n of [prerequisiti.length, metodologie.length, fasi.length, arrangiamenti.length, materiali.length, valutazione.length, inclusione.length]) expect(n).toBeGreaterThan(0);
  });
  it("l'index generato non perde righe rispetto ai CSV sorgente", () => {
    const c = (JSON.parse(read("../src/data/archivio.json")) as { meta: { conteggi: Record<string, number> } }).meta.conteggi;
    expect(c.obiettivi).toBe(obiettivi.length);
    expect(c.voci).toBe(voci.length);
    expect(c.parallelismi).toBe(parallelismi.length);
    expect(c.prerequisiti).toBe(prerequisiti.length);
    expect(c.metodologie).toBe(metodologie.length);
    expect(c.fasi).toBe(fasi.length);
    expect(c.arrangiamenti).toBe(arrangiamenti.length);
    expect(c.materiali).toBe(materiali.length);
    expect(c.valutazione).toBe(valutazione.length);
    expect(c.inclusione).toBe(inclusione.length);
    expect(c.agenda).toBe(agenda.length);
    expect(c.profili).toBe(profili.length);
    expect(c.progetti).toBe(progetti.length);
  });
});

describe("Archivio · rete dipartimentale (09_)", () => {
  const parIds = new Set(parallelismi.map((p) => (p as { id: string }).id));
  const profIds = new Set(profili.map((p) => (p as { id: string }).id));
  it("0 raccordi/competenze inesistenti nei profili L1", () => {
    const bad = profili.flatMap((p) => [
      ...pipe((p as Record<string, string>).raccordi).filter((r) => !parIds.has(r)).map((r) => `${(p as Record<string, string>).id} → ${r}`),
      ...pipe((p as Record<string, string>).competenze_trasversali).filter((o) => !obIds.has(o)).map((o) => `${(p as Record<string, string>).id} → ${o}`),
    ]);
    expect(bad).toEqual([]);
  });
  it("0 semi/profili inesistenti nei progetti L2", () => {
    const bad = progetti.flatMap((g) => {
      const r = g as Record<string, string>;
      return [
        ...(r.parallelismo_seme && !parIds.has(r.parallelismo_seme) ? [`${r.id} → ${r.parallelismo_seme}`] : []),
        ...pipe(r.profili_coinvolti).filter((pr) => !profIds.has(pr)).map((pr) => `${r.id} → ${pr}`),
      ];
    });
    expect(bad).toEqual([]);
  });
});
