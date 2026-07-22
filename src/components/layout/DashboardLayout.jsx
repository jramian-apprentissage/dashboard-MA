import { useSearchParams } from 'react-router-dom';
import PeriodPicker from '../ui/PeriodPicker';
import { usePeriod } from '../../contexts/PeriodContext';
import defaultHeroBg from '../../assets/bg.svg';
import styles from './DashboardLayout.module.css';

const PERIOD_LABELS = {
  today:          "d'aujourd'hui",
  yesterday:      "d'hier",
  month:          "du mois en cours",
  'last-month':   "du mois précédent",
  week:           "de la semaine en cours",
  'last-week':    "de la semaine précédente",
  quarter:        "du trimestre en cours",
  'last-quarter': "du trimestre précédent",
};

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function buildPeriodLabel(key, customFrom, customTo) {
  if (key === 'custom' && customFrom && customTo)
    return `du ${fmtDate(customFrom)} au ${fmtDate(customTo)}`;
  return PERIOD_LABELS[key] || 'de la période sélectionnée';
}

export default function DashboardLayout({
  dashboardName,
  dashboardNameEmphasis,
  tabLabel,
  children,
  extraFilters,
  activeFilters = [],
  heroBgSrc,
  heroBgPosition = 'center 55%',
  onExtraire,
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
              Vous analysez les KPIs&nbsp;
              <span className={styles.subtitlePeriod}>{subtitle}</span>
            </p>
            {tabLabel && <p className={styles.tabBadge}>{tabLabel}</p>}
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

              {onExtraire && (
                <button
                  className={styles.heroBtn}
                  onClick={onExtraire}
                  type="button"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Extraire
                </button>
              )}

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
