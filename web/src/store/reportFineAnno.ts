// Esportazione di fine anno: raccoglie la programmazione SVOLTA (programmazione,
// UdA, lezioni, obiettivi) raggruppata per classe × materia, e un quadro
// valutativo (medie + infografiche). Serializza in Markdown e in HTML (per Word
// e per la stampa/PDF vettoriale). Tutto dai dati locali, nessuna dipendenza.
import { getRecord, records, recordTitle, type Rec, type Value } from "./store";
import { classeDiLezione } from "../compute/progress";
import { getProfile, materieClasseEffettive, scuoleCorrenti } from "./profile";
import { annoCorrente, getValutazione, type Sessione } from "./valutazione";
import { distribuzione, rigaCompilata } from "../compute/voto";
import { materiaColor } from "../ui/materia";

const str = (v: Value): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 2 });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ids = (v: Value): string[] => (Array.isArray(v) ? v : []);
const isIso = (v: Value): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
const SVOLTE = new Set(["Svolta", "Valutata", "Archiviata"]);

// ── Programmazione svolta ────────────────────────────────────────────────────
export interface UdaR { titolo: string; competenza: string; stato: string; obiettivi: string[] }
export interface LezR { data: string; titolo: string; stato: string; ore: number; obiettivi: string; esito: string }
export interface SezioneProg { classe: string; materia: string; finalita: string; monteOre?: number; strumenti: string[]; uda: UdaR[]; lezioni: LezR[]; obiettivi: string[]; oreSvolte: number }
export interface ReportProg { docente: string; scuola: string; anno: string; sezioni: SezioneProg[] }

const classeLabelRel = (rec: Rec): string | undefined => {
  const id = ids(rec["Classe"])[0];
  return id ? (str(getRecord("classi", id)?.["Titolo"]) || undefined) : undefined;
};
const obiettivoEnunciato = (id: string): string => {
  const o = getRecord("obiettivi", id);
  return o ? (str(o["Enunciato"]) || recordTitle("obiettivi", o)) : "";
};

export function buildProgrammazione(): ReportProg {
  const profile = getProfile();
  const anno = annoCorrente();
  const lezioni = records("lezioni");
  const udaAll = records("uda");
  const progAll = records("programmazione");

  // Coppie (classe, materia) da: classi del profilo × loro materie, + lezioni esistenti.
  const pairs = new Map<string, { classe: string; materia: string }>();
  for (const c of profile.classi) for (const m of materieClasseEffettive(c, profile)) pairs.set(`${c}|${m}`, { classe: c, materia: m });
  for (const l of lezioni) { const c = classeDiLezione(l); const m = str(l["Materia"]); if (c && m) pairs.set(`${c}|${m}`, { classe: c, materia: m }); }

  const sezioni: SezioneProg[] = [];
  for (const { classe, materia } of pairs.values()) {
    const lez = lezioni.filter((l) => str(l["Materia"]) === materia && classeDiLezione(l) === classe);
    const prog = progAll.find((p) => str(p["Materia"]) === materia && classeLabelRel(p) === classe);
    if (lez.length === 0 && !prog) continue; // niente da riportare per questa coppia

    const lezIds = new Set(lez.map((l) => l.id));
    const udaSet = new Map<string, Rec>();
    for (const u of udaAll) if (ids(u["Lezioni"]).some((id) => lezIds.has(id))) udaSet.set(u.id, u);
    if (prog) for (const uid of ids(prog["Moduli/UdA"])) { const u = getRecord("uda", uid); if (u) udaSet.set(u.id, u); }

    const uda: UdaR[] = [...udaSet.values()].map((u) => ({
      titolo: recordTitle("uda", u),
      competenza: str(u["Competenza attesa"]),
      stato: str(u["Stato"]),
      obiettivi: ids(u["Obiettivi"]).map(obiettivoEnunciato).filter(Boolean),
    }));

    const lezR: LezR[] = lez
      .slice()
      .sort((a, b) => (isIso(a["Data prevista"]) ? (a["Data prevista"] as string) : "").localeCompare(isIso(b["Data prevista"]) ? (b["Data prevista"] as string) : ""))
      .map((l) => ({
        data: isIso(l["Data effettiva"]) ? (l["Data effettiva"] as string).slice(0, 10) : isIso(l["Data prevista"]) ? (l["Data prevista"] as string).slice(0, 10) : "",
        titolo: recordTitle("lezioni", l),
        stato: str(l["Stato"]),
        ore: typeof l["Durata (ore)"] === "number" ? (l["Durata (ore)"] as number) : 0,
        obiettivi: str(l["Obiettivi della lezione"]),
        esito: str(l["Esito/riflessione"]),
      }));

    // Elenco obiettivi affrontati (UdA + righe degli "Obiettivi della lezione").
    const obSet = new Set<string>();
    uda.forEach((u) => u.obiettivi.forEach((o) => obSet.add(o)));
    lezR.forEach((l) => l.obiettivi.split(/\n+/).map((s) => s.replace(/^[•\-\s]+/, "").trim()).filter(Boolean).forEach((o) => obSet.add(o)));

    const oreSvolte = lez.filter((l) => SVOLTE.has(str(l["Stato"]))).reduce((s, l) => s + (typeof l["Durata (ore)"] === "number" ? (l["Durata (ore)"] as number) : 0), 0);

    sezioni.push({
      classe, materia,
      finalita: prog ? str(prog["Finalità generali"]) : "",
      monteOre: prog && typeof prog["Monte ore"] === "number" ? (prog["Monte ore"] as number) : undefined,
      strumenti: prog ? (Array.isArray(prog["Strumenti di verifica"]) ? (prog["Strumenti di verifica"] as string[]) : []) : [],
      uda, lezioni: lezR, obiettivi: [...obSet], oreSvolte,
    });
  }
  sezioni.sort((a, b) => a.classe.localeCompare(b.classe) || a.materia.localeCompare(b.materia));
  return { docente: profile.docente, scuola: scuoleCorrenti(profile)[0]?.nome ?? "", anno, sezioni };
}

