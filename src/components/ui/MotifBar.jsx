import { useState, useEffect } from 'react';
import {fmtNumber, fmtPourcentage } from '../../utils/formatNumber';
import styles from './MotifBar.module.css';

/* Une entrée `extra` a existé ici du 16 au 17/10, pour poser l'ancienneté
   moyenne à côté du pourcentage et du nombre sur les barres par département du
   Dash RH. Elle a été retirée avec la colonne qu'elle servait, cette
   ancienneté passant sur la page Mouvements. Elle entraînait toute une
   variante en grille à colonnes fixes : rien ne justifie de la garder sans
   appelant, git la rendra si le besoin revient. */
export default function MotifBar({ label, pct, count, fillColor = 'var(--neg)', title }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    // `title` optionnel : porte la comparaison à la période précédente sans
    // ajouter de colonne — la barre reste lisible d'un coup d'œil, le détail
    // vient au survol pour qui le cherche.
    <div className={styles.row} title={title || undefined}>
      <div className={styles.label}>{label}</div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{
            // Même représentation que le funnel par étape juste au-dessus :
            // barre à l'échelle 0-100%, valeur affichée à droite plutôt que
            // dans la barre (évitait un grand espace blanc visuellement peu
            // clair entre deux valeurs proches, ex. 13% et 35%).
            width: `${w > 0 ? Math.max(w, 4) : 0}%`,
            background: fillColor,
            opacity: 0.7,
            transition: 'width 0.85s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
      <div className={styles.val}>
        {/* Virgule décimale française : une part sous 1 % s'écrit « 0,2 % ».
            Les valeurs entières passent inchangées. */}
        {typeof pct === 'number' ? fmtPourcentage(pct) : `${pct}%`}
        {count !== undefined && <span> → {fmtNumber(count)}</span>}
      </div>
    </div>
  );
}
