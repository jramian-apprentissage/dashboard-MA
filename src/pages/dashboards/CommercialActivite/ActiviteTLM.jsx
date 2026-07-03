import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import MotifBar from '../../../components/ui/MotifBar';
import { activiteTLMData as d, months } from '../../../data/mockData';
import styles from './Activite.module.css';

Chart.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler);

const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(227,225,216,0.5)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };
const barAnim = { duration: 900, easing: 'easeOutQuart', delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 55 : 0 };

function rdvInsidePlugin(rows) {
  return {
    id: 'rdvInside',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = 'bold 9px OverusedGrotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      meta.data.forEach((bar, i) => {
        const rdv = rows[i]?.rdv;
        if (!rdv) return;
        const barHeight = bar.base - bar.y;
        if (barHeight < 18) return;
        ctx.fillStyle = 'rgba(142,207,170,0.95)';
        ctx.fillText(`RDV : ${rdv}`, bar.x, bar.y + 4);
      });
      ctx.restore();
    },
  };
}
const lineAnim = { duration: 900, easing: 'easeOutQuart' };

function getKPIs(collab) {
  if (collab === 'Tous') return d.kpis;
  const c = d.collaborateurs.find(x => x.name === collab);
  if (!c) return d.kpis;
  return [
    { label: 'Appels émis', value: c.appels, unit: '', trend: { dir: 'neutral', text: 'Période Jan–Jun 2025' }, color: 'blue' },
    { label: 'Contacts joints', value: d.kpis[1].value, unit: '', trend: { dir: 'neutral', text: 'Données globales' }, color: 'blue' },
    { label: 'Appels exploitables', value: c.exploitables, unit: '', trend: { dir: 'neutral', text: `${Math.round(c.exploitables / c.appels * 100)}% du total` }, color: 'green' },
    { label: 'Appels non exploitables', value: d.kpis[3].value, unit: '', trend: { dir: 'neutral', text: 'Données globales' }, color: 'red' },
    { label: 'Taux décrochés >30s', value: d.kpis[4].value, unit: '', trend: { dir: 'neutral', text: 'Données globales' }, color: 'accent' },
    { label: 'Fiches complétées', value: c.fiches, unit: '', trend: { dir: 'neutral', text: `Taux : ${c.tauxCompletion}` }, color: 'green' },
    { label: 'RDV pris', value: c.rdv, unit: '', trend: { dir: 'neutral', text: 'Période Jan–Jun 2025' }, color: 'green' },
    { label: 'Taux RDV honorés', value: d.kpis[7].value, unit: '', trend: { dir: 'neutral', text: 'Données globales' }, color: 'purple' },
    { label: 'Taux transformation nette', value: c.taux, unit: '', trend: { dir: 'neutral', text: 'Taux individuel' }, color: 'accent' },
    { label: 'Leads à recycler', value: d.kpis[9].value, unit: '', trend: { dir: 'neutral', text: 'Données globales' }, color: 'amber' },
    { label: 'Leads restants à contacter', value: d.kpis[10].value, unit: '', trend: { dir: 'neutral', text: 'Données globales' }, color: 'amber' },
    { label: 'Taux fiches exploitables', value: c.tauxCompletion, unit: '', trend: { dir: 'neutral', text: 'Taux individuel' }, color: 'amber' },
  ];
}

