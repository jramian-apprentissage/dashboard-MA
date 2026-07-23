import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import NotConnected from '../../../components/ui/NotConnected';
import Loader from '../../../components/ui/Loader';
import { computeAsusEvolution, dernierJourArchive } from '../../../services/sheetsParser';
import styles from './Activite.module.css';

Chart.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(227,225,216,0.5)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };

const EVO_OPTIONS = [
  { key: 'jour',    label: 'Journalier' },
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois',    label: 'Mensuel' },
];

function fmtDuree(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Une carte par tag, dans l'ordre transmis par Jimmy — la première (total)
// reçoit la variante accent, c'est l'indicateur "plus important".
function buildTagCards(directionStats, totalLabel) {
  const cards = [
    { label: totalLabel, value: directionStats.total, unit: '', color: 'accent' },
    ...directionStats.parTag.map(t => ({ label: t.label, value: t.count, unit: '', color: 'default' })),
  ];
  return cards;
}

function ClickIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

export default function ActiviteASUS({ selectedCollab = 'Tous', asusData }) {
  const hasData = asusData?.hasData && asusData?.result;
  const r = asusData?.result;
  const [qualifOpen, setQualifOpen] = useState(null); // { collab, direction }
  const [evoGranularity, setEvoGranularity] = useState('jour');

  // Même principe que Activité Sales : le tout premier chargement affiche le
  // logo animé plutôt qu'une mosaïque de "Non connecté", pour ne pas donner
  // l'impression que c'est cassé le temps que l'archive arrive.
  const firstLoad = !hasData && asusData?.loading && !asusData?.error;

  const perCollabEntries = hasData ? Object.entries(r.perCollab || {}) : [];
  const evolution = hasData ? computeAsusEvolution(asusData.rows || [], evoGranularity, selectedCollab) : null;
  const qualifStats = qualifOpen && r.perCollab?.[qualifOpen.collab]
    ? r.perCollab[qualifOpen.collab][qualifOpen.direction]
    : null;

  return (
    <Loader loading={firstLoad} label="Récupération de l'archive Ringover…" minHeight={380}>
      {() => (
    <>
    <div className={styles.page}>
      <SectionLabel badge="RINGOVER — CLIENT ASUS">Activité commerciale ASUS</SectionLabel>

      {asusData?.error && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(196,135,106,0.4)', background: 'rgba(196,135,106,0.08)' }}>
          <span style={{ color: 'var(--neg)' }}>⚠ Erreur :</span> {asusData.error}
        </div>
      )}
      {hasData && asusData.lastFetched && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(142,207,170,0.3)', background: 'rgba(142,207,170,0.06)' }}>
          <span style={{ color: 'var(--pos)' }}>● Données Ringover — ASUS</span> — {r.totalAppels.toLocaleString('fr-FR')} appels chargés · MAJ arrêtée au {dernierJourArchive(asusData.rows) || '—'}
          {selectedCollab !== 'Tous' && <span style={{ color: 'var(--text3)' }}> · filtre : {selectedCollab}</span>}
        </div>
      )}

      <SectionLabel>Appels sortants</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGridAuto}>
            {buildTagCards(r.sortant, 'Appels sortants').map(k => <KPICard key={k.label} {...k} />)}
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Appels entrants</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGridAuto}>
            {buildTagCards(r.entrant, 'Appels entrants').map(k => <KPICard key={k.label} {...k} />)}
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Qualité des appels — TMC</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGridAuto}>
            <KPICard label="Durée moyenne (TMC)" value={fmtDuree(r.dureeMoyenneS)} unit="min" color="default" />
            <KPICard label="Bons appels (≥ 5 min)" value={r.bonsAppels} unit="" trend={{ dir: 'neutral', text: `${r.tauxBons}% du total` }} color="default" />
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Statistiques par collaborateur</SectionLabel>
      <Card title="Détail des appels par collaborateur">
        {hasData && perCollabEntries.length > 0 ? (
          <table className={styles.perfTable}>
            <thead><tr>
              <th>Collaborateur</th>
              <th>Appels sortants</th>
              <th>Appels entrants</th>
              <th>TMC</th>
              <th>Bons appels (≥ 5 min)</th>
            </tr></thead>
            <tbody>
              {perCollabEntries.map(([name, c]) => (
                <tr key={name} className={name === selectedCollab ? styles.highlightRow : ''}>
                  <td className={styles.tdName}>{name}</td>
                  <td className={styles.tdNum}>
                    <button type="button" className={styles.clickableStat} onClick={() => setQualifOpen({ collab: name, direction: 'sortant' })}>
                      {c.sortant.total}<ClickIcon />
                    </button>
                  </td>
                  <td className={styles.tdNum}>
                    <button type="button" className={styles.clickableStat} onClick={() => setQualifOpen({ collab: name, direction: 'entrant' })}>
                      {c.entrant.total}<ClickIcon />
                    </button>
                  </td>
                  <td className={styles.tdNum}>{fmtDuree(c.dureeMoyenneS)}</td>
                  <td className={styles.tdNum}>{c.bonsAppels}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
        <div className={styles.subNote} style={{ marginTop: 8 }}>Cliquer sur un nombre d'appels affiche le détail des qualifications</div>
      </Card>

      <SectionLabel>Évolution du nombre d'appels</SectionLabel>
      <Card>
        <div className={styles.cardHeadRow}>
          <span className={styles.subNote} style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12 }}>Nombre d'appels</span>
          <div className={styles.evoToggle}>
            {EVO_OPTIONS.map(o => (
              <button
                key={o.key}
                type="button"
                className={`${styles.evoToggleBtn} ${evoGranularity === o.key ? styles.evoToggleBtnActive : ''}`}
                onClick={() => setEvoGranularity(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {hasData && evolution ? (
          <div className={styles.chartWrap} style={{ height: 220 }}>
            <Line
              data={{
                labels: evolution.labels,
                datasets: [{
                  label: 'Appels',
                  data: evolution.counts,
                  borderColor: 'rgba(38,0,31,0.8)',
                  backgroundColor: 'rgba(255,249,147,0.18)',
                  pointBackgroundColor: 'rgba(38,0,31,0.8)',
                  tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y',
                }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 700, easing: 'easeOutQuart' },
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} appel${ctx.parsed.y > 1 ? 's' : ''}` } },
                },
                scales: {
                  x: { ticks: tickStyle, grid: gridStyle, border: borderCol },
                  y: { ticks: tickStyle, grid: gridStyle, border: borderCol, beginAtZero: true, position: 'left' },
                },
              }}
            />
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>
    </div>

    {qualifOpen && qualifStats && (
      <div className={styles.qualifOverlay} onClick={() => setQualifOpen(null)}>
        <div className={styles.qualifPanel} onClick={e => e.stopPropagation()}>
          <div className={styles.qualifHeader}>
            <div>
              <div className={styles.qualifTitle}>
                {qualifOpen.collab} — {qualifOpen.direction === 'sortant' ? 'Appels sortants' : 'Appels entrants'}
              </div>
              <div className={styles.qualifSub}>Répartition par qualification</div>
            </div>
            <button type="button" className={styles.qualifClose} onClick={() => setQualifOpen(null)}>✕</button>
          </div>
          <div className={styles.kpiGridAuto}>
            {buildTagCards(qualifStats, qualifOpen.direction === 'sortant' ? 'Appels sortants' : 'Appels entrants').map(k => (
              <KPICard key={k.label} {...k} />
            ))}
          </div>
        </div>
      </div>
    )}
    </>
      )}
    </Loader>
  );
}
