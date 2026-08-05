/* Filtrage texte des listes de cartes (opportunités sans prochaine action,
   santé par client). Séparé du composant RechercheListe : un fichier qui
   exporte à la fois un composant et des fonctions casse le rechargement à
   chaud de Vite (react-refresh/only-export-components). */

// Insensible aux accents ET à la casse : « mediatechnologie » doit trouver
// « MEDIA TECHNOLOGIE ». Personne ne tape les accents dans un champ de
// recherche — même normalisation que le menu « / » de l'assistante IA.
export function normaliserRecherche(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Vrai si `terme` est vide (donc pas de filtre) ou contenu dans l'un des
// champs passés. Le terme est cherché tel quel, sans découpage en mots : sur
// des noms de sociétés, une recherche par sous-chaîne est plus prévisible.
export function correspond(terme, ...champs) {
  const t = normaliserRecherche(terme).trim();
  if (!t) return true;
  return champs.some(c => normaliserRecherche(c).includes(t));
}
