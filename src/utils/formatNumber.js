// Séparateur de milliers français (espace fine insécable) — ex. 16724 → "16 724".
// N'affecte que les nombres ; les chaînes déjà formatées (ex. "45%", "-")
// passent inchangées.
export function fmtNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  return value.toLocaleString('fr-FR');
}
