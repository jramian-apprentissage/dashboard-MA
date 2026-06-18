import styles from './KPICard.module.css';

/* Ligne Soleil uniforme — la couleur sémantique s'exprime via le trend */
const colorMap = {
  accent:  { accent: 'rgba(255,249,147,0.45)', glow: 'rgba(255,249,147,0.04)' },
  green:   { accent: 'rgba(255,249,147,0.45)', glow: 'rgba(255,249,147,0.04)' },
  red:     { accent: 'rgba(255,249,147,0.45)', glow: 'rgba(255,249,147,0.04)' },
  amber:   { accent: 'rgba(255,249,147,0.45)', glow: 'rgba(255,249,147,0.04)' },
  blue:    { accent: 'rgba(255,249,147,0.45)', glow: 'rgba(255,249,147,0.04)' },
  purple:  { accent: 'rgba(255,249,147,0.45)', glow: 'rgba(255,249,147,0.04)' },
};

export default function KPICard({ label, value, unit, trend, color = 'accent' }) {
  const { accent, glow } = colorMap[color] || colorMap.accent;
  return (
    <div
      className={styles.card}
      style={{ '--kpi-accent': accent, '--kpi-glow': glow }}
    >
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>
        {value}<span className={styles.unit}>{unit}</span>
      </div>
      {trend && (
        <div className={`${styles.trend} ${styles[trend.dir]}`}>
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
