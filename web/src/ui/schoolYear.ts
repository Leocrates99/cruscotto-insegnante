export interface SchoolYearOption {
  label: string; // "a.s. 24/25"
  titolo: string; // valore per il campo Titolo
  inizio: string; // ISO
  fine: string; // ISO
}

const pad2 = (n: number) => String(((n % 100) + 100) % 100).padStart(2, "0");

/**
 * Genera le opzioni di anno scolastico ("a.s. 24/25") attorno all'anno corrente,
 * con le date indicative di inizio (15/09) e fine (10/06).
 */
export function schoolYearOptions(): SchoolYearOption[] {
  const now = new Date();
  // L'a.s. corrente parte a settembre: da settembre in poi è l'anno in corso.
  const base = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const out: SchoolYearOption[] = [];
  for (let y = base + 2; y >= base - 3; y--) {
    out.push({
      label: `a.s. ${pad2(y)}/${pad2(y + 1)}`,
      titolo: `a.s. ${pad2(y)}/${pad2(y + 1)}`,
      inizio: `${y}-09-15`,
      fine: `${y + 1}-06-10`,
    });
  }
  return out;
}
