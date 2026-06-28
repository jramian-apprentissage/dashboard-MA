import { useState } from 'react';
import { useAuth, DASHBOARDS } from '../contexts/AuthContext';
import { glossaireData } from '../data/mockData';
import styles from './GlossaireKPI.module.css';

const DASH_LABELS = {
  'commercial-rc':       'Commercial & RC',
  'commercial-activite': 'Activité commerciale',
};

const DASH_COLORS = {
  'commercial-rc':       { bg: '#26001F', color: '#FFF993', border: '#26001F' },
  'commercial-activite': { bg: '#3A0030', color: 'rgba(255,249,147,0.75)', border: '#3A0030' },
};

export default function GlossaireKPI() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterDash, setFilterDash] = useState('all');

  const accessible = DASHBOARDS.filter(d => user?.dashboards?.includes(d.id));
  const accessibleIds = accessible.map(d => d.id);

  // Termes visibles = ceux dont au moins un dashboard est accessible à l'utilisateur
  const visible = glossaireData.filter(t =>
    t.dashboards.some(d => accessibleIds.includes(d))
  );

  // Applique filtre dashboard + recherche
  const filtered = visible.filter(t => {
    const matchDash = filterDash === 'all' || t.dashboards.includes(filterDash);
    const matchSearch = !search || t.terme.toLowerCase().includes(search.toLowerCase()) || t.definition.toLowerCase().includes(search.toLowerCase());
    return matchDash && matchSearch;
  });

  return (
    <div className={styles.page}>
      {/* Header sticky */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Glossaire KPI</h1>
          <span className={styles.count}>{filtered.length} terme{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className={styles.controls}>
          {/* Filtre par dashboard */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${filterDash === 'all' ? styles.tabActive : ''}`}
              onClick={() => setFilterDash('all')}
            >
              Tous
            </button>
            {accessible.map(d => (
              <button
                key={d.id}
                className={`${styles.tab} ${filterDash === d.id ? styles.tabActive : ''}`}
                onClick={() => setFilterDash(d.id)}
              >
                {DASH_LABELS[d.id] || d.label}
              </button>
            ))}
          </div>
          {/* Recherche */}
          <div className={styles.searchWrap}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.searchIcon}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className={styles.search}
              type="text"
              placeholder="Rechercher un terme…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grille de termes */}
      <div className={styles.grid}>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <svg className={styles.emptyIcon} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Aucun terme trouvé{search ? ` pour « ${search} »` : ''}
          </div>
        )}
        {filtered.map(t => (
          <div key={t.terme} className={styles.card}>
            {/* Tags dashboards */}
            <div className={styles.tags}>
              {t.dashboards.filter(d => accessibleIds.includes(d)).map(d => {
                const c = DASH_COLORS[d] || DASH_COLORS['commercial-rc'];
                return (
                  <span
                    key={d}
                    className={styles.tag}
                    style={{ background: c.bg, color: c.color, borderColor: c.border }}
                  >
                    {DASH_LABELS[d] || d}
                  </span>
                );
              })}
            </div>
            <div className={styles.terme}>{t.terme}</div>
            <div className={styles.def}>{t.definition}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
