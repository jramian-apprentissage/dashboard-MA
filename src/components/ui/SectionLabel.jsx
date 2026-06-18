import styles from './SectionLabel.module.css';

export default function SectionLabel({ children, badge }) {
  return (
    <div className={styles.label}>
      <span>{children}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
    </div>
  );
}
