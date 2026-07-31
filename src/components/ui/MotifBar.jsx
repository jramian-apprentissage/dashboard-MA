import { useState, useEffect } from 'react';
import { fmtNumber } from '../../utils/formatNumber';
import styles from './MotifBar.module.css';

export default function MotifBar({ label, pct, count, fillColor = 'var(--neg)' }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div className={styles.row}>
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
        {pct}%{count !== undefined && <span> → {fmtNumber(count)}</span>}
      </div>
    </div>
  );
}
