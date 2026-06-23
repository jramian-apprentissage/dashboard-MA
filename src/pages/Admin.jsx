import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DASHBOARDS, ROLES, roleLabel } from '../contexts/AuthContext';
import { getHistory, clearHistory } from '../services/tracking';
import styles from './Admin.module.css';

function formatTs(iso) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Admin() {
  const { user, getAllUsers, createUser, updateUserDashboards, deleteUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState(getAllUsers());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'responsable', dashboards: [] });
  const [formError, setFormError] = useState('');
  const [historyUser, setHistoryUser] = useState(null);
  const [historyEvents, setHistoryEvents] = useState([]);

  function openHistory(u) {
    setHistoryUser(u);
    setHistoryEvents(getHistory(u.id));
  }

  function handleClearHistory(uid) {
    clearHistory(uid);
    setHistoryEvents([]);
  }

  if (!['admin', 'directeur'].includes(user?.role)) {
    navigate('/');
    return null;
  }

  function refresh() { setUsers(getAllUsers()); }

  function toggleDashboard(userId, dashId) {
    const u = users.find(u => u.id === userId);
    const current = u?.dashboards || [];
    const updated = current.includes(dashId)
      ? current.filter(d => d !== dashId)
      : [...current, dashId];
    updateUserDashboards(userId, updated);
    refresh();
  }

  function handleDelete(userId) {
    if (userId === user.id) return;
    deleteUser(userId);
    refresh();
  }

  function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.email || !form.password) {
      setFormError('Tous les champs sont requis.');
      return;
    }
    const autoAllDash = ['admin', 'directeur'].includes(form.role) ? DASHBOARDS.map(d => d.id) : form.dashboards;
    createUser({ ...form, dashboards: autoAllDash });
    setShowModal(false);
    setForm({ name: '', email: '', password: '', role: 'responsable', dashboards: [] });
    refresh();
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Administration</h1>
            <p className={styles.sub}>Gestion des utilisateurs et des accès aux dashboards</p>
          </div>
          <button className={styles.btnAdd} onClick={() => setShowModal(true)}>+ Créer un utilisateur</button>
        </div>

        <div className={styles.table}>
          <div className={styles.thead}>
            <div className={styles.th}>Utilisateur</div>
            <div className={styles.th}>Rôle</div>
            {DASHBOARDS.map(d => <div key={d.id} className={styles.th}>{d.label}</div>)}
            <div className={styles.th}>Actions</div>
          </div>
          {users.map(u => (
            <div key={u.id} className={styles.tr}>
              <div className={styles.td}>
                <div className={styles.userAvatar}>{u.name.charAt(0)}</div>
                <div>
                  <div className={styles.userName}>{u.name}</div>
                  <div className={styles.userEmail}>{u.email}</div>
                </div>
              </div>
              <div className={styles.td}>
                <span className={`${styles.rolePill} ${styles['role_' + u.role] || styles.roleCore}`}>
                  {roleLabel(u.role)}
                </span>
              </div>
              {DASHBOARDS.map(d => {
                const fullAccess = ['admin', 'directeur'].includes(u.role);
                const hasAccess  = fullAccess || u.dashboards?.includes(d.id);
                return (
                  <div key={d.id} className={styles.td} style={{ justifyContent: 'center' }}>
                    <button
                      className={`${styles.toggle} ${hasAccess ? styles.toggleOn : ''}`}
                      onClick={() => !fullAccess && toggleDashboard(u.id, d.id)}
                      disabled={fullAccess}
                      title={fullAccess ? `${roleLabel(u.role)} voit tout` : (hasAccess ? 'Révoquer' : 'Autoriser')}
                    >
                      {hasAccess ? '✓' : '—'}
                    </button>
                  </div>
                );
              })}
              <div className={styles.td} style={{ gap: 6 }}>
                {user.role === 'admin' && (
                  <button className={styles.btnHistory} onClick={() => openHistory(u)}>Historique</button>
                )}
                {u.id !== user.id && (
                  <button className={styles.btnDelete} onClick={() => handleDelete(u.id)}>Supprimer</button>
                )}
                {u.id === user.id && <span className={styles.moi}>Vous</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau historique de connexion — admin uniquement */}
      {historyUser && (
        <div className={styles.overlay} onClick={() => setHistoryUser(null)}>
          <div className={styles.historyPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.historyHeader}>
              <div>
                <div className={styles.historyTitle}>Historique — {historyUser.name}</div>
                <div className={styles.historySub}>{historyEvents.length} événement{historyEvents.length !== 1 ? 's' : ''} enregistré{historyEvents.length !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.btnClear} onClick={() => handleClearHistory(historyUser.id)}>Effacer</button>
                <button className={styles.btnClose} onClick={() => setHistoryUser(null)}>✕</button>
              </div>
            </div>
            <div className={styles.historyList}>
              {historyEvents.length === 0 && (
                <div className={styles.historyEmpty}>Aucun historique disponible</div>
              )}
              {historyEvents.map((ev, i) => (
                <div key={i} className={styles.historyItem}>
                  <span className={`${styles.historyBadge} ${ev.type === 'login' ? styles.badgeLogin : styles.badgeVisit}`}>
                    {ev.type === 'login' ? 'Connexion' : 'Visite'}
                  </span>
                  <div className={styles.historyInfo}>
                    <span className={styles.historyPage}>{ev.page || '—'}</span>
                    <span className={styles.historyTs}>{formatTs(ev.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Créer un utilisateur</h2>
            <form onSubmit={handleCreate} className={styles.modalForm}>
              <label className={styles.fieldLabel}>Nom complet</label>
              <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jean Dupont" />
              <label className={styles.fieldLabel}>Email</label>
              <input className={styles.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jean@monambassadeur.com" />
              <label className={styles.fieldLabel}>Mot de passe</label>
              <input className={styles.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
              <label className={styles.fieldLabel}>Rôle</label>
              <select className={styles.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {form.role === 'responsable' && (
                <>
                  <label className={styles.fieldLabel}>Dashboards autorisés</label>
                  <div className={styles.checkList}>
                    {DASHBOARDS.map(d => (
                      <label key={d.id} className={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={form.dashboards.includes(d.id)}
                          onChange={e => setForm(f => ({
                            ...f,
                            dashboards: e.target.checked ? [...f.dashboards, d.id] : f.dashboards.filter(x => x !== d.id)
                          }))}
                        />
                        {d.label}
                      </label>
                    ))}
                  </div>
                </>
              )}
              {formError && <div className={styles.formError}>{formError}</div>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className={styles.btnCreate}>Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
