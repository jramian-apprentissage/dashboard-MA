import { useNavigate } from 'react-router-dom';
import { useAuth, DASHBOARDS, DASHBOARD_SCOPES } from '../contexts/AuthContext';
import { DASHBOARD_ROUTES } from '../data/dashboardTabs';
import { DASH_RH_ACTIF } from '../config/dashRh';
import heroBg from '../assets/hero-home.svg';
import styles from './Home.module.css';

/* L'ACCUEIL TENAIT SA PROPRE TABLE DE ROUTES, copie de DASHBOARD_ROUTES sans
   l'entrée RH. Le bouton « Consulter » du Suivi des effectifs appelait donc
   navigate(undefined) et ne faisait rien, signalé par Jimmy le 19/10.
   La copie est supprimée au profit de la table partagée : c'est la seule
   façon qu'un dashboard ajouté demain marche ici sans qu'on y pense. Les
   libellés et icônes ci-dessous restent propres à l'accueil, eux, parce
   qu'ils n'existent nulle part ailleurs. */

// Titres longs pour les cartes de l'accueil — distincts des libellés de nav
// (courts, utilisés dans le header/la barre basse) pour rester lisibles là-bas.
// Peuvent tenir sur deux lignes (cf. FocusCommercial.module.css → insightDash).
// Convention pour tout futur dashboard client : "Dashboard Client - [Nom]".
const CARD_LABELS = {
  /* Étalé derrière le drapeau comme partout ailleurs : le libellé contient
     « Suivi des effectifs », qui est précisément le marqueur que
     scripts/verifier-cloisonnement-rh.mjs cherche dans le paquet de
     production. Écrit en dur ici, il ferait échouer la construction. */
  ...(DASH_RH_ACTIF ? {
    'rh-effectifs':   'Dashboard RH - Suivi des effectifs',
    'rh-recrutement': 'Dashboard RH - Recrutement et pipeline',
  } : {}),
  'commercial-rc':       'Dashboard Commercial et Relation Client',
  'commercial-activite': 'Dashboard Activités commerciales',
  asus:                  'Dashboard Client - Asus',
};

const DASH_ICONS = {
  /* Sans entrée ici, la carte s'affichait avec une pastille vide : le bouton
     ne marchait pas et la carte avait l'air inachevée. Deux silhouettes,
     pour ne pas reprendre celle de l'Administration juste en dessous, qui
     est une personne seule. */
  ...(DASH_RH_ACTIF ? {
    /* Un entonnoir : c'est un pipeline de recrutement, pas un effectif. */
    'rh-recrutement': (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h18l-7 8v7l-4 2v-9z"/>
      </svg>
    ),
    'rh-effectifs': (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  } : {}),
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

  /* Les groupes effectivement remplis, dans l'ordre de DASHBOARD_SCOPES. On
     les calcule avant le rendu parce que leur NOMBRE décide de l'affichage :
     à deux groupes on titre et on sépare, à un seul on ne titre rien. */
  const groupes = DASHBOARD_SCOPES
    .map(scope => ({ scope, dashboards: accessible.filter(d => d.scope === scope.id) }))
    .filter(g => g.dashboards.length > 0);

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
            synthèse automatique n'est réellement branchée sur un dashboard.

            DEUX SECTIONS ET NON UNE SEULE GRILLE : demande de Clémence au call
            du 27/07, « une catégorie dashboard interne et après en dessous
            dashboard externe », parce qu'un Julien ou un Christophe ne doit
            pas scroller les dashboards clients pour trouver les siens. Un
            groupe sans aucune carte accessible disparaît entièrement, titre
            compris : quelqu'un qui n'a que l'Asus ne doit pas lire un
            intertitre « Dashboards internes » suivi de rien. Et si un seul
            groupe subsiste, on retombe sur l'affichage d'avant, sans titre ni
            séparateur, pour ne pas catégoriser une liste unique. */}
        {groupes.map((groupe, i) => {
          const { scope, dashboards: duScope } = groupe;
          return (
            <section key={scope.id} className={styles.scopeSection}>
              {groupes.length > 1 && (
                <>
                  {/* Séparateur seulement à partir du second groupe : au-dessus
                      du premier, il viendrait couper le hero de ses cartes. */}
                  {i > 0 && <div className={styles.scopeDivider} />}
                  <div className={styles.scopeTitle}>{scope.label}</div>
                </>
              )}
              <div className={styles.insightsGrid}>
                {duScope.map(d => (
                  <div key={d.id} className={styles.insightCard}>
                    <div className={styles.insightHeader}>
                      <div className={styles.insightIconWrap}>{DASH_ICONS[d.id]}</div>
                      <div className={styles.insightMeta}>
                        <div className={styles.insightDash}>{CARD_LABELS[d.id] || d.label}</div>
                      </div>
                    </div>

                    <button className={styles.insightCTA} onClick={() => navigate(DASHBOARD_ROUTES[d.id])}>
                      Consulter
                      {ARROW}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

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
