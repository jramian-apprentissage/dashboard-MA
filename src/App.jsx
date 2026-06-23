import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PeriodProvider } from './contexts/PeriodContext';
import Sidebar from './components/layout/Sidebar';
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

// Admin et Directeur peuvent gérer les utilisateurs
function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!['admin', 'directeur'].includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function AppShell({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <PageTracker />
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, background: '#FBFBFB', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
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
          <Route path="/" element={<RequireAuth><AppShell><Home /></AppShell></RequireAuth>} />
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
