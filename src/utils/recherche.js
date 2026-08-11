/* Filtrage texte des listes de cartes (voir components/ui/RechercheListe.jsx).

   À part du composant : un fichier qui exporte un composant React ne doit
   exporter que ça, sinon le rafraîchissement à chaud de Vite cesse de
   fonctionner sur ce fichier (règle react-refresh/only-export-components). */

// Insensible aux accents ET à la casse : « mediatechnologie » doit trouver
// « MEDIA TECHNOLOGIE ». Personne ne tape les accents dans un champ de
// recherche. Même normalisation que le menu « / » de l'assistante IA.
export function normaliserRecherche(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Vrai si le terme est vide (aucun filtre actif) ou contenu dans l'un des
// champs fournis. Les champs nuls sont ignorés sans planter.
export function correspond(terme, ...champs) {
  const t = normaliserRecherche(terme).trim();
  if (!t) return true;
  return champs.some(c => normaliserRecherche(c).includes(t));
}
