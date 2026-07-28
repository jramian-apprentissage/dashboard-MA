import { useNavigate } from 'react-router-dom';
import { useAuth, DASHBOARDS } from '../contexts/AuthContext';
import heroBg from '../assets/hero-home.svg';
import styles from './Home.module.css';

const ROUTES = {
  'commercial-rc': '/commercial-rc',
  'commercial-activite': '/commercial-activite',
  asus: '/asus',
};

// Titres longs pour les cartes de l'accueil — distincts des libellés de nav
// (courts, utilisés dans le header/la barre basse) pour rester lisibles là-bas.
// Peuvent tenir sur deux lignes (cf. FocusCommercial.module.css → insightDash).
// Convention pour tout futur dashboard client : "Dashboard client - [Nom]".
const CARD_LABELS = {
  'commercial-rc':       'Dashboard Commercial et Relation Client',
  'commercial-activite': 'Dashboard Activités commerciales',
  asus:                  'Dashboard client - Asus',
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
  asus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>
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

export default function Home() {
  const { user, hasAccessToDashboard } = useAuth();
  const navigate = useNavigate();
  const accessible = DASHBOARDS.filter(d => hasAccessToDashboard(user, d.id));

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
          <div className={styles.heroLabel}>DATA MONITORING</div>
          <h1 className={styles.heroTitle}>Bonjour, <em>{firstName}.</em></h1>
          <p className={styles.heroDesc}>
            Suivez vos performances en temps réel et accédez prochainement à
            vos insights depuis une interface unique.
          </p>
        </div>

        {/* ─ Dashboards — la section "Insights IA" reste masquée tant qu'aucune
            synthèse automatique n'est réellement branchée sur un dashboard. */}
        {accessible.length > 0 && (
          <section>
            <div className={styles.insightsGrid}>
              {accessible.map(d => (
                <div key={d.id} className={styles.insightCard}>
                  <div className={styles.insightHeader}>
                    <div className={styles.insightIconWrap}>{DASH_ICONS[d.id]}</div>
                    <div className={styles.insightMeta}>
                      <div className={styles.insightDash}>{CARD_LABELS[d.id] || d.label}</div>
                    </div>
                  </div>

                  <button className={styles.insightCTA} onClick={() => navigate(ROUTES[d.id])}>
                    Consulter
                    {ARROW}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Administration — volontairement décorrélée des cartes dashboards
            (section propre, séparateur) pour ne pas se lire comme un
            dashboard de plus parmi les autres. */}
        {user?.role === 'admin' && (
          <section className={styles.adminSection}>
            <div className={styles.adminDivider} />
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
          </section>
        )}

      </div>{/* fin .content */}
    </div>
  );
}
