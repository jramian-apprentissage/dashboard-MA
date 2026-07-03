import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Pill from '../../../components/ui/Pill';
import Loader from '../../../components/ui/Loader';
import { focusClientData as d, months } from '../../../data/mockData';
import styles from './FocusClient.module.css';

Chart.register(BarElement, ArcElement, CategoryScale, LinearScale, Tooltip);

const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(0)} K€` : (v ? `${v}€` : '—');
const tickStyle = { color: 'rgba(22,5,18,0.35)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(22,5,18,0.06)' };
const borderCol = { color: 'rgba(22,5,18,0.08)' };
const secteurVariant = s => ({ Tech: 'blue', Finance: 'gray', Industrie: 'gray', Retail: 'gray', Santé: 'gray' }[s] || 'gray');
const evolVariant = v => v > 0 ? 'green' : v < 0 ? 'red' : 'gray';
const healthColor = s => ({ Sain: 'var(--pos)', Warning: 'var(--warn)', Risque: 'var(--neg)' }[s]);
const healthVariant = s => ({ Sain: 'green', Warning: 'amber', Risque: 'red' }[s]);
const healthLabel = s => ({ Sain: 'Sain', Warning: 'Sous vigilance', Risque: 'À risque' }[s] || s);

const barAnim = { duration: 900, easing: 'easeOutQuart', delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 55 : 0 };
const arcAnim = { duration: 1000, easing: 'easeOutQuart' };

const fmtEuros = v => {
  if (!v) return '0 €';
  if (v >= 1000) return `${(v / 1000).toFixed(0)} K€`;
  return `${v} €`;
};

export default function FocusClient() {
  const mounted = useChartMount();
  const { result, loading } = useSnapshotData();

  return (
    <div className={styles.page}>

      {/* ══ Ligne 1 — Le solde net du portefeuille : entrées vs sorties ══ */}
      <SectionLabel badge="Monday CRM — données réelles">Le solde net — entrées & sorties du portefeuille</SectionLabel>
      <Loader loading={loading} label="Chargement des données CRM…" size={44} minHeight={110} />
      {result && (
        <div className={styles.newClientsGrid}>
          <KPICard
            label="Nouveaux clients (période)"
            value={result.nbDealsGagnes}
            unit=" clients"
            trend={{ dir: result.nbDealsGagnes > 0 ? 'up' : 'neutral', text: `CA : ${fmtEuros(result.sommeVentesGagnes)}` }}
            color="green"
          />
          <KPICard
            label="Clients perdus (période)"
            value={d.clientsPerdus.length}
            unit=" clients"
            trend={{ dir: d.clientsPerdus.length > 0 ? 'down' : 'neutral', text: `CA perdu : ${fmt(d.revenuPerdu)}` }}
            color="red"
          />
          <KPICard
            label="Portefeuille actif"
            value={result.nbClientsActifs}
            unit=" actifs"
            trend={{ dir: 'neutral', text: `sur ${result.nbClientsTotal} comptes au total` }}
            color="blue"
          />
          <KPICard
            label="Marge brute nouveaux"
            value={fmtEuros(result.margeBruteNouveaux)}
            trend={{
              dir: result.margeBruteNouveaux >= 0 ? 'up' : 'down',
              text: result.sommeVentesGagnes > 0
                ? `Taux : ${Math.round(result.margeBruteNouveaux / result.sommeVentesGagnes * 100)}%`
                : '—',
            }}
            color={result.margeBruteNouveaux >= 0 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* ══ Ligne 2 — La valeur : qui rapporte quoi ══ */}
      <SectionLabel>La valeur — classement clients</SectionLabel>
      <div className={styles.col6040}>
        <Card title="CA par client">
          <table className={styles.tbl}>
            <thead><tr><th>#</th><th>Client</th><th>Secteur</th><th>CA</th><th>Évol.</th><th>Part</th></tr></thead>
            <tbody>
              {d.topClients.map((c, i) => (
                <tr key={c.name}>
                  <td className={styles.rank} style={{ color: c.rank === 1 ? 'var(--myrtille)' : 'var(--text2)' }}>{c.rank}</td>
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
          <div className={styles.subnote}>Marge brute = Prix de vente – Prix d'achat</div>
        </Card>
      </div>

      {/* ══ Ligne 3 — La santé : où on va, ce que ça a déjà coûté ══ */}
      <SectionLabel badge="IA — colonne Monday">La santé — risque actuel & pertes constatées</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="Nb de Clients par Niveau de Santé">
          <div className={styles.chartWrap} style={{ height: 160 }}>
            <Doughnut
              data={{ labels: ['Sains ≥75', 'Sous vigilance 50–74', 'À risque <50'], datasets: [{ data: [d.healthScore.sains, d.healthScore.warning, d.healthScore.risque], backgroundColor: ['rgba(142,207,170,0.75)', 'rgba(212,168,75,0.65)', 'rgba(196,135,106,0.65)'], borderWidth: 0, hoverOffset: 4 }] }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', animation: arcAnim, plugins: { legend: { display: false } } }}
            />
          </div>
          <div className={styles.healthStats}>
            <div className={styles.hStat}><div className={styles.hVal} style={{ color: 'var(--pos)' }}>{d.healthScore.sains}</div><div className={styles.hLbl}>Sains ≥ 75</div></div>
            <div className={styles.hStat}><div className={styles.hVal} style={{ color: 'var(--warn)' }}>{d.healthScore.warning}</div><div className={styles.hLbl}>Sous vigilance 50–74</div></div>
            <div className={styles.hStat}><div className={styles.hVal} style={{ color: 'var(--neg)' }}>{d.healthScore.risque}</div><div className={styles.hLbl}>À risque {'<'} 50</div></div>
          </div>
          <div className={styles.subnote}>Score IA basé sur : échanges, renouvellements, retards paiement</div>
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

      {/* Tendance du churn — même sujet que "Clients perdus" ci-dessus, jamais analysé avec le classement collaborateurs */}
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

      {/* ══ Ligne 4 — Le détail santé client par client ══ */}
      <Card title="Détails du niveau de Santé par Client">
        {d.healthClients.map((c, i) => {
          const secteur = c.sub.split('·')[0].trim();
          return (
            <div key={c.name} className={styles.hsRow}>
              <div className={styles.hsSecteur} style={{ borderColor: `${healthColor(c.status)}44`, color: healthColor(c.status) }}>{secteur}</div>
              <div className={styles.hsInfo}>
                <div className={styles.hsName}>{c.name}</div>
                <div className={styles.hsSub}>{c.sub.split('·')[1]?.trim()}</div>
              </div>
              <div className={styles.hsScore} style={{ color: healthColor(c.status) }}>{c.score}</div>
              <div className={styles.hsBarCol}>
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
                  <Pill variant={healthVariant(c.status)}>{healthLabel(c.status)}</Pill>
                </div>
              </div>
              <div className={styles.hsJustif}>{c.justificatif}</div>
            </div>
          );
        })}
        <div className={styles.subnote} style={{ marginTop: 8 }}>Justificatif généré par l'IA Monday CRM — basé sur activité, paiements et engagements</div>
      </Card>

      {/* ══ Ligne 5 — Pilotage interne : qui génère la marge, indépendant du churn ══ */}
      <SectionLabel>Pilotage interne — marge par collaborateur</SectionLabel>
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
        <div className={styles.subnote}>Marge brute = Prix de vente – Prix d'achat</div>
      </Card>

    </div>
  );
}
