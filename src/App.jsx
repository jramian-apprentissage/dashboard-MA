import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, DASHBOARDS } from './contexts/AuthContext';
import { DASHBOARD_ROUTES } from './data/dashboardTabs';
import { PeriodProvider } from './contexts/PeriodContext';
import Topbar from './components/layout/Topbar';
import AIChat from './components/ui/AIChat';
import PageTracker from './components/PageTracker';
import Login from './pages/Login';
import Home from './pages/Home';
import Admin from './pages/Admin';
import GlossaireKPI from './pages/GlossaireKPI';
import CommercialRC from './pages/dashboards/CommercialRC';
import CommercialActivite from './pages/dashboards/CommercialActivite';

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

function AppShell({ children }) {
  return (
    <div style={{ paddingTop: '52px', minHeight: '100vh', background: '#FBFBFB', display: 'flex', flexDirection: 'column' }}>
      <PageTracker />
      <Topbar />
      {children}
      <AIChat />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PeriodProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><RequireHome><AppShell><Home /></AppShell></RequireHome></RequireAuth>} />
          <Route path="/glossaire" element={<RequireAuth><AppShell><GlossaireKPI /></AppShell></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><RequireAdmin><AppShell><Admin /></AppShell></RequireAdmin></RequireAuth>} />
          <Route path="/commercial-rc" element={<RequireAuth><RequireDashboard id="commercial-rc"><AppShell><CommercialRC /></AppShell></RequireDashboard></RequireAuth>} />
          <Route path="/commercial-activite" element={<RequireAuth><RequireDashboard id="commercial-activite"><AppShell><CommercialActivite /></AppShell></RequireDashboard></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </PeriodProvider>
    </AuthProvider>
  );
}
