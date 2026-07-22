export const INDICATOR_ORDER = [
  "Appels émis",
  "Leads décrochés",
  "Data non exploitable",
  "Leads restants à contacter",
  "Leads à recycler",
  "RDVs Bookés TLM",
  "RDVs Bookés Telepro",
  "Fiches complétées",
  "RDV (formulaire)",
  "Fiche complété (formulaire)"
];

export const FORMULAIRE_ROWS = ["RDV (formulaire)", "Fiche complété (formulaire)"];

// Les 8 lignes ecrites dans "Dernier Reporting" (ordre fixe impose par la sheet cible)
export const SHEET_WRITE_ORDER = [
  "Appels émis",
  "Leads décrochés",
  "Data non exploitable",
  "Leads restants à contacter",
  "Leads à recycler",
  "RDVs Bookés TLM",
  "RDVs Bookés Telepro",
  "Fiches complétées"
];

export function buildOrderedValues(results) {
  return SHEET_WRITE_ORDER.map((key) => {
    const v = results ? results[key] : undefined;
    return v === undefined || v === null ? "" : v;
  });
}
