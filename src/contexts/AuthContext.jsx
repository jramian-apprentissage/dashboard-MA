import { createContext, useContext, useState, useEffect } from 'react';
import { trackEvent } from '../services/tracking';

/* Comptes et droits gérés par le backend (table `users`, routes /api/auth
   et /api/users) — plus aucun mock en mémoire/localStorage côté frontend.
   Avant ce changement, la gestion des utilisateurs vivait entièrement dans
   ce fichier (tableau JS + bricolage localStorage) : un accès révoqué par
   l'admin sur son poste ne changeait rien pour la personne concernée sur
   le sien, faute de source de vérité partagée. */
const API_URL = import.meta.env.VITE_API_URL || 'https://dashboard-ma-backend-production.up.railway.app';

const TOKEN_KEY = 'ma_token';

function authFetch(path, token, options = {}) {
  return fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  // `ready` distingue "pas encore vérifié" de "pas connecté" — évite un
  // flash de redirection vers /login le temps que /me réponde alors qu'un
  // token valide existe déjà.
  const [ready, setReady] = useState(false);

  // Revérifie systématiquement via /me plutôt que de faire confiance à une
  // copie locale : c'est ce qui garantit qu'un accès révoqué par l'admin
  // s'applique dès le prochain chargement de page, sur n'importe quel
  // appareil, sans reconnexion manuelle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setReady(true); return; }
      try {
        const res = await authFetch('/auth/me', token);
        if (cancelled) return;
        if (res.ok) {
          setUser(await res.json());
        } else {
          setToken(null);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        // Backend injoignable : on garde le token, on retentera au prochain montage.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function login(email, password) {
    let res;
    try {
      res = await authFetch('/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch {
      return false;
    }
    if (!res.ok) return false;
    const { token: t, user: u } = await res.json();
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
    trackEvent(u.id, u.name, 'login');
    return true;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  }

  async function getAllUsers() {
    const res = await authFetch('/users', token);
    if (!res.ok) throw new Error('Impossible de charger les utilisateurs');
    return res.json();
  }

  async function createUser(userData) {
    const res = await authFetch('/users', token, { method: 'POST', body: JSON.stringify(userData) });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || 'Création impossible');
    }
    return res.json();
  }

  async function updateUserDashboards(userId, dashboards) {
    const res = await authFetch(`/users/${userId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ dashboards }),
    });
    if (!res.ok) throw new Error('Mise à jour impossible');
    return res.json();
  }

  async function deleteUser(userId) {
    const res = await authFetch(`/users/${userId}`, token, { method: 'DELETE' });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || 'Suppression impossible');
    }
  }

  // admin et directeur ont accès à tous les dashboards implicitement. `u`
  // est toujours l'utilisateur tel que retourné par /me (jamais une copie
  // figée), donc pas besoin de relire une autre source ici.
  function hasAccessToDashboard(u, dashId) {
    if (!u) return false;
    if (['admin', 'directeur'].includes(u.role)) return true;
    return u.dashboards?.includes(dashId) ?? false;
  }

  return (
    <AuthContext.Provider value={{
      user, ready, login, logout,
      getAllUsers, createUser, updateUserDashboards, deleteUser,
      hasAccessToDashboard,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const DASHBOARDS = [
  { id: 'commercial-rc',       label: 'Commercial & Relation Client' },
  { id: 'commercial-activite', label: 'Activité commerciale' },
  { id: 'asus',                label: 'ASUS' },
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
