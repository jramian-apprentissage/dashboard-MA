// Calcul + formattage des deltas de comparaison pour les KPICard, partagé par
// tous les dashboards. La comparaison est toujours dérivée de la période de
// référence (voir PeriodContext) — jamais de sélection de dates libre.

export function compareLabel(comparePeriodKey) {
  return comparePeriodKey === 'previous-year' ? 'année précédente' : 'période précédente';
}

/* BANDE DE STABILITÉ — en deçà de cet écart, la variation s'affiche en gris.
 *
 * Demandé par Clémence le 09/10 : « quand tes variations sont stables, tu peux
 * mettre des pourcentages qui sont en gris, quand tu estimes que les variations
 * sont négatives, tu les mets un peu plus en rouge, et quand elles sont
 * positives, en vert. » Sans bande neutre, un écart de 1 % s'affiche du même
 * vert qu'un écart de 40 %, et la couleur ne dit plus rien.
 *
 * LE SEUIL EST LE SIEN : ±10 %, arbitré par Jimmy le 10/10. Elle le justifie
 * par ses volumes à elle, « nous on n'observe pas que ce soit une augmentation
 * mais parce qu'on a beaucoup de volume », et Mon Ambassadeur en a bien moins :
 * sur 85 k€ de chiffre d'affaires, 8 k€ de mois en mois passent donc en gris.
 * C'est assumé, et c'est pour pouvoir y revenir que la valeur vit ici seule.
 *
 * La bande ne touche QUE la couleur. Le chiffre, le signe et la flèche restent
 * ceux de la variation réelle : on dit « ce n'est pas un message », pas « il ne
 * s'est rien passé ».
 */
export const SEUIL_STABILITE_PCT = 10;  // en pourcentage relatif

/* Pour les écarts en POINTS, le seuil est volontairement laissé à 1, c'est à
 * dire qu'il ne neutralise que l'écart nul, déjà neutre avant. Un point ne
 * pèse pas la même chose selon le taux : sur un taux de marge à 53 %, un point
 * est du bruit ; sur la transformation nette, qui vaut 2 %, un point est un
 * doublement. Une bande uniforme en points mentirait sur l'un ou sur l'autre.
 * Si on veut en poser une, elle doit être par indicateur, comme les échelles
 * de couleur des tableaux par agent (echelles.js). */
export const SEUIL_STABILITE_PTS = 1;

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
  /* Deux directions, et il faut les distinguer :
       `sens` suit le CHIFFRE — +11 % monte, -20 % descend. C'est la flèche.
       `dir`  porte le JUGEMENT — vert si c'est une bonne nouvelle. C'est la couleur.

     Sur un KPI de perte, les deux divergent : +11 % de missions perdues, ça
     monte (flèche ↗) et c'est mauvais (rouge). Tant que `dir` pilotait aussi
     la flèche, la carte affichait « ↘ +11 % » — une flèche qui descend collée
     à un nombre qui monte, ce qui se lit comme une erreur de calcul et non
     comme un jugement. */
  const sens = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
  let dir = sens;
  if (invert && dir !== 'neutral') dir = dir === 'up' ? 'down' : 'up';
  // Sous la bande de stabilité, la couleur se tait. La flèche, elle, suit
  // toujours le chiffre : `sens` n'est pas touché.
  if (Math.abs(pct) < SEUIL_STABILITE_PCT) dir = 'neutral';
  return {
    dir,
    sens,
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
  const sens = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
  return {
    dir: Math.abs(diff) < SEUIL_STABILITE_PTS ? 'neutral' : sens,
    sens,
    text: `${diff === 0 ? '=' : sign + diff + ' ' + unit} vs ${compareLabel(comparePeriodKey)}`,
  };
}

/* Le taux et son écart dans la même ligne : « Taux de marge brute : 53 % (-4 pts) ».
 *
 * Clémence, 09/10 : « mettre le taux de marge ici à 53 %, on a l'impression
 * qu'il n'y a pas de message clé, alors que le message clé c'est peut-être
 * 53 % mais surtout moins 10 %. » La carte posait la valeur en `neutral`, sans
 * comparaison : elle se lisait comme une étiquette, pas comme un résultat.
 *
 *   libelle   le nom du taux, répété pour ne pas le faire deviner
 *   valeur    le taux courant, déjà formaté
 *   current   le taux courant en nombre, ou null
 *   ref       le taux de la période de comparaison, ou null
 */
export function tauxAvecEcart(libelle, valeur, current, ref, comparePeriodKey) {
  const ecart = comparePtsText(current, ref, comparePeriodKey);
  if (!ecart) return { dir: 'neutral', text: `${libelle} : ${valeur}` };
  const pts = ecart.text.split(' vs ')[0];
  return {
    dir: ecart.dir,
    sens: ecart.sens,
    text: `${libelle} : ${valeur} (${pts})`,
  };
}
