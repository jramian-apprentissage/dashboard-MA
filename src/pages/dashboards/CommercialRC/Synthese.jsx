import { Bar } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import { useSatisfactionClient } from '../../../hooks/useSatisfactionClient';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import DonutChart from '../../../components/ui/DonutChart';
import NotConnected from '../../../components/ui/NotConnected';
import styles from './Synthese.module.css';

Chart.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip);

const fmt = v => {
  if (!v) return '0 €';
  if (v >= 1000) return `${(v / 1000).toFixed(0)} K€`;
  return `${v} €`;
};

const tickStyle = { color: 'rgba(22,5,18,0.35)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(22,5,18,0.06)' };
const borderCol = { color: 'rgba(22,5,18,0.08)' };

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
      ticks: { ...tickStyle, callback: v => fmt(v) },
      grid:  gridStyle,
      border: borderCol,
    },
    y: {
      ticks: { color: 'rgba(22,5,18,0.50)', font: { size: 10, family: 'DM Sans' } },
      grid:  { display: false },
    },
  },
};

export default function Synthese() {
  const { result, monthly, loading, error } = useSnapshotData();
  const satisfaction = useSatisfactionClient();

  return (
    <Loader loading={loading} label="Chargement des données CRM…" minHeight={220}>
      {() => error ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--neg)', fontSize: 13 }}>
          Erreur de chargement : {error}
        </div>
      ) : result ? (
        <SyntheseContent result={result} monthly={monthly} satisfaction={satisfaction} />
      ) : null}
    </Loader>
  );
}

