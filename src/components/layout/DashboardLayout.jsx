import PeriodPicker from '../ui/PeriodPicker';
import { usePeriod } from '../../contexts/PeriodContext';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ dashboardName, children, extraFilters }) {
  const {
    periodKey, customFrom, customTo, onChange,
    compareActive, comparePeriodKey, compareFrom, compareTo,
    toggleCompare, onCompareChange,
  } = usePeriod();

  return (
    <div className={styles.shell}>
      {/* Barre de filtres — fond blanc, sticky */}
      <div className={styles.filterBar}>
        <h1 className={styles.title}>{dashboardName}</h1>
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
