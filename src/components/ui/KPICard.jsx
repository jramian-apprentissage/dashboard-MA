import styles from './KPICard.module.css';

export default function KPICard({ label, value, unit, trend, color = 'default', variant }) {
  const cls = [
    styles.card,
    variant === 'accent'      ? styles.accent      : '',
    variant === 'accent-soft' ? styles.accentSoft  : '',
    color === 'accent'        ? styles.accent       : '',
  ].filter(Boolean).join(' ');

  const valueLen = String(value).length;

  return (
    <div className={cls}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.value}${valueLen > 8 ? ' ' + styles.sm : ''}`}>
        {value}<span className={styles.unit}>{unit}</span>
      </div>
      {trend && (
        <div className={`${styles.trend} ${styles[trend.dir] || ''}`}>
          {/* Icônes "tendance graphique" (trending-up/down) plutôt qu'un chevron,
              qui se lit comme un contrôle cliquable (expand/collapse) et non
              comme un indicateur de hausse/baisse. */}
          {trend.dir === 'up' && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          )}
          {trend.dir === 'down' && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
              <polyline points="16 17 22 17 22 11"/>
            </svg>
          )}
          {trend.text}
        </div>
      )}
    </div>
  );
}
