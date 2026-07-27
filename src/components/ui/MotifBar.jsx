import { useState, useEffect } from 'react';
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
            // Seuil mini pour rester visible même sous 5% — au-delà de zéro,
            // une valeur reste une valeur, pas une barre invisible.
            width: `${w > 0 ? Math.max(w, 4) : 0}%`,
            background: fillColor,
            opacity: 0.7,
            transition: 'width 0.85s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <span className={styles.val}>{pct}%</span>
        </div>
      </div>
      {count !== undefined && <div className={styles.count}>{count}</div>}
    </div>
  );
}
