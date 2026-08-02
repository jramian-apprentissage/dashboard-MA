import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import NotConnected from '../../../components/ui/NotConnected';
import Loader from '../../../components/ui/Loader';
import DonutChart from '../../../components/ui/DonutChart';
import { usePeriod } from '../../../contexts/PeriodContext';
import { compareValueText } from '../../../utils/compareText';
import { fmtNumber } from '../../../utils/formatNumber';
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
function buildTagCards(directionStats, totalLabel, compareStats, comparePeriodKey) {
  const cmpTotal = compareStats ? compareValueText(directionStats.total, compareStats.total, comparePeriodKey) : null;
  const cmpSansTag = compareStats ? compareValueText(directionStats.sansTag, compareStats.sansTag, comparePeriodKey) : null;
  const cards = [
    { label: totalLabel, value: directionStats.total, unit: '', compare: cmpTotal, color: 'accentAsus' },
    ...directionStats.parTag.map(t => {
      const ct = compareStats?.parTag.find(x => x.label === t.label);
      return { label: t.label, value: t.count, unit: '', compare: ct ? compareValueText(t.count, ct.count, comparePeriodKey) : null, color: 'default' };
    }),
    // Appels dont le tag ne correspond à aucune des catégories ci-dessus (ou
    // sans tag du tout) — complète le total pour qu'on puisse voir d'un coup
    // d'œil si des appels échappent au suivi qualitatif.
    { label: 'Sans tag', value: directionStats.sansTag, unit: '', compare: cmpSansTag, color: 'default' },
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

export default function ActiviteASUS({ selectedCollab = 'Tous', asusData, compareResult }) {
  const hasData = asusData?.hasData && asusData?.result;
  const r = asusData?.result;
  const { comparePeriodKey } = usePeriod();
  const [qualifOpen, setQualifOpen] = useState(null); // { collab, direction }
  const [evoGranularity, setEvoGranularity] = useState('jour');
  const [infoOpen, setInfoOpen] = useState(false);

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
      {/* Fraîcheur de l'archive — tout en haut, avant la première section. */}
      {asusData?.error && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(196,135,106,0.4)', background: 'rgba(196,135,106,0.08)' }}>
          <span style={{ color: 'var(--neg)' }}>⚠ Erreur :</span> {asusData.error}
        </div>
      )}
      {hasData && asusData.lastFetched && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(142,207,170,0.3)', background: 'rgba(142,207,170,0.06)', textAlign: 'center' }}>
          <span style={{ color: 'var(--pos)' }}>● Données Ringover</span> — Mise à jour arrêtée au {dernierJourArchive(asusData.rows) || '—'}
          {selectedCollab !== 'Tous' && <span style={{ color: 'var(--text3)' }}> · filtre : {selectedCollab}</span>}
        </div>
      )}

      <SectionLabel badge="RINGOVER">Activité commerciale ASUS</SectionLabel>
      <Card>
        {hasData ? (
          <>
          <div className={styles.cardHeadRow}>
            <span className={styles.subNote} style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12 }}>Nombre total d'appels</span>
            <div
              className={styles.infoWrap}
              onMouseEnter={() => setInfoOpen(true)}
              onMouseLeave={() => setInfoOpen(false)}
            >
              <button type="button" className={styles.infoBtn} onClick={() => setInfoOpen(o => !o)} aria-label="Définitions Ringover">i</button>
              {infoOpen && (
                <div className={styles.infoTooltip}>
                  <p><strong>Aboutis</strong> : Pris par un agent ou tombés sur la messagerie vocale.</p>
                  <p><strong>Non aboutis</strong> : Impossible de joindre le contact (raccroché avant de faire sonner chez le contact ou échec de la connexion).</p>
                  <p><strong>Décrochés</strong> : Pris par un agent ou par un standard. Lorsque l'option « Considérer comme appel manqué » est désactivée dans votre standard, les appels sont comptabilisés comme décrochés. Les appels décrochés en interne ne sont pas comptabilisés.</p>
                  <p><strong>Manqués</strong> : Non pris par un agent ou par un standard avec l'option « Considérer comme manqué » activée.</p>
                </div>
              )}
            </div>
          </div>
          <div className={styles.asusTotalWrap}>
            <div className={styles.asusTotalDonut}>
              <DonutChart
                variant="donut"
                data={[r.aboutis, r.nonAboutis, r.decroches, r.manques]}
                labels={['Aboutis (sortant)', 'Non aboutis (sortant)', 'Décrochés (entrant)', 'Manqués (entrant)']}
                colors={['var(--asus-blue)', 'rgba(167,173,170,0.5)', 'rgba(126,184,154,0.75)', 'rgba(196,135,106,0.75)']}
                height={150}
                centerValue={r.totalAppels}
                centerLabel="appels"
                tooltip={(label, value, pct) => `${label} : ${value} appels (${pct}%)`}
                showDataLabels={false}
              />
            </div>
            <div className={styles.asusTotalStats}>
              <div className={styles.asusTotalGroup}>
                <div className={styles.asusTotalGroupTitle}>Appels sortants</div>
                <div className={styles.asusTotalRow}>
                  <span className={styles.legDot} style={{ background: 'var(--asus-blue)' }} />
                  Aboutis
                  <span className={styles.asusTotalRowVal}>{fmtNumber(r.aboutis)}</span>
                  <span className={styles.asusTotalRowPct}>{r.sortant.total > 0 ? Math.round(r.aboutis / r.sortant.total * 100) : 0}%</span>
                </div>
                <div className={styles.asusTotalRow}>
                  <span className={styles.legDot} style={{ background: 'rgba(167,173,170,0.5)' }} />
                  Non aboutis
                  <span className={styles.asusTotalRowVal}>{fmtNumber(r.nonAboutis)}</span>
                  <span className={styles.asusTotalRowPct}>{r.sortant.total > 0 ? Math.round(r.nonAboutis / r.sortant.total * 100) : 0}%</span>
                </div>
              </div>
              <div className={styles.asusTotalGroup}>
                <div className={styles.asusTotalGroupTitle}>Appels entrants</div>
                <div className={styles.asusTotalRow}>
                  <span className={styles.legDot} style={{ background: 'rgba(126,184,154,0.75)' }} />
                  Décrochés
                  <span className={styles.asusTotalRowVal}>{fmtNumber(r.decroches)}</span>
                  <span className={styles.asusTotalRowPct}>{r.entrant.total > 0 ? Math.round(r.decroches / r.entrant.total * 100) : 0}%</span>
                </div>
                <div className={styles.asusTotalRow}>
                  <span className={styles.legDot} style={{ background: 'rgba(196,135,106,0.75)' }} />
                  Manqués
                  <span className={styles.asusTotalRowVal}>{fmtNumber(r.manques)}</span>
                  <span className={styles.asusTotalRowPct}>{r.entrant.total > 0 ? Math.round(r.manques / r.entrant.total * 100) : 0}%</span>
                </div>
              </div>
            </div>
          </div>
          </>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Appels sortants</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGrid5}>
            {buildTagCards(r.sortant, 'Appels sortants', compareResult?.sortant, comparePeriodKey).map(k => <KPICard key={k.label} {...k} />)}
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Appels entrants</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGrid5}>
            {buildTagCards(r.entrant, 'Appels entrants', compareResult?.entrant, comparePeriodKey).map(k => <KPICard key={k.label} {...k} />)}
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Qualité des appels — TMC</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGridAuto}>
            <KPICard
              label="Durée moyenne (TMC)"
              value={fmtDuree(r.dureeMoyenneS)}
              unit="min"
              compare={compareResult ? compareValueText(r.dureeMoyenneS, compareResult.dureeMoyenneS, comparePeriodKey) : null}
              trend={{ dir: 'neutral', text: `${fmtDuree(r.dureeMoyenneSortantS)} sortant · ${fmtDuree(r.dureeMoyenneEntrantS)} entrant` }}
              color="default"
            />
            <KPICard label="Bons appels (≥ 5 min)" value={r.bonsAppels} unit="" compare={compareResult ? compareValueText(r.bonsAppels, compareResult.bonsAppels, comparePeriodKey) : null} trend={{ dir: 'neutral', text: `${r.tauxBons}% du total` }} color="default" />
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
                      {fmtNumber(c.sortant.total)}<ClickIcon />
                    </button>
                  </td>
                  <td className={styles.tdNum}>
                    <button type="button" className={styles.clickableStat} onClick={() => setQualifOpen({ collab: name, direction: 'entrant' })}>
                      {fmtNumber(c.entrant.total)}<ClickIcon />
                    </button>
                  </td>
                  <td className={styles.tdNum}>{fmtDuree(c.dureeMoyenneS)}</td>
                  <td className={styles.tdNum}>{fmtNumber(c.bonsAppels)}</td>
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
                className={`${styles.evoToggleBtn} ${evoGranularity === o.key ? `${styles.evoToggleBtnActive} ${styles.evoToggleBtnActiveAsus}` : ''}`}
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
                  borderColor: 'rgba(0,108,225,0.85)',
                  backgroundColor: 'rgba(0,108,225,0.12)',
                  pointBackgroundColor: 'rgba(0,108,225,0.85)',
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
            {/* Pas de comparatif dans ce détail par agent (pas de donnée de
                période comparée plombée jusqu'ici) — compare={false} explicite,
                sinon KPICard afficherait "Calcul en cours…" indéfiniment. */}
            {buildTagCards(qualifStats, qualifOpen.direction === 'sortant' ? 'Appels sortants' : 'Appels entrants').map(k => (
              <KPICard key={k.label} {...k} compare={false} />
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
