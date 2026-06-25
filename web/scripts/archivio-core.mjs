// Nucleo condiviso (puro, senza effetti collaterali) per importare l'archivio:
// parser CSV, costruzione del modello, le 4 INVARIANTI e gli indici.
// Usato sia da gen-archivio.mjs (build step) sia dai test di import.

export function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", inQ = false, i = 0;
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
export function toObjects(text) {
  const rows = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ""));
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => { const o = {}; header.forEach((h, j) => (o[h] = (r[j] ?? "").trim())); return o; });
}
export const pipe = (s) => (s ? s.split("|").map((x) => x.trim()).filter(Boolean) : []);
export const orNull = (s) => (s && s.trim() ? s.trim() : null);

/** Costruisce il modello (array già normalizzati, pipe splittate). `read(file)` → testo. */
export function buildModel(read) {
  const obiettivi = toObjects(read("obiettivi_3d.csv")).map((o) => ({
    id: o.id, materia: o.materia, materia_label: o.materia_label, nucleo: o.nucleo, tipo: o.tipo, fase: o.fase,
    argomento: o.argomento, descrizione: o.descrizione, bloom: orNull(o.bloom), competenza_europea: o.competenza_europea,
    indirizzi: pipe(o.indirizzi), classi: pipe(o.classi), keywords: pipe(o.keywords),
  }));
  const voci = ["voci-GRC.csv", "voci-LAT.csv", "voci-ITA.csv"].flatMap((f) =>
    toObjects(read(f)).map((v) => ({
      id: v.id, materia: v.materia, anno: orNull(v.anno), fase: v.fase, indirizzi: pipe(v.indirizzi), classi: pipe(v.classi),
      blocco: v.blocco, nucleo: v.nucleo, testo: v.testo, obiettivi_backbone: pipe(v.obiettivi_backbone),
      tipo_contenuto: orNull(v.tipo_contenuto), parent: orNull(v.parent), peso: v.peso, tag: pipe(v.tag),
      bloom: orNull(v.bloom), competenza_europea: v.competenza_europea, fonte: v.fonte, stato: v.stato,
    }))
  );
  const parallelismi = toObjects(read("voci-parallelismi.csv")).map((p) => ({
    id: p.id, asse: p.asse, sotto_tipo: p.sotto_tipo, titolo: p.titolo, descrizione: p.descrizione, relazione: p.relazione,
    materie: pipe(p.materie), riferimenti: pipe(p.riferimenti), ambito_culturale: p.ambito_culturale,
    discipline_apporto: pipe(p.discipline_apporto), tag: pipe(p.tag), stato: p.stato,
  }));
  let faccette = {};
  try { faccette = JSON.parse(read("tassonomia_3d.json")).faccette ?? {}; } catch { /* opzionale */ }
  return { obiettivi, voci, parallelismi, faccette };
}

const RESIDUI = new Set(["verifica", "griglia", "ed_civica"]);
/** Le 4 invarianti del contratto, per categoria (array vuoti = ok). */
export function validate({ obiettivi, voci, parallelismi }) {
  const obIds = new Set(obiettivi.map((o) => o.id));
  const vById = new Map(voci.map((v) => [v.id, v]));
  const orfani = [], parent = [], riferimenti = [], residui = [];
  for (const v of voci) for (const ob of v.obiettivi_backbone) if (!obIds.has(ob)) orfani.push(`${v.id} → ${ob}`);
  for (const v of voci) if (v.parent) { const p = vById.get(v.parent); if (!p) parent.push(`${v.id} → ${v.parent} (inesistente)`); else if (p.materia !== v.materia) parent.push(`${v.id} → ${v.parent} (altra materia)`); }
  for (const par of parallelismi) for (const r of par.riferimenti) { const v = vById.get(r); if (!v) riferimenti.push(`${par.id} → ${r} (inesistente)`); else if (v.blocco !== "contenuto") riferimenti.push(`${par.id} → ${r} (blocco=${v.blocco})`); }
  for (const v of voci) if (RESIDUI.has(v.blocco)) residui.push(`${v.id} (blocco=${v.blocco})`);
  return { orfani, parent, riferimenti, residui };
}

/** Indici denormalizzati per il client. */
export function buildIndex({ voci, parallelismi }) {
  const vociByMateria = {}, figliByParent = {}, vociByObiettivo = {}, parallelismiByRef = {};
  for (const v of voci) (vociByMateria[v.materia] ??= []).push(v.id);
  for (const v of voci) if (v.parent) (figliByParent[v.parent] ??= []).push(v.id);
  for (const v of voci) for (const ob of v.obiettivi_backbone) (vociByObiettivo[ob] ??= []).push(v.id);
  for (const p of parallelismi) for (const r of p.riferimenti) (parallelismiByRef[r] ??= []).push(p.id);
  return { vociByMateria, figliByParent, vociByObiettivo, parallelismiByRef };
}
