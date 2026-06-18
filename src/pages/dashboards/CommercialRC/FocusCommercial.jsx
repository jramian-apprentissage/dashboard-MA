import { Line, Doughnut } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Pill from '../../../components/ui/Pill';
import MotifBar from '../../../components/ui/MotifBar';
import { focusCommercialData as d, months } from '../../../data/mockData';
import styles from './FocusCommercial.module.css';

Chart.register(LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler);

const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(0)} K€` : `${v}€`;
const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'OverusedGrotesk' } };
const gridStyle = { color: 'rgba(227,225,216,0.04)' };
const borderStyle = { color: 'rgba(227,225,216,0.08)' };

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

  return (
    <div className={styles.page}>
      <SectionLabel badge="Monday CRM">Pipeline & activité commerciale</SectionLabel>
      <div className={styles.kpiGrid}>
        {d.kpis.map(k => <KPICard key={k.label} {...k} />)}
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

      <div className={styles.twoCol}>
        <Card title="Motifs de perte">
          <div className={styles.metaSub} style={{ marginBottom: 12 }}>{d.kpis[2].value} deals perdus sur la période</div>
          {d.motifsPerte.map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />)}
          <div className={styles.subnote}>Plusieurs motifs possibles par deal — total {'>'} 100%</div>
        </Card>
        <Card title="Motifs de stand-by">
          <div className={styles.metaSub} style={{ marginBottom: 12 }}>{d.kpis[1].value} deals en attente sur la période</div>
          {d.motifsStandby.map(m => <MotifBar key={m.label} {...m} fillColor="var(--warn)" />)}
          <div className={styles.subnote}>Plusieurs motifs possibles par deal — total {'>'} 100%</div>
        </Card>
      </div>

      <SectionLabel>Performance par segment</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="Performance par secteur d'activité">
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
              options={{ ...doughnutOpts, plugins: { legend: { display: false } } }}
            />
          </div>
          <div className={styles.donutLegend}>
            {d.missions.map((m, i) => (
              <span key={m.label} className={styles.legItem}>
                <span className={styles.legDot} style={{ background: ['rgba(255,249,147,0.75)', 'rgba(227,225,216,0.45)', 'rgba(167,173,170,0.35)'][i] }} />{m.label}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <SectionLabel>Évolution mensuelle des performances</SectionLabel>
      <Card title="Deals gagnés, perdus & stand-by — évolution mensuelle">
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
    </div>
  );
}
