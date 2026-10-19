/* LES COULEURS DU CAMEMBERT DES CAUSES DE DÉPART.
 *
 * ELLES VIENNENT DU DASHBOARD COMMERCIAL, famille par famille, et c'est une
 * demande de Jimmy du 19/10 : « tu peux pas appliquer les mêmes couleurs de
 * camembert que ce qu'on a sur commercial ». Elles remplacent les huit teintes
 * de la référence dataviz, justes mais étrangères à la maison.
 *
 * LES LITTÉRAUX SONT LES VALEURS APLATIES SUR FOND BLANC des rgba employés
 * dans FocusCommercial.jsx et FocusClient.jsx. Les cartes sont blanches, donc
 * le rendu est identique ; et comme ce sont exactement les valeurs passées au
 * validateur, ce qui s'affiche est ce qui a été vérifié. L'origine de chacune
 * est notée en face pour qu'on puisse la retrouver là-bas.
 *
 * L'ORDRE N'EST PAS CELUI DE LA PALETTE COMMERCIALE, il a été cherché. Dans
 * l'ordre naturel, sauge et bleu poussière tombaient côte à côte : écart de
 * 9,7 en vision normale, sous le seuil de 15, donc deux tranches voisines
 * qu'on ne distingue pas. Les 40 320 permutations ont été parcourues pour
 * maximiser la pire paire voisine de l'ANNEAU, bouclage compris.
 *
 * VÉRIFIÉ AU VALIDATEUR DE LA RÉFÉRENCE sur la séquence réellement rendue :
 *   séparation CVD  : pire paire voisine 11,3 (cible 8)     PASSE
 *   vision normale  : pire paire voisine 15,7 (seuil 15)    PASSE
 * Les deux reproches restants portent sur la bande de clarté et la saturation :
 * la palette Mon Ambassadeur est pastel, c'est son parti pris, et le validateur
 * la trouve logiquement trop douce. Le troisième, le contraste sous 3:1, exige
 * un secours : c'est le tableau à côté, qui sert de légende.
 *
 * LE CIMENT FERME LA MARCHE, comme AUTRES_SOURCE_COLOR le fait déjà sur le
 * camembert des sources du dashboard commercial. L'anneau boucle donc du gris
 * vers la myrtille sombre, et non vers un bleu : c'est précisément le raccord
 * que Jimmy a trouvé immonde dans la version précédente.
 *
 * L'ORDRE EST CELUI DE ORDRE_CAUSES, CÔTÉ SERVEUR, et l'anneau le suit au lieu
 * de se ranger par volume. Deux raisons, aucune esthétique. Une couleur doit
 * suivre la CAUSE et jamais son rang : sinon un mois où l'insatisfaction passe
 * devant la faute repeint les deux tranches, et deux captures du même écran ne
 * se comparent plus. Et l'adjacence validée ci-dessus est celle de cet ordre ;
 * la laisser varier avec le classement reviendrait à n'avoir rien validé.
 */
export const COULEURS_CAUSE = [
  '#51324b', // 0 · faute ou abandon       — myrtille,       rgba(38,0,31,0.80)
  '#95bacb', // 1 · arrêt économique       — bleu poussière, rgba(123,170,191,0.80)
  '#fff998', // 2 · insatisfaction client  — soleil,         rgba(255,249,147,0.95)
  '#bea9d2', // 3 · santé ou perso         — lavande,        rgba(169,141,196,0.75)
  '#dcb96e', // 4 · démotivation           — ocre,           rgba(212,168,75,0.80)
  '#967c91', // 5 · décision ou réorg.     — glycine encre,  rgba(116,81,110,0.75)
  '#a4d8ba', // 6 · fin prévue             — sauge,          rgba(142,207,170,0.80)
  '#cc9980', // 7 · départ volontaire      — terracotta,     rgba(196,135,106,0.85)
  /* 8 · autre mention. Un filet, pas une cause, donc un neutre. Il est FONCÉ
     et non ciment clair : deux gris voisins tombaient à 6,4 en vision normale,
     soit deux tranches confondues. Le cas est rare, la case ne se remplit que
     si la grille de lecture a pris du retard sur le vocabulaire de la saisie,
     mais le jour où il arrive il doit se voir. */
  '#6f7472',
  /* 9 · non renseigné. Le ciment du dashboard commercial, celui de sa tranche
     « Autres ». Une absence, pas une cause : il ne doit pas réclamer l'œil
     alors qu'il pèse la moitié du cercle. */
  '#d2d5d3',
];

/* Le rang arrive du serveur avec chaque ligne. Le repli sur le dernier neutre
   n'est pas de la défiance : si la grille gagne une cause et que l'écran n'a
   pas encore sa couleur, mieux vaut un gris qu'une tranche invisible ou qu'un
   plantage. */
export const couleurCause = (rang) =>
  COULEURS_CAUSE[rang] ?? COULEURS_CAUSE[COULEURS_CAUSE.length - 1];
