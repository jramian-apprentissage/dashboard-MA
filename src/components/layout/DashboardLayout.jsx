import { useSearchParams } from 'react-router-dom';
import PeriodPicker from '../ui/PeriodPicker';
import { usePeriod } from '../../contexts/PeriodContext';
import defaultHeroBg from '../../assets/bg.svg';
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

export default function DashboardLayout({
  dashboardName,
  dashboardNameEmphasis,
  children,
  extraFilters,
  activeFilters = [],
  heroBgSrc,
  heroBgPosition = 'center 55%',
}) {
  const [searchParams] = useSearchParams();

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

      {/* ── Hero header ── */}
      <div className={styles.hero}>
        <div className={styles.heroBg} style={{ backgroundImage: `url(${heroBgSrc || defaultHeroBg})`, backgroundPosition: heroBgPosition }} />
        <div className={styles.heroOverlay} />

        <div className={styles.heroInner}>

          {/* Titre seul à gauche */}
          <div className={styles.heroTitleBlock}>
            <h1 className={styles.title}>
              {dashboardName}
              {dashboardNameEmphasis && <em className={styles.titleEm}> {dashboardNameEmphasis}.</em>}
            </h1>
            <p className={styles.subtitle}>
              Vous analysez les KPI&nbsp;
              <span className={styles.subtitlePeriod}>{subtitle}</span>
            </p>
          </div>

          {/* Tous les contrôles regroupés à droite en bas */}
          <div className={styles.heroBottom}>
            <div className={styles.heroActions}>
              {extraFilters}

              <PeriodPicker
                value={periodKey}
                customFrom={customFrom}
                customTo={customTo}
                onChange={onChange}
              />

              <div className={styles.compareWrap}>
                <button
                  className={`${styles.heroBtn} ${compareActive ? styles.heroBtnActive : ''}`}
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
                    <span className={styles.heroBtnX} onClick={e => { e.stopPropagation(); toggleCompare(); }}>✕</span>
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

        </div>
      </div>

      {/* ── Contenu principal ── */}
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
