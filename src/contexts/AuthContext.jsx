import { createContext, useContext, useState } from 'react';
import { trackEvent } from '../services/tracking';

// Rôles : admin > directeur > responsable
// admin       — accès à tout (y compris historique connexion à venir)
// directeur   — accès à tout sauf historique connexion
// responsable — accès aux dashboards autorisés uniquement

// 'home' vit dans le même tableau `dashboards` que les vrais dashboards :
// c'est un id comme un autre pour hasAccessToDashboard(). Les utilisateurs
// 'responsable' existants l'ont explicitement pour ne rien changer à leur
// comportement actuel (Accueil était visible pour tous jusqu'ici) — Jimmy
// peut le décocher depuis l'admin si besoin.
const USERS = [
  { id: 1, name: 'Jimmy Ramiandrisoa', email: 'j.ramian@cepremium.fr', password: 'admin123', role: 'admin',       dashboards: ['home', 'commercial-rc', 'commercial-activite'] },
  { id: 2, name: 'Sophie L.',          email: 'sophie@monambassadeur.com', password: 'pass123', role: 'directeur',   dashboards: ['home', 'commercial-rc', 'commercial-activite'] },
  { id: 3, name: 'Marc R.',            email: 'marc@monambassadeur.com',   password: 'pass123', role: 'responsable', dashboards: ['home', 'commercial-activite'] },
  { id: 4, name: 'Julie D.',           email: 'julie@monambassadeur.com',  password: 'pass123', role: 'responsable', dashboards: ['home', 'commercial-rc', 'commercial-activite'] },
];

const SESSION_VERSION = 'v2';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ma_user');
    const version = localStorage.getItem('ma_session_v');
    if (!stored || version !== SESSION_VERSION) {
      localStorage.removeItem('ma_user');
      localStorage.setItem('ma_session_v', SESSION_VERSION);
      return null;
    }
    return JSON.parse(stored);
  });

  function login(email, password) {
    const found = USERS.find(u => u.email === email && u.password === password);
    if (!found) return false;
    const { password: _, ...safe } = found;
    setUser(safe);
    localStorage.setItem('ma_user', JSON.stringify(safe));
    trackEvent(safe.id, safe.name, 'login');
    return true;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('ma_user');
  }

  function updateUsers(updatedList) {
    // In a real app this would call an API
    USERS.length = 0;
    updatedList.forEach(u => USERS.push(u));
  }

  function getAllUsers() {
    return USERS.map(({ password: _, ...u }) => u);
  }

  // admin et directeur ont accès à tous les dashboards implicitement
  function hasAccessToDashboard(u, dashId) {
    if (['admin', 'directeur'].includes(u?.role)) return true;
    return u?.dashboards?.includes(dashId) ?? false;
  }

  function createUser(userData) {
    const newUser = { ...userData, id: Date.now() };
    USERS.push(newUser);
  }

  function updateUserDashboards(userId, dashboards) {
    const u = USERS.find(u => u.id === userId);
    if (u) u.dashboards = dashboards;
  }

  function deleteUser(userId) {
    const idx = USERS.findIndex(u => u.id === userId);
    if (idx !== -1) USERS.splice(idx, 1);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, getAllUsers, createUser, updateUserDashboards, deleteUser, hasAccessToDashboard }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const DASHBOARDS = [
  { id: 'commercial-rc',       label: 'Commercial & Relation Client' },
  { id: 'commercial-activite', label: 'Activité commerciale' },
];

// Accueil suit exactement le même mécanisme d'autorisation que DASHBOARDS
// (id dans user.dashboards, vérifié par hasAccessToDashboard) mais reste à
// part : ce n'est pas un dashboard à onglets, la Sidebar ne doit pas le
// boucler avec DASHBOARD_TABS/DASHBOARD_ROUTES sous peine de casser son rendu.
export const HOME_PAGE = { id: 'home', label: 'Accueil' };

export const ROLES = [
  { value: 'admin',       label: 'Admin' },
  { value: 'directeur',   label: 'Directeur' },
  { value: 'responsable', label: 'Responsable' },
];

export function roleLabel(role) {
  return ROLES.find(r => r.value === role)?.label ?? role;
}
