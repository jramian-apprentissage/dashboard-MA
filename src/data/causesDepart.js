/* LES COULEURS DU CAMEMBERT DES CAUSES DE DÉPART.
 *
 * ELLES SORTENT DE LA CHARTE MON AMBASSADEUR, et c'est une décision de Jimmy
 * du 19/10, prise après mesure et non par goût.
 *
 * POURQUOI LA CHARTE NE POUVAIT PAS LES PORTER. Myrtille, glycine et ciment
 * forment une palette quasi monochrome : magnifique sur une page, inutilisable
 * pour distinguer neuf tranches qui se touchent. Passée au validateur de la
 * référence dataviz, elle tient à TROIS tranches (écart de la pire paire
 * voisine : 16,0 en vision normale, seuil 15). À quatre elle tombe à 9,6, à
 * six à 4,9 : deux tranches voisines deviennent indistinguables même pour qui
 * voit toutes les couleurs. C'est d'ailleurs pour cela que le camembert des
 * contrats de la page 1 n'a que trois parts.
 *
 * CE QUE ÇA COÛTE, et il faut l'assumer : deux graphiques de la même maison
 * n'ont plus la même palette. Le camembert des contrats reste en charte, celui
 * des causes non.
 *
 * LA PALETTE VIENT DE LA RÉFÉRENCE, pas de mon imagination : ce sont ses huit
 * teintes catégorielles, dans son ordre, qui est précisément l'ordre validé.
 * Vérifié sur la séquence complète de l'anneau :
 *   séparation CVD     : pire paire voisine 9,1 (cible 8)      PASSE
 *   vision normale     : pire paire voisine 19,6 (seuil 15)    PASSE
 * Les deux reproches restants du validateur ne portent que sur les gris, qu'il
 * juge trop clairs et trop peu colorés pour des teintes catégorielles. C'est
 * exactement l'intention : ils disent « ce n'est pas une cause ».
 *
 * L'ORDRE EST CELUI DE ORDRE_CAUSES, CÔTÉ SERVEUR, et l'anneau le suit au lieu
 * de se ranger par volume. Deux raisons, et aucune n'est esthétique. D'abord
 * une couleur doit suivre la CAUSE et jamais son rang : sinon un mois où
 * l'insatisfaction passe devant la faute repeint les deux tranches, et deux
 * captures du même écran ne se comparent plus. Ensuite l'adjacence validée
 * ci-dessus est celle de cet ordre-là ; la laisser varier avec le classement
 * reviendrait à ne plus rien avoir validé du tout.
 *
 * LE TABLEAU À CÔTÉ RESTE TRIÉ PAR VOLUME, lui, et ses pastilles portent les
 * mêmes littéraux : c'est lui qui sert de légende, et c'est aussi le secours
 * que le validateur exige pour les teintes dont le contraste sur fond blanc
 * reste sous 3:1.
 */
export const COULEURS_CAUSE = [
  '#2a78d6', // 0 · faute ou abandon de poste
  '#eb6834', // 1 · arrêt économique du client
  '#1baf7a', // 2 · insatisfaction du client
  '#eda100', // 3 · santé ou raison personnelle
  '#e87ba4', // 4 · démotivation ou conditions
  '#008300', // 5 · décision ou réorganisation
  '#6250d6', // 6 · fin prévue de la mission
  '#e34948', // 7 · départ volontaire
  '#8a8f8c', // 8 · autre mention, un filet et non une cause
  '#c8ccca', // 9 · non renseigné, une absence et non une cause
];

/* Le rang arrive du serveur avec chaque ligne. Le repli sur le dernier gris
   n'est pas de la défiance : si la grille gagne une cause et que l'écran n'a
   pas encore sa couleur, mieux vaut un gris neutre qu'une tranche invisible
   ou qu'un plantage. */
export const couleurCause = (rang) =>
  COULEURS_CAUSE[rang] ?? COULEURS_CAUSE[COULEURS_CAUSE.length - 1];
