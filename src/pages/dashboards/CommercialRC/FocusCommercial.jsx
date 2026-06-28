import { Line, Doughnut } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Pill from '../../../components/ui/Pill';
import MotifBar from '../../../components/ui/MotifBar';
import { focusCommercialData as d, months } from '../../../data/mockData';
import styles from './FocusCommercial.module.css';

Chart.register(LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler);

const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(0)} K€` : `${v}€`;
const tickStyle = { color: 'rgba(22,5,18,0.35)', font: { size: 10, family: 'OverusedGrotesk' } };
const gridStyle = { color: 'rgba(22,5,18,0.06)' };
const borderStyle = { color: 'rgba(22,5,18,0.08)' };

const urgenceVariant = { Critique: 'red', Haute: 'amber', Normale: 'green' };
const stageVariant = { Négociation: 'amber', Proposition: 'blue', Qualification: 'blue', Prospection: 'gray' };
const sourceColors = ['rgba(255,249,147,0.8)', 'rgba(123,170,191,0.7)', 'rgba(169,141,196,0.7)', 'rgba(167,173,170,0.5)'];

const doughnutOpts = {
  responsive: true, maintainAspectRatio: false, cutout: '68%',
  animation: { duration: 1000, easing: 'easeOutQuart' },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.label + ' : ' + ctx.parsed + '%' } } },
};

const lineOpts = {
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


  // Calcul du % pour la répartition revenue
  const totalRevMissions = d.missions.reduce((sum, m) => sum + m.revenue, 0);

  const circumference = 276.5;
  const winRate = result?.winRate ?? 0;
  const dashTarget = winRate * (circumference / 100);

  return (
    <div className={styles.page}>

      {/* ── Pipeline & Win rate — données réelles Monday CRM ──────────────── */}
      <SectionLabel badge="Monday CRM — données réelles">Pipeline & taux de transformation</SectionLabel>
      {loading && (
        <div style={{ padding: '16px 0', color: 'var(--text3)', fontSize: 12 }}>Chargement des données CRM…</div>
      )}
      {result && (
        <>
          <div className={styles.pipelineTopRow}>
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
              label="Deals gagnés (période)"
              value={result.nbDealsGagnes}
              unit=" deals"
              trend={{ dir: result.nbDealsGagnes > 0 ? 'up' : 'neutral', text: 'Date de démarrage sur la période' }}
              color="green"
            />
          </div>

          <div className={styles.pipelineDetailRow}>
            {/* Pipeline pondéré breakdown */}
            <Card title="Pipeline pondéré par probabilité">
              <div className={styles.pipelineHeader}>
                <div>
                  <div className={styles.metaSub}>Pipeline total</div>
                  <div className={styles.metaVal}>{fmt(result.montantPipeline)}</div>
                </div>
                <div>
                  <div className={styles.metaSub}>Pipeline pondéré</div>
                  <div className={styles.metaVal} style={{ color: 'var(--accent)' }}>{fmt(result.montantPipelinePondere)}</div>
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

            {/* Win rate */}
            <Card title="Win rate — Taux de transformation">
              <div className={styles.donutWrap}>
                <svg viewBox="0 0 110 110" width={120} height={120}>
                  <defs>
                    <linearGradient id="winGradFC" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#FBFBFB" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#FFF993" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <circle cx="55" cy="55" r="44" fill="none" stroke="rgba(167,173,170,0.20)" strokeWidth="11" />
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
              <div className={styles.subnote}>Win rate = Gagnés ÷ (Gagnés + Perdus)</div>
            </Card>
          </div>
        </>
      )}

      {/* ── Activité commerciale — données mock ────────────────────────────── */}
      <SectionLabel badge="Monday CRM">Pipeline & activité commerciale</SectionLabel>

      {/* ── Ligne 1 : Deals (gagnés en premier) ── */}
      <div className={styles.dealsGrid}>
        {/* Deals gagnés — bloc spécial avec nb + € */}
        <div className={styles.dealGagneCard}>
          <div className={styles.dgLabel}>Deals gagnés</div>
          <div className={styles.dgValues}>
            <span className={styles.dgNb}>{d.kpis[3].value}</span>
            <span className={styles.dgUnit}>deals</span>
            <span className={styles.dgSep}>·</span>
            <span className={styles.dgEuros}>{fmt(d.valeurDealsGagnes)}</span>
          </div>
          <div className={styles.dgTrend}>+12% vs période préc.</div>
        </div>
        <KPICard label="Deals en cours"  value={d.kpis[0].value} unit=" deals" trend={null}                                              color="blue" />
        <KPICard label="Deals stand-by"  value={d.kpis[1].value} unit=" deals" trend={{ dir: 'down', text: '+2 vs mois préc.' }}        color="amber" />
        <KPICard label="Deals perdus"    value={d.kpis[2].value} unit=" deals" trend={{ dir: 'down', text: '+3 vs mois préc.' }}        color="red" />
      </div>

      {/* ── Ligne 2 : Indicateurs temporels ── */}
      <div className={styles.cycleGrid}>
        <KPICard label="Âge moyen des opportunités" value={d.kpis[4].value} unit=" j" trend={{ dir: 'neutral', text: 'Depuis création' }}         color="blue" />
        <KPICard label="Durée du cycle de vente"    value={d.kpis[5].value} unit=" j" trend={{ dir: 'neutral', text: 'Création → signature' }}    color="purple" />
      </div>

      <div className={styles.twoCol}>
        <Card title="Pipeline par étape commerciale">
          <div className={styles.pipeTotal}>
            <div className={styles.metaSub}>Montant total pipeline</div>
            <div className={styles.metaVal}>{fmt(d.pipelineTotal)}</div>
          </div>
          {d.pipelineStages.map((s, i) => (
            <div key={s.label} className={styles.stageRow}>
              <div className={styles.stageLbl}>{s.label}</div>
              <div className={styles.stageTrack}>
                <div
                  className={styles.stageFill}
                  style={{
                    width: mounted ? `${s.pct}%` : '0%',
                    opacity: 0.8 - i * 0.08,
                    transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                  }}
                >
                  {s.opps} opps <span>{s.pct}%</span>
                </div>
              </div>
              <div className={styles.stageAmt}>{fmt(s.amount)}</div>
            </div>
          ))}
        </Card>

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
      </div>

      <SectionLabel>Évolution mensuelle des performances</SectionLabel>
      <Card title="Deals gagnés, perdus & stand-by — évolution mensuelle">
        <div className={styles.evoKpis}>
          <div className={styles.evoStat}><span className={styles.evoVal} style={{ color: 'var(--pos)' }}>{d.kpis[3].value}</span><span className={styles.evoLbl}>Gagnés</span></div>
          <div className={styles.evoStat}><span className={styles.evoVal} style={{ color: 'var(--neg)' }}>{d.kpis[2].value}</span><span className={styles.evoLbl}>Perdus</span></div>
          <div className={styles.evoStat}><span className={styles.evoVal} style={{ color: 'var(--warn)' }}>{d.kpis[1].value}</span><span className={styles.evoLbl}>Stand-by</span></div>
          <div className={styles.evoStat}><span className={styles.evoVal} style={{ color: 'var(--text2)' }}>{d.kpis[0].value}</span><span className={styles.evoLbl}>En cours</span></div>
        </div>
        <div className={styles.lineWrap}>
          <Line
            data={{
              labels: months,
              datasets: [
                { label: 'Deals gagnés', data: d.evolution.gagnes, borderColor: '#8ECFAA', backgroundColor: 'rgba(142,207,170,0.06)', pointBackgroundColor: '#8ECFAA', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2 },
                { label: 'Deals perdus', data: d.evolution.perdus, borderColor: '#C4876A', backgroundColor: 'rgba(196,135,106,0.05)', pointBackgroundColor: '#C4876A', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2 },
                { label: 'Stand-by', data: d.evolution.standby, borderColor: '#D4A84B', backgroundColor: 'rgba(212,168,75,0.05)', pointBackgroundColor: '#D4A84B', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2 },
              ],
            }}
            options={lineOpts}
          />
        </div>
        <div className={styles.legend}>
          <span className={styles.legDot} style={{ background: '#8ECFAA' }} />Deals gagnés
          <span className={styles.legDot} style={{ background: '#C4876A', marginLeft: 12 }} />Deals perdus
          <span className={styles.legDot} style={{ background: '#D4A84B', marginLeft: 12 }} />Stand-by
        </div>
      </Card>

      <div className={styles.twoCol}>
        <Card title="Motifs des deals perdus">
          {d.motifsPerte.map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />)}
          <div className={styles.subnote}>
            {d.kpis[2].value} deals perdus sur la période · Divers motifs de perte possibles — % du total des deals perdus
          </div>
        </Card>
        <Card title="Motifs des deals stand-by">
          {d.motifsStandby.map(m => <MotifBar key={m.label} {...m} fillColor="var(--warn)" />)}
          <div className={styles.subnote}>
            {d.kpis[1].value} deals en attente sur la période · Divers motifs possibles — % du total des deals stand-by
          </div>
        </Card>
      </div>

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
        <Card title="Performance par source de lead">
          <div className={styles.donutWrap}>
            <Doughnut
              data={{
                labels: d.sources.map(s => s.label),
                datasets: [{ data: d.sources.map(s => s.pct), backgroundColor: sourceColors, borderWidth: 0, hoverOffset: 4 }],
              }}
              options={doughnutOpts}
            />
          </div>
          <div className={styles.donutLegend}>
            {d.sources.map((s, i) => (
              <span key={s.label} className={styles.legItem}>
                <span className={styles.legDot} style={{ background: sourceColors[i] }} />{s.label} {s.pct}%
              </span>
            ))}
          </div>
        </Card>
      </div>

      <SectionLabel>Revenue par type de mission MA</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="Revenue & marge par type de mission">
          {d.missions.map(m => (
            <div key={m.label} className={styles.missionCard}>
              <div className={styles.missionName}>{m.label}</div>
              <div>
                <div className={styles.missionRev}>{fmt(m.revenue)}</div>
                <div className={styles.missionAvg}>Moy. {fmt(m.moy)} / mission</div>
              </div>
            </div>
          ))}
          <div className={styles.sep} />
          <div className={styles.revMoyen}>
            <span>Revenue moyen / mission (global)</span>
            <span className={styles.revMoyenVal}>{fmt(d.revMoyenMission)}</span>
          </div>
        </Card>
        <Card title="Répartition revenue par mission">
          <div className={styles.donutWrap}>
            <Doughnut
              data={{
                labels: d.missions.map(m => m.label),
                datasets: [{ data: d.missions.map(m => m.revenue), backgroundColor: ['rgba(255,249,147,0.75)', 'rgba(227,225,216,0.45)', 'rgba(167,173,170,0.35)'], borderWidth: 0, hoverOffset: 4 }],
              }}
              options={{ ...doughnutOpts, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label} : ${Math.round(ctx.parsed / totalRevMissions * 100)}%` } } } }}
            />
          </div>
          <div className={styles.donutLegend}>
            {d.missions.map((m, i) => (
              <span key={m.label} className={styles.legItem}>
                <span className={styles.legDot} style={{ background: ['rgba(255,249,147,0.75)', 'rgba(227,225,216,0.45)', 'rgba(167,173,170,0.35)'][i] }} />
                {m.label} — {Math.round(m.revenue / totalRevMissions * 100)}%
              </span>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
