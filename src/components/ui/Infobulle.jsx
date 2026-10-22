import { cloneElement, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Infobulle.module.css';

/* Infobulle de survol, au style du dashboard, en remplacement de l'attribut
 * `title` du navigateur.
 *
 * POURQUOI PAS `title` : il met environ une seconde à sortir, n'est pas
 * stylable, se place où le système le décide et ne sait pas afficher plusieurs
 * lignes proprement. Sur le Dash RH il a été cherché sans être trouvé
 * (Jimmy, 22/10 : « où est le pop-up du type de postes ? ») — une information
 * qu'on ne découvre pas n'existe pas.
 *
 * POURQUOI UN PORTAIL, et c'est le cœur du composant. Les cartes de ce dépôt
 * portent `overflow: hidden` ET un `transform` au survol (voir
 * Card.module.css). Les deux sont des pièges connus :
 *   - `overflow: hidden` rogne toute boîte absolue qui dépasse de la carte ;
 *   - un `transform` crée un bloc conteneur, si bien que même `position:
 *     fixed` s'ancre à la carte au lieu de la fenêtre.
 * Le dépôt porte déjà la trace de ce piège, « élever le parent, pas
 * l'infobulle ». Un portail l'évite autrement : le nœud n'est pas un
 * descendant de la carte, donc ni le rognage ni le bloc conteneur ne
 * s'appliquent. Aucune carte n'a besoin d'être modifiée.
 *
 * L'ÉLÉMENT SURVOLÉ N'EST PAS ENVELOPPÉ. Le composant CLONE son enfant pour y
 * poser la référence et les gestionnaires, au lieu de l'entourer d'un span.
 * Un span supplémentaire casserait les mises en page qui comptent sur leurs
 * enfants directs — les neuf segments de BarreEtapes sont des `flex: 1` dans
 * une piste, un parent intermédiaire les écraserait tous dans une seule case.
 *
 * CLAVIER : le focus ouvre l'infobulle comme le survol, et Échap la ferme.
 * TACTILE : rien. Sans survol fiable, une infobulle qui s'ouvre au toucher
 * entre en concurrence avec le geste de défilement ; c'est déjà l'arbitrage
 * de MontantExact dans ce dépôt.
 */

/* Hauteur réservée sous le curseur avant de basculer au-dessus. Généreuse :
   l'infobulle des postes peut porter six lignes. */
const PLACE_DESSOUS = 150;
const LARGEUR_MAX = 300;
const MARGE = 8;

export default function Infobulle({ contenu, children }) {
  const [boite, setBoite] = useState(null);
  const ancre = useRef(null);

  const cacher = useCallback(() => setBoite(null), []);

  const montrer = useCallback(() => {
    const el = ancre.current;
    if (!el || !contenu) return;
    const r = el.getBoundingClientRect();
    const dessous = window.innerHeight - r.bottom > PLACE_DESSOUS;
    /* Le centrage se fait par translateX(-50%) côté CSS ; on borne ici le
       point d'ancrage pour qu'une infobulle au bord de l'écran ne sorte pas
       de la fenêtre. Sur une fenêtre plus étroite que l'infobulle elle-même,
       la borne basse l'emporte et la boîte se cale à gauche. */
    const demi = Math.min(LARGEUR_MAX, window.innerWidth - 2 * MARGE) / 2;
    const x = Math.min(
      Math.max(r.left + r.width / 2, MARGE + demi),
      Math.max(MARGE + demi, window.innerWidth - MARGE - demi),
    );
    setBoite({ x, y: dessous ? r.bottom + 8 : r.top - 8, dessous });
  }, [contenu]);

  /* UNE INFOBULLE EN POSITION FIXE NE SUIT PAS LE DÉFILEMENT : ses coordonnées
     ont été prises au survol et ne valent plus dès que la page bouge. On la
     ferme plutôt que de la laisser flotter à côté de son élément. `capture`
     parce que le défilement peut venir d'un conteneur interne — le corps d'une
     modale, par exemple — et ne remonterait pas jusqu'à window autrement. */
  useEffect(() => {
    if (!boite) return undefined;
    function surEchap(e) { if (e.key === 'Escape') cacher(); }
    window.addEventListener('scroll', cacher, { capture: true, passive: true });
    window.addEventListener('resize', cacher);
    document.addEventListener('keydown', surEchap);
    return () => {
      window.removeEventListener('scroll', cacher, { capture: true });
      window.removeEventListener('resize', cacher);
      document.removeEventListener('keydown', surEchap);
    };
  }, [boite, cacher]);

  if (!contenu) return children;

  return (
    <>
      {cloneElement(children, {
        ref: ancre,
        onMouseEnter: montrer,
        onMouseLeave: cacher,
        onFocus: montrer,
        onBlur: cacher,
      })}
      {boite && createPortal(
        <div
          className={`${styles.bulle} ${boite.dessous ? styles.dessous : styles.dessus}`}
          style={{ left: boite.x, top: boite.y }}
          role="tooltip"
        >
          {contenu}
        </div>,
        document.body,
      )}
    </>
  );
}
