import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth, DASHBOARDS } from '../../contexts/AuthContext';
import { DASHBOARD_ROUTES, DASHBOARD_TABS, DASHBOARD_DEFAULT_TAB } from '../../data/dashboardTabs';
import logoSun from '../../assets/logo/logo-full-sun.svg';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { user, logout, hasAccessToDashboard } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const accessible = DASHBOARDS.filter(d => user?.dashboards?.includes(d.id));

  const currentTab = searchParams.get('tab');

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoWrap}>
        <img src={logoSun} alt="Mon Ambassadeur" className={styles.logo} />
      </div>

      <div className={styles.divider} />

      {/* Navigation */}
      <nav className={styles.nav}>
        {/* Accueil — soumis au même toggle d'accès que les dashboards (id "home") */}
        {hasAccessToDashboard(user, 'home') && (
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Accueil</span>
          </NavLink>
        )}

        {/* Dashboards avec sous-menus */}
        {accessible.length > 0 && (
          <div className={styles.navSection}>Tableaux de bord</div>
        )}

        {accessible.map(d => {
          const isOnDash = location.pathname === DASHBOARD_ROUTES[d.id];
          const tabs = DASHBOARD_TABS[d.id] || [];
          const defaultTab = DASHBOARD_DEFAULT_TAB[d.id];

          return (
            <div key={d.id} className={styles.dashGroup}>
              {/* Lien principal du dashboard */}
              <button
                className={`${styles.navItem} ${isOnDash ? styles.dashActive : ''}`}
                onClick={() => navigate(`${DASHBOARD_ROUTES[d.id]}?tab=${defaultTab}`)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                <span>{d.label}</span>
                <svg
                  className={`${styles.chevron} ${isOnDash ? styles.chevronOpen : ''}`}
                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Sous-menus — visibles uniquement sur ce dashboard */}
              {isOnDash && (
                <div className={styles.subMenu}>
                  {tabs.map(t => {
                    const isTabActive = (currentTab === t.id) || (!currentTab && t.id === defaultTab);
                    return (
                      <button
                        key={t.id}
                        className={`${styles.subItem} ${isTabActive ? styles.subActive : ''}`}
                        onClick={() => navigate(`${DASHBOARD_ROUTES[d.id]}?tab=${t.id}`)}
                      >
                        <span className={styles.subDot} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Glossaire KPI — menu principal */}
        <div className={styles.navSection}>Référence</div>
        <NavLink
          to="/glossaire"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>Glossaire KPI</span>
        </NavLink>

        {/* Admin */}
        {user?.role === 'admin' && (
          <>
            <div className={styles.navSection}>Admin</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Utilisateurs</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Bas — user + logout */}
      <div className={styles.bottom}>
        <button className={styles.userRow} onClick={handleLogout} title="Déconnexion">
          <div className={styles.avatar}>{user?.name?.charAt(0) || 'U'}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userRole}>{user?.role === 'admin' ? 'Admin' : 'Core Team'}</div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.logoutIcon}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>
  );
}