// ── Quadro valutativo (medie + infografiche) ─────────────────────────────────
export interface VerR { titolo: string; data: string; media: number; n: number; pctSuff: number; votoMax: number }
export interface SezioneVal { classe: string; materia: string; verifiche: VerR[]; mediaGen: number }
export interface ReportVal { docente: string; scuola: string; anno: string; sezioni: SezioneVal[] }

export function buildValutazione(): ReportVal {
  const profile = getProfile();
  const anno = annoCorrente();
  const sess = getValutazione().sessioni.filter((s) => s.annoScolastico === anno);
  const byKey = new Map<string, { classe: string; materia: string; verifiche: VerR[] }>();
  for (const s of sess) {
    const key = `${s.classe}|${s.materia ?? ""}`;
    const g = byKey.get(key) ?? { classe: s.classe, materia: s.materia ?? "", verifiche: [] };
    const compilate = s.righe.filter(rigaCompilata);
    const d = distribuzione(s.griglia, compilate);
    if (d.n > 0) g.verifiche.push({ titolo: s.titolo, data: s.data, media: d.media, n: d.n, pctSuff: d.pctSuff, votoMax: s.griglia.scala.votoMax });
    byKey.set(key, g);
  }
  const sezioni: SezioneVal[] = [...byKey.values()]
    .filter((g) => g.verifiche.length > 0)
    .map((g) => ({ ...g, mediaGen: Math.round((g.verifiche.reduce((s, v) => s + v.media, 0) / g.verifiche.length) * 100) / 100 }));
  sezioni.sort((a, b) => a.classe.localeCompare(b.classe) || a.materia.localeCompare(b.materia));
  return { docente: profile.docente, scuola: scuoleCorrenti(profile)[0]?.nome ?? "", anno, sezioni };
}

