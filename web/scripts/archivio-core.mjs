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
export const num = (s) => { const n = Number(String(s ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
export const yesNo = (s) => /^s[iì]$/i.test(String(s ?? "").trim());
// Pipe per i campi-riferimento: "-" è un segnaposto «nessuno» e va scartato.
export const pipeRef = (s) => pipe(s).filter((x) => x !== "-");

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
  return { obiettivi, voci, parallelismi, faccette, repertori: buildRepertori(read) };
}

/** I 6 cataloghi del lesson-builder (08_repertori-didattici), pipe già splittate. */
export function buildRepertori(read) {
  const rd = (f) => toObjects(read(`repertori/${f}`));
  const prerequisiti = rd("prerequisiti.csv").map((p) => ({
    id: p.id, materia: p.materia, scope: p.scope, target: p.target, prerequisito: p.prerequisito,
    tipo: p.tipo, orizzonte: p.orizzonte, obbligatorio: yesNo(p.obbligatorio), nota: p.nota,
  }));
  const metodologie = rd("metodologie.csv").map((m) => ({
    id: m.id, nome: m.nome, gruppo: m.gruppo, centratura: m.centratura, strutturazione: m.strutturazione,
    raggruppamento: m.raggruppamento, logica: m.logica, focus: m.focus, esito: m.esito, tempi: m.tempi,
    tecnologia: m.tecnologia, carico_docente: m.carico_docente, fase_tipica: pipe(m.fase_tipica), aggancio_classico: m.aggancio_classico,
  }));
  const fasi = rd("fasi-lezione.csv").map((f) => ({
    id: f.id, fase: f.fase, modello: f.modello, ordine: num(f.ordine), funzione: f.funzione, centratura: f.centratura,
    perc_monte: num(f.perc_monte), dur_min_60: num(f.dur_min_60), dur_max_60: num(f.dur_max_60),
    attivita_docente: f.attivita_docente, attivita_studente: f.attivita_studente,
    metodologie_tipiche: pipeRef(f.metodologie_tipiche), opzionale: yesNo(f.opzionale),
  }));
  const arrangiamenti = rd("arrangiamenti-lezione.csv").map((a) => ({
    id: a.id, nome: a.nome, modello: a.modello, sequenza_fasi: pipeRef(a.sequenza_fasi),
    durata_riferimento_min: num(a.durata_riferimento_min), metodologie_tipiche: pipeRef(a.metodologie_tipiche),
    calibrazione: a.calibrazione, note: a.note,
  }));
  const materiali = rd("materiali.csv").map((m) => ({
    id: m.id, categoria: m.categoria, tipo: m.tipo, descrizione: m.descrizione, supporto: m.supporto,
    funzione: m.funzione, accessibilita: m.accessibilita, materie: pipe(m.materie), note: m.note,
  }));
  const valutazione = rd("valutazione.csv").map((v) => ({
    id: v.id, funzione: v.funzione, metodo: v.metodo, forma: v.forma, descrizione: v.descrizione, momento: v.momento,
    oggetto: pipe(v.oggetto), bloom_max: v.bloom_max, descrittore_dublino: v.descrittore_dublino, graduata: yesNo(v.graduata), materie: pipe(v.materie),
  }));
  const inclusione = rd("misure-inclusione.csv").map((i) => ({
    id: i.id, ambito: i.ambito, categoria: i.categoria, misura: i.misura, descrizione: i.descrizione,
    disciplina_o_trasversale: i.disciplina_o_trasversale, riferimento_normativo: i.riferimento_normativo,
    raccordo_valutazione: i.raccordo_valutazione, materie: pipe(i.materie),
  }));
  const agenda = rd("agenda-2030.csv").map((s) => ({
    id: s.id, numero: num(s.numero), titolo: s.titolo, colore: s.colore, icona: s.icona, area: s.area, descrizione: s.descrizione, keywords: pipe(s.keywords),
  }));
  return { prerequisiti, metodologie, fasi, arrangiamenti, materiali, valutazione, inclusione, agenda };
}

const RESIDUI = new Set(["verifica", "griglia", "ed_civica"]);
/** Codici-nucleo validi per materia, estratti dagli ID del backbone (MATERIA.TIPO.NUCLEO.NN). */
export function nucleoCodiciByMateria(obiettivi) {
  const m = {};
  for (const o of obiettivi) { const code = o.id.split(".")[2]; if (code) (m[o.materia] ??= new Set()).add(code); }
  return m;
}
/** Le invarianti del contratto (disciplinari + repertori), per categoria (array vuoti = ok). */
export function validate({ obiettivi, voci, parallelismi, repertori }) {
  const obIds = new Set(obiettivi.map((o) => o.id));
  const vById = new Map(voci.map((v) => [v.id, v]));
  const orfani = [], parent = [], riferimenti = [], residui = [], metodologie = [], fasi = [], prerequisiti = [];
  for (const v of voci) for (const ob of v.obiettivi_backbone) if (!obIds.has(ob)) orfani.push(`${v.id} → ${ob}`);
  for (const v of voci) if (v.parent) { const p = vById.get(v.parent); if (!p) parent.push(`${v.id} → ${v.parent} (inesistente)`); else if (p.materia !== v.materia) parent.push(`${v.id} → ${v.parent} (altra materia)`); }
  for (const par of parallelismi) for (const r of par.riferimenti) { const v = vById.get(r); if (!v) riferimenti.push(`${par.id} → ${r} (inesistente)`); else if (v.blocco !== "contenuto") riferimenti.push(`${par.id} → ${r} (blocco=${v.blocco})`); }
  for (const v of voci) if (RESIDUI.has(v.blocco)) residui.push(`${v.id} (blocco=${v.blocco})`);
  if (repertori) {
    const metIds = new Set(repertori.metodologie.map((m) => m.id));
    const fasIds = new Set(repertori.fasi.map((f) => f.id));
    for (const f of repertori.fasi) for (const m of f.metodologie_tipiche) if (!metIds.has(m)) metodologie.push(`${f.id} → ${m} (metodologia inesistente)`);
    for (const a of repertori.arrangiamenti) {
      for (const m of a.metodologie_tipiche) if (!metIds.has(m)) metodologie.push(`${a.id} → ${m} (metodologia inesistente)`);
      for (const s of a.sequenza_fasi) if (!fasIds.has(s)) fasi.push(`${a.id} → ${s} (fase inesistente)`);
    }
    const codici = nucleoCodiciByMateria(obiettivi);
    for (const p of repertori.prerequisiti) if (p.scope === "nucleo") {
      const set = codici[p.materia] ?? new Set();
      if (!set.has(p.target)) prerequisiti.push(`${p.id} → target ${p.materia}:${p.target} (nucleo inesistente)`);
      if (!set.has(p.prerequisito)) prerequisiti.push(`${p.id} → prerequisito ${p.materia}:${p.prerequisito} (nucleo inesistente)`);
    }
  }
  return { orfani, parent, riferimenti, residui, metodologie, fasi, prerequisiti };
}

/** Indici denormalizzati per il client (disciplinari + repertori). */
export function buildIndex({ voci, parallelismi, repertori }) {
  const vociByMateria = {}, figliByParent = {}, vociByObiettivo = {}, parallelismiByRef = {};
  for (const v of voci) (vociByMateria[v.materia] ??= []).push(v.id);
  for (const v of voci) if (v.parent) (figliByParent[v.parent] ??= []).push(v.id);
  for (const v of voci) for (const ob of v.obiettivi_backbone) (vociByObiettivo[ob] ??= []).push(v.id);
  for (const p of parallelismi) for (const r of p.riferimenti) (parallelismiByRef[r] ??= []).push(p.id);
  const metodologieByFase = {}, fasiById = {}, prerequisitiByNucleo = {};
  if (repertori) {
    for (const f of repertori.fasi) { fasiById[f.id] = f.id; metodologieByFase[f.id] = [...f.metodologie_tipiche]; }
    for (const p of repertori.prerequisiti) if (p.scope === "nucleo") (prerequisitiByNucleo[`${p.materia}:${p.target}`] ??= []).push(p.id);
  }
  return { vociByMateria, figliByParent, vociByObiettivo, parallelismiByRef, metodologieByFase, fasiById, prerequisitiByNucleo };
}
