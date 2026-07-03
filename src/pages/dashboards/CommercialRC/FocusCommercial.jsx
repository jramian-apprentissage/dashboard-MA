import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Pill from '../../../components/ui/Pill';
import MotifBar from '../../../components/ui/MotifBar';
import Loader from '../../../components/ui/Loader';
import DonutChart from '../../../components/ui/DonutChart';
import { focusCommercialData as d, months } from '../../../data/mockData';
import styles from './FocusCommercial.module.css';

Chart.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip);


const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(0)} K€` : `${v}€`;
const tickStyle = { color: 'rgba(22,5,18,0.35)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(22,5,18,0.06)' };
const borderStyle = { color: 'rgba(22,5,18,0.08)' };

const urgenceVariant = { Critique: 'red', Haute: 'amber', Normale: 'green' };
const stageVariant = { Négociation: 'amber', Proposition: 'blue', Qualification: 'blue', Prospection: 'gray' };
const sourceColors = ['rgba(255,249,147,0.8)', 'rgba(123,170,191,0.7)', 'rgba(169,141,196,0.7)', 'rgba(167,173,170,0.5)'];

// Évolution mensuelle — comptages discrets → barres groupées (pas de fausse continuité)
const evoBarOpts = {
  responsive: true, maintainAspectRatio: false,
  animation: { duration: 900, easing: 'easeOutQuart' },
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: tickStyle, grid: gridStyle, border: borderStyle },
    y: { ticks: { ...tickStyle, stepSize: 1 }, grid: gridStyle, border: borderStyle, min: 0 },
  },
};

export default function FocusCommercial() {
  const mounted = useChartMount();
  const { result, loading } = useSnapshotData();

  // Calcul du % pour la répartition revenue missions
  const totalRevMissions = d.missions.reduce((sum, m) => sum + m.revenue, 0);

  const circumference = 276.5;
  const winRate = result?.winRate ?? 0;
  const dashTarget = winRate * (circumference / 100);

  return (
    <div className={styles.page}>

      {/* ══ Ligne 1 — L'entonnoir en chiffres : entrée → conversion → sortie ══ */}
      <SectionLabel badge="Monday CRM — données réelles">L'entonnoir — pipeline, conversion, signatures</SectionLabel>
      <Loader loading={loading} label="Chargement des données CRM…" size={44} minHeight={110} />
      {result && (
        <>
          <div className={styles.kpiRow4}>
            <KPICard
              label="Pipeline total"
              value={fmt(result.montantPipeline)}
              trend={{ dir: 'neutral', text: 'Opportunités en cours' }}
              color="blue"
            />
            <KPICard
              label="Pipeline pondéré"
              value={fmt(result.montantPipelinePondere)}
              trend={{ dir: 'neutral', text: 'Seuil ≥ 30% de probabilité' }}
              color="green"
            />
            <KPICard
              label="Win rate"
              value={`${winRate}%`}
              trend={{ dir: winRate >= 50 ? 'up' : 'down', text: 'Gagnés ÷ (Gagnés + Perdus)' }}
              color={winRate >= 50 ? 'green' : 'amber'}
            />
            <KPICard
              label="Deals gagnés (période)"
              value={result.nbDealsGagnes}
              unit=" deals"
              trend={{ dir: result.nbDealsGagnes > 0 ? 'up' : 'neutral', text: `CA associé : ${fmt(result.sommeVentesGagnes)}` }}
              color="green"
            />
          </div>

          {/* ══ Ligne 2 — Diagnostic du flux : où sont les opps, que valent-elles ══ */}
          <SectionLabel>Diagnostic du pipeline</SectionLabel>
          <div className={styles.threeCol}>
            {/* Funnel par étape — les stats de cycle vivent dans le funnel */}
            <Card title="Funnel par étape commerciale">
              <div className={styles.pipeTotal}>
                <div className={styles.metaSub}>Montant total pipeline</div>
                <div className={styles.metaVal}>{fmt(d.pipelineTotal)}</div>
              </div>
              {d.pipelineStages.map((s, i) => (
                <div key={s.label} className={styles.funnelRow}>
                  <div className={styles.stageLbl}>{s.label}</div>
                  <div className={styles.funnelTrack}>
                    <div
                      className={styles.funnelFill}
                      style={{
                        width: mounted ? `${s.pct}%` : '0%',
                        opacity: 0.85 - i * 0.1,
                        transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                      }}
                    >
                      {s.opps} opps <span>{s.pct}%</span>
                    </div>
                  </div>
                  <div className={styles.stageAmt}>{fmt(s.amount)}</div>
                </div>
              ))}
              <div className={styles.sep} />
              <div className={styles.cycleStats}>
                <div><span className={styles.cycleVal}>{d.kpis[4].value} j</span><span className={styles.cycleLbl}>Âge moyen des opps</span></div>
                <div><span className={styles.cycleVal}>{d.kpis[5].value} j</span><span className={styles.cycleLbl}>Cycle de vente moyen</span></div>
              </div>
            </Card>

            {/* Pipeline pondéré par probabilité */}
            <Card title="Pipeline pondéré par probabilité">
              <div className={styles.pipelineHeader}>
                <div>
                  <div className={styles.metaSub}>Pipeline total</div>
                  <div className={styles.metaVal}>{fmt(result.montantPipeline)}</div>
                </div>
                <div>
                  <div className={styles.metaSub}>Pipeline pondéré</div>
                  <div className={styles.metaVal} style={{ color: 'var(--myrtille)' }}>{fmt(result.montantPipelinePondere)}</div>
                </div>
              </div>
              <div className={styles.sep} />
              {result.pipelineBreakdown.map((p, i) => (
                <div key={p.label} className={styles.pBar}>
                  <div className={styles.pLabel}>{p.label}</div>
                  <div className={styles.pTrack}>
                    <div
                      className={styles.pFill}
                      style={{
                        width: mounted ? `${p.pct}%` : '0%',
                        background: p.color,
                        transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                      }}
                    >
                      <span>{fmt(p.amount)}</span>
                      <span style={{ opacity: 0.7 }}>{p.pct}%</span>
                    </div>
                  </div>
                </div>
              ))}
              {result.pipelineBreakdown.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 12 }}>Aucune opportunité en pipeline</div>
              )}
            </Card>

            {/* Win rate — jauge + détail des issues */}
            <Card title="Win rate — détail des issues">
              <div className={styles.donutWrap} style={{ height: 'auto' }}>
                <svg viewBox="0 0 110 110" width={120} height={120}>
                  <defs>
                    <linearGradient id="winGradFC" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#26001F" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#26001F" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <circle cx="55" cy="55" r="44" fill="none" stroke="rgba(167,173,170,0.25)" strokeWidth="11" />
                  {/* Repère cible 50% */}
                  <line x1="55" y1="4" x2="55" y2="16" stroke="rgba(38,0,31,0.3)" strokeWidth="2" transform="rotate(180 55 55)" />
                  <circle
                    cx="55" cy="55" r="44" fill="none"
                    stroke="url(#winGradFC)" strokeWidth="11"
                    strokeDasharray={mounted ? `${dashTarget} ${circumference}` : `0 ${circumference}`}
                    strokeLinecap="round"
                    transform="rotate(-90 55 55)"
                    style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)' }}
                  />
                </svg>
                <div className={styles.donutCenter}>
                  <div className={styles.donutVal}>{winRate}%</div>
                  <div className={styles.donutLbl}>Win rate</div>
                </div>
              </div>
              <div className={styles.donutStats}>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--pos)' }}>{result.dealStats.gagnes}</div>
                  <div className={styles.dl}>Gagnés</div>
                </div>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--neg)' }}>{result.dealStats.perdus}</div>
                  <div className={styles.dl}>Perdus</div>
                </div>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--warn)' }}>{result.dealStats.standby}</div>
                  <div className={styles.dl}>Stand-by</div>
                </div>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--text2)' }}>{result.dealStats.enCours}</div>
                  <div className={styles.dl}>En cours</div>
                </div>
              </div>
              <div className={styles.subnote}>Repère vertical = cible 50% · Win rate = Gagnés ÷ (Gagnés + Perdus)</div>
            </Card>
          </div>
        </>
      )}

      {/* ══ Ligne 3 — Pourquoi on perd : tendance + causes sur la même ligne ══ */}
      <SectionLabel badge="Monday CRM">Pourquoi on gagne, pourquoi on perd</SectionLabel>
      <div className={styles.threeCol}>
        <Card title="Deals gagnés / perdus / stand-by — par mois">
          <div className={styles.lineWrap} style={{ height: 180 }}>
            <Bar
              data={{
                labels: months,
                datasets: [
                  { label: 'Gagnés',   data: d.evolution.gagnes,  backgroundColor: 'rgba(142,207,170,0.75)', borderRadius: 3, borderSkipped: false },
                  { label: 'Perdus',   data: d.evolution.perdus,  backgroundColor: 'rgba(196,135,106,0.75)', borderRadius: 3, borderSkipped: false },
                  { label: 'Stand-by', data: d.evolution.standby, backgroundColor: 'rgba(212,168,75,0.7)',   borderRadius: 3, borderSkipped: false },
                ],
              }}
              options={evoBarOpts}
            />
          </div>
          <div className={styles.legend}>
            <span className={styles.legDot} style={{ background: '#8ECFAA' }} />Gagnés
            <span className={styles.legDot} style={{ background: '#C4876A', marginLeft: 12 }} />Perdus
            <span className={styles.legDot} style={{ background: '#D4A84B', marginLeft: 12 }} />Stand-by
          </div>
        </Card>
        <Card title="Motifs des deals perdus">
          {d.motifsPerte.map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />)}
          <div className={styles.subnote}>
            {d.kpis[2].value} deals perdus sur la période — % du total des deals perdus
          </div>
        </Card>
        <Card title="Motifs des deals stand-by">
          {d.motifsStandby.map(m => <MotifBar key={m.label} {...m} fillColor="var(--warn)" />)}
          <div className={styles.subnote}>
            {d.kpis[1].value} deals en attente sur la période — % du total des deals stand-by
          </div>
        </Card>
      </div>

      {/* ══ Ligne 4 — L'action immédiate : la to-do de la réunion d'équipe ══ */}
      <SectionLabel>À traiter cette semaine</SectionLabel>
      <Card title="Opportunités sans prochaine action">
        <div className={styles.alertCount}>
          <span className={styles.alertNum}>{d.oppsWithoutAction.length}</span>
          <span className={styles.alertSub}>affaires sans relance planifiée — à traiter</span>
        </div>
        <table className={styles.tbl}>
          <thead><tr>
            <th>Opportunité</th><th>Étape</th><th>Âge</th><th>Urgence</th>
          </tr></thead>
          <tbody>
            {d.oppsWithoutAction.map(o => (
              <tr key={o.name}>
                <td><strong>{o.name}</strong></td>
                <td><Pill variant={stageVariant[o.stage] || 'gray'}>{o.stage}</Pill></td>
                <td>{o.age} j</td>
                <td><Pill variant={urgenceVariant[o.urgence] || 'gray'}>{o.urgence}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ══ Ligne 5 — Segments : lecture stratégique ══ */}
      <SectionLabel>Performance par segment</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="CA par secteur d'activité">
          {d.secteurs.map((s, i) => (
            <div key={s.label} className={styles.sectorRow}>
              <div className={styles.sectorLbl}>{s.label}</div>
              <div className={styles.sectorTrack}>
                <div
                  className={styles.sectorFill}
                  style={{
                    width: mounted ? `${s.pct}%` : '0%',
                    transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms`,
                  }}
                />
              </div>
              <div className={styles.sectorVal}>{fmt(s.amount)}</div>
            </div>
          ))}
        </Card>
        {/* Sources de lead — partie-du-tout à 4 segments → donut (Kosara & Skau) */}
        <Card title="Performance par source de lead">
          {/* Modèle "rose" : camembert complet à rayons proportionnels aux valeurs */}
          <DonutChart
            variant="rose"
            data={d.sources.map(s => s.pct)}
            labels={d.sources.map(s => s.label)}
            colors={sourceColors}
            height={210}
            tooltip={(label, value) => `${label} : ${value}%`}
          />
          <div className={styles.donutLegend}>
            {d.sources.map((s, i) => (
              <span key={s.label} className={styles.legItem}>
                <span className={styles.legDot} style={{ background: sourceColors[i] }} />{s.label} {s.pct}%
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* ══ Ligne 6 — Missions MA : part du tout en donut + chiffres exacts à côté ══ */}
      <SectionLabel>Revenue par type de mission MA</SectionLabel>
      <Card title="Répartition du revenue par type de mission">
        <div className={styles.missionSplit}>
          {/* Modèle "demi-rose" : éventail semi-circulaire à rayons variables */}
          <div style={{ flex: '0 0 240px' }}>
            <DonutChart
              variant="half-rose"
              data={d.missions.map(m => m.revenue)}
              labels={d.missions.map(m => m.label)}
              colors={['rgba(255,249,147,0.95)', 'rgba(38,0,31,0.8)', 'rgba(196,135,106,0.85)']}
              height={145}
              tooltip={(label, value, pct) => `${label} : ${fmt(value)} (${pct}%)`}
            />
          </div>
          <div className={styles.missionList}>
            {d.missions.map((m, i) => (
              <div key={m.label} className={styles.missionCard}>
                <div className={styles.missionName}>
                  <span className={styles.legDot} style={{ background: ['rgba(255,249,147,0.95)', 'rgba(38,0,31,0.8)', 'rgba(196,135,106,0.85)'][i], marginRight: 7 }} />
                  {m.label}
                </div>
                <div>
                  <div className={styles.missionRev}>{fmt(m.revenue)} <span className={styles.missionPct}>· {Math.round(m.revenue / totalRevMissions * 100)}%</span></div>
                  <div className={styles.missionAvg}>Moy. {fmt(m.moy)} / mission</div>
                </div>
              </div>
            ))}
            <div className={styles.revMoyen}>
              <span>Revenue moyen / mission (global)</span>
              <span className={styles.revMoyenVal}>{fmt(d.revMoyenMission)}</span>
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}
