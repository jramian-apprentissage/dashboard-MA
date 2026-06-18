import { Bar, Line } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import MotifBar from '../../../components/ui/MotifBar';
import { activiteSalesData as d, months } from '../../../data/mockData';
import styles from './Activite.module.css';

Chart.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'OverusedGrotesk' } };
const gridStyle = { color: 'rgba(227,225,216,0.04)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };
const barAnim = { duration: 900, easing: 'easeOutQuart', delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 55 : 0 };
const lineAnim = { duration: 900, easing: 'easeOutQuart' };

export default function ActiviteSales() {
  const mounted = useChartMount();

  return (
    <div className={styles.page}>
      <SectionLabel badge="RINGOVER">Activité Sales — indicateurs clés</SectionLabel>
      <div className={styles.kpiGrid6}>
        {d.kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      <div className={styles.twoCol}>
        <Card title="Statut par appels — répartition">
          <div className={styles.chartWrap} style={{ height: 200 }}>
            <Bar
              data={{
                labels: d.statutAppels.map(s => s.label),
                datasets: [{ data: d.statutAppels.map(s => s.count), backgroundColor: ['rgba(255,249,147,0.7)', 'rgba(123,170,191,0.55)', 'rgba(167,173,170,0.4)', 'rgba(196,135,106,0.55)', 'rgba(212,168,75,0.55)'], borderRadius: 5, borderSkipped: false }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, animation: barAnim, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y + ' appels' } } }, scales: { x: { ticks: tickStyle, grid: gridStyle, border: borderCol }, y: { ticks: tickStyle, grid: gridStyle, border: borderCol } } }}
            />
          </div>
          <div className={styles.statutTable}>
            {d.statutAppels.map((s, i) => (
              <div key={s.label} className={styles.statutRow}>
                <div className={styles.statutLbl}>{s.label}</div>
                <div className={styles.statutTrack}>
                  <div
                    className={styles.statutFill}
                    style={{
                      width: mounted ? `${s.pct}%` : '0%',
                      transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 65}ms`,
                    }}
                  />
                </div>
                <div className={styles.statutVals}><span>{s.count}</span><span className={styles.pct}>{s.pct}%</span></div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Motifs de refus en appel">
          <div className={styles.subNote} style={{ marginBottom: 12 }}>Principaux freins rencontrés en prospection</div>
          {d.motifsRefus.map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />)}
          <div className={styles.subNote} style={{ marginTop: 8 }}>Plusieurs motifs possibles par appel</div>
        </Card>
      </div>

      <SectionLabel>Performance globale / collaborateur</SectionLabel>
      <Card title="Comparatif individuel — principaux leviers">
        <table className={styles.perfTable}>
          <thead><tr>
            <th>Collaborateur</th>
            <th>Appels émis</th>
            <th>Appels argumentés</th>
            <th>RDV pris</th>
            <th>Taux décroché</th>
            <th>Présence</th>
          </tr></thead>
          <tbody>
            {d.collaborateurs.map((c, i) => (
              <tr key={c.name} className={i === 0 ? styles.topRow : ''}>
                <td className={styles.tdName}>{c.name}</td>
                <td className={styles.tdNum}>{c.appels}</td>
                <td className={styles.tdNum}>{c.argues}</td>
                <td className={styles.tdNum}>{c.rdv}</td>
                <td className={styles.tdNum}>
                  <span className={styles.tauxPill} style={{ color: parseInt(c.taux) >= 55 ? 'var(--pos)' : parseInt(c.taux) >= 45 ? 'var(--warn)' : 'var(--neg)' }}>{c.taux}</span>
                </td>
                <td className={styles.tdNum}>{c.presence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SectionLabel>Évolution mensuelle</SectionLabel>
      <Card title="Appels émis & RDV pris — évolution mensuelle">
        <div className={styles.chartWrap} style={{ height: 200 }}>
          <Line
            data={{
              labels: months,
              datasets: [
                { label: 'Appels émis', data: d.evolutionMensuelle.appels, borderColor: '#FFF993', backgroundColor: 'rgba(255,249,147,0.05)', pointBackgroundColor: '#FFF993', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y' },
                { label: 'RDV pris', data: d.evolutionMensuelle.rdv, borderColor: '#7EB89A', backgroundColor: 'rgba(126,184,154,0.04)', pointBackgroundColor: '#7EB89A', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y2' },
              ],
            }}
            options={{
              responsive: true, maintainAspectRatio: false,
              animation: lineAnim,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: tickStyle, grid: gridStyle, border: borderCol },
                y: { ticks: tickStyle, grid: gridStyle, border: borderCol, position: 'left' },
                y2: { ticks: { ...tickStyle, color: 'rgba(126,184,154,0.5)' }, grid: { display: false }, border: borderCol, position: 'right' },
              },
            }}
          />
        </div>
        <div className={styles.legend}>
          <span className={styles.legDot} style={{ background: 'var(--accent)' }} />Appels émis (axe gauche)
          <span className={styles.legDot} style={{ background: '#7EB89A', marginLeft: 14 }} />RDV pris (axe droit)
        </div>
      </Card>
    </div>
  );
}
