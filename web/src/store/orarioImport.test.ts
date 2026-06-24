import { describe, it, expect } from "vitest";
import { parseDelimited, rowsToSlots } from "./orarioImport";

describe("orarioImport — parsing CSV", () => {
  it("legge il formato LUNGO (Giorno, Ora, Materia, Classe)", () => {
    const csv = [
      "Giorno,Ora,Materia,Classe",
      "Lunedì,1ª ora,Lingua e cultura greca,IV A",
      "Martedì,2ª ora,Lingua e cultura latina,II B",
    ].join("\n");
    const slots = rowsToSlots(parseDelimited(csv));
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({ giorno: 0, fascia: "1ª ora", materia: "Lingua e cultura greca", classe: "IV A" });
    expect(slots[1].giorno).toBe(1);
  });

  it("legge il formato GRIGLIA (ora × giorni) separando materia e classe", () => {
    const csv = [
      "Ora,Lun,Mar",
      "1ª ora,Greco IV A,",
      "2ª ora,,Latino II B",
    ].join("\n");
    const slots = rowsToSlots(parseDelimited(csv));
    expect(slots).toHaveLength(2);
    const lun = slots.find((s) => s.giorno === 0)!;
    expect(lun.classe).toBe("IV A");
    expect(lun.materia).toBe("Greco");
    expect(slots.find((s) => s.giorno === 1)!.classe).toBe("II B");
  });

  it("rispetta il delimitatore ; (CSV italiano da Excel)", () => {
    const csv = "Giorno;Ora;Materia;Classe\nMercoledì;3ª ora;Storia;V C";
    const slots = rowsToSlots(parseDelimited(csv));
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ giorno: 2, fascia: "3ª ora", classe: "V C" });
  });

  it("ignora righe vuote e celle vuote", () => {
    const csv = "Ora,Lun,Dom\n1ª ora,,\n\n2ª ora,Italiano I A,";
    const slots = rowsToSlots(parseDelimited(csv));
    expect(slots).toHaveLength(1);
    expect(slots[0].giorno).toBe(0);
  });
});
