import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import styles from './Synthese.module.css';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

const fmt = v => {
  if (!v) return '0 €';
  if (v >= 1000) return `${(v / 1000).toFixed(0)} K€`;
  return `${v} €`;
};

const chartOpts = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 900,
    easing: 'easeOutQuart',
    delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 60 : 0,
  },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.x) } },
  },
  scales: {
    x: {
      ticks: { color: 'rgba(22,5,18,0.35)', font: { size: 10, family: 'OverusedGrotesk' }, callback: v => fmt(v) },
      grid:  { color: 'rgba(22,5,18,0.06)' },
      border: { color: 'rgba(22,5,18,0.08)' },
    },
    y: {
      ticks: { color: 'rgba(22,5,18,0.50)', font: { size: 10, family: 'OverusedGrotesk' } },
      grid:  { display: false },
    },
  },
};

export default function Synthese() {
  const mounted = useChartMount();
  const { result, loading, error } = useSnapshotData();

  if (loading) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
      Chargement des données CRM…
    </div>
  );

  if (error) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--neg)', fontSize: 13 }}>
      Erreur de chargement : {error}
    </div>
  );

  if (!result) return null;

  const d = result;

  const chartData = {
    labels: d.topClients.map(c => c.name),
    datasets: [{
      label: 'CA',
      data:  d.topClients.map(c => c.ca),
      backgroundColor: 'rgba(255,249,147,0.5)',
      borderRadius: 4,
      borderSkipped: false,
    }],
  };

  return (
    <div className={styles.page}>

      {/* ── Vue financière consolidée ───────────────────────────────────────── */}
      <SectionLabel badge="Monday CRM">Performance financière — portefeuille actuel</SectionLabel>
      <div className={styles.kpiGrid}>
        <KPICard
          label="CA Global"
          value={fmt(d.caGlobal)}
          trend={{ dir: 'neutral', text: `Clients actifs : ${d.nbClientsActifs}` }}
          color="blue"
        />
        <KPICard
          label="Marge brute globale"
          value={fmt(d.margeBruteGlobale)}
          trend={{ dir: d.tauxMarge >= 20 ? 'up' : 'neutral', text: `Taux : ${d.tauxMarge}%` }}
          color="green"
        />
        <KPICard
          label="Total achats (masse salariale)"
          value={fmt(d.totalAchats)}
          trend={{ dir: 'neutral', text: 'Ensemble clients actifs' }}
          color="amber"
        />
        <KPICard
          label="Portefeuille clients"
          value={d.nbClientsActifs}
          unit=" actifs"
          trend={{ dir: 'neutral', text: `sur ${d.nbClientsTotal} au total` }}
          color="purple"
        />
      </div>

      {/* ── Répartition CA par client ────────────────────────────────────────── */}
      <SectionLabel>Répartition CA — top clients</SectionLabel>
      <div className={styles.chartsRow}>
        <Card title="Top clients — CA (état actuel)">
          {d.topClients.length > 0 ? (
            <div className={styles.chartWrap}>
              <Bar data={chartData} options={chartOpts} />
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 12, padding: '20px 0' }}>Aucun client actif</div>
          )}
        </Card>

        <Card title="Top clients — part du CA">
          {d.topClients.map((c, i) => (
            <div key={c.name} className={styles.clientRow}>
              <div className={styles.cName}>{c.name}</div>
              <div className={styles.cRight}>
                <div className={styles.miniBar}>
                  <div
                    className={styles.miniFill}
                    style={{
                      width: mounted ? `${c.pct}%` : '0%',
                      transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms`,
                    }}
                  />
                </div>
                <div className={styles.cVal}>{fmt(c.ca)}</div>
              </div>
            </div>
          ))}
          <div className={styles.subnote}>
            Détail marge + santé client → onglet <strong>Pôle relations clients</strong>
          </div>
        </Card>
      </div>

    </div>
  );
}
