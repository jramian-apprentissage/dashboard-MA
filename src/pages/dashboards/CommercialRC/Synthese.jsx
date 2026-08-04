import { Bar } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import { useSatisfactionClient } from '../../../hooks/useSatisfactionClient';
import { usePeriod } from '../../../contexts/PeriodContext';
import { compareValueText } from '../../../utils/compareText';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader, { LoaderMark } from '../../../components/ui/Loader';
import DonutChart from '../../../components/ui/DonutChart';
import NotConnected, { notConnectedKPI } from '../../../components/ui/NotConnected';
import NoPeriodData from '../../../components/ui/NoPeriodData';
import { todayDDMM } from '../../../utils/formatDate';
import { fmtEurosExact } from '../../../utils/formatNumber';
import { SHOW_LEADS_KPIS, SHOW_COMPTES_KPIS } from '../../../config/featureFlags';

const COMPTES_HIDDEN_REASON = 'masqué temporairement — travail en cours sur le board Leads/Prospects';
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
  const { result, compareResult, monthly, loading, error } = useSnapshotData();
  const satisfaction = useSatisfactionClient();
  const { comparePeriodKey } = usePeriod();

  return (
    // Le grand Loader central ne couvre que le tout premier chargement
    // (result encore null) — une fois les données là, un rechargement
    // (changement de période) garde le contenu affiché et montre son
    // spinner dans le bandeau de fraîcheur en tête de page à la place.
    <Loader loading={loading && !result} label="Chargement des données CRM…" minHeight={220}>
      {() => error ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--neg)', fontSize: 13 }}>
          Erreur de chargement : {error}
        </div>
      ) : result ? (
        <SyntheseContent result={result} compareResult={compareResult} comparePeriodKey={comparePeriodKey} monthly={monthly} satisfaction={satisfaction} loading={loading} />
      ) : null}
    </Loader>
  );
}

