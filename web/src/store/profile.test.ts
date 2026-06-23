import { describe, it, expect } from "vitest";
import { MATERIE } from "@model";
import { materieAttive, type Profile } from "./profile";

const base: Profile = { onboarded: false, docente: "", scuole: [], concorsi: [], materie: [] };

describe("profile — materieAttive", () => {
  it("senza profilo, ricade sulle materie di default", () => {
    expect(materieAttive(base)).toEqual(MATERIE.map((m) => m.name));
  });

  it("con materie nel profilo, usa quelle", () => {
    expect(materieAttive({ ...base, materie: ["Lingua e cultura greca", "Filosofia"] })).toEqual([
      "Lingua e cultura greca",
      "Filosofia",
    ]);
  });
});
