import { useCallback, useEffect, useRef, useState } from 'react';

/* Mesure la largeur RÉELLE d'un élément, pas celle de la fenêtre.
 *
 * POURQUOI PAS UNE MÉDIA-REQUÊTE, qui aurait été plus courte. Parce que la
 * question n'est pas « sommes-nous sur un téléphone » mais « cette carte
 * a-t-elle la place ». Un graphique de douze mois porte vingt-quatre barres :
 * il est à l'aise sur une carte pleine largeur, serré sur une demi-rangée, et
 * illisible sur un téléphone. Or la même carte passe de l'un à l'autre selon
 * ce qu'on pose à côté d'elle, et une média-requête sur la fenêtre ne voit
 * rien de tout cela. Jimmy l'a signalé le 17/10 : une carte doit rejoindre le
 * graphique des mouvements sur desktop, ce qui le ramène à une demi-largeur
 * sans que la fenêtre ait bougé.
 *
 * CE QUI SE DÉCIDE AILLEURS : le seuil. Ce crochet ne rend qu'une largeur en
 * pixels, l'appelant en tire ce qu'il veut. Il n'a donc rien à savoir des
 * mois, des barres ni des points de rupture du projet.
 *
 * ResizeObserver et pas un écouteur de `resize` : il voit aussi les
 * changements qui ne viennent PAS de la fenêtre, un volet qui s'ouvre ou une
 * grille qui se reconfigure, ce qui est précisément le cas visé.
 */
export function useLargeurElement() {
  const [largeur, setLargeur] = useState(0);
  const observateur = useRef(null);

  /* Un ref en CALLBACK, pas un useRef : l'élément observé disparaît et
     réapparaît quand la carte passe de son état de chargement à son contenu.
     Un useRef + useEffect observerait le premier nœud et raterait le second. */
  const ref = useCallback(node => {
    if (observateur.current) { observateur.current.disconnect(); observateur.current = null; }
    if (!node) return;
    if (typeof ResizeObserver === 'undefined') { setLargeur(node.getBoundingClientRect().width); return; }
    observateur.current = new ResizeObserver(entrees => {
      const e = entrees[0];
      if (e) setLargeur(e.contentRect.width);
    });
    observateur.current.observe(node);
    setLargeur(node.getBoundingClientRect().width);
  }, []);

  useEffect(() => () => observateur.current?.disconnect(), []);

  return [ref, largeur];
}
