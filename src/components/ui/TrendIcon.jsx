/* La fleche de tendance du dashboard, extraite de KPICard le 25/10 pour que
 * le tableau de l'evolution annuelle montre EXACTEMENT le meme signe que les
 * tuiles. Jimmy : « avec l'emoji qu'on utilise deja en prod sur la hausse ou
 * la baisse ».
 *
 * CE N'EST PAS UN EMOJI MAIS UN SVG, et c'est voulu : un caractere Unicode se
 * rend differemment d'un systeme a l'autre et ne prend pas la couleur du
 * texte. Celui-ci est dessine en `currentColor`, donc il vire au vert ou au
 * rouge avec la cellule qui le porte.
 *
 * TRENDING-UP ET NON UN CHEVRON : un chevron se lit comme un controle
 * cliquable, pas comme une hausse. Le choix date de KPICard et ne bouge pas.
 *
 * `dir` vaut 'up', 'down' ou autre chose : tout ce qui n'est ni l'un ni
 * l'autre ne dessine RIEN, ce qui est le comportement voulu pour un ecart nul
 * ou pour une valeur qu'on ne sait pas comparer. */
export default function TrendIcon({ dir }) {
  if (dir === 'up') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    );
  }
  if (dir === 'down') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
        <polyline points="16 17 22 17 22 11"/>
      </svg>
    );
  }
  return null;
}