// ── Serializzazione Markdown ─────────────────────────────────────────────────
export function progToMarkdown(r: ReportProg): string {
  const L: string[] = [];
  L.push(`# Resoconto della programmazione svolta — ${r.anno}`);
  if (r.docente || r.scuola) L.push(`*${[r.docente, r.scuola].filter(Boolean).join(" · ")}*`);
  L.push("");
  let curClasse = "";
  for (const s of r.sezioni) {
    if (s.classe !== curClasse) { L.push(`## Classe ${s.classe}`); curClasse = s.classe; }
    L.push(`### ${s.materia}`);
    if (s.finalita) L.push(`**Finalità generali.** ${s.finalita}`);
    const meta = [s.monteOre != null ? `Monte ore: ${s.monteOre}` : "", `Ore svolte: ${num(s.oreSvolte)}`, s.strumenti.length ? `Strumenti: ${s.strumenti.join(", ")}` : ""].filter(Boolean);
    if (meta.length) L.push(meta.join(" · "));
    if (s.uda.length) { L.push("", "**UdA / Moduli**"); s.uda.forEach((u) => L.push(`- **${u.titolo}**${u.stato ? ` _(${u.stato})_` : ""}${u.competenza ? ` — ${u.competenza}` : ""}`)); }
    if (s.lezioni.length) {
      L.push("", `**Lezioni svolte (${s.lezioni.length})**`, "", "| Data | Lezione | Stato | Ore |", "| --- | --- | --- | --- |");
      s.lezioni.forEach((l) => L.push(`| ${l.data || "—"} | ${l.titolo.replace(/\|/g, "/")} | ${l.stato || "—"} | ${l.ore || ""} |`));
    }
    if (s.obiettivi.length) { L.push("", "**Obiettivi affrontati**"); s.obiettivi.forEach((o) => L.push(`- ${o}`)); }
    L.push("");
  }
  if (r.sezioni.length === 0) L.push("_Nessuna lezione o programmazione registrata per quest'anno._");
  return L.join("\n");
}

export function valToMarkdown(r: ReportVal): string {
  const L: string[] = [];
  L.push(`# Quadro valutativo — ${r.anno}`);
  if (r.docente || r.scuola) L.push(`*${[r.docente, r.scuola].filter(Boolean).join(" · ")}*`);
  L.push("");
  let curClasse = "";
  for (const s of r.sezioni) {
    if (s.classe !== curClasse) { L.push(`## Classe ${s.classe}`); curClasse = s.classe; }
    L.push(`### ${s.materia || "—"} — media generale ${num(s.mediaGen)}`);
    L.push("", "| Verifica | Data | Media | Valutati | % suff. |", "| --- | --- | --- | --- | --- |");
    s.verifiche.forEach((v) => L.push(`| ${v.titolo.replace(/\|/g, "/")} | ${v.data} | ${num(v.media)} | ${v.n} | ${v.pctSuff}% |`));
    L.push("");
  }
  if (r.sezioni.length === 0) L.push("_Nessuna verifica valutata per quest'anno._");
  return L.join("\n");
}

// ── Serializzazione HTML (anteprima, stampa/PDF, Word) ───────────────────────
export function progToHtml(r: ReportProg): string {
  const H: string[] = [];
  H.push(`<h1>Resoconto della programmazione svolta — ${esc(r.anno)}</h1>`);
  if (r.docente || r.scuola) H.push(`<p class="rep-sub">${esc([r.docente, r.scuola].filter(Boolean).join(" · "))}</p>`);
  let curClasse = "";
  for (const s of r.sezioni) {
    if (s.classe !== curClasse) { H.push(`<h2>Classe ${esc(s.classe)}</h2>`); curClasse = s.classe; }
    H.push(`<h3 style="color:${materiaColor(s.materia) ?? "#333"}">${esc(s.materia)}</h3>`);
    if (s.finalita) H.push(`<p><b>Finalità generali.</b> ${esc(s.finalita)}</p>`);
    const meta = [s.monteOre != null ? `Monte ore: ${s.monteOre}` : "", `Ore svolte: ${num(s.oreSvolte)}`, s.strumenti.length ? `Strumenti: ${esc(s.strumenti.join(", "))}` : ""].filter(Boolean);
    if (meta.length) H.push(`<p class="rep-meta">${meta.join(" · ")}</p>`);
    if (s.uda.length) { H.push("<p><b>UdA / Moduli</b></p><ul>"); s.uda.forEach((u) => H.push(`<li><b>${esc(u.titolo)}</b>${u.stato ? ` <i>(${esc(u.stato)})</i>` : ""}${u.competenza ? ` — ${esc(u.competenza)}` : ""}</li>`)); H.push("</ul>"); }
    if (s.lezioni.length) {
      H.push(`<p><b>Lezioni svolte (${s.lezioni.length})</b></p><table><thead><tr><th>Data</th><th>Lezione</th><th>Stato</th><th>Ore</th></tr></thead><tbody>`);
      s.lezioni.forEach((l) => H.push(`<tr><td>${esc(l.data || "—")}</td><td>${esc(l.titolo)}</td><td>${esc(l.stato || "—")}</td><td>${l.ore || ""}</td></tr>`));
      H.push("</tbody></table>");
    }
    if (s.obiettivi.length) { H.push("<p><b>Obiettivi affrontati</b></p><ul>"); s.obiettivi.forEach((o) => H.push(`<li>${esc(o)}</li>`)); H.push("</ul>"); }
  }
  if (r.sezioni.length === 0) H.push("<p><i>Nessuna lezione o programmazione registrata per quest'anno.</i></p>");
  return H.join("\n");
}

