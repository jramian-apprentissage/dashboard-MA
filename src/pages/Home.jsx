import { useNavigate } from 'react-router-dom';
import { useAuth, DASHBOARDS } from '../contexts/AuthContext';
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

const AI_INSIGHTS = {
  'commercial-rc': {
    summary: 'Performance en hausse · 3 alertes clients',
    insights: [
      { type: 'up',      text: 'Win rate à 64 % — +8 pts vs S1 2024' },
      { type: 'warn',    text: '3 clients à risque de churn identifiés' },
      { type: 'up',      text: 'Pipeline pondéré : 687 K€ (+12 % MoM)' },
      { type: 'neutral', text: 'Marge brute stable à 25,4 % depuis 3 mois' },
    ],
  },
  'commercial-activite': {
    summary: 'Activité stable · 2 campagnes à surveiller',
    insights: [
      { type: 'up',      text: 'Taux de conversion appels : 12,3 % (+2 pts)' },
      { type: 'warn',    text: '2 campagnes en retard sur objectif mensuel' },
      { type: 'neutral', text: 'Volume TLM stable — 3 mois consécutifs' },
      { type: 'up',      text: '18 nouveaux contacts qualifiés ce mois' },
    ],
  },
};

const TYPE_COLOR = { up: '#7EB89A', down: '#B87B65', warn: '#C4973A', neutral: 'rgba(167,173,170,0.55)' };

const TYPE_ICONS = {
  up:      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  down:    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  warn:    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  neutral: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

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
          <div className={styles.heroLabel}>ANALYTICS · DÉMONSTRATION</div>
          <h1 className={styles.heroTitle}>Bonjour, <em>{firstName}.</em></h1>
          <p className={styles.heroDesc}>
            Centralisez vos indicateurs commerciaux, suivez vos performances
            en temps réel et accédez à vos insights IA depuis une interface unique.
          </p>
          <div className={styles.heroBadges}>
            <span className={styles.heroBadge}>{today}</span>
            <span className={styles.heroBadgeSep}>·</span>
            <span className={styles.heroBadge}>Données mock · Jan–Jun 2025</span>
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
              <span className={styles.sectionNote}>Analyse automatique des données mock</span>
            </div>

            <div className={styles.insightsGrid}>
              {accessible.map(d => {
                const ins = AI_INSIGHTS[d.id];
                if (!ins) return null;
                return (
                  <div key={d.id} className={styles.insightCard}>
                    <div className={styles.insightHeader}>
                      <div className={styles.insightIconWrap}>{DASH_ICONS[d.id]}</div>
                      <div className={styles.insightMeta}>
                        <div className={styles.insightDash}>{d.label}</div>
                        <div className={styles.insightSummary}>{ins.summary}</div>
                      </div>
                    </div>

                    <div className={styles.insightList}>
                      {ins.insights.map((item, i) => (
                        <div
                          key={i}
                          className={styles.insightItem}
                          style={{ color: TYPE_COLOR[item.type] }}
                        >
                          <span className={styles.insightItemIcon} style={{ color: TYPE_COLOR[item.type] }}>
                            {TYPE_ICONS[item.type]}
                          </span>
                          {item.text}
                        </div>
                      ))}
                    </div>

                    <button className={styles.insightCTA} onClick={() => navigate(ROUTES[d.id])}>
                      Ouvrir le dashboard
                      {ARROW}
                    </button>
                  </div>
                );
              })}

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
