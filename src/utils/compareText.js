// Calcul + formattage des deltas de comparaison pour les KPICard, partagé par
// tous les dashboards. La comparaison est toujours dérivée de la période de
// référence (voir PeriodContext) — jamais de sélection de dates libre.

export function compareLabel(comparePeriodKey) {
  return comparePeriodKey === 'previous-year' ? 'année précédente' : 'période précédente';
}

// Delta relatif (%) entre une valeur courante et une valeur de référence.
export function compareValueText(current, ref, comparePeriodKey) {
  if (ref == null || ref === 0) return null;
  const pct = Math.round(((current - ref) / ref) * 100);
  const sign = pct > 0 ? '+' : '';
  return {
    dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
    text: `${pct === 0 ? '=' : sign + pct + '%'} vs ${compareLabel(comparePeriodKey)}`,
  };
}

// Delta en points (taux/pourcentages déjà exprimés en %, ex. win rate).
export function comparePtsText(current, ref, comparePeriodKey) {
  if (ref == null) return null;
  const diff = current - ref;
  const sign = diff > 0 ? '+' : '';
  return {
    dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
    text: `${diff === 0 ? '=' : sign + diff + ' pts'} vs ${compareLabel(comparePeriodKey)}`,
  };
}
