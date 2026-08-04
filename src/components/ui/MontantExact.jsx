import { useState, useRef, useEffect } from 'react';
import styles from './MontantExact.module.css';

/* Montant abrégé (« 5 K€ ») dont on peut lire la valeur exacte.

   Même principe que la prop `exactValue` de KPICard, mais pour les montants
   qui ne sont PAS dans une carte : cellules de tableau, listes, barres.
   Une carte peut se retourner ; une cellule de tableau, non — d'où un
   composant distinct plutôt qu'une réutilisation forcée de KPICard.

   - Ordinateur : infobulle au survol (gate `@media (hover: hover)`).
   - Tactile : un tap remplace la valeur abrégée par la valeur exacte, un
     second tap revient. Retour automatique après 5 s comme sur les cartes,
     pour que la valeur abrégée réapparaisse même si l'utilisateur passe à
     autre chose.

   `children` porte l'affichage abrégé (déjà formaté par l'appelant), `exact`
   la valeur complète. */

const DUREE_MS = 5000;

export default function MontantExact({ children, exact, className = '' }) {
  const [montreExact, setMontreExact] = useState(false);
  const minuteur = useRef(null);

  useEffect(() => () => clearTimeout(minuteur.current), []);

  function onClick(e) {
    if (!exact) return;
    // Sur un appareil à survol, l'infobulle suffit — on ne veut pas qu'un
    // clic de souris remplace la valeur affichée.
    if (typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    // La ligne entière peut être cliquable (tri, navigation) : ne pas
    // déclencher ces actions en voulant seulement lire un montant.
    e.stopPropagation();
    clearTimeout(minuteur.current);
    if (montreExact) { setMontreExact(false); return; }
    setMontreExact(true);
    minuteur.current = setTimeout(() => setMontreExact(false), DUREE_MS);
  }

  if (!exact) return <span className={className}>{children}</span>;

  return (
    <span className={`${styles.wrap} ${className}`} onClick={onClick}>
      {montreExact ? <span className={styles.exactInline}>{exact}</span> : children}
      <span className={styles.tooltip}>{exact}</span>
    </span>
  );
}
