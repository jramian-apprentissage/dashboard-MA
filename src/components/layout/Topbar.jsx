import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth, DASHBOARDS } from '../../contexts/AuthContext';
import { DASHBOARD_ROUTES, DASHBOARD_TABS, DASHBOARD_DEFAULT_TAB } from '../../data/dashboardTabs';
import logoSun from '../../assets/logo/logo-full-sun.svg';
import styles from './Topbar.module.css';

export default function Topbar() {
  const { user, logout, hasAccessToDashboard } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null); // dashboardId du submenu ouvert
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropRef = useRef(null);
  const submenuRef = useRef(null);
  const mobileNavRef = useRef(null);
  const accessible = DASHBOARDS.filter(d => user?.dashboards?.includes(d.id));

  // Fermer dropdown utilisateur si clic extérieur
  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
      if (submenuRef.current && !submenuRef.current.contains(e.target)) setOpenSubmenu(null);
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target)) setMobileNavOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Liste plate Accueil + dashboards accessibles — utilisée par le sélecteur
  // mobile : sur petit écran, la rangée horizontale de liens devient illisible
  // (tronquée) et ne passe pas à l'échelle à 4-5 dashboards. On reprend le
  // même principe que le dropdown "Choisir une vue" des onglets, éprouvé.
  const mobileNavItems = [
    ...(hasAccessToDashboard(user, 'home') ? [{ id: 'home', label: 'Accueil', to: '/' }] : []),
    ...accessible.map(d => ({ id: d.id, label: d.label, to: `${DASHBOARD_ROUTES[d.id]}?tab=${DASHBOARD_DEFAULT_TAB[d.id] || ''}` })),
  ];
  const currentMobileItem = mobileNavItems.find(it => it.id === 'home' ? location.pathname === '/' : location.pathname === DASHBOARD_ROUTES[it.id]) || mobileNavItems[0];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleDashboardClick(e, dashboardId) {
    const tabs = DASHBOARD_TABS[dashboardId];
    if (tabs && tabs.length > 1) {
      e.preventDefault();
      setOpenSubmenu(prev => prev === dashboardId ? null : dashboardId);
    } else {
      setOpenSubmenu(null);
    }
  }

  function handleTabSelect(dashboardId, tabId) {
    navigate(`${DASHBOARD_ROUTES[dashboardId]}?tab=${tabId}`);
    setOpenSubmenu(null);
  }

  function isRouteActive(dashboardId) {
    return location.pathname === DASHBOARD_ROUTES[dashboardId];
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <img src={logoSun} alt="Mon Ambassadeur" className={styles.logo} />
        <div className={styles.divider} />
        <nav className={styles.nav}>
          {hasAccessToDashboard(user, 'home') && (
            <NavLink
              to="/"
              end
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              Accueil
            </NavLink>
          )}

          {accessible.map(d => {
            // L'onglet ASUS suit son propre toggle (accès à un périmètre
            // client restreint), distinct de l'autorisation générale sur
            // le dashboard Activité commerciale.
            const tabs = (DASHBOARD_TABS[d.id] || []).filter(
              t => t.id !== 'asus' || hasAccessToDashboard(user, 'commercial-activite-asus'),
            );
            const hasTabs = tabs.length > 1;
            const isActive = isRouteActive(d.id);
            const isOpen = openSubmenu === d.id;

            return (
              <div key={d.id} className={styles.navItem} ref={isOpen ? submenuRef : null}>
                <NavLink
                  to={`${DASHBOARD_ROUTES[d.id]}?tab=${DASHBOARD_DEFAULT_TAB[d.id] || ''}`}
                  className={() => `${styles.link} ${isActive ? styles.active : ''} ${hasTabs ? styles.linkWithSub : ''}`}
                  onClick={hasTabs ? (e) => handleDashboardClick(e, d.id) : () => setOpenSubmenu(null)}
                >
                  {d.label}
                  {hasTabs && (
                    <svg
                      width="9" height="9" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      className={isOpen ? styles.chevronOpen : styles.chevron}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                </NavLink>

                {hasTabs && isOpen && (
                  <div className={styles.submenu}>
                    <div className={styles.submenuLabel}>Choisir une vue</div>
                    {tabs.map(t => {
                      const params = new URLSearchParams(location.search);
                      const currentTab = params.get('tab') || DASHBOARD_DEFAULT_TAB[d.id];
                      const isTabActive = isActive && currentTab === t.id;
                      return (
                        <button
                          key={t.id}
                          className={`${styles.submenuItem} ${isTabActive ? styles.submenuItemActive : ''}`}
                          onClick={() => handleTabSelect(d.id, t.id)}
                          type="button"
                        >
                          {isTabActive && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          {!isTabActive && <span className={styles.submenuDot} />}
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sélecteur mobile : remplace la rangée de liens (tronquée, illisible
            en dessous de 640px et non scalable à 4-5 dashboards) par un bouton
            + dropdown, même principe que "Choisir une vue" ci-dessus. */}
        <div className={styles.mobileNavWrap} ref={mobileNavRef}>
          <button
            className={styles.mobileNavBtn}
            onClick={() => setMobileNavOpen(o => !o)}
            type="button"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span>{currentMobileItem?.label || 'Menu'}</span>
            <svg
              width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              className={mobileNavOpen ? styles.chevronOpen : styles.chevron}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {mobileNavOpen && (
            <div className={styles.submenu} style={{ left: 0 }}>
              <div className={styles.submenuLabel}>Tableaux de bord</div>
              {mobileNavItems.map(it => {
                const isItemActive = currentMobileItem?.id === it.id;
                return (
                  <NavLink
                    key={it.id}
                    to={it.to}
                    end={it.id === 'home'}
                    className={`${styles.submenuItem} ${isItemActive ? styles.submenuItemActive : ''}`}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {isItemActive
                      ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span className={styles.submenuDot} />
                    }
                    {it.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={styles.right} ref={dropRef}>
        <button
          className={styles.avatarBtn}
          onClick={() => setDropdownOpen(o => !o)}
          aria-label="Menu utilisateur"
          aria-expanded={dropdownOpen}
        >
          <span className={styles.avatarInitials}>{initials}</span>
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={dropdownOpen ? styles.chevronOpen : ''}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {dropdownOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropUser}>
              <div className={styles.dropName}>{user?.name}</div>
              <div className={styles.dropRole}>{user?.role === 'admin' ? 'Administrateur' : 'Core Team'}</div>
            </div>
            <div className={styles.dropSep} />
            <button className={styles.dropItem} onClick={() => { navigate('/glossaire'); setDropdownOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              Glossaire KPI
            </button>
            {user?.role === 'admin' && (
              <button className={styles.dropItem} onClick={() => { navigate('/admin'); setDropdownOpen(false); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Gestion utilisateurs
              </button>
            )}
            <div className={styles.dropSep} />
            <button className={`${styles.dropItem} ${styles.dropLogout}`} onClick={handleLogout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
