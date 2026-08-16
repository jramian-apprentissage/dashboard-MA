// Calcul + formattage des deltas de comparaison pour les KPICard, partagé par
// tous les dashboards. La comparaison est toujours dérivée de la période de
// référence (voir PeriodContext) — jamais de sélection de dates libre.

export function compareLabel(comparePeriodKey) {
  return comparePeriodKey === 'previous-year' ? 'année précédente' : 'période précédente';
}

// Texte "0 sur la période/année précédente" — jamais de comparaison masquée
// silencieusement : un pourcentage n'a pas de sens avec une référence à 0,
// mais l'utilisateur doit voir POURQUOI il n'y a pas de %, pas une carte
// vide sans explication (retour direct : certaines cartes affichent un
// comparatif et d'autres non, sans qu'on comprenne pourquoi).
export function compareZeroRefText(comparePeriodKey) {
  const article = comparePeriodKey === 'previous-year' ? "l'" : 'la ';
  return { dir: 'neutral', text: `0 sur ${article}${compareLabel(comparePeriodKey)}` };
}

// Delta relatif (%) entre une valeur courante et une valeur de référence.
// `invert` : pour les KPI "perte" (ex. clients perdus) où une hausse est
// une mauvaise nouvelle — le texte (+X%) reste basé sur le sens réel de la
// variation, seule la couleur (vert/rouge, via `dir`) est inversée.
export function compareValueText(current, ref, comparePeriodKey, invert = false) {
  if (ref == null) return null; // donnée de comparaison pas encore chargée — KPICard affiche "Calcul en cours…"
  if (ref === 0) return compareZeroRefText(comparePeriodKey);
  const pct = Math.round(((current - ref) / ref) * 100);
  const sign = pct > 0 ? '+' : '';
  let dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
  if (invert && dir !== 'neutral') dir = dir === 'up' ? 'down' : 'up';
  return {
    dir,
    text: `${pct === 0 ? '=' : sign + pct + '%'} vs ${compareLabel(comparePeriodKey)}`,
  };
}

// Delta en points (taux/pourcentages déjà exprimés en %, ex. win rate).
//
// L'écart est arrondi à l'entier, sans exception. Soustraire deux taux à une
// décimale (la transformation nette, par exemple) fait ressortir l'erreur de
// représentation binaire : 36,7 - 3,4 donnait « +33.30000000000001 pts », et
// on a vu passer un « 33,333333333333333333333333 vs période précédente »
// (retour de Jimmy, 16/08). Un écart en points ne se lit pas à la décimale
// près — l'entier est la seule forme utile, et la seule qui ne peut pas
// dégénérer.
export function comparePtsText(current, ref, comparePeriodKey) {
  if (ref == null || !Number.isFinite(ref) || !Number.isFinite(current)) return null;
  const diff = Math.round(current - ref);
  const sign = diff > 0 ? '+' : '';
  const unit = Math.abs(diff) === 1 ? 'pt' : 'pts';
  return {
    dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
    text: `${diff === 0 ? '=' : sign + diff + ' ' + unit} vs ${compareLabel(comparePeriodKey)}`,
  };
}
