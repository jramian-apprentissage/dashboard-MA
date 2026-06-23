import PeriodPicker from '../ui/PeriodPicker';
import { usePeriod } from '../../contexts/PeriodContext';
import styles from './DashboardLayout.module.css';

const PERIOD_LABELS = {
  today:        "aujourd'hui",
  yesterday:    "hier",
  week:         "la semaine en cours",
  month:        "le mois en cours",
  'last-week':  "la semaine dernière",
  'last-month': "le mois précédent",
  quarter:      "le trimestre en cours",
};

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function buildPeriodLabel(key, customFrom, customTo) {
  if (key === 'custom' && customFrom && customTo)
    return `du ${fmtDate(customFrom)} au ${fmtDate(customTo)}`;
  return PERIOD_LABELS[key] || 'la période sélectionnée';
}

export default function DashboardLayout({ dashboardName, children, extraFilters, activeFilters = [] }) {
  const {
    periodKey, customFrom, customTo, onChange,
    compareActive, comparePeriodKey, compareFrom, compareTo,
    toggleCompare, onCompareChange,
  } = usePeriod();

  const periodLabel = buildPeriodLabel(periodKey, customFrom, customTo);
  const filterParts = activeFilters.filter(Boolean);
  const subtitle = filterParts.length > 0
    ? `${periodLabel} · ${filterParts.join(' · ')}`
    : periodLabel;

  return (
    <div className={styles.shell}>
      {/* Barre de filtres — fond blanc, sticky */}
      <div className={styles.filterBar}>

        {/* Titre + sous-titre */}
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{dashboardName}</h1>
          <p className={styles.subtitle}>
            Vous analysez les KPI&nbsp;
            <span className={styles.subtitlePeriod}>{subtitle}</span>
          </p>
        </div>

        <div className={styles.filters}>
          {extraFilters}

          <PeriodPicker
            value={periodKey}
            customFrom={customFrom}
            customTo={customTo}
            onChange={onChange}
          />

          {/* Bouton Comparer + picker période de comparaison */}
          <div className={styles.compareWrap}>
            <button
              className={`${styles.compareBtn} ${compareActive ? styles.compareBtnActive : ''}`}
              onClick={toggleCompare}
              type="button"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
                <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
                <line x1="12" y1="3" x2="12" y2="21"/>
              </svg>
              Comparer
              {compareActive && (
                <span
                  className={styles.compareBtnX}
                  onClick={e => { e.stopPropagation(); toggleCompare(); }}
                >✕</span>
              )}
            </button>
            {compareActive && (
              <PeriodPicker
                value={comparePeriodKey}
                customFrom={compareFrom}
                customTo={compareTo}
                onChange={onCompareChange}
              />
            )}
          </div>
          <div className={styles.mockPill}>
            <span className={styles.dot} />
            Mock
          </div>
        </div>
      </div>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
