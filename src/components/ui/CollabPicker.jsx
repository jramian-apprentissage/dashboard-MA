import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './CollabPicker.module.css';

/* Remplace le <select> natif du filtre collaborateur : la liste déroulante
   d'un <select> est rendue par l'OS/le navigateur, hors de portée du CSS
   (le "Tous" sélectionné ressort en bleu système quel que soit le thème de
   la page — voir capture Jimmy). Même mécanique de popup que PeriodPicker
   (portail, coordonnées viewport, thème par dashboard) pour que ce filtre
   ait enfin la même cohérence visuelle que Comparer/période. */
export default function CollabPicker({ value, options, onChange, theme = 'default', ariaLabel = 'Filtrer par collaborateur' }) {
  const themeCls = theme === 'asus' ? styles.themeAsus : theme === 'argent' ? styles.themeArgent : theme === 'myrtille' ? styles.themeMyrtille : '';
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      const insideWrap = wrapRef.current?.contains(e.target);
      const insideDrop = dropRef.current?.contains(e.target);
      if (!insideWrap && !insideDrop) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const dropW = 160;
    const dropH = Math.min(300, 38 * options.length + 12);
    const goRight = rect.left + dropW <= vpW;
    const goDown = rect.bottom + dropH <= vpH;
    setCoords({
      top:    goDown  ? rect.bottom + 6 : undefined,
      bottom: !goDown ? vpH - rect.top + 6 : undefined,
      left:   goRight ? rect.left : undefined,
      right:  !goRight ? vpW - rect.right : undefined,
    });
  }, [open, options.length]);

  function select(v) {
    onChange(v);
    setOpen(false);
  }

  const dropdown = open && coords && createPortal(
    <div className={`${styles.dropdown} ${themeCls}`} style={coords} ref={dropRef} data-keep-sheet-open>
      {options.map(o => (
        <button
          key={o}
          type="button"
          className={`${styles.option} ${value === o ? styles.optionActive : ''}`}
          onClick={() => select(o)}
        >
          {value === o
            ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={styles.check}><polyline points="20 6 9 17 4 12"/></svg>
            : <span className={styles.checkPlaceholder} />
          }
          {o}
        </button>
      ))}
    </div>,
    document.body,
  );

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" className={`${styles.pill} ${themeCls}`} onClick={() => setOpen(o => !o)} aria-label={ariaLabel}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span>{value}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
