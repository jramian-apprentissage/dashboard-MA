import { useState } from 'react';
import SectionLabel from '../../../components/ui/SectionLabel';
import { glossaireData } from '../../../data/glossaire';
import styles from './GlossaireKPI.module.css';

export default function GlossaireKPI() {
  const [search, setSearch] = useState('');

  const data = glossaireData.filter(g => g.dashboards.includes('commercial-activite'));

  const filtered = data.filter(g =>
    !search ||
    g.terme.toLowerCase().includes(search.toLowerCase()) ||
    g.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <SectionLabel>Glossaire des indicateurs</SectionLabel>

      <div className={styles.searchWrap}>
        <svg className={styles.searchIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className={styles.search}
          type="text"
          placeholder="Rechercher un indicateur…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.count}>{filtered.length} indicateur{filtered.length !== 1 ? 's' : ''}</div>

      <div className={styles.grid}>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Aucun indicateur trouvé{search ? ` pour « ${search} »` : ''}
          </div>
        )}
        {filtered.map(g => (
          <div key={g.terme} className={styles.card}>
            <div className={styles.terme}>{g.terme}</div>
            <div className={styles.def}>{g.definition}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
