import { useState } from 'react';
import SectionLabel from '../../../components/ui/SectionLabel';
import { glossaireData } from '../../../data/mockData';
import styles from './GlossaireKPI.module.css';

export default function GlossaireKPI() {
  const [search, setSearch] = useState('');
  const filtered = glossaireData.filter(g =>
    g.terme.toLowerCase().includes(search.toLowerCase()) ||
    g.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <SectionLabel>Glossaire des indicateurs</SectionLabel>
      <div className={styles.searchWrap}>
        <input
          className={styles.search}
          placeholder="Rechercher un indicateur…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className={styles.count}>{filtered.length} indicateur{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div className={styles.grid}>
        {filtered.map(g => (
          <div key={g.terme} className={styles.card}>
            <div className={styles.terme}>{g.terme}</div>
            <div className={styles.def}>{g.definition}</div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className={styles.empty}>Aucun indicateur trouvé pour « {search} »</div>
      )}
    </div>
  );
}
