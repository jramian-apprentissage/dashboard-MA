import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import { syntheseData, months } from '../../../data/mockData';
import styles from './Synthese.module.css';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(0)} K€` : `${v}€`;

const BAR_TRANSITION = { transition: 'width 0.85s cubic-bezier(0.16,1,0.3,1)' };

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  animation: {
    duration: 900,
    easing: 'easeOutQuart',
    delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 55 : 0,
  },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y + 'k€' } } },
  scales: {
    x: { ticks: { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'OverusedGrotesk' } }, grid: { color: 'rgba(227,225,216,0.04)' }, border: { color: 'rgba(227,225,216,0.08)' } },
    y: { ticks: { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'OverusedGrotesk' }, callback: v => v + 'k' }, grid: { color: 'rgba(227,225,216,0.04)' }, border: { color: 'rgba(227,225,216,0.08)' } },
  },
};

export default function Synthese() {
  const mounted = useChartMount();
  const d = syntheseData;

  const circumference = 276.5;
  const dashTarget = d.winRate * (circumference / 100);

  return (
    <div className={styles.page}>
      <SectionLabel badge="Monday CRM">Vue globale — indicateurs clés</SectionLabel>
      <div className={styles.kpiGrid}>
        <KPICard label="CA" value={`${(d.caGlobal / 1000).toFixed(0)} K`} unit="€" trend={{ dir: 'up', text: '+18% vs S1 2024' }} color="blue" />
        <KPICard label="Marge brute" value={`${(d.margeGlobale / 1000).toFixed(0)} K`} unit="€" trend={{ dir: 'up', text: `Taux : ${d.tauxMarge}%` }} color="green" />
        <KPICard label="Clients actifs" value={d.nbClientsActifs} unit=" clients" trend={{ dir: 'up', text: '+5 vs période préc.' }} color="purple" />
        <KPICard label="Vente totale" value={`${(d.sommesVentes / 1000).toFixed(0)} K`} unit="€" trend={{ dir: 'neutral', text: 'Deals gagnés — S1' }} color="blue" />
        <KPICard label="Achat total" value={`${(d.sommesAchats / 1000).toFixed(0)} K`} unit="€" trend={{ dir: 'neutral', text: 'Masse salariale collaborateurs' }} color="amber" />
        <KPICard label="Deals gagnés" value={d.dealsGagnes} unit=" deals" trend={{ dir: 'up', text: '+12% vs période préc.' }} color="green" />
      </div>

      <div className={styles.chartsRow}>
        <Card title="Évolution mensuelle">
          <div className={styles.chartWrap}>
            <Bar
              data={{
                labels: months,
                datasets: [
                  { label: 'CA mensuel (k€)', data: d.evolution.ca, backgroundColor: 'rgba(255,249,147,0.55)', borderRadius: 5, borderSkipped: false },
                  { label: 'Marge brute (k€)', data: d.evolution.marge, backgroundColor: 'rgba(227,225,216,0.30)', borderRadius: 5, borderSkipped: false },
                ],
              }}
              options={chartOpts}
            />
          </div>
          <div className={styles.legend}>
            <span className={styles.dot} style={{ background: 'rgba(255,249,147,0.7)' }} />CA mensuel
            <span className={styles.dot} style={{ background: 'rgba(227,225,216,0.5)', marginLeft: 12 }} />Marge brute
          </div>
        </Card>

        <Card title="Pipeline pondéré par probabilité">
          <div className={styles.pipelineHeader}>
            <div><div className={styles.metaSub}>Pipeline total</div><div className={styles.metaVal}>{fmt(d.pipelineTotal)}</div></div>
            <div><div className={styles.metaSub}>Pipeline pondéré</div><div className={styles.metaVal} style={{ color: 'var(--accent)' }}>{fmt(d.pipelinePondere)}</div></div>
          </div>
          <div className={styles.sep} />
          {d.pipeline.map((p, i) => (
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
                  <span>{fmt(p.amount)}</span><span style={{ opacity: 0.7 }}>{p.pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <SectionLabel>Performance commerciale</SectionLabel>
      <div className={styles.bottomRow}>
        <Card title="Win rate — Taux de transformation">
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 110 110" width={120} height={120}>
              <defs>
                <linearGradient id="winGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FBFBFB" stopOpacity="0.7" />
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
            <div className={styles.dstat}><div className={styles.dv} style={{ color: 'var(--pos)' }}>{d.dealStats.gagnes}</div><div className={styles.dl}>Gagnés</div></div>
            <div className={styles.dstat}><div className={styles.dv} style={{ color: 'var(--neg)' }}>{d.dealStats.perdus}</div><div className={styles.dl}>Perdus</div></div>
            <div className={styles.dstat}><div className={styles.dv} style={{ color: 'var(--warn)' }}>{d.dealStats.standby}</div><div className={styles.dl}>Stand-by</div></div>
            <div className={styles.dstat}><div className={styles.dv} style={{ color: 'var(--text2)' }}>{d.dealStats.enCours}</div><div className={styles.dl}>En cours</div></div>
          </div>
          <div className={styles.subnote}>Win rate = Gagnés ÷ (Gagnés + Perdus + En cours)</div>
        </Card>

        <Card title="Top clients — CA">
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
          <div className={styles.subnote}>Détail marge / client → onglet Focus client</div>
        </Card>

        <Card title="Points d'attention">
          {d.alertes.map((a, i) => (
            <div key={i} className={`${styles.alert} ${styles[a.type]}`}>
              <div className={styles.alertBody}>
                <strong>{a.title}</strong><br />{a.detail}
              </div>
            </div>
          ))}
        </Card>
      </div>

      <SectionLabel>Marge brute — décomposition mensuelle</SectionLabel>
      <Card title="Ventes vs Achats vs Marge brute">
        <div className={styles.chartWrapLarge}>
          <Bar
            data={{
              labels: months,
              datasets: [
                { label: 'Ventes (k€)', data: d.evolution.ca, backgroundColor: 'rgba(255,249,147,0.55)', borderRadius: 4, borderSkipped: false },
                { label: 'Achats (k€)', data: d.evolution.achats, backgroundColor: 'rgba(167,173,170,0.22)', borderRadius: 4, borderSkipped: false },
                { label: 'Marge brute (k€)', data: d.evolution.marge, backgroundColor: 'rgba(227,225,216,0.35)', borderRadius: 4, borderSkipped: false },
              ],
            }}
            options={chartOpts}
          />
        </div>
        <div className={styles.legend}>
          <span className={styles.dot} style={{ background: 'rgba(255,249,147,0.7)' }} />Ventes
          <span className={styles.dot} style={{ background: 'rgba(167,173,170,0.4)', marginLeft: 12 }} />Achats
          <span className={styles.dot} style={{ background: 'rgba(227,225,216,0.6)', marginLeft: 12 }} />Marge brute
        </div>
      </Card>
    </div>
  );
}
