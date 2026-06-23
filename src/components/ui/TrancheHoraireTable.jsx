import { useState } from 'react';
import styles from './TrancheHoraireTable.module.css';

const joinColor = v => v >= 55 ? 'var(--pos)' : v >= 38 ? 'var(--warn)' : v === 0 ? 'var(--text3)' : 'var(--neg)';

export default function TrancheHoraireTable({ tranchesHoraires }) {
  const { cols, data } = tranchesHoraires;
  const [selected, setSelected] = useState('Tous');

  const rows = data[selected] || [];
  const totalAppels = rows.reduce((s, r) => s + r.appels, 0);
  const totalRdv = rows.reduce((s, r) => s + r.rdv, 0);
  const bestJoin = Math.max(...rows.filter(r => r.appels > 0).map(r => r.join));

  return (
    <div className={styles.wrap}>
      {/* Filtre collaborateur */}
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Filtrer par collaborateur</span>
        <div className={styles.pills}>
          {cols.map(c => (
            <button
              key={c}
              className={`${styles.pill} ${selected === c ? styles.pillActive : ''}`}
              onClick={() => setSelected(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <table className={styles.tbl}>
        <thead>
          <tr>
            <th>Tranche horaire</th>
            <th className={styles.num}>Appels émis</th>
            <th className={styles.num}>Taux joignabilité</th>
            <th className={styles.num}>RDV pris</th>
            <th className={styles.bar}>Activité</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.t} className={r.appels === 0 ? styles.empty : ''}>
              <td className={styles.tranche}>{r.t}</td>
              <td className={styles.num}>{r.appels > 0 ? r.appels : '—'}</td>
              <td className={styles.num}>
                {r.appels > 0 ? (
                  <span className={styles.joinBadge} style={{ color: joinColor(r.join) }}>
                    {r.join}%
                    {r.join === bestJoin && <span className={styles.star}>★</span>}
                  </span>
                ) : '—'}
              </td>
              <td className={styles.num}>
                {r.rdv > 0 ? <span className={styles.rdvBadge}>{r.rdv}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}
              </td>
              <td className={styles.barCell}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: totalAppels > 0 ? `${(r.appels / Math.max(...rows.map(x => x.appels))) * 100}%` : '0%' }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className={styles.totalLbl}>Total</td>
            <td className={styles.num} style={{ color: 'var(--text)', fontWeight: 600 }}>{totalAppels}</td>
            <td className={styles.num} style={{ color: 'var(--text3)', fontSize: 10 }}>—</td>
            <td className={styles.num} style={{ color: 'var(--pos)', fontWeight: 600 }}>{totalRdv}</td>
            <td />
          </tr>
        </tfoot>
      </table>

      <div className={styles.legend}>
        <span className={styles.dot} style={{ background: 'var(--pos)' }} />≥ 55% joignabilité
        <span className={styles.dot} style={{ background: 'var(--warn)', marginLeft: 12 }} />38–54%
        <span className={styles.dot} style={{ background: 'var(--neg)', marginLeft: 12 }} />{'< 38%'}
        <span style={{ marginLeft: 12, color: 'var(--accent)', fontWeight: 600 }}>★</span> Meilleure tranche
      </div>
    </div>
  );
}
