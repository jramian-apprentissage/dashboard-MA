// Séparateur de milliers français (espace fine insécable) — ex. 16724 → "16 724".
// N'affecte que les nombres ; les chaînes déjà formatées (ex. "45%", "-")
// passent inchangées.
export function fmtNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  return value.toLocaleString('fr-FR');
}

// Montant exact à 2 décimales — pour l'infobulle au survol/clic des KPI
// normalement abrégés en K€ (ex. "137 K€" affiché, "137 136,00 €" au survol
// ou au clic sur mobile, voir KPICard `exactValue`).
export function fmtEurosExact(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
