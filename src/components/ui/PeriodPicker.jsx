import { useState, useRef, useEffect } from 'react';
import styles from './PeriodPicker.module.css';

const PERIODS = [
  { key: 'today',         label: "Aujourd'hui" },
  { key: 'yesterday',     label: 'Hier' },
  { key: 'month',         label: 'Mois en cours' },
  { key: 'last-month',    label: 'Mois précédent' },
  { key: 'week',          label: 'Semaine en cours' },
  { key: 'last-week',     label: 'Semaine précédente' },
  { key: 'quarter',       label: 'Trimestre en cours' },
  { key: 'last-quarter',  label: 'Trimestre précédent' },
];
const CUSTOM_PERIOD = { key: 'custom', label: 'Personnaliser…' };
const ALL_PERIODS = [...PERIODS, CUSTOM_PERIOD];

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

export function getPeriodRange(key, customFrom, customTo) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  switch (key) {
    case 'today':
      return { from: dateStr(today), to: dateStr(today) };

    case 'yesterday': {
      const d = new Date(today); d.setDate(d.getDate() - 1);
      return { from: dateStr(d), to: dateStr(d) };
    }

    case 'week': {
      const d = new Date(today);
      const day = today.getDay() || 7;
      d.setDate(today.getDate() - day + 1);
      return { from: dateStr(d), to: dateStr(today) };
    }

    case 'month':
      return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: dateStr(today) };

    case 'last-week': {
      const d = new Date(today);
      const day = today.getDay() || 7;
      d.setDate(today.getDate() - day + 1 - 7);
      const end = new Date(d); end.setDate(d.getDate() + 6);
      return { from: dateStr(d), to: dateStr(end) };
    }

    case 'last-month': {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const lastDay = new Date(ly, lm + 1, 0).getDate();
      return {
        from: `${ly}-${String(lm + 1).padStart(2, '0')}-01`,
        to:   `${ly}-${String(lm + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    }

    case 'quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return { from: `${y}-${String(qStart + 1).padStart(2, '0')}-01`, to: dateStr(today) };
    }

    case 'last-quarter': {
      const qStart = Math.floor(m / 3) * 3;
      const lqStartAbs = qStart - 3; // peut être négatif → bascule année précédente
      const lqYear  = lqStartAbs < 0 ? y - 1 : y;
      const lqStart = lqStartAbs < 0 ? lqStartAbs + 12 : lqStartAbs;
      const lqEnd   = lqStart + 2;
      const lastDay = new Date(lqYear, lqEnd + 1, 0).getDate();
      return {
        from: `${lqYear}-${String(lqStart + 1).padStart(2, '0')}-01`,
        to:   `${lqYear}-${String(lqEnd + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    }

    case 'custom':
      return { from: customFrom, to: customTo };

    default:
      return { from: dateStr(today), to: dateStr(today) };
  }
}

export default function PeriodPicker({ value, customFrom, customTo, onChange }) {
  const [open, setOpen] = useState(false);
  // 'down-left' | 'down-right' | 'up-left' | 'up-right'
  const [placement, setPlacement] = useState('down-left');
  const wrapRef = useRef(null);
  const dropRef = useRef(null);

  // Fermer au clic extérieur
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-flip : calcule si le dropdown sort de l'écran
  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const dropW = 220;
    const dropH = 320; // estimation max

    const goRight = rect.left + dropW <= vpW;   // peut s'ouvrir à droite (left:0)
    const goDown  = rect.bottom + dropH <= vpH;  // peut s'ouvrir vers le bas

    const h = goRight ? 'left' : 'right';
    const v = goDown  ? 'down' : 'up';
    setPlacement(`${v}-${h}`);
  }, [open]);

  const current = ALL_PERIODS.find(p => p.key === value) || ALL_PERIODS.find(p => p.key === 'month');

  function selectPeriod(key) {
    if (key !== 'custom') {
      const range = getPeriodRange(key, customFrom, customTo);
      onChange({ key, ...range });
      setOpen(false);
    } else {
      onChange({ key: 'custom', from: customFrom, to: customTo });
    }
  }

  function handleCustomDate(field, val) {
    const next = { from: customFrom, to: customTo, [field]: val };
    onChange({ key: 'custom', ...next });
  }

  // Style dynamique du dropdown selon le placement calculé
  const dropStyle = {
    ...(placement.startsWith('down') ? { top: 'calc(100% + 6px)' } : { bottom: 'calc(100% + 6px)' }),
    ...(placement.endsWith('left')   ? { left: 0 }                  : { right: 0 }),
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button className={styles.pill} onClick={() => setOpen(o => !o)} type="button">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{current.label}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown} style={dropStyle} ref={dropRef}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`${styles.option} ${value === p.key ? styles.optionActive : ''}`}
              onClick={() => selectPeriod(p.key)}
              type="button"
            >
              {value === p.key
                ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={styles.check}><polyline points="20 6 9 17 4 12"/></svg>
                : <span className={styles.checkPlaceholder} />
              }
              {p.label}
            </button>
          ))}

          <div className={styles.optionSep} />
          <button
            className={`${styles.option} ${value === CUSTOM_PERIOD.key ? styles.optionActive : ''}`}
            onClick={() => selectPeriod(CUSTOM_PERIOD.key)}
            type="button"
          >
            {value === CUSTOM_PERIOD.key
              ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={styles.check}><polyline points="20 6 9 17 4 12"/></svg>
              : <span className={styles.checkPlaceholder} />
            }
            {CUSTOM_PERIOD.label}
          </button>

          {value === 'custom' && (
            <div className={styles.customRange}>
              <div className={styles.customRow}>
                <label className={styles.customLbl}>Du</label>
                <input
                  type="date"
                  className={styles.customInput}
                  value={customFrom}
                  onChange={e => handleCustomDate('from', e.target.value)}
                />
              </div>
              <div className={styles.customRow}>
                <label className={styles.customLbl}>Au</label>
                <input
                  type="date"
                  className={styles.customInput}
                  value={customTo}
                  onChange={e => handleCustomDate('to', e.target.value)}
                />
              </div>
              <button
                className={styles.applyBtn}
                onClick={() => setOpen(false)}
                type="button"
              >
                Appliquer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
