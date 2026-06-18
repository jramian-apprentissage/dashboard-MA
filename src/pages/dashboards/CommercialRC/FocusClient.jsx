import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart, BarElement, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Pill from '../../../components/ui/Pill';
import { focusClientData as d, months } from '../../../data/mockData';
import styles from './FocusClient.module.css';

Chart.register(BarElement, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(0)} K€` : (v ? `${v}€` : '—');
const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'OverusedGrotesk' } };
const gridStyle = { color: 'rgba(227,225,216,0.04)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };
const secteurVariant = s => ({ Tech: 'blue', Finance: 'gray', Industrie: 'gray', Retail: 'gray', Santé: 'gray' }[s] || 'gray');
const evolVariant = v => v > 0 ? 'green' : v < 0 ? 'red' : 'gray';
const healthColor = s => ({ Sain: 'var(--pos)', Warning: 'var(--warn)', Risque: 'var(--neg)' }[s]);
const healthVariant = s => ({ Sain: 'green', Warning: 'amber', Risque: 'red' }[s]);

const barAnim = { duration: 900, easing: 'easeOutQuart', delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 55 : 0 };
const arcAnim = { duration: 1000, easing: 'easeOutQuart' };

export default function FocusClient() {
  const mounted = useChartMount();

  return (
    <div className={styles.page}>
      <SectionLabel badge="Monday CRM">Vue client — indicateurs clés</SectionLabel>
      <div className={styles.kpiGrid}>
        {d.kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      <SectionLabel>Classement clients — CA & marge brute</SectionLabel>
      <div className={styles.col6040}>
        <Card title="CA par client">
          <table className={styles.tbl}>
            <thead><tr><th>#</th><th>Client</th><th>Secteur</th><th>CA</th><th>Évol.</th><th>Part</th></tr></thead>
            <tbody>
              {d.topClients.map((c, i) => (
                <tr key={c.name}>
                  <td className={styles.rank} style={{ color: c.rank === 1 ? 'var(--accent)' : 'var(--text2)' }}>{c.rank}</td>
                  <td className={styles.tdName}>{c.name}</td>
                  <td><Pill variant={secteurVariant(c.secteur)}>{c.secteur}</Pill></td>
                  <td className={styles.tdRight} style={{ color: 'var(--text)', fontWeight: 600 }}>{fmt(c.ca)}</td>
                  <td className={styles.tdRight}><Pill variant={evolVariant(c.evol)}>{c.evol > 0 ? '+' : ''}{c.evol}%</Pill></td>
                  <td>
                    <div className={styles.miniBarWrap}>
                      <div className={styles.miniBar}>
                        <div
                          className={styles.miniFill}
                          style={{
                            width: mounted ? `${c.part * 5}%` : '0%',
                            transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
                          }}
                        />
                      </div>
                      <span>{c.part}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ color: 'var(--text3)', fontSize: 10, paddingTop: 8 }}>40 autres clients…</td>
                <td className={styles.tdRight} style={{ color: 'var(--text)', fontWeight: 500, paddingTop: 8 }}>339 K€</td>
                <td /><td />
              </tr>
            </tbody>
          </table>
        </Card>

        <Card title="Marge brute par client">
          <table className={styles.tbl}>
            <thead><tr><th>Client</th><th>Marge</th><th>Taux</th></tr></thead>
            <tbody>
              {d.margeClients.map(c => (
                <tr key={c.name}>
                  <td className={styles.tdName}>{c.name}</td>
                  <td className={styles.tdRight} style={{ color: c.taux >= 25 ? 'var(--pos)' : 'var(--warn)', fontWeight: 600 }}>{fmt(c.marge)}</td>
                  <td><Pill variant={c.taux >= 25 ? 'green' : 'amber'}>{c.taux}%</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.chartWrap} style={{ height: 130, marginTop: 12 }}>
            <Bar
              data={{ labels: d.margeClients.map(c => c.name.split(' ')[0]), datasets: [{ data: d.margeClients.map(c => c.marge / 1000), backgroundColor: d.margeClients.map(c => c.taux >= 25 ? 'rgba(142,207,170,0.6)' : 'rgba(212,168,75,0.5)'), borderRadius: 4, borderSkipped: false }] }}
              options={{ responsive: true, maintainAspectRatio: false, animation: barAnim, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y + 'K€' } } }, scales: { x: { ticks: { ...tickStyle, font: { size: 9 } }, grid: gridStyle, border: borderCol }, y: { ticks: { ...tickStyle, callback: v => v + 'k' }, grid: gridStyle, border: borderCol } } }}
            />
          </div>
        </Card>
      </div>

      <SectionLabel badge="Accès Direction">Marge brute par collaborateur</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="Classement collaborateurs — marge générée">
          {d.collaborateurs.map((c, i) => (
            <div key={c.name} className={styles.collabRow}>
              <div className={styles.collabLeft}>
                <div className={styles.collabAvatar}>{c.initials}</div>
                <div className={styles.collabName}>{c.name}</div>
              </div>
              <div className={styles.collabRight}>
                <div className={styles.collabBar}>
                  <div
                    className={styles.collabFill}
                    style={{
                      width: mounted ? `${c.pct}%` : '0%',
                      opacity: c.taux >= 25 ? 1 : 0.7,
                      transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms`,
                    }}
                  />
                </div>
                <div className={styles.collabMarge}>{fmt(c.marge)}</div>
                <Pill variant={c.taux >= 25 ? 'green' : c.taux >= 20 ? 'amber' : 'red'}>{c.taux}%</Pill>
              </div>
            </div>
          ))}
          <div className={styles.subnote}>Marge brute = Prix de vente – Prix d'achat. Accès restreint Direction.</div>
        </Card>
        <Card title="Répartition marge brute / collaborateur">
          <div className={styles.chartWrap} style={{ height: 190 }}>
            <Doughnut
              data={{ labels: d.collaborateurs.map(c => c.name), datasets: [{ data: d.collaborateurs.map(c => c.marge / 1000), backgroundColor: ['rgba(255,249,147,0.75)', 'rgba(142,207,170,0.7)', 'rgba(123,170,191,0.7)', 'rgba(212,168,75,0.65)', 'rgba(196,135,106,0.65)', 'rgba(169,141,196,0.65)'], borderWidth: 0, hoverOffset: 4 }] }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', animation: arcAnim, plugins: { legend: { display: false } } }}
            />
          </div>
          <div className={styles.donutLegend}>
            {d.collaborateurs.map(c => <span key={c.name} className={styles.legItem}>{c.name}</span>)}
          </div>
        </Card>
      </div>

      <SectionLabel badge="IA — colonne Monday">Client Health Score</SectionLabel>
      <div className={styles.col4060}>
        <Card title="Répartition par niveau de santé">
          <div className={styles.chartWrap} style={{ height: 160 }}>
            <Doughnut
              data={{ labels: ['Sains ≥75', 'Warning 50-74', 'Risque <50'], datasets: [{ data: [d.healthScore.sains, d.healthScore.warning, d.healthScore.risque], backgroundColor: ['rgba(142,207,170,0.75)', 'rgba(212,168,75,0.65)', 'rgba(196,135,106,0.65)'], borderWidth: 0, hoverOffset: 4 }] }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', animation: arcAnim, plugins: { legend: { display: false } } }}
            />
          </div>
          <div className={styles.healthStats}>
            <div className={styles.hStat}><div className={styles.hVal} style={{ color: 'var(--pos)' }}>{d.healthScore.sains}</div><div className={styles.hLbl}>Sains ≥ 75</div></div>
            <div className={styles.hStat}><div className={styles.hVal} style={{ color: 'var(--warn)' }}>{d.healthScore.warning}</div><div className={styles.hLbl}>Warning 50–74</div></div>
            <div className={styles.hStat}><div className={styles.hVal} style={{ color: 'var(--neg)' }}>{d.healthScore.risque}</div><div className={styles.hLbl}>Risque {'<'} 50</div></div>
          </div>
          <div className={styles.subnote}>Score IA basé sur : échanges, renouvellements, retards paiement</div>
        </Card>
        <Card title="Scorecard clients — détail Health Score">
          {d.healthClients.map((c, i) => (
            <div key={c.name} className={styles.hsCard}>
              <div className={styles.hsAvatar} style={{ background: `${healthColor(c.status)}22`, color: healthColor(c.status) }}>{c.initials}</div>
              <div className={styles.hsInfo}><div className={styles.hsName}>{c.name}</div><div className={styles.hsSub}>{c.sub}</div></div>
              <div className={styles.hsRight}>
                <div className={styles.hsScore} style={{ color: healthColor(c.status) }}>{c.score}</div>
                <div className={styles.hsBarRow}>
                  <div className={styles.hsBar}>
                    <div
                      className={styles.hsBarFill}
                      style={{
                        width: mounted ? `${c.score}%` : '0%',
                        background: healthColor(c.status),
                        transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
                      }}
                    />
                  </div>
                  <Pill variant={healthVariant(c.status)}>{c.status}</Pill>
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <SectionLabel>Churn & pertes clients</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="Revenue perdu — évolution mensuelle">
          <div className={styles.churnHead}>
            <div><div className={styles.metaSub}>Revenue perdu (période)</div><div className={styles.bigVal} style={{ color: 'var(--neg)' }}>{fmt(d.revenuPerdu)}</div></div>
            <div><div className={styles.metaSub}>Clients arrêtés</div><div className={styles.bigVal} style={{ color: 'var(--warn)' }}>{d.clientsPerdus.length}</div></div>
          </div>
          <div className={styles.chartWrap} style={{ height: 150 }}>
            <Bar
              data={{ labels: months, datasets: [{ label: 'Revenue perdu (k€)', data: d.churnMensuel, backgroundColor: 'rgba(196,135,106,0.6)', borderRadius: 4, borderSkipped: false }] }}
              options={{ responsive: true, maintainAspectRatio: false, animation: barAnim, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y + 'k€' } } }, scales: { x: { ticks: tickStyle, grid: gridStyle, border: borderCol }, y: { ticks: { ...tickStyle, callback: v => v + 'k' }, grid: gridStyle, border: borderCol } } }}
            />
          </div>
        </Card>
        <Card title="Clients perdus — détail">
          <table className={styles.tbl}>
            <thead><tr><th>Client</th><th>Secteur</th><th>CA perdu</th><th>Date</th><th>Motif</th></tr></thead>
            <tbody>
              {d.clientsPerdus.map(c => (
                <tr key={c.name}>
                  <td className={styles.tdName}>{c.name}</td>
                  <td><Pill variant="gray">{c.secteur}</Pill></td>
                  <td className={styles.tdRight} style={{ color: 'var(--neg)', fontWeight: 600 }}>{fmt(c.ca)}</td>
                  <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{c.date}</td>
                  <td><Pill variant={c.motif === 'Prix' || c.motif === 'Budget' ? 'red' : 'amber'}>{c.motif}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.sep} />
          <div className={styles.infoRow}>ℹ️ Surveiller Darby Ltd & Maxim & Co — Health Score critique</div>
        </Card>
      </div>
    </div>
  );
}
