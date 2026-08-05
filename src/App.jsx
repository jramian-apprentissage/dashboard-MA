import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, DASHBOARDS } from './contexts/AuthContext';
import { DASHBOARD_ROUTES } from './data/dashboardTabs';
import { PeriodProvider } from './contexts/PeriodContext';
import { ExtraFiltersProvider } from './contexts/ExtraFiltersContext';
import Topbar from './components/layout/Topbar';
import BottomNav from './components/layout/BottomNav';
import AIChat from './components/ui/AIChat';
import PageTracker from './components/PageTracker';
import { LoaderMark } from './components/ui/Loader';
import styles from './App.module.css';
import Login from './pages/Login';
import Home from './pages/Home';

/* Dashboards chargés à la demande.
 *
 * Ils étaient tous importés en statique, donc réunis dans un seul fichier JS :
 * un utilisateur ASUS téléchargeait le code de Commercial RC et de Activité,
 * qu'il n'a pas le droit d'ouvrir. Les graphes (chart.js) pèsent le plus lourd
 * là-dedans et ne servent à aucune des deux pages d'entrée.
 *
 * Login et Home restent en statique : ce sont les points d'arrivée de toute
 * session, les rendre paresseux ajouterait un aller-retour réseau juste avant
 * le premier affichage — l'inverse du but recherché. */
const Admin              = lazy(() => import('./pages/Admin'));
const GlossaireKPI       = lazy(() => import('./pages/GlossaireKPI'));
const CommercialRC       = lazy(() => import('./pages/dashboards/CommercialRC'));
const CommercialActivite = lazy(() => import('./pages/dashboards/CommercialActivite'));
const Asus               = lazy(() => import('./pages/dashboards/Asus'));

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireDashboard({ id, children }) {
  const { user, hasAccessToDashboard } = useAuth();
  if (!hasAccessToDashboard(user, id)) return <Navigate to="/" replace />;
  return children;
}

/* Garde de la route "/" elle-même : contrairement à RequireDashboard, on ne
   peut pas se rabattre sur "/" en cas de refus (boucle infinie). On redirige
   vers le premier dashboard auquel l'utilisateur a accès, ou vers le
   Glossaire (seule page jamais soumise à un toggle d'accès) en dernier
   recours. */
function RequireHome({ children }) {
  const { user, hasAccessToDashboard } = useAuth();
  if (hasAccessToDashboard(user, 'home')) return children;
  const fallback = DASHBOARDS.find(d => hasAccessToDashboard(user, d.id));
  return <Navigate to={fallback ? DASHBOARD_ROUTES[fallback.id] : '/glossaire'} replace />;
}

// Admin et Directeur peuvent gérer les utilisateurs
function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!['admin', 'directeur'].includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

// Seuil (px) au-delà duquel on considère que le hero (titre + période
// analysée) a défilé hors de vue. Approximatif — pas d'IntersectionObserver
// par page pour rester simple — mais suffisant : toutes les heroes mobiles
// font environ cette hauteur (min-height: 130px, cf. DashboardLayout.module.css).
const HERO_SCROLL_THRESHOLD = 90;

function AppShell({ children }) {
  // Sur mobile, l'entête (logo) reste masqué tant que le hero est visible,
  // et ne réapparaît qu'une fois qu'on a scrollé au-delà — laisse le hero
  // respirer au premier affichage plutôt que de lui voler de la hauteur.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > HERO_SCROLL_THRESHOLD); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Pas d'assistante IA sur le dashboard client ASUS : c'est une vue
  // partagée avec le client, l'IA est un outil interne (demande de Jimmy,
  // 2026-08-04). Le bouton flottant lui-même est masqué, pas seulement le
  // panneau — sinon il reste visible et cliquable côté client.
  const { pathname } = useLocation();
  const iaMasquee = pathname.startsWith('/asus');

  return (
    <div className={`${styles.shell} ${scrolled ? styles.shellScrolled : ''}`}>
      <PageTracker />
      <Topbar scrolled={scrolled} />
      {/* Suspense placé ici, et non autour de <Routes>, pour que l'entête et
          la navigation basse restent en place pendant le chargement d'un
          dashboard : seule la zone de contenu affiche le chargeur, au lieu de
          voir toute la page disparaître à chaque changement de page. */}
      <Suspense fallback={<div className={styles.routeGate}><LoaderMark size={48} /></div>}>
        {children}
      </Suspense>
      {!iaMasquee && <AIChat />}
      <BottomNav />
    </div>
  );
}

// Le temps que /me réponde (vérification du token existant contre le
// backend), on n'affiche rien de définitif : ni les routes protégées (le
// user n'est pas encore connu → redirection prématurée vers /login), ni la
// page elle-même (flash de contenu qui disparaît aussitôt).
function AuthGate({ children }) {
  const { ready } = useAuth();
  if (!ready) {
    return (
      <div className={styles.authGate}>
        <LoaderMark size={48} />
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <PeriodProvider>
      <ExtraFiltersProvider>
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><RequireHome><AppShell><Home /></AppShell></RequireHome></RequireAuth>} />
            <Route path="/glossaire" element={<RequireAuth><AppShell><GlossaireKPI /></AppShell></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><RequireAdmin><AppShell><Admin /></AppShell></RequireAdmin></RequireAuth>} />
            <Route path="/commercial-rc" element={<RequireAuth><RequireDashboard id="commercial-rc"><AppShell><CommercialRC /></AppShell></RequireDashboard></RequireAuth>} />
            <Route path="/commercial-activite" element={<RequireAuth><RequireDashboard id="commercial-activite"><AppShell><CommercialActivite /></AppShell></RequireDashboard></RequireAuth>} />
            <Route path="/asus" element={<RequireAuth><RequireDashboard id="asus"><AppShell><Asus /></AppShell></RequireDashboard></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
      </ExtraFiltersProvider>
      </PeriodProvider>
    </AuthProvider>
  );
}