export default function ActiviteTLM({ selectedCollab = 'Tous' }) {
  const mounted = useChartMount();
  const kpis = getKPIs(selectedCollab);
  const trancheRows = d.tranchesHoraires.data[selectedCollab] || d.tranchesHoraires.data['Tous'];

  return (
    <div className={styles.page}>
      <SectionLabel badge="KAVKOM — 'EN STAND BY'">Activité TLM — indicateurs clés</SectionLabel>
      <div className={styles.kpiGrid4}>
        {kpis.slice(0, 8).map(k => <KPICard key={k.label} {...k} />)}
      </div>
      <div className={styles.kpiGrid4} style={{ marginTop: 0 }}>
        {kpis.slice(8).map(k => <KPICard key={k.label} {...k} />)}
      </div>
      <SectionLabel>Performance globale / collaborateur TLM</SectionLabel>
      <Card title="Comparatif individuel — principaux leviers TLM">
        <table className={styles.perfTable}>
          <thead><tr>
            <th>Collaborateur</th>
            <th>Appels émis</th>
            <th>Exploitables</th>
            <th>Fiches complétées</th>
            <th>RDV pris</th>
            <th>Taux complétion</th>
            <th>Taux transf.</th>
          </tr></thead>
          <tbody>
            {d.collaborateurs.map((c, i) => (
              <tr key={c.name} className={`${i === 0 ? styles.topRow : ''} ${c.name === selectedCollab ? styles.highlightRow : ''}`}>
                <td className={styles.tdName}>{c.name}</td>
                <td className={styles.tdNum}>{c.appels}</td>
                <td className={styles.tdNum}>{c.exploitables}</td>
                <td className={styles.tdNum}>{c.fiches}</td>
                <td className={styles.tdNum}>{c.rdv}</td>
                <td className={styles.tdNum}>
                  <span className={styles.tauxPill} style={{ color: parseInt(c.tauxCompletion) >= 70 ? 'var(--pos)' : 'var(--warn)' }}>{c.tauxCompletion}</span>
                </td>
                <td className={styles.tdNum}>
                  <span className={styles.tauxPill} style={{ color: parseFloat(c.taux) >= 5 ? 'var(--pos)' : 'var(--warn)' }}>{c.taux}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>


      <SectionLabel>Appels par tranche horaire</SectionLabel>
      <Card title={`Joignabilité & RDV par tranche horaire${selectedCollab !== 'Tous' ? ` — ${selectedCollab}` : ' — Équipe'}`}>
        <div className={styles.chartWrap} style={{ height: 240 }}>
          <Bar
            plugins={[rdvInsidePlugin(trancheRows)]}
            data={{
              labels: trancheRows.map(r => r.t),
              datasets: [
                {
                  type: 'bar',
                  label: 'Appels émis',
                  data: trancheRows.map(r => r.appels),
                  backgroundColor: 'rgba(255,249,147,0.38)',
                  borderRadius: 4,
                  borderSkipped: false,
                  yAxisID: 'y',
                  order: 1,
                },
                {
                  type: 'line',
                  label: 'Joignabilité %',
                  data: trancheRows.map(r => r.appels > 0 ? r.join : null),
                  borderColor: 'rgba(196,135,106,0.9)',
                  backgroundColor: 'rgba(196,135,106,0.04)',
                  pointBackgroundColor: 'rgba(196,135,106,0.9)',
                  tension: 0.35,
                  fill: false,
                  pointRadius: 4,
                  borderWidth: 2,
                  yAxisID: 'y2',
                  spanGaps: false,
                  order: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: barAnim,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: ctx => ctx.dataset.label === 'Joignabilité %'
                      ? `${ctx.dataset.label}: ${ctx.parsed.y}%`
                      : `${ctx.dataset.label}: ${ctx.parsed.y} appels`,
                  },
                },
              },
              scales: {
                x: { ticks: { ...tickStyle, font: { size: 9 } }, grid: gridStyle, border: borderCol },
                y: { ticks: tickStyle, grid: gridStyle, border: borderCol, position: 'left', title: { display: true, text: 'Nb appels', color: 'rgba(167,173,170,0.4)', font: { size: 9 } } },
                y2: { ticks: { ...tickStyle, callback: v => v + '%' }, grid: { display: false }, border: borderCol, position: 'right', min: 0, max: 100, title: { display: true, text: 'Joignabilité %', color: 'rgba(196,135,106,0.5)', font: { size: 9 } } },
              },
            }}
          />
        </div>
        <div className={styles.legend}>
          <span className={styles.legDot} style={{ background: 'rgba(255,249,147,0.7)' }} />Appels émis (axe gauche)
          <span style={{ color: 'rgba(142,207,170,0.9)', fontWeight: 600, marginLeft: 14, fontSize: 10 }}>RDV : n</span> affiché dans chaque barre
          <span className={styles.legDot} style={{ background: 'rgba(196,135,106,0.9)', marginLeft: 14 }} />Joignabilité % (axe droit)
        </div>
      </Card>

      <div className={styles.twoCol}>
        <Card title="Statut par appels TLM — répartition">
          {/* Partie-du-tout (100% des appels) → donut ; les barres dessous donnent le détail */}
          <div className={styles.chartWrap} style={{ height: 190 }}>
            <Doughnut
              data={{
                labels: d.statutAppels.map(s => s.label),
                datasets: [{ data: d.statutAppels.map(s => s.count), backgroundColor: ['rgba(255,249,147,0.8)', 'rgba(167,173,170,0.5)', 'rgba(240,92,92,0.65)', 'rgba(245,166,35,0.65)', 'rgba(74,224,140,0.65)', 'rgba(240,92,92,0.4)'], borderWidth: 0, hoverOffset: 4 }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', animation: { duration: 1000, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label} : ${ctx.parsed} appels` } } } }}
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
                      width: mounted ? `${s.pct * 3}%` : '0%',
                      transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 65}ms`,
                    }}
                  />
                </div>
                <div className={styles.statutVals}><span>{s.count}</span><span className={styles.pct}>{s.pct}%</span></div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Motifs de refus en appel TLM">
          <div className={styles.subNote} style={{ marginBottom: 12 }}>Freins récurrents rencontrés par les équipes TLM</div>
          {d.motifsRefus.map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />)}
          <div className={styles.subNote} style={{ marginTop: 8 }}>Plusieurs motifs possibles par appel</div>
        </Card>
      </div>

      <SectionLabel>Évolution mensuelle TLM</SectionLabel>
      <Card title="Appels, RDV pris & Fiches complétées — évolution mensuelle">
        <div className={styles.chartWrap} style={{ height: 210 }}>
          <Line
            data={{
              labels: months,
              datasets: [
                { label: 'Appels émis', data: d.evolutionMensuelle.appels, borderColor: 'var(--accent)', backgroundColor: 'rgba(255,249,147,0.05)', pointBackgroundColor: 'var(--accent)', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y' },
                { label: 'Fiches complétées', data: d.evolutionMensuelle.fiches, borderColor: 'rgba(227,225,216,0.5)', backgroundColor: 'rgba(227,225,216,0.03)', pointBackgroundColor: 'rgba(227,225,216,0.5)', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y2' },
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
          <span className={styles.legDot} style={{ background: 'var(--accent)' }} />Appels (axe gauche)
          <span className={styles.legDot} style={{ background: 'rgba(227,225,216,0.5)', marginLeft: 14 }} />Fiches complétées (axe droit)
          <span className={styles.legDot} style={{ background: '#7EB89A', marginLeft: 14 }} />RDV pris (axe droit)
        </div>
      </Card>
    </div>
  );
}