function SyntheseContent({ result, compareResult, comparePeriodKey, monthly, satisfaction, loading }) {
  const mounted = useChartMount();
  const navigate = useNavigate();
  const d = result;
  const c = compareResult;
  const cmp = (current, ref) => c ? compareValueText(current, ref, comparePeriodKey) : null;
  // Connecté, données chargées, mais aucun compte facturé sur la période
  // choisie (ex. période hors historique) — même traitement que Sales/
  // ASUS/TLM : un seul message clair plutôt qu'une mosaïque de "0 €".
  const isEmptyPeriod = SHOW_COMPTES_KPIS && d.nbClientsActifs === 0;

  const chartData = {
    labels: d.topClients.map(c => c.name),
    datasets: [{
      label: 'CA',
      data:  d.topClients.map(c => c.ca),
      backgroundColor: 'rgba(213,208,123,0.85)',
      borderRadius: 4,
      borderSkipped: false,
    }],
  };

  // Concentration : part du CA portée par le top 5
  const top5CA = d.topClients.reduce((s, c) => s + c.ca, 0);

  return (
    <div className={styles.page}>

      {/* Source des données — Monday CRM (webhooks live), donc pas de
          notion d'archive figée comme Ringover/CloudTalk : toujours à jour
          du jour. Spinner uniquement lors d'un rechargement (changement de
          filtre), pas au tout premier affichage. */}
      <div className={styles.dataAlert} style={{ borderColor: 'rgba(142,207,170,0.3)', background: 'rgba(142,207,170,0.06)' }}>
        <span style={{ color: 'var(--pos)' }}>● Source Monday CRM</span> — Mise à jour au {todayDDMM()}
        {loading && <span className={styles.dataAlertSpin}><LoaderMark size={14} /></span>}
      </div>

      {isEmptyPeriod ? (
        <>
          <SectionLabel badge="Monday">Vue consolidée</SectionLabel>
          <Card><NoPeriodData suggestion="Essayez une autre période — le mois précédent, par exemple." /></Card>
        </>
      ) : (
      <>
      {/* ── Ligne 1 — Le résultat : les 4 chiffres du lundi matin ─────────── */}
      <SectionLabel badge="Monday">Vue consolidée</SectionLabel>
      <div className={styles.kpiGrid}>
        {SHOW_COMPTES_KPIS ? (
          <>
            <KPICard
              label="CA"
              value={fmt(d.caGlobal)}
              exactValue={fmtEurosExact(d.caGlobal)}
              compare={cmp(d.caGlobal, c?.caGlobal)}
              trend={{ dir: 'neutral', text: `Clients actifs : ${d.nbClientsActifs}` }}
              color="blue"
            />
            <KPICard
              label="Marge brute"
              value={fmt(d.margeBruteGlobale)}
              exactValue={fmtEurosExact(d.margeBruteGlobale)}
              compare={cmp(d.margeBruteGlobale, c?.margeBruteGlobale)}
              trend={{ dir: 'neutral', text: `Taux de marge brute : ${d.tauxMarge}%` }}
              color="green"
            />
          </>
        ) : (
          <>
            <KPICard {...notConnectedKPI('CA', COMPTES_HIDDEN_REASON, 'blue')} />
            <KPICard {...notConnectedKPI('Marge brute', COMPTES_HIDDEN_REASON, 'green')} />
          </>
        )}
        {SHOW_LEADS_KPIS ? (
          <>
            <KPICard
              label="Deals gagnés"
              value={d.nbDealsGagnes}
              unit=" deals"
              compare={cmp(d.nbDealsGagnes, c?.nbDealsGagnes)}
              trend={{ dir: 'neutral', text: `CA associé : ${fmt(d.caDealsGagnes)}` }}
              color="green"
            />
            <KPICard
              label="Pipeline pondéré"
              value={fmt(d.montantPipelinePondere)}
              exactValue={fmtEurosExact(d.montantPipelinePondere)}
              compare={cmp(d.montantPipelinePondere, c?.montantPipelinePondere)}
              trend={{ dir: 'neutral', text: 'Le CA de demain — opportunités en cours' }}
              color="purple"
            />
          </>
        ) : (
          <>
            <KPICard {...notConnectedKPI('Deals gagnés', 'masqué temporairement — reconstruction Comptes en cours', 'green')} />
            <KPICard {...notConnectedKPI('Pipeline pondéré', 'masqué temporairement — reconstruction Comptes en cours', 'purple')} />
          </>
        )}
      </div>

      {/* ── Ligne 2 — La trajectoire : évolution CA + marge ────────────────── */}
      <SectionLabel>La trajectoire — 6 derniers mois</SectionLabel>
      <Card title="Évolution mensuelle du CA et de la marge">
        {!SHOW_COMPTES_KPIS ? (
          <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
        ) : monthly && monthly.length > 0 ? (
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
                      // Jaune soleil d'origine (#FFF993) trop pâle pour distinguer
                      // les mois adjacents sans zoomer — teinte 60% de la même
                      // famille (#D5D07B, palette fournie) pour plus de contraste.
                      backgroundColor: 'rgba(213,208,123,0.85)',
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
              <span className={styles.dot} style={{ background: 'rgba(213,208,123,0.95)' }} />CA
              <span className={styles.dot} style={{ background: 'rgba(38,0,31,0.45)', marginLeft: 12 }} />Marge brute
              <span className={styles.dot} style={{ background: 'rgba(196,135,106,0.9)', marginLeft: 12 }} />Taux de marge %
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text3)', fontSize: 12, padding: '20px 0' }}>Historique de snapshots insuffisant</div>
        )}
      </Card>

      {/* ── Ligne 3 — Santé du portefeuille : qui fait le CA + dépendance ──── */}
      <SectionLabel>Santé du portefeuille client</SectionLabel>
      <div className={styles.chartsRow}>
        <Card title="Top 5 clients par CA">
          {!SHOW_COMPTES_KPIS ? (
            <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
          ) : d.topClients.length > 0 ? (
            <div className={styles.chartWrap}>
              <Bar data={chartData} options={chartOpts} />
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 12, padding: '20px 0' }}>Aucun client actif</div>
          )}
        </Card>

        <Card title="Concentration du CA & santé client">
          {!SHOW_COMPTES_KPIS ? (
            <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
          ) : (
          <>
          {/* Résumé santé client en tête, chiffres avant le camembert — plus
              parlant qu'un pourcentage (source : colonne "Note de
              satisfaction" IA, board Comptes Monday) */}
          <div className={styles.metaSub} style={{ marginBottom: 2 }}>Santé du portefeuille (Health Score)</div>
          {satisfaction.error ? (
            <div style={{ padding: '8px 0', color: 'var(--neg)', fontSize: 12 }}>Erreur de chargement : {satisfaction.error}</div>
          ) : satisfaction.data ? (
            <>
              {/* Instantané des comptes live actuels, indépendant de la période
                  sélectionnée (la note de satisfaction n'a pas d'historique par
                  mois côté Monday) — ne pas comparer ce total à "Clients
                  actifs" ci-dessus, qui lui est filtré sur la période. */}
              <div className={styles.subnote} style={{ marginBottom: 8 }}>Instantané des comptes actuels — pas filtré par période</div>
              <div className={styles.healthRow}>
                <div className={styles.hCell}><span className={styles.hNum} style={{ color: 'var(--pos)' }}>{satisfaction.data.buckets.sain}</span><span className={styles.hLbl}>Clients sains</span></div>
                <div className={styles.hCell}><span className={styles.hNum} style={{ color: 'var(--warn)' }}>{satisfaction.data.buckets.warning}</span><span className={styles.hLbl}>Clients sous vigilance</span></div>
                <div className={styles.hCell}><span className={styles.hNum} style={{ color: 'var(--neg)' }}>{satisfaction.data.buckets.risque}</span><span className={styles.hLbl}>Clients à risque</span></div>
              </div>
            </>
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}

          <div className={styles.sep} />

          {/* Concentration top 5 — camembert sous les chiffres, détail exact
              au clic sur les tranches (pas besoin de le doubler en texte) */}
          <div className={styles.metaSub} style={{ marginBottom: 8 }}>Chiffre d'affaires Top 5 clients versus les autres</div>
          <div className={styles.donutRow}>
            <div className={styles.donutBox}>
              {/* Modèle "pie pull-out" : camembert plein, tranche dominante sortie + arc décoratif.
                  Couleurs pastel dédiées — le jaune est déjà utilisé pour "CA global"
                  ailleurs dans le dashboard, le réutiliser ici prêtait à confusion. */}
              <DonutChart
                variant="pie"
                data={[top5CA, Math.max(d.caGlobal - top5CA, 0)]}
                labels={['Top 5 clients', 'Autres clients']}
                colors={['rgba(123,170,191,0.85)', 'rgba(196,135,106,0.75)']}
                height={185}
                tooltip={(label, value) => `${label} : ${fmt(value)}`}
              />
            </div>
          </div>

          <div className={styles.subnote}>
            Détail marge + santé client →{' '}
            <button type="button" className={styles.linkBtn} onClick={() => navigate('/commercial-rc?tab=focus-client')}>
              Pôle Relation Client
            </button>
          </div>
          </>
          )}
        </Card>
      </div>
      </>
      )}

    </div>
  );
}
