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
const voci = ["voci-GRC.csv", "voci-LAT.csv", "voci-ITA.csv"].flatMap((f) => toObjects(read(f)));
const parallelismi = toObjects(read("voci-parallelismi.csv"));
const obIds = new Set(obiettivi.map((o) => o.id));
const vById = new Map(voci.map((v) => [v.id, v]));

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
