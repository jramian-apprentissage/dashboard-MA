import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DASHBOARDS, HOME_PAGE, ROLES, roleLabel } from '../contexts/AuthContext';

// Accueil + dashboards : même mécanisme de toggle, une seule liste pour
// piloter à la fois les colonnes du tableau et la checklist de création.
const TOGGLEABLE_PAGES = [HOME_PAGE, ...DASHBOARDS];
import heroBg from '../assets/hero-admin.svg';
import AccesDashboards from '../components/ui/AccesDashboards';
import styles from './Admin.module.css';

function formatTs(iso) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* Le journal stocke l'IDENTIFIANT du tableau de bord, pas son libellé :
   renommer une page côté produit ne doit pas réécrire l'historique. Le
   libellé se retrouve ici, à l'affichage. */
function libelleDashboard(id) {
  if (!id) return '—';
  return DASHBOARDS.find(d => d.id === id)?.label || id;
}

export default function Admin() {
  const { user, getAllUsers, createUser, updateUserDashboards, deleteUser,
          chargerActivite, effacerActivite } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'responsable', dashboards: [] });
  const [formError, setFormError] = useState('');
  const [accesUser, setAccesUser] = useState(null);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [historyError, setHistoryError] = useState('');

  async function openHistory(u) {
    setHistoryUser(u);
    setHistoryEvents([]);
    setHistoryError('');
    try {
      setHistoryEvents(await chargerActivite(u.id));
    } catch (e) {
      setHistoryError(e.message);
    }
  }

  async function handleClearHistory(uid) {
    try {
      await effacerActivite(uid);
      setHistoryEvents([]);
    } catch (e) {
      setHistoryError(e.message);
    }
  }

  useEffect(() => {
    if (!['admin', 'directeur'].includes(user?.role)) return;
    refresh();
  }, [user]);

  if (!['admin', 'directeur'].includes(user?.role)) {
    navigate('/');
    return null;
  }

  async function refresh() {
    try {
      setUsers(await getAllUsers());
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }

  async function toggleDashboard(userId, dashId) {
    const u = users.find(u => u.id === userId);
    const current = u?.dashboards || [];
    const updated = current.includes(dashId)
      ? current.filter(d => d !== dashId)
      : [...current, dashId];
    try {
      await updateUserDashboards(userId, updated);
      await refresh();
      setActionError('');
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleDelete(userId) {
    if (userId === user.id) return;
    try {
      await deleteUser(userId);
      await refresh();
      setActionError('');
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.email || !form.password) {
      setFormError('Tous les champs sont requis.');
      return;
    }
    const autoAllDash = ['admin', 'directeur'].includes(form.role) ? TOGGLEABLE_PAGES.map(d => d.id) : form.dashboards;
    try {
      await createUser({ ...form, dashboards: autoAllDash });
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'responsable', dashboards: [] });
      await refresh();
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div className={styles.page}>
      {/* Fond pleine page — même principe que login */}
      <div className={styles.heroBg} style={{ backgroundImage: `url(${heroBg})` }} />
      <div className={styles.overlay} />

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.label}>ADMINISTRATION</div>
            <h1 className={styles.title}>Gestion des <em className={styles.titleEm}>utilisateurs.</em></h1>
            <p className={styles.sub}>Accès aux pages et historique de connexion</p>
          </div>
          <button className={styles.btnAdd} onClick={() => setShowModal(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Créer un utilisateur
          </button>
        </div>

        {(loadError || actionError) && (
          <div className={styles.formError} style={{ marginBottom: 12 }}>{loadError || actionError}</div>
        )}

        {/* Une carte par utilisateur, plutôt qu'un tableau. Les accès étaient
            une colonne chacun : la liste grandissant à chaque dashboard
            ajouté, le tableau devenait illisible par le haut sur ordinateur
            (en-têtes repliés) et interminable sur mobile. Ils vivent
            désormais dans une modale, la carte n'en montrant que le
            décompte. */}
        <div className={styles.cards}>
          {users.map(u => {
            const accesTotal = ['admin', 'directeur'].includes(u.role);
            const nbAcces = accesTotal
              ? TOGGLEABLE_PAGES.length
              : TOGGLEABLE_PAGES.filter(d => u.dashboards?.includes(d.id)).length;
            return (
              <div key={u.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={styles.userAvatar}>{u.name.charAt(0)}</div>
                  <div className={styles.cardIdent}>
                    <div className={styles.userName}>{u.name}</div>
                    <div className={styles.userEmail}>{u.email}</div>
                  </div>
                  {u.id === user.id && <span className={styles.moi}>Vous</span>}
                </div>

                <div className={styles.cardMeta}>
                  <span className={`${styles.rolePill} ${styles['role_' + u.role] || styles.roleCore}`}>
                    {roleLabel(u.role)}
                  </span>
                  {accesTotal && <span className={styles.accesTotal}>voit tout</span>}
                </div>

                {/* Le décompte est le bouton : c'est l'information ET la porte
                    d'entrée. Un lien « Gérer » séparé aurait ajouté une cible
                    sans ajouter de sens. */}
                <button
                  type="button"
                  className={styles.btnAcces}
                  onClick={() => setAccesUser(u)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  {nbAcces} accès sur {TOGGLEABLE_PAGES.length}
                  <svg className={styles.btnAccesChevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>

                <div className={styles.cardActions}>
                  {user.role === 'admin' && (
                    <button className={styles.btnHistory} onClick={() => openHistory(u)}>Historique</button>
                  )}
                  {u.id !== user.id && (
                    <button className={styles.btnDelete} onClick={() => handleDelete(u.id)}>Supprimer</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {accesUser && (
        <AccesDashboards
          utilisateur={accesUser}
          pages={TOGGLEABLE_PAGES}
          accesTotal={['admin', 'directeur'].includes(accesUser.role)}
          /* Relu depuis `users` et non depuis `accesUser`, qui est une copie
             figée au moment de l'ouverture : sans ça les bascules ne se
             voyaient pas tant qu'on n'avait pas refermé la modale. */
          estActif={pageId => ['admin', 'directeur'].includes(accesUser.role)
            || users.find(x => x.id === accesUser.id)?.dashboards?.includes(pageId)}
          onBasculer={pageId => toggleDashboard(accesUser.id, pageId)}
          onClose={() => setAccesUser(null)}
        />
      )}

      {/* Panneau historique */}
      {historyUser && (
        <div className={styles.modalOverlay} onClick={() => setHistoryUser(null)}>
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
              {historyError && <div className={styles.historyEmpty}>{historyError}</div>}
              {!historyError && historyEvents.length === 0 && (
                <div className={styles.historyEmpty}>Aucune activité enregistrée</div>
              )}
              {historyEvents.map((ev, i) => (
                <div key={i} className={styles.historyItem}>
                  <span className={`${styles.historyBadge} ${ev.type === 'connexion' ? styles.badgeLogin : styles.badgeVisit}`}>
                    {ev.type === 'connexion' ? 'Connexion' : 'Consultation'}
                  </span>
                  <div className={styles.historyInfo}>
                    <span className={styles.historyPage}>{libelleDashboard(ev.dashboard)}</span>
                    <span className={styles.historyTs}>{formatTs(ev.survenu_le)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal créer utilisateur */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
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
                  <label className={styles.fieldLabel}>Pages autorisées</label>
                  <div className={styles.checkList}>
                    {TOGGLEABLE_PAGES.map(d => (
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
