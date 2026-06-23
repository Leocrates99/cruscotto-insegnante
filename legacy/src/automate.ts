import "dotenv/config";
import { getParentPageId, describeError } from "./lib/notion";
import { loadManifest, saveManifest } from "./lib/state";
import { hydrateManifestFromWorkspace } from "./lib/discover";
import { runReminders } from "./automations/reminders";
import { ensureAnnuario } from "./automations/annuario";
import { runRollover } from "./automations/rollover";

/**
 * Dispatcher delle automazioni vive (Ramo 3).
 *
 *   npm run automate -- reminders                     promemoria scadenze (default)
 *   npm run automate -- annuario 2025/2026            (ri)genera l'Annuario di un anno
 *   npm run automate -- rollover 2026/2027 2025/2026  apri il nuovo anno e chiudi il precedente
 *
 * In CI: cron giornaliero → reminders; workflow_dispatch → la task scelta
 * (parametri passati anche via env: TASK, GIORNI, ANNO, ANNO_NUOVO, ANNO_PRECEDENTE).
 */
function argAt(i: number): string | undefined {
  const v = process.argv[i];
  return v && !v.startsWith("-") ? v : undefined;
}

async function main() {
  const task = (argAt(2) ?? process.env.TASK ?? "reminders").toLowerCase();
  const parentPageId = getParentPageId();
  const manifest = loadManifest();

  console.log(`\n━━ Automazione: ${task} ━━\n`);
  const found = await hydrateManifestFromWorkspace(parentPageId, manifest);
  if (found > 0) console.log(`Riconosciuti ${found} database esistenti nello spazio.\n`);
  saveManifest(manifest);

  switch (task) {
    case "reminders": {
      const giorni = Number(process.env.GIORNI ?? "7");
      await runReminders(manifest, Number.isFinite(giorni) && giorni > 0 ? giorni : 7);
      break;
    }
    case "annuario": {
      const anno = argAt(3) ?? process.env.ANNO;
      if (!anno) throw new Error('Specifica l\'anno: `npm run automate -- annuario 2025/2026` (oppure env ANNO).');
      await ensureAnnuario(manifest, anno);
      break;
    }
    case "rollover": {
      const nuovo = argAt(3) ?? process.env.ANNO_NUOVO;
      const precedente = argAt(4) ?? process.env.ANNO_PRECEDENTE;
      if (!nuovo) {
        throw new Error('Specifica il nuovo anno: `npm run automate -- rollover 2026/2027 [2025/2026]` (oppure env ANNO_NUOVO).');
      }
      await runRollover(manifest, nuovo, precedente);
      break;
    }
    default:
      throw new Error(`Automazione sconosciuta: "${task}". Usa: reminders | annuario | rollover.`);
  }

  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Automazione interrotta:", describeError(err));
  process.exit(1);
});
