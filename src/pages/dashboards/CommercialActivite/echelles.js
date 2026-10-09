/* Échelles de couleur des tableaux par collaborateur, Sales et TLM.
 *
 * POURQUOI CE FICHIER — les deux tableaux coloriaient n'importe comment, et
 * Clémence l'a relevé le 08/10 : « vérifier le sens des couleurs, un meilleur
 * résultat ne doit pas être visuellement présenté comme moins bon », et
 * « adapter les échelles de couleur à chaque indicateur, ne pas appliquer
 * partout les mêmes seuils ».
 *
 * Trois défauts étaient à corriger.
 *
 * 1. La couleur portait sur le VOLUME alors qu'elle décrivait un TAUX. La
 *    colonne « Échanges > 1s » affichait un nombre d'appels, teinté selon le
 *    taux de décroché, lui-même visible seulement au survol. L'œil lisait donc
 *    une couleur qui ne qualifiait pas le chiffre affiché.
 *
 * 2. « RDV pris », « RDV honorés » et « Taux RDV honorés » étaient verts dès
 *    que la valeur existait : `row.rdvPris != null ? 'var(--pos)' : undefined`.
 *    Zéro rendez-vous s'affichait en vert comme dix. Ce n'est pas une échelle,
 *    c'est une décoration, et elle présentait un mauvais résultat comme bon.
 *
 * 3. Aucun garde-fou sur les petits effectifs. Sur septembre, six
 *    collaborateurs sur dix ont moins de cinq rendez-vous échus : un seul
 *    rendez-vous honoré affiche 100 % en vert, un seul manqué affiche 0 % en
 *    rouge. On colorie du bruit.
 *
 * LES SEUILS CI-DESSOUS SONT A ARBITRER. Clémence a été explicite : « les
 * seuils que je te donne oralement sont des exemples à définir, pas des
 * objectifs validés ». Ils sont calés sur la distribution observée, pas sur
 * un objectif commercial, et ils vivent ici pour être changés en un endroit.
 */

/* En dessous de ce nombre d'observations, un taux ne veut rien dire et reste
 * donc en gris. Cinq est le seuil retenu faute d'objectif : sur septembre il
 * laisse en gris les six collaborateurs à moins de cinq rendez-vous échus. */
export const MIN_OBSERVATIONS = 5;

export const SEUILS = {
  /* Décroché de plus d'une seconde, rapporté aux appels émis. Mesuré entre
     59 % et 92 % selon les collaborateurs, médiane 85 %. */
  decroche1s: { bon: 85, moyen: 70 },
  /* Échanges de plus de trente secondes, rapportés aux appels émis. Barème
     d'origine, qui visait précisément cette métrique. */
  echange30s: { bon: 35, moyen: 25 },
  /* Rendez-vous honorés rapportés aux rendez-vous dont le créneau est passé.
     Distribution de septembre : 100, 100, 100, 100, 92, 80, 50, 50, 33, 0. */
  rdvHonores: { bon: 80, moyen: 60 },
  /* Transformation nette : rendez-vous pris sur appels émis hors data non
     exploitable. Les valeurs sont de l'ordre du pour cent, pas de la dizaine. */
  transfoNette: { bon: 2, moyen: 1 },
};

/* Rend la couleur d'un taux, ou undefined quand il ne faut pas colorier.
 *
 *   taux          la valeur en pourcentage, ou null
 *   seuils        { bon, moyen } pris dans SEUILS
 *   observations  le dénominateur du taux, pour écarter les petits effectifs
 */
export function couleurTaux(taux, seuils, observations = Infinity) {
  if (taux == null || !seuils) return undefined;
  if (observations < MIN_OBSERVATIONS) return 'var(--text3)';
  if (taux >= seuils.bon) return 'var(--pos)';
  if (taux >= seuils.moyen) return 'var(--warn)';
  return 'var(--neg)';
}

/* Le titre au survol, qui dit pourquoi un taux n'est pas colorié. Sans lui,
 * le gris passe pour un bug. */
export function titreTaux(taux, observations, libelleObservations) {
  if (taux == null) return undefined;
  if (observations < MIN_OBSERVATIONS) {
    return `Taux non qualifié : ${observations} ${libelleObservations}, c'est trop peu `
      + `pour en tirer une tendance.`;
  }
  return undefined;
}
