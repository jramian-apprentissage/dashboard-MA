import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

// Valeur affichée directement sur le bouton (desktop et nav basse mobile) —
// pas de libellé générique type "Filtre" : l'utilisateur voit tout de suite
// la période active sans ouvrir le sélecteur.
export function getPeriodLabel(key, customFrom, customTo) {
  if (key === 'custom' && customFrom && customTo) {
    const short = d => { const [, m, dd] = d.split('-'); return `${dd}/${m}`; };
    return `${short(customFrom)} – ${short(customTo)}`;
  }
  return ALL_PERIODS.find(p => p.key === key)?.label || PERIODS[2].label;
}

// Jamais toISOString() pour une date calendaire : ça convertit en UTC, et
// pour un fuseau en avance sur UTC (Europe/Paris) minuit local retomberait
// sur la veille au moment de la sérialisation.
function dateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

// Grille d'un mois calendaire — lundi en première colonne, cases vides
// avant le 1er du mois (pas de jours du mois adjacent affichés, plus simple
// à lire et suffisant : une plage à cheval sur deux mois se sélectionne en
// changeant de mois entre les deux clics).
function buildCalendarCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // 0=lundi
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    cells.push({ day: d, iso: dateStr(date) });
  }
  return cells;
}
const WEEKDAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function PeriodPicker({ value, customFrom, customTo, onChange, excludeKeys = [], theme = 'default', onClose }) {
  const themeCls = theme === 'asus' ? styles.themeAsus : theme === 'argent' ? styles.themeArgent : theme === 'myrtille' ? styles.themeMyrtille : '';
  const visiblePeriods = excludeKeys.length ? PERIODS.filter(p => !excludeKeys.includes(p.key)) : PERIODS;
  const [open, setOpen] = useState(false);
  // Coordonnées viewport (position:fixed) calculées à l'ouverture
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const dropRef = useRef(null);
  const calRef = useRef(null);

  // Mini-calendrier "Personnaliser" — en pop-up séparé (pas inline dans le
  // dropdown, sinon le panneau s'allonge et pousse tout vers le bas). Ouvert
  // par le clic sur "Personnaliser…", refermé par la croix, un clic hors du
  // panneau, ou automatiquement une fois la 2e date choisie (voir
  // handleDayClick) — l'utilisateur n'a pas de bouton à chercher pour valider.
  const [calOpen, setCalOpen] = useState(false);
  // Mois affiché — recentré sur la date de début déjà choisie (ou
  // aujourd'hui) à chaque ouverture, pour retomber sur un point de départ
  // pertinent plutôt que de garder le mois laissé par une session précédente.
  const [calMonth, setCalMonth] = useState(() => {
    const base = customFrom ? new Date(customFrom) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  useEffect(() => {
    if (!calOpen) return;
    const base = customFrom ? new Date(customFrom) : new Date();
    setCalMonth(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [calOpen]); // eslint-disable-line

  // Rouvrir le picker (le pill) alors que "Personnaliser…" est déjà la
  // période active doit remontrer le calendrier directement, sans exiger un
  // nouveau clic sur "Personnaliser…" — sinon la case cochée sans calendrier
  // visible ne donne aucun moyen évident de rouvrir la sélection. Fermer le
  // picker referme aussi le calendrier, pour ne pas le laisser orphelin.
  useEffect(() => {
    if (open) {
      if (value === 'custom') setCalOpen(true);
    } else {
      setCalOpen(false);
    }
  }, [open]); // eslint-disable-line

  // Fermer au clic extérieur — le dropdown est en portail (voir plus bas),
  // donc physiquement hors de wrapRef dans le DOM : il faut aussi vérifier
  // dropRef, sinon un clic dedans se referme instantanément.
  useEffect(() => {
    function handler(e) {
      const insideWrap = wrapRef.current?.contains(e.target);
      const insideDrop = dropRef.current?.contains(e.target);
      const insideCal  = calRef.current?.contains(e.target);
      if (!insideWrap && !insideDrop && !insideCal) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Position en portail dans document.body (position:fixed, coordonnées
  // calculées ici) plutôt qu'absolute dans son parent : évite que le menu
  // soit tronqué par le overflow:auto d'un conteneur ancêtre (ex. la feuille
  // "Filtre" de BottomNav sur mobile).
  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const dropW = 220;
    // Le calendrier est un pop-up séparé (voir calendarModal) — il n'ajoute
    // plus à la hauteur du dropdown lui-même, seuls Du/Au + Appliquer le
    // rallongent légèrement en mode "custom".
    const dropH = value === 'custom' ? 380 : 320;

    const goRight = rect.left + dropW <= vpW;   // peut s'ouvrir à droite (left du bouton)
    const goDown  = rect.bottom + dropH <= vpH;  // peut s'ouvrir vers le bas

    setCoords({
      top:    goDown  ? rect.bottom + 6 : undefined,
      bottom: !goDown ? vpH - rect.top + 6 : undefined,
      left:   goRight ? rect.left : undefined,
      right:  !goRight ? vpW - rect.right : undefined,
    });
  }, [open, value]);

  const current = ALL_PERIODS.find(p => p.key === value) || ALL_PERIODS.find(p => p.key === 'month');

  // Choisir une période prédéfinie, c'est valider : on referme le menu ET,
  // sur mobile, la feuille "Filtre" qui le contient (onClose). Sans ça la
  // feuille restait ouverte par-dessus le dashboard qu'on venait justement de
  // demander, et il fallait un geste de plus pour voir le résultat — alors
  // que la 2e date de "Personnaliser" refermait déjà tout (handleDayClick).
  // "Personnaliser…" fait exception : la sélection n'est pas finie, le
  // calendrier doit rester visible.
  function selectPeriod(key) {
    if (key !== 'custom') {
      const range = getPeriodRange(key, customFrom, customTo);
      onChange({ key, ...range });
      setOpen(false);
      onClose?.();
    } else {
      onChange({ key: 'custom', from: customFrom, to: customTo });
    }
  }

  function handleCustomDate(field, val) {
    const next = { from: customFrom, to: customTo, [field]: val };
    onChange({ key: 'custom', ...next });
  }

  // Sélection à 2 clics dans le mini-calendrier : 1er clic = date de début
  // (efface une éventuelle fin déjà choisie), 2e clic = date de fin — sauf
  // si elle tombe avant le début, auquel cas on inverse plutôt que de
  // produire une plage invalide. Un clic après une plage déjà complète
  // recommence une nouvelle sélection. Toujours un seul onChange par clic
  // (jamais deux handleCustomDate d'affilée, dont le 2e verrait des props
  // from/to pas encore réactualisées par le 1er).
  function handleDayClick(iso) {
    let nextFrom = customFrom;
    let nextTo = customTo;
    if (!customFrom || customTo) {
      nextFrom = iso;
      nextTo = '';
    } else if (iso < customFrom) {
      nextFrom = iso;
      nextTo = customFrom;
    } else {
      nextTo = iso;
    }
    onChange({ key: 'custom', from: nextFrom, to: nextTo });
    // Plage complète (2e date choisie) — referme tout d'un coup (calendrier,
    // dropdown de périodes, et sur mobile la feuille "Filtre" entière via
    // onClose) : on atterrit directement sur la page, rien à valider ni à
    // fermer soi-même en plus.
    if (nextFrom && nextTo) {
      setCalOpen(false);
      setOpen(false);
      onClose?.();
    }
  }

  const dropdown = open && coords && createPortal(
    <div className={`${styles.dropdown} ${themeCls}`} style={coords} ref={dropRef} data-keep-sheet-open>
      {visiblePeriods.map(p => (
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
        onClick={() => { selectPeriod(CUSTOM_PERIOD.key); setCalOpen(true); }}
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
            onClick={() => { setOpen(false); onClose?.(); }}
            type="button"
          >
            Appliquer
          </button>
        </div>
      )}
    </div>,
    document.body,
  );

  // Mini-calendrier — pop-up séparé, centré à l'écran (pas inline dans le
  // dropdown), pour rester compact quel que soit l'endroit où le picker est
  // ouvert (hero desktop ou feuille "Filtre" mobile).
  const calendarModal = calOpen && value === 'custom' && createPortal(
    <div className={styles.calOverlay} onClick={() => setCalOpen(false)} ref={calRef} data-keep-sheet-open>
      <div className={`${styles.calPanel} ${themeCls}`} onClick={e => e.stopPropagation()}>
        <div className={styles.calPanelHeader}>
          <span className={styles.calPanelTitle}>Choisir la période</span>
          <button type="button" className={styles.calClose} onClick={() => setCalOpen(false)} aria-label="Fermer">✕</button>
        </div>
        <div className={styles.calHeader}>
          <button
            type="button"
            className={styles.calNav}
            onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            aria-label="Mois précédent"
          >‹</button>
          <span className={styles.calLabel}>
            {calMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            className={styles.calNav}
            onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            aria-label="Mois suivant"
          >›</button>
        </div>
        <div className={styles.calWeekdays}>
          {WEEKDAY_LETTERS.map((l, i) => <span key={i}>{l}</span>)}
        </div>
        <div className={styles.calGrid}>
          {buildCalendarCells(calMonth).map((cell, i) => {
            if (!cell) return <span key={i} className={styles.calDayEmpty} />;
            const isStart = cell.iso === customFrom;
            const isEnd = !!customTo && cell.iso === customTo;
            const isSingle = isStart && (!customTo || customFrom === customTo);
            const inRange = customFrom && customTo && cell.iso > customFrom && cell.iso < customTo;
            const cls = [
              styles.calDay,
              isSingle ? styles.calDaySingle : '',
              isStart && !isSingle ? styles.calDayStart : '',
              isEnd && !isSingle ? styles.calDayEnd : '',
              inRange ? styles.calDayInRange : '',
            ].filter(Boolean).join(' ');
            return (
              <button key={i} type="button" className={cls} onClick={() => handleDayClick(cell.iso)}>
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button className={`${styles.pill} ${themeCls}`} onClick={() => setOpen(o => !o)} type="button">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{getPeriodLabel(value, customFrom, customTo)}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {dropdown}
      {calendarModal}
    </div>
  );
}
