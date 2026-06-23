import type { BasePropertyDef, OptionDef } from "../types";

/**
 * Traduce una mappa di proprietà-base (passata 1) nel formato dello schema Notion.
 * Le relazioni, i rollup e le formule NON passano da qui: si aggiungono nelle
 * passate 2 e 3, dove servono gli id dei database di destinazione.
 *
 * Il valore di ritorno è volutamente "lasco" (Record<string, unknown>) perché
 * l'unione dei tipi-proprietà dell'SDK è ampia e sensibile alla versione: viene
 * castata al confine della chiamata API (in createDatabase.ts). I NOMI dei campi
 * della richiesta (parent, title, initial_data_source, ...) restano invece tipati
 * e quindi validati dal type-check.
 */
export function toNotionProps(
  props: Record<string, BasePropertyDef>
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [name, def] of Object.entries(props)) {
    out[name] = toNotionProp(def);
  }
  return out;
}

function toNotionProp(def: BasePropertyDef): Record<string, unknown> {
  switch (def.type) {
    case "title":
      return { title: {} };
    case "rich_text":
      return { rich_text: {} };
    case "number":
      return { number: { format: def.format ?? "number" } };
    case "checkbox":
      return { checkbox: {} };
    case "url":
      return { url: {} };
    case "email":
      return { email: {} };
    case "phone_number":
      return { phone_number: {} };
    case "files":
      return { files: {} };
    case "date":
      return { date: {} };
    case "select":
      return { select: { options: toOptions(def.options) } };
    case "multi_select":
      return { multi_select: { options: toOptions(def.options) } };
  }
}

function toOptions(options: OptionDef[]) {
  return options.map((o) => ({ name: o.name, color: o.color ?? "default" }));
}
