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

/* Part en pourcentage, telle qu'on l'AFFICHE.
 *
 * Un arrondi à l'entier fait tomber à « 0 % » toute part inférieure à un
 * demi-point — et la carte affiche alors « Ventes gagnées · 0 % · 2 », qui se
 * contredit sous les yeux du lecteur. Le zéro doit rester réservé au vrai
 * zéro.
 *
 * Sous 1 %, on garde donc une décimale (0,2 %), avec un plancher à 0,1 % pour
 * qu'un effectif non nul ne puisse jamais s'afficher à zéro. Au-dessus,
 * l'entier suffit : écrire « 24,2 % » là où « 24 % » dit la même chose
 * n'ajoute que du bruit, et c'est précisément la surcharge qu'on nous a
 * reprochée.
 *
 * Retourne un NOMBRE — c'est fmtPourcentage() qui le met en forme, ou
 * l'appelant qui l'insère où il veut. */
export function partPct(n, total) {
  if (!total || !Number.isFinite(total) || total <= 0) return 0;
  if (!n || !Number.isFinite(n)) return 0;
  const p = (n / total) * 100;
  // Le signe doit survivre : une marge de -0,4 % est un déficit, pas un zéro.
  // On raisonne sur la valeur absolue pour choisir la précision, puis on
  // replace le signe — sans ça, `p < 1` attraperait tous les négatifs et les
  // remonterait à +0,1 %.
  const abs = Math.abs(p);
  if (abs < 1) {
    const arrondi = Math.max(0.1, Math.round(abs * 10) / 10);
    return p < 0 ? -arrondi : arrondi;
  }
  return Math.round(p);
}

/* Mise en forme française du résultat de partPct : virgule décimale, et rien
   d'inutile sur les valeurs entières. « 0,2 % » et non « 0.2% ». */
export function fmtPourcentage(p) {
  if (p == null || !Number.isFinite(p)) return '—';
  // Une décimale au maximum, quoi qu'on lui passe. `partPct` respecte déjà
  // cette forme, mais le formateur ne doit pas dépendre de la discipline de
  // son appelant : un flottant brut concaténé tel quel est précisément ce qui
  // a produit « 33,30000000000001 » côté comparaison.
  return `${p.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`;
}
