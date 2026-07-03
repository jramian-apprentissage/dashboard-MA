import { useEffect, useRef, useState } from 'react';
import styles from './Loader.module.css';

/* Logo soleil décomposé — 8 pétales (2 par côté) + cercle central.
   dx/dy = direction d'explosion de chaque pétale. */
const PETALS = [
  { d: 'M26.4034 114.628C19.4049 116.495 11.6307 114.684 6.14261 109.196C0.654512 103.708 -1.15626 95.9341 0.710972 88.9356L26.4034 114.628Z', dx: -1, dy: 1 },
  { d: 'M114.626 88.9356C116.493 95.934 114.683 103.708 109.195 109.196C103.707 114.684 95.9322 116.495 88.9336 114.628L114.626 88.9356Z', dx: 1, dy: 1 },
  { d: 'M45.2735 104.319C35.9422 106.813 25.5761 104.397 18.2569 97.0782C10.9377 89.759 8.52168 79.3929 11.0147 70.0616L45.2735 104.319Z', dx: -0.7, dy: 0.7 },
  { d: 'M104.316 70.0616C106.809 79.3929 104.393 89.759 97.0743 97.0782C89.755 104.397 79.3889 106.813 70.0577 104.319L104.316 70.0616Z', dx: 0.7, dy: 0.7 },
  { d: 'M18.2569 18.2598C25.5761 10.9407 35.9421 8.52541 45.2735 11.0186L11.0147 45.2764C8.52152 35.945 10.9376 25.579 18.2569 18.2598Z', dx: -0.7, dy: -0.7 },
  { d: 'M70.0577 11.0186C79.389 8.52541 89.755 10.9407 97.0743 18.2598C104.393 25.579 106.81 35.945 104.316 45.2764L70.0577 11.0186Z', dx: 0.7, dy: -0.7 },
  { d: 'M6.14261 6.14555C11.6307 0.652329 19.4049 -1.1585 26.4034 0.713906L0.710972 26.4063C-1.15623 19.4078 0.654533 11.6336 6.14261 6.14555Z', dx: -1, dy: -1 },
  { d: 'M88.9336 0.71293C95.9322 -1.15439 103.707 0.655443 109.195 6.14359C114.683 11.6317 116.493 19.4068 114.626 26.4053L88.9336 0.71293Z', dx: 1, dy: -1 },
];
const CORE = 'M57.6651 29.1426C73.42 29.1426 86.1922 41.9142 86.1924 57.669C86.1924 73.424 73.4201 86.1963 57.6651 86.1963C41.9102 86.1961 29.1387 73.4239 29.1387 57.669C29.139 41.9143 41.9104 29.1428 57.6651 29.1426Z';

/* Marque seule — utilisable inline (boutons, pills) */
export function LoaderMark({ exploding = false, size = 48 }) {
  return (
    <svg
      viewBox="0 0 116 116"
      width={size}
      height={size}
      className={`${styles.mark} ${exploding ? styles.exploded : styles.spinning}`}
      aria-hidden="true"
    >
      {PETALS.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="currentColor"
          className={styles.petal}
          style={{ '--dx': p.dx, '--dy': p.dy, transitionDelay: exploding ? `${i * 22}ms` : '0ms' }}
        />
      ))}
      <path d={CORE} fill="currentColor" className={styles.core} />
    </svg>
  );
}

const EXPLODE_MS = 620;

/* Loader bloc — affiche le logo tournant tant que `loading` est vrai,
   joue l'explosion des pétales, puis rend `children` (élément ou fonction). */
export default function Loader({ loading, label = 'Chargement des données…', size = 52, minHeight = 140, children = null }) {
  const [phase, setPhase] = useState(loading ? 'spin' : 'done');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (loading) {
      setPhase('spin');
      return;
    }
    if (phaseRef.current === 'spin') {
      setPhase('explode');
      const t = setTimeout(() => setPhase('done'), EXPLODE_MS);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (phase === 'done') return typeof children === 'function' ? children() : children;

  return (
    <div className={styles.wrap} style={{ minHeight }} role="status" aria-live="polite">
      <LoaderMark exploding={phase === 'explode'} size={size} />
      {label && <div className={styles.label}>{label}</div>}
    </div>
  );
}
