import { useState, useEffect } from 'react';
import {fmtNumber, fmtPourcentage } from '../../utils/formatNumber';
import styles from './MotifBar.module.css';

/* `extra` : une troisième valeur à droite, après le pourcentage et le compte.
   Ajoutée le 16/10 pour l'ancienneté moyenne par département du Dash RH. La
   colonne de droite s'élargit quand elle est présente — sans cela, les trois
   valeurs se chevauchent dans les 78 px prévus pour deux. Les appels qui ne la
   passent pas gardent exactement la mise en page d'avant. */
export default function MotifBar({ label, pct, count, extra, fillColor = 'var(--neg)', title }) {
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
      <div className={`${styles.val} ${extra !== undefined ? styles.valLarge : ''}`}>
        {/* Virgule décimale française : une part sous 1 % s'écrit « 0,2 % ».
            Les valeurs entières passent inchangées. */}
        {typeof pct === 'number' ? fmtPourcentage(pct) : `${pct}%`}
        {count !== undefined && <span> → {fmtNumber(count)}</span>}
        {extra !== undefined && <span className={styles.extra}>{extra}</span>}
      </div>
    </div>
  );
}
