import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DASHBOARDS } from '../../contexts/AuthContext';
import { usePeriod } from '../../contexts/PeriodContext';
import { useExtraFilters } from '../../contexts/ExtraFiltersContext';
import { DASHBOARD_ROUTES, DASHBOARD_DEFAULT_TAB } from '../../data/dashboardTabs';
import PeriodPicker from '../ui/PeriodPicker';
import styles from './BottomNav.module.css';

/* Barre de navigation mobile — remplace le dropdown du haut, illisible et non
   scalable à 4-5 dashboards (voir Topbar.jsx). 4 boutons fixes en bas, dans
   l'esprit d'une bottom-bar TikTok/Instagram : Page (changer de dashboard),
   Filtre (période), Comparer, Menu (compte). Chaque bouton ouvre une feuille
   qui glisse depuis le bas plutôt qu'un dropdown flottant, plus adapté au
   pouce. Repose sur PeriodContext, déjà global — fonctionne donc même si
   la page courante n'est pas un dashboard (Filtre/Comparer sont alors
   simplement sans effet visible, aucun consommateur ne lit l'état). */
export default function BottomNav() {
  const { user, logout, hasAccessToDashboard } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheet, setSheet] = useState(null); // 'page' | 'filtre' | 'comparer' | 'menu' | null
  const sheetRef = useRef(null);

  const {
    periodKey, customFrom, customTo, onChange,
    compareActive, comparePeriodKey, compareFrom, compareTo,
    toggleCompare, onCompareChange,
  } = usePeriod();
  const { node: extraFiltersNode } = useExtraFilters();

  useEffect(() => {
    function handler(e) {
      if (!sheet) return;
      if (sheetRef.current && !sheetRef.current.contains(e.target) && !e.target.closest('[data-bn-btn]')) {
        setSheet(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sheet]);

  // Fermer la feuille ouverte à chaque changement de route (sélection d'une page)
  useEffect(() => { setSheet(null); }, [location.pathname, location.search]);

  if (!user) return null; // page de login

  const accessible = DASHBOARDS.filter(d => hasAccessToDashboard(user, d.id));
  const pageItems = [
    ...(hasAccessToDashboard(user, 'home') ? [{ id: 'home', label: 'Accueil', to: '/' }] : []),
    ...accessible.map(d => ({
      id: d.id,
      label: d.label,
      to: DASHBOARD_DEFAULT_TAB[d.id] ? `${DASHBOARD_ROUTES[d.id]}?tab=${DASHBOARD_DEFAULT_TAB[d.id]}` : DASHBOARD_ROUTES[d.id],
    })),
  ];
  const currentPageItem = pageItems.find(it => it.id === 'home' ? location.pathname === '/' : location.pathname === DASHBOARD_ROUTES[it.id]);

  function toggle(name) {
    setSheet(s => (s === name ? null : name));
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <nav className={styles.bar}>
        <button data-bn-btn className={`${styles.btn} ${sheet === 'page' ? styles.btnActive : ''}`} onClick={() => toggle('page')} type="button">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>Page</span>
        </button>

        <button data-bn-btn className={`${styles.btn} ${sheet === 'filtre' ? styles.btnActive : ''}`} onClick={() => toggle('filtre')} type="button">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/>
            <line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/>
            <line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2" fill="currentColor" stroke="none"/>
          </svg>
          <span>Filtre</span>
        </button>

        <button data-bn-btn className={`${styles.btn} ${sheet === 'comparer' ? styles.btnActive : ''} ${compareActive ? styles.btnHint : ''}`} onClick={() => toggle('comparer')} type="button">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
            <line x1="12" y1="3" x2="12" y2="21"/>
          </svg>
          <span>Comparer</span>
        </button>

        <button data-bn-btn className={`${styles.btn} ${sheet === 'menu' ? styles.btnActive : ''}`} onClick={() => toggle('menu')} type="button">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Menu</span>
        </button>
      </nav>

      {sheet && (
        <div className={styles.scrim}>
          <div className={styles.sheet} ref={sheetRef}>
            <div className={styles.sheetHandle} />

            {sheet === 'page' && (
              <>
                <div className={styles.sheetTitle}>Tableaux de bord</div>
                {pageItems.map(it => (
                  <button
                    key={it.id}
                    type="button"
                    className={`${styles.sheetItem} ${currentPageItem?.id === it.id ? styles.sheetItemActive : ''}`}
                    onClick={() => { navigate(it.to); setSheet(null); }}
                  >
                    {currentPageItem?.id === it.id
                      ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span className={styles.sheetDot} />
                    }
                    {it.label}
                  </button>
                ))}
              </>
            )}

            {sheet === 'filtre' && (
              <>
                {extraFiltersNode && (
                  <>
                    <div className={styles.sheetTitle}>Filtres</div>
                    <div className={styles.sheetExtraFilters}>{extraFiltersNode}</div>
                  </>
                )}
                <div className={styles.sheetTitle}>Période de référence</div>
                <div className={styles.sheetCentered}>
                  <PeriodPicker value={periodKey} customFrom={customFrom} customTo={customTo} onChange={onChange} />
                </div>
              </>
            )}

            {sheet === 'comparer' && (
              <>
                <div className={styles.sheetTitle}>Comparaison de périodes</div>
                <button type="button" className={`${styles.compareToggle} ${compareActive ? styles.compareToggleActive : ''}`} onClick={toggleCompare}>
                  {compareActive ? 'Comparaison activée — désactiver' : 'Activer la comparaison'}
                </button>
                {compareActive && (
                  <div className={styles.sheetCentered} style={{ marginTop: 10 }}>
                    <PeriodPicker value={comparePeriodKey} customFrom={compareFrom} customTo={compareTo} onChange={onCompareChange} />
                  </div>
                )}
              </>
            )}

            {sheet === 'menu' && (
              <>
                <div className={styles.sheetTitle}>{user?.name}</div>
                <button type="button" className={styles.sheetItem} onClick={() => { navigate('/glossaire'); setSheet(null); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  Glossaire KPI
                </button>
                {user?.role === 'admin' && (
                  <button type="button" className={styles.sheetItem} onClick={() => { navigate('/admin'); setSheet(null); }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    Gestion utilisateurs
                  </button>
                )}
                <button type="button" className={`${styles.sheetItem} ${styles.sheetItemLogout}`} onClick={handleLogout}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Déconnexion
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
