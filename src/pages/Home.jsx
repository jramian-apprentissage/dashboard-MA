import { useNavigate } from 'react-router-dom';
import { useAuth, DASHBOARDS } from '../contexts/AuthContext';
import NotConnected from '../components/ui/NotConnected';
import heroBg from '../assets/hero-home.svg';
import styles from './Home.module.css';

const ROUTES = {
  'commercial-rc': '/commercial-rc',
  'commercial-activite': '/commercial-activite',
};

const DASH_ICONS = {
  'commercial-rc': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  'commercial-activite': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
};

const ADMIN_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
  </svg>
);

const ARROW = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

// L'analyse IA par dashboard n'est pas encore construite — aucune source
// n'est branchée pour la générer. Voir NotConnected pour l'état affiché.

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const accessible = DASHBOARDS.filter(d => user?.dashboards?.includes(d.id));

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const firstName = user?.name?.split(' ')[0] || 'vous';

  return (
    <div className={styles.page}>

      {/* Fond pleine page — identique à la page login */}
      <div className={styles.heroBg} style={{ backgroundImage: `url(${heroBg})` }} />
      <div className={styles.overlay} />

      {/* ═══ CONTENU ════════════════════════════════════════ */}
      <div className={styles.content}>

        {/* Hero : texte seul, sans boîte */}
        <div className={styles.hero}>
          <div className={styles.heroLabel}>ANALYTICS</div>
          <h1 className={styles.heroTitle}>Bonjour, <em>{firstName}.</em></h1>
          <p className={styles.heroDesc}>
            Centralisez vos indicateurs commerciaux, suivez vos performances
            en temps réel et accédez à vos insights IA depuis une interface unique.
          </p>
          <div className={styles.heroBadges}>
            <span className={styles.heroBadge}>{today}</span>
          </div>
        </div>

        {/* ─ Insights IA ─ */}
        {accessible.length > 0 && (
          <section>
            <div className={styles.sectionRow}>
              <div className={styles.sectionLabel}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                </svg>
                Insights IA
              </div>
              <span className={styles.sectionNote}>Synthèse automatique par dashboard</span>
            </div>

            <div className={styles.insightsGrid}>
              {accessible.map(d => (
                <div key={d.id} className={styles.insightCard}>
                  <div className={styles.insightHeader}>
                    <div className={styles.insightIconWrap}>{DASH_ICONS[d.id]}</div>
                    <div className={styles.insightMeta}>
                      <div className={styles.insightDash}>{d.label}</div>
                    </div>
                  </div>

                  <div className={styles.insightList}>
                    <NotConnected>aucune source d'analyse IA branchée pour ce dashboard</NotConnected>
                  </div>

                  <button className={styles.insightCTA} onClick={() => navigate(ROUTES[d.id])}>
                    Ouvrir le dashboard
                    {ARROW}
                  </button>
                </div>
              ))}

              {/* Admin card dans la grille */}
              {user?.role === 'admin' && (
                <button className={`${styles.insightCard} ${styles.adminCard}`} onClick={() => navigate('/admin')}>
                  <div className={styles.insightHeader}>
                    <div className={`${styles.insightIconWrap} ${styles.adminIcon}`}>{ADMIN_ICON}</div>
                    <div className={styles.insightMeta}>
                      <div className={styles.insightDash}>Administration</div>
                      <div className={styles.insightSummary}>Gestion des utilisateurs et des accès</div>
                    </div>
                  </div>
                  <div className={styles.adminCTA}>
                    Accéder
                    {ARROW}
                  </div>
                </button>
              )}
            </div>
          </section>
        )}

      </div>{/* fin .content */}
    </div>
  );
}
