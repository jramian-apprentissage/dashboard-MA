import { createContext, useContext, useState, useEffect } from 'react';

/* Comptes et droits gérés par le backend (table `users`, routes /api/auth
   et /api/users) — plus aucun mock en mémoire/localStorage côté frontend.
   Avant ce changement, la gestion des utilisateurs vivait entièrement dans
   ce fichier (tableau JS + bricolage localStorage) : un accès révoqué par
   l'admin sur son poste ne changeait rien pour la personne concernée sur
   le sien, faute de source de vérité partagée. */
const API_URL = import.meta.env.VITE_API_URL || 'https://dashboard-ma-backend-production.up.railway.app';

const TOKEN_KEY = 'ma_token';
const USER_KEY  = 'ma_user';

/* Dernier profil connu, relu au démarrage pour afficher la page sans attendre
   le réseau (voir l'effet de revalidation plus bas). Volontairement tolérant :
   un contenu illisible ou absent équivaut à "pas de profil en cache" et fait
   simplement retomber sur l'ancien comportement bloquant. */
function lireUtilisateurEnCache() {
  try {
    const brut = localStorage.getItem(USER_KEY);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

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
  const [user, setUser] = useState(lireUtilisateurEnCache);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  // `ready` distingue "pas encore vérifié" de "pas connecté" — évite un
  // flash de redirection vers /login le temps que /me réponde alors qu'un
  // token valide existe déjà. Vrai d'emblée quand un profil est en cache :
  // il n'y a alors rien à attendre pour savoir quoi afficher.
  const [ready, setReady] = useState(() => !localStorage.getItem(TOKEN_KEY) || !!lireUtilisateurEnCache());

  /* Revalidation de la session — en arrière-plan, plus en barrage.
   *
   * /me reste appelé à chaque montage, et reste la source de vérité : c'est
   * lui qui applique une révocation d'accès faite par l'admin, sur n'importe
   * quel appareil, sans reconnexion manuelle. Ce qui change, c'est qu'on
   * n'attend plus sa réponse pour afficher quoi que ce soit.
   *
   * Le blocage coûtait un aller-retour complet avant le moindre pixel, et
   * surtout il retardait d'autant les appels de données du dashboard, qui ne
   * partaient qu'ensuite. Mesuré depuis le poste de Jimmy, un aller-retour
   * vers le backend Railway coûte ~320 ms à connexion ouverte (l'edge qui
   * répond est jnb1, Johannesburg) : c'était donc une seconde perdue à deux
   * reprises sur un premier chargement.
   *
   * Contrepartie assumée : un accès révoqué reste affiché le temps de cet
   * aller-retour, avant redirection. La redirection a toujours lieu, sur le
   * même chargement de page — et aucune donnée n'est exposée pour autant,
   * les routes de données étant gardées côté backend. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setReady(true);
        return;
      }
      try {
        const res = await authFetch('/auth/me', token);
        if (cancelled) return;
        if (res.ok) {
          const frais = await res.json();
          setUser(frais);
          localStorage.setItem(USER_KEY, JSON.stringify(frais));
        } else {
          setToken(null);
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
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
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
    return true;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /* ── Journal d'usage ─────────────────────────────────────────────────────
     Le suivi vivait dans le localStorage : chaque navigateur tenait le sien,
     et un administrateur ouvrant l'historique d'un collaborateur lisait en
     réalité le sien, filtré sur l'identifiant de l'autre — donc toujours
     vide. Le panneau annonçait « Aucun historique disponible », ce qui se lit
     « cette personne ne vient jamais ». Tout est désormais en base.

     On n'enregistre que l'identifiant du tableau de bord, jamais l'onglet
     ouvert à l'intérieur : on mesure l'adoption, pas le détail des gestes. */
  async function enregistrerConsultation(dashboardId) {
    // Silencieux par construction : un journal qui échoue ne doit jamais
    // interrompre la navigation de qui que ce soit.
    try {
      await authFetch('/activite', token, {
        method: 'POST',
        body: JSON.stringify({ dashboard: dashboardId }),
      });
    } catch { /* sans effet */ }
  }

  async function chargerActivite(userId) {
    const res = await authFetch(`/activite/${userId}`, token);
    if (!res.ok) throw new Error("Impossible de charger le journal d'usage");
    return res.json();
  }

  async function effacerActivite(userId) {
    const res = await authFetch(`/activite/${userId}`, token, { method: 'DELETE' });
    if (!res.ok) throw new Error('Suppression impossible');
    return res.json();
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

  /* Changement de mot de passe par l'utilisateur lui-même — distinct de
     updateUser* qui sont des outils d'administration. Le backend n'accepte
     que le compte porté par le jeton, l'identifiant n'est donc jamais envoyé
     depuis ici (voir PATCH /api/auth/password).

     Renvoie le message du backend tel quel : c'est lui qui distingue "mot de
     passe actuel incorrect" de "trop court", et l'utilisateur doit savoir
     lequel des deux champs corriger. */
  async function changePassword(actuel, nouveau) {
    let res;
    try {
      res = await authFetch('/auth/password', token, {
        method: 'PATCH',
        body: JSON.stringify({ actuel, nouveau }),
      });
    } catch {
      throw new Error('Connexion au serveur impossible.');
    }
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || 'Changement impossible.');
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
      user, ready, login, logout, changePassword,
      getAllUsers, createUser, updateUserDashboards, deleteUser,
      enregistrerConsultation, chargerActivite, effacerActivite,
      hasAccessToDashboard,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const DASHBOARDS = [
  { id: 'commercial-rc',       label: 'Commercial & Relation Client' },
  { id: 'commercial-activite', label: 'Activités commerciales' },
  { id: 'asus',                label: 'Client - Asus' },
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