function SyntheseContent({ result, monthly, satisfaction }) {
  const mounted = useChartMount();
  const navigate = useNavigate();
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

  // Concentration : part du CA portée par le top 5
  const top5CA  = d.topClients.reduce((s, c) => s + c.ca, 0);
  const top5Pct = d.caGlobal > 0 ? Math.round((top5CA / d.caGlobal) * 100) : 0;

  return (
    <div className={styles.page}>

      {/* ── Ligne 1 — Le résultat : les 4 chiffres du lundi matin ─────────── */}
      <SectionLabel badge="Monday">Le résultat — vue consolidée</SectionLabel>
      <div className={styles.kpiGrid}>
        <KPICard
          label="CA"
          value={fmt(d.caGlobal)}
          trend={{ dir: 'neutral', text: `Clients actifs : ${d.nbClientsActifs}` }}
          color="blue"
        />
        <KPICard
          label="Marge brute"
          value={fmt(d.margeBruteGlobale)}
          trend={{ dir: 'neutral', text: `Taux de marge brute : ${d.tauxMarge}%` }}
          color="green"
        />
        <KPICard
          label="Deals gagnés"
          value={d.nbDealsGagnes}
          unit=" deals"
          trend={{ dir: d.nbDealsGagnes > 0 ? 'up' : 'neutral', text: `CA associé : ${fmt(d.sommeVentesGagnes)}` }}
          color="green"
        />
        <KPICard
          label="Pipeline pondéré"
          value={fmt(d.montantPipelinePondere)}
          trend={{ dir: 'neutral', text: 'Le CA de demain — opportunités en cours' }}
          color="purple"
        />
      </div>

      {/* ── Ligne 2 — La trajectoire : évolution CA + marge ────────────────── */}
      <SectionLabel>La trajectoire — 6 derniers mois</SectionLabel>
      <Card title="Évolution mensuelle du CA et de la marge">
        {monthly && monthly.length > 0 ? (
          <>
            <div className={styles.chartWrapLarge}>
              <Bar
                data={{
                  labels: monthly.map(m => m.label),
                  datasets: [
                    {
                      type: 'bar',
                      label: 'CA',
                      data: monthly.map(m => m.ca),
                      backgroundColor: 'rgba(255,249,147,0.5)',
                      borderRadius: 4,
                      borderSkipped: false,
                      yAxisID: 'y',
                      order: 2,
                    },
                    {
                      type: 'bar',
                      label: 'Marge brute',
                      data: monthly.map(m => m.marge),
                      backgroundColor: 'rgba(38,0,31,0.35)',
                      borderRadius: 4,
                      borderSkipped: false,
                      yAxisID: 'y',
                      order: 2,
                    },
                    {
                      type: 'line',
                      label: 'Taux de marge %',
                      data: monthly.map(m => m.tauxMarge),
                      borderColor: 'rgba(196,135,106,0.9)',
                      pointBackgroundColor: 'rgba(196,135,106,0.9)',
                      tension: 0.35,
                      fill: false,
                      pointRadius: 4,
                      borderWidth: 2,
                      yAxisID: 'y2',
                      order: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 900, easing: 'easeOutQuart' },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: ctx => ctx.dataset.label === 'Taux de marge %'
                          ? `${ctx.dataset.label}: ${ctx.parsed.y}%`
                          : `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
                      },
                    },
                  },
                  scales: {
                    x:  { ticks: tickStyle, grid: gridStyle, border: borderCol },
                    y:  { ticks: { ...tickStyle, callback: v => fmt(v) }, grid: gridStyle, border: borderCol, position: 'left' },
                    y2: { ticks: { ...tickStyle, callback: v => v + '%' }, grid: { display: false }, border: borderCol, position: 'right', min: 0, max: 100 },
                  },
                }}
              />
            </div>
            <div className={styles.legend}>
              <span className={styles.dot} style={{ background: 'rgba(255,249,147,0.7)' }} />CA
              <span className={styles.dot} style={{ background: 'rgba(38,0,31,0.45)', marginLeft: 12 }} />Marge brute
              <span className={styles.dot} style={{ background: 'rgba(196,135,106,0.9)', marginLeft: 12 }} />Taux de marge %
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text3)', fontSize: 12, padding: '20px 0' }}>Historique de snapshots insuffisant</div>
        )}
      </Card>

      {/* ── Ligne 3 — Santé du portefeuille : qui fait le CA + dépendance ──── */}
      <SectionLabel>Santé du portefeuille</SectionLabel>
      <div className={styles.chartsRow}>
        <Card title="Top 5 clients par CA">
          {d.topClients.length > 0 ? (
            <div className={styles.chartWrap}>
              <Bar data={chartData} options={chartOpts} />
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 12, padding: '20px 0' }}>Aucun client actif</div>
          )}
        </Card>

        <Card title="Concentration du CA & santé client">
          {/* Résumé santé client en tête, chiffres avant le camembert — plus
              parlant qu'un pourcentage (source : colonne "Note de
              satisfaction" IA, board Comptes Monday) */}
          <div className={styles.metaSub} style={{ marginBottom: 8 }}>Santé du portefeuille (Health Score)</div>
          {satisfaction.error ? (
            <div style={{ padding: '8px 0', color: 'var(--neg)', fontSize: 12 }}>Erreur de chargement : {satisfaction.error}</div>
          ) : satisfaction.data ? (
            <div className={styles.healthRow}>
              <div className={styles.hCell}><span className={styles.hNum} style={{ color: 'var(--pos)' }}>{satisfaction.data.buckets.sain}</span><span className={styles.hLbl}>Clients sains</span></div>
              <div className={styles.hCell}><span className={styles.hNum} style={{ color: 'var(--warn)' }}>{satisfaction.data.buckets.warning}</span><span className={styles.hLbl}>Clients sous vigilance</span></div>
              <div className={styles.hCell}><span className={styles.hNum} style={{ color: 'var(--neg)' }}>{satisfaction.data.buckets.risque}</span><span className={styles.hLbl}>Clients à risque</span></div>
            </div>
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}

          <div className={styles.sep} />

          {/* Concentration top 5 — camembert sous les chiffres, détail exact
              au clic sur les tranches (pas besoin de le doubler en texte) */}
          <div className={styles.metaSub} style={{ marginBottom: 8 }}>Top 5 clients — {top5Pct}% du CA</div>
          <div className={styles.donutRow}>
            <div className={styles.donutBox}>
              {/* Modèle "pie pull-out" : camembert plein, tranche dominante sortie + arc décoratif.
                  Jaune constant pour "Top 5 clients" — pas de notion de risque ici. */}
              <DonutChart
                variant="pie"
                data={[top5CA, Math.max(d.caGlobal - top5CA, 0)]}
                labels={['Top 5 clients', 'Autres clients']}
                colors={['rgba(255,249,147,0.95)', 'rgba(38,0,31,0.75)']}
                height={185}
                tooltip={(label, value) => `${label} : ${fmt(value)}`}
              />
            </div>
          </div>

          <div className={styles.subnote}>
            Détail marge + santé client →{' '}
            <button type="button" className={styles.linkBtn} onClick={() => navigate('/commercial-rc?tab=focus-client')}>
              Pôle relation client
            </button>
          </div>
        </Card>
      </div>

    </div>
  );
}
