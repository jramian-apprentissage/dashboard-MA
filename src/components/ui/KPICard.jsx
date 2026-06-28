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
          {trend.dir === 'up' && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          )}
          {trend.dir === 'down' && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
          {trend.text}
        </div>
      )}
    </div>
  );
}
