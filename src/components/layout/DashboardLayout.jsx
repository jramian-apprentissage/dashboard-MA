import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ dashboardName, children }) {
  return (
    <div className={styles.shell}>
      {/* Barre de filtres — fond blanc, sticky */}
      <div className={styles.filterBar}>
        <h1 className={styles.title}>{dashboardName}</h1>
        <div className={styles.filters}>
          <div className={styles.periodPill}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Jan – Jun 2025
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
