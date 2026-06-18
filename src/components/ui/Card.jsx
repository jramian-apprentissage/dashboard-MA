import styles from './Card.module.css';

export default function Card({ title, icon, badge, children, className = '' }) {
  return (
    <div className={`${styles.card} ${className}`}>
      {(title || badge) && (
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <div className={styles.headerRight}>
            {badge && <span className={styles.badge}>{badge}</span>}
            {icon && <span className={styles.icon}>{icon}</span>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
