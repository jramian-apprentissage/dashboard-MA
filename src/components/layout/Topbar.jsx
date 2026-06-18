import { useAuth } from '../../contexts/AuthContext';
import logoSun from '../../assets/logo/logo-full-sun.svg';
import styles from './Topbar.module.css';

export default function Topbar({ period = 'Jan – Jun 2025', onLogout }) {
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    if (onLogout) onLogout();
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <img src={logoSun} alt="Mon Ambassadeur" className={styles.logo} />
      </div>
      <div className={styles.right}>
        <div className={styles.chip}>
          <span className={styles.dot} />
          Données mock
        </div>
        <div className={styles.chip}>📅 {period}</div>
        <div className={styles.userPill} onClick={handleLogout} title="Déconnexion">
          <div className={styles.avatar}>{user?.name?.charAt(0) || 'U'}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userRole}>{user?.role === 'admin' ? 'Admin' : 'Core Team'}</div>
          </div>
          <span className={styles.logout}>↩</span>
        </div>
      </div>
    </header>
  );
}
