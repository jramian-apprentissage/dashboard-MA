import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import styles from './Synthese.module.css';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

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
      ticks: { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'OverusedGrotesk' }, callback: v => fmt(v) },
      grid:  { color: 'rgba(227,225,216,0.04)' },
      border: { color: 'rgba(227,225,216,0.08)' },
    },
    y: {
      ticks: { color: 'rgba(167,173,170,0.7)', font: { size: 10, family: 'OverusedGrotesk' } },
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
  const circumference = 276.5;
  const dashTarget = d.winRate * (circumference / 100);

  // Top clients chart data
  const topClients = d.topClients;
  const chartData = {
    labels: topClients.map(c => c.name),
    datasets: [{
      label: 'CA',
      data:  topClients.map(c => c.ca),
      backgroundColor: 'rgba(255,249,147,0.5)',
      borderRadius: 4,
      borderSkipped: false,
    }],
  };

  return (
    <div className={styles.page}>
      <SectionLabel badge="Monday CRM">Vue globale — indicateurs clés</SectionLabel>

      <div className={styles.kpiGrid}>
        <KPICard
          label="CA Global"
          value={fmt(d.caGlobal)}
          trend={{ dir: 'neutral', text: `${d.nbClientsActifs} clients actifs` }}
          color="blue"
        />
        <KPICard
          label="Marge brute globale"
          value={fmt(d.margeBruteGlobale)}
          trend={{ dir: d.tauxMarge >= 20 ? 'up' : 'neutral', text: `Taux : ${d.tauxMarge}%` }}
          color="green"
        />
        <KPICard
          label="Clients actifs"
          value={d.nbClientsActifs}
          unit=" clients"
          trend={{ dir: 'neutral', text: `sur ${d.nbClientsTotal} total` }}
          color="purple"
        />
        <KPICard
          label="Ventes (deals démarrés)"
          value={fmt(d.sommeVentesGagnes)}
          trend={{ dir: 'neutral', text: 'Clients démarrés sur la période' }}
          color="blue"
        />
        <KPICard
          label="Masse salariale"
          value={fmt(d.totalAchats)}
          trend={{ dir: 'neutral', text: 'Achat total clients actifs' }}
          color="amber"
        />
        <KPICard
          label="Deals gagnés"
          value={d.nbDealsGagnes}
          unit=" deals"
          trend={{ dir: 'neutral', text: 'Date de démarrage sur la période' }}
          color="green"
        />
      </div>

      <div className={styles.chartsRow}>
        <Card title="Top clients — CA">
          {topClients.length > 0 ? (
            <div className={styles.chartWrap}>
              <Bar data={chartData} options={chartOpts} />
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 12, padding: '20px 0' }}>Aucun client actif</div>
          )}
        </Card>

        <Card title="Pipeline pondéré par probabilité">
          <div className={styles.pipelineHeader}>
            <div>
              <div className={styles.metaSub}>Pipeline total</div>
              <div className={styles.metaVal}>{fmt(d.montantPipeline)}</div>
            </div>
            <div>
              <div className={styles.metaSub}>Pipeline pondéré</div>
              <div className={styles.metaVal} style={{ color: 'var(--accent)' }}>{fmt(d.montantPipelinePondere)}</div>
            </div>
          </div>
          <div className={styles.sep} />
          {d.pipelineBreakdown.map((p, i) => (
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
          {d.pipelineBreakdown.length === 0 && (
            <div style={{ color: 'var(--text3)', fontSize: 12 }}>Aucune opportunité en pipeline</div>
          )}
        </Card>
      </div>

      <SectionLabel>Performance commerciale</SectionLabel>
      <div className={styles.bottomRow}>
        <Card title="Win rate — Taux de transformation">
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 110 110" width={120} height={120}>
              <defs>
                <linearGradient id="winGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#FBFBFB" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#FFF993" stopOpacity="1" />
                </linearGradient>
              </defs>
              <circle cx="55" cy="55" r="44" fill="none" stroke="rgba(167,173,170,0.20)" strokeWidth="11" />
              <circle
                cx="55" cy="55" r="44" fill="none"
                stroke="url(#winGrad)" strokeWidth="11"
                strokeDasharray={mounted ? `${dashTarget} ${circumference}` : `0 ${circumference}`}
                strokeLinecap="round"
                transform="rotate(-90 55 55)"
                style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)' }}
              />
            </svg>
            <div className={styles.donutCenter}>
              <div className={styles.donutVal}>{d.winRate}%</div>
              <div className={styles.donutLbl}>Win rate</div>
            </div>
          </div>
          <div className={styles.donutStats}>
            <div className={styles.dstat}>
              <div className={styles.dv} style={{ color: 'var(--pos)' }}>{d.dealStats.gagnes}</div>
              <div className={styles.dl}>Gagnés</div>
            </div>
            <div className={styles.dstat}>
              <div className={styles.dv} style={{ color: 'var(--neg)' }}>{d.dealStats.perdus}</div>
              <div className={styles.dl}>Perdus</div>
            </div>
            <div className={styles.dstat}>
              <div className={styles.dv} style={{ color: 'var(--warn)' }}>{d.dealStats.standby}</div>
              <div className={styles.dl}>Stand-by</div>
            </div>
            <div className={styles.dstat}>
              <div className={styles.dv} style={{ color: 'var(--text2)' }}>{d.dealStats.enCours}</div>
              <div className={styles.dl}>En cours</div>
            </div>
          </div>
          <div className={styles.subnote}>Win rate = Gagnés ÷ (Gagnés + Perdus)</div>
        </Card>

        <Card title="Top clients — détail CA">
          {topClients.map((c, i) => (
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
          <div className={styles.subnote}>Détail marge / client → onglet Focus client</div>
        </Card>

        <Card title="Marge brute — nouveaux clients">
          <div style={{ padding: '8px 0' }}>
            <div className={styles.metaSub}>Ventes (démarrés période)</div>
            <div className={styles.metaVal}>{fmt(d.sommeVentesGagnes)}</div>
          </div>
          <div className={styles.sep} />
          <div style={{ padding: '4px 0' }}>
            <div className={styles.metaSub}>Achats (démarrés période)</div>
            <div className={styles.metaVal} style={{ fontSize: 16 }}>{fmt(d.sommeAchatsGagnes)}</div>
          </div>
          <div className={styles.sep} />
          <div style={{ padding: '4px 0' }}>
            <div className={styles.metaSub}>Marge brute nouveaux</div>
            <div
              className={styles.metaVal}
              style={{ color: d.margeBruteNouveaux >= 0 ? 'var(--pos)' : 'var(--neg)' }}
            >
              {fmt(d.margeBruteNouveaux)}
            </div>
          </div>
          <div className={styles.subnote}>Clients dont la date de démarrage est dans la période</div>
        </Card>
      </div>
    </div>
  );
}
