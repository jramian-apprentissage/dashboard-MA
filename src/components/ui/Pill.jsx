import styles from './Pill.module.css';

const variants = {
  green: styles.green,
  red: styles.red,
  amber: styles.amber,
  blue: styles.blue,
  gray: styles.gray,
  accent: styles.accent,
};

export default function Pill({ children, variant = 'gray' }) {
  return <span className={`${styles.pill} ${variants[variant] || ''}`}>{children}</span>;
}
