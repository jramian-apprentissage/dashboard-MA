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

/* Montant abrégé avec UNE décimale sur les K€ — pour les tableaux de détail
   (CA et marge par client, revenus perdus, revenu par mission).

   Un arrondi à l'entier y écrase des écarts qui font justement l'intérêt du
   tableau : 1 480 € et 2 400 € s'affichaient tous deux « 2 K€ », donnant deux
   lignes identiques pour des montants qui vont du simple au double. Les
   cartes KPI, elles, gardent l'entier : c'est un ordre de grandeur qu'on y
   lit, pas un classement ligne à ligne. */
export function fmtEurosDetail(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (!v) return '0 €';
  if (Math.abs(v) >= 1000) {
    return `${(v / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} K€`;
  }
  return `${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
}