export function valToHtml(r: ReportVal): string {
  const H: string[] = [];
  H.push(`<h1>Quadro valutativo — ${esc(r.anno)}</h1>`);
  if (r.docente || r.scuola) H.push(`<p class="rep-sub">${esc([r.docente, r.scuola].filter(Boolean).join(" · "))}</p>`);
  let curClasse = "";
  for (const s of r.sezioni) {
    if (s.classe !== curClasse) { H.push(`<h2>Classe ${esc(s.classe)}</h2>`); curClasse = s.classe; }
    H.push(`<h3 style="color:${materiaColor(s.materia) ?? "#333"}">${esc(s.materia || "—")} — media generale ${num(s.mediaGen)}</h3>`);
    // Infografica: barre orizzontali (vettoriali) media/votoMax per verifica.
    H.push('<div class="rep-bars">');
    s.verifiche.forEach((v) => {
      const pct = Math.max(2, Math.min(100, Math.round((v.media / (v.votoMax || 10)) * 100)));
      const col = v.pctSuff >= 50 ? "#2f7d5a" : "#c0531f";
      H.push(`<div class="rep-bar"><span class="rep-bar-lab">${esc(v.titolo)} <i>(${esc(v.data)})</i></span><span class="rep-bar-track"><span class="rep-bar-fill" style="width:${pct}%;background:${col}"></span></span><b class="rep-bar-val">${num(v.media)}</b></div>`);
    });
    H.push("</div>");
    H.push("<table><thead><tr><th>Verifica</th><th>Data</th><th>Media</th><th>Valutati</th><th>% suff.</th></tr></thead><tbody>");
    s.verifiche.forEach((v) => H.push(`<tr><td>${esc(v.titolo)}</td><td>${esc(v.data)}</td><td>${num(v.media)}</td><td>${v.n}</td><td>${v.pctSuff}%</td></tr>`));
    H.push("</tbody></table>");
  }
  if (r.sezioni.length === 0) H.push("<p><i>Nessuna verifica valutata per quest'anno.</i></p>");
  return H.join("\n");
}

// ── Download (.md / .doc Word) ───────────────────────────────────────────────
function download(name: string, mime: string, content: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + content], { type: mime }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function downloadMarkdown(name: string, md: string) {
  download(`${name}.md`, "text/markdown;charset=utf-8", md);
}
/** Word apre senza problemi un HTML con estensione .doc e MIME application/msword. */
export function downloadWord(name: string, titolo: string, bodyHtml: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(titolo)}</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#222}h1{font-size:18pt}h2{font-size:14pt;border-bottom:1px solid #999;margin-top:18pt}h3{font-size:12pt;margin-bottom:4pt}table{border-collapse:collapse;width:100%;margin:6pt 0}th,td{border:1px solid #999;padding:3pt 6pt;text-align:left;font-size:10pt}.rep-sub{color:#666;font-style:italic}.rep-meta{color:#555}.rep-bar{display:flex;align-items:center;gap:8px;margin:2pt 0}.rep-bar-track{flex:1;background:#eee;height:12px}.rep-bar-fill{display:block;height:12px}.rep-bar-val{min-width:34px}</style>
</head><body>${bodyHtml}</body></html>`;
  download(`${name}.doc`, "application/msword;charset=utf-8", html);
}
