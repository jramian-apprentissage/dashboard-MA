import { createContext, useContext, useState } from 'react';

const USERS = [
  { id: 1, name: 'Jimmy Ramiandrisoa', email: 'j.ramian@cepremium.fr', password: 'admin123', role: 'admin', dashboards: ['commercial-rc', 'commercial-activite'] },
  { id: 2, name: 'Sophie L.', email: 'sophie@monambassadeur.com', password: 'pass123', role: 'core_team', dashboards: ['commercial-rc'] },
  { id: 3, name: 'Marc R.', email: 'marc@monambassadeur.com', password: 'pass123', role: 'core_team', dashboards: ['commercial-activite'] },
  { id: 4, name: 'Julie D.', email: 'julie@monambassadeur.com', password: 'pass123', role: 'core_team', dashboards: ['commercial-rc', 'commercial-activite'] },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ma_user');
    return stored ? JSON.parse(stored) : null;
  });

  function login(email, password) {
    const found = USERS.find(u => u.email === email && u.password === password);
    if (!found) return false;
    const { password: _, ...safe } = found;
    setUser(safe);
    localStorage.setItem('ma_user', JSON.stringify(safe));
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
    <AuthContext.Provider value={{ user, login, logout, getAllUsers, createUser, updateUserDashboards, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const DASHBOARDS = [
  { id: 'commercial-rc', label: 'Commercial & Relation Client' },
  { id: 'commercial-activite', label: 'Commercial & Activité' },
];
