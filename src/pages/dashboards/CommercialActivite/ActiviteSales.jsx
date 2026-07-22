import { Bar, Line } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { useRef, useMemo } from 'react';
import { useChartMount } from '../../../hooks/useChartMount';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import MotifBar from '../../../components/ui/MotifBar';
import NotConnected, { notConnectedKPI } from '../../../components/ui/NotConnected';
import Loader from '../../../components/ui/Loader';
import { TAG_CATEGORIES } from '../../../services/sheetsParser';
import DonutChart from '../../../components/ui/DonutChart';
import styles from './Activite.module.css';

Chart.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler);

const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(227,225,216,0.5)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };
const barAnim = { duration: 900, easing: 'easeOutQuart', delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 55 : 0 };
const lineAnim = { duration: 900, easing: 'easeOutQuart' };

function makeRdvPlugin(rowsRef) {
  return {
    id: 'rdvInside',
    afterDatasetsDraw(chart) {
      const rows = rowsRef.current;
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

// Calcul delta pour comparaison
function delta(current, ref) {
  if (!ref || ref === 0) return null;
  const pct = Math.round(((current - ref) / ref) * 100);
  return { pct, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral' };
}
function trendCompare(current, ref, fallback) {
  const d = delta(current, ref);
  if (!d) return { dir: 'neutral', text: fallback };
  const sign = d.pct > 0 ? '+' : '';
  return { dir: d.dir, text: `${sign}${d.pct}% vs période comparée` };
}
function trendComparePts(currentPct, refPct, fallback) {
  if (refPct == null) return { dir: 'neutral', text: fallback };
  const diff = currentPct - refPct;
  if (diff === 0) return { dir: 'neutral', text: `= vs période comparée` };
  const sign = diff > 0 ? '+' : '';
  return { dir: diff > 0 ? 'up' : 'down', text: `${sign}${diff} pts vs période comparée` };
}

// KPIs depuis l'archive Ringover (seule source pour cet onglet)
function buildKPIs(result, rdvResult, compareResult) {
  const { total, argues, decroche } = result;
  const tauxDec = total > 0 ? Math.round((decroche / total) * 100) : 0;
  const argPct  = total > 0 ? Math.round((argues  / total) * 100) : 0;
  const rdvPris = rdvResult?.rdvPris ?? '—';
  const tauxHon = rdvResult ? `${rdvResult.tauxHonores}%` : '—';
  const rdvSrc  = rdvResult ? 'Fichier RDV' : 'Fichier RDV non chargé';

  const cmp = compareResult;
  const cmpTauxDec = cmp && cmp.total > 0 ? Math.round((cmp.decroche / cmp.total) * 100) : null;

  return [
    { label: 'Appels émis',              value: total,          unit: '', trend: cmp ? trendCompare(total,   cmp.total,   'Archive Ringover') : { dir: 'neutral', text: 'Archive Ringover' }, color: 'blue' },
    { label: 'Appels argumentés',        value: argues,         unit: '', trend: cmp ? trendCompare(argues,  cmp.argues,  `${argPct}% du total`)      : { dir: 'neutral', text: `${argPct}% du total` },     color: 'green' },
    { label: 'Taux décrochés >30s',      value: `${tauxDec}%`, unit: '', trend: cmp ? trendComparePts(tauxDec, cmpTauxDec, 'Durée > 30 secondes')    : { dir: 'neutral', text: 'Durée > 30 secondes' },     color: 'accent' },
    notConnectedKPI('Taux fiches exploitables', 'aucune notion de fiche qualité côté Ringover', 'amber'),
    { label: 'RDV pris',                 value: rdvPris,        unit: '', trend: { dir: 'neutral', text: rdvSrc },                                                                                             color: 'green' },
    { label: 'Taux RDV honorés',         value: tauxHon,        unit: '', trend: { dir: 'neutral', text: rdvSrc },                                                                                             color: 'purple' },
  ];
}

export default function ActiviteSales({ selectedCollab = 'Tous', salesData, compareResult = null }) {
  const mounted = useChartMount();
  const hasData = salesData?.hasData && salesData?.result;
  const rdvResult = salesData?.rdvResult ?? null;

  const kpis = hasData ? buildKPIs(salesData.result, rdvResult, compareResult) : null;
  const trancheRows = hasData
    ? salesData.result.tranches.map(row => ({
        ...row,
        rdv: rdvResult?.byHour != null ? (rdvResult.byHour[row.t] ?? 0) : row.rdv,
      }))
    : [];

  const trancheRowsRef = useRef(trancheRows);
  trancheRowsRef.current = trancheRows;
  const rdvPlugin = useMemo(() => makeRdvPlugin(trancheRowsRef), []); // eslint-disable-line

  // Tant que le tout premier chargement n'a pas de données, on affiche le
  // logo animé plutôt que la mosaïque de blocs "Non connecté" — sinon un
  // chargement un peu lent se lit comme une panne. Les rafraîchissements
  // suivants (changement de période/collab) gardent le contenu déjà là,
  // signalés par la pastille "Chargement…" du bandeau de filtres.
  const firstLoad = !hasData && salesData?.loading && !salesData?.error;

  return (
    <Loader loading={firstLoad} label="Récupération de l'archive Ringover…" minHeight={480}>
      {() => (
    <div className={styles.page}>
      <SectionLabel badge="RINGOVER">Activité Sales — indicateurs clés</SectionLabel>

      {/* Bandeau statut connexion données */}
      {salesData?.error && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(196,135,106,0.4)', background: 'rgba(196,135,106,0.08)' }}>
          <span style={{ color: 'var(--neg)' }}>⚠ Erreur :</span> {salesData.error}
        </div>
      )}
      {salesData?.rdvError && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(212,168,75,0.4)', background: 'rgba(212,168,75,0.08)' }}>
          <span style={{ color: 'var(--warn)' }}>⚠ Fichier RDV :</span> {salesData.rdvError}
        </div>
      )}
      {hasData && salesData.lastFetched && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(142,207,170,0.3)', background: 'rgba(142,207,170,0.06)' }}>
          <span style={{ color: 'var(--pos)' }}>● Données Ringover</span> — {salesData.result.total.toLocaleString('fr-FR')} appels chargés · MAJ {salesData.lastFetched.toLocaleTimeString('fr-FR')}
          {selectedCollab !== 'Tous' && <span style={{ color: 'var(--text3)' }}> · filtre : {selectedCollab}</span>}
        </div>
      )}

      {kpis ? (
        <div className={styles.kpiGrid6}>
          {kpis.map(k => <KPICard key={k.label} {...k} />)}
        </div>
      ) : (
        <Card><NotConnected>{salesData?.error ? 'échec du chargement, voir erreur ci-dessus' : 'en attente de l\'archive Ringover'}</NotConnected></Card>
      )}

      <SectionLabel>Performance globale / collaborateur</SectionLabel>
      <Card title="Comparatif individuel — principaux leviers">
        {hasData && salesData.result.collabs ? (
          <table className={styles.perfTable}>
            <thead><tr>
              <th>Collaborateur</th>
              <th>Appels émis</th>
              <th>Appels argumentés</th>
              <th>RDV pris</th>
              <th>RDV honorés</th>
              <th>Taux décroché</th>
            </tr></thead>
            <tbody>
              {salesData.result.collabs
                .filter(c => c !== 'Tous')
                .filter(name => (salesData.result.perCollab?.[name]?.appels ?? 0) > 0)
                .map(name => {
                const rdvC  = rdvResult?.perCollab?.[name];
                const ring  = salesData.result.perCollab?.[name];
                const taux  = ring?.taux ?? '—';
                const tauxN = parseInt(taux);
                const tauxColor = isNaN(tauxN) ? undefined : tauxN >= 35 ? 'var(--pos)' : tauxN >= 25 ? 'var(--warn)' : 'var(--neg)';
                return (
                  <tr key={name} className={name === selectedCollab ? styles.highlightRow : ''}>
                    <td className={styles.tdName}>{name}</td>
                    <td className={styles.tdNum}>{ring?.appels ?? '—'}</td>
                    <td className={styles.tdNum}>{ring?.argues ?? '—'}</td>
                    <td className={styles.tdNum} style={{ color: rdvC ? 'var(--pos)' : undefined }}>{rdvC?.rdvPris ?? '—'}</td>
                    <td className={styles.tdNum} style={{ color: rdvC ? 'var(--pos)' : undefined }}>{rdvC?.rdvHonores ?? '—'}</td>
                    <td className={styles.tdNum}><span className={styles.tauxPill} style={{ color: tauxColor }}>{taux}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Appels par tranche horaire</SectionLabel>
      <Card title={`Joignabilité & RDV par tranche horaire${selectedCollab !== 'Tous' ? ` — ${selectedCollab}` : ' — Équipe'}`}>
        {hasData && trancheRows.length > 0 ? (
          <>
            <div className={styles.chartWrap} style={{ height: 240 }}>
              <Bar
                plugins={[rdvPlugin]}
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
          </>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <div className={styles.twoCol}>
        <Card title="Statut par appels — répartition">
          {hasData && salesData.result.categStats?.length > 0 ? (
            <>
              <DonutChart
                variant="donut"
                data={salesData.result.categStats.map(c => c.count)}
                labels={salesData.result.categStats.map(c => c.label)}
                colors={salesData.result.categStats.map(c => c.color)}
                height={200}
                centerValue={salesData.result.categStats.reduce((s2, c) => s2 + c.count, 0)}
                centerLabel="appels"
                tooltip={(label, value, pct) => `${label} : ${value} appels (${pct}%)`}
              />
              <div className={styles.legend} style={{ justifyContent: 'center' }}>
                {salesData.result.categStats.map(c => (
                  <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span className={styles.legDot} style={{ background: c.color }} />{c.label} {c.pct}%
                  </span>
                ))}
              </div>

              {salesData.result.tagStats?.length > 0 && (
                <div className={styles.tagTable}>
                  <div className={styles.tagTableHead}>
                    <span>Tag</span><span>Nb</span><span>%</span>
                  </div>
                  {salesData.result.tagStats.map(t => {
                    const cat = TAG_CATEGORIES.find(c => c.key && t.tag.toUpperCase().startsWith(c.key));
                    return (
                      <div key={t.tag} className={styles.tagRow}>
                        <div className={styles.tagName}>
                          {cat && <span className={styles.tagDot} style={{ background: cat.color }} />}
                          {t.tag}
                        </div>
                        <span className={styles.tagCount}>{t.count}</span>
                        <span className={styles.tagPct}>{t.pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <NotConnected>en attente de l'archive Ringover</NotConnected>
          )}
        </Card>

        <Card title="Motifs de refus en appel">
          <div className={styles.subNote} style={{ marginBottom: 12 }}>Principaux freins rencontrés en prospection</div>
          {(() => {
            const motifs = hasData
              ? (salesData.result.tagStats || [])
                  .filter(t => t.tag.toUpperCase().startsWith('PI -'))
                  .map(t => ({ label: t.tag.replace(/^PI\s*-\s*/i, ''), pct: t.pct, count: t.count }))
              : [];
            if (!hasData) return <NotConnected>en attente de l'archive Ringover</NotConnected>;
            if (motifs.length === 0) return <div style={{ color: 'var(--text3)', fontSize: 12 }}>Aucun motif « PI » sur la période</div>;
            return motifs.map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />);
          })()}
          <div className={styles.subNote} style={{ marginTop: 8 }}>Plusieurs motifs possibles par appel</div>
        </Card>
      </div>

      <SectionLabel>Évolution mensuelle</SectionLabel>
      <Card title="Appels émis & RDV pris — évolution mensuelle">
        {rdvResult?.monthly && Object.keys(rdvResult.monthly).length > 0 ? (
          <>
            <div className={styles.chartWrap} style={{ height: 200 }}>
              <Line
                data={{
                  labels: Object.keys(rdvResult.monthly).sort().map(k => {
                    const [y, m] = k.split('-');
                    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('fr-FR', { month: 'short' });
                  }),
                  datasets: [
                    {
                      label: 'RDV pris',
                      data: Object.keys(rdvResult.monthly).sort().map(k => rdvResult.monthly[k]),
                      borderColor: '#7EB89A', backgroundColor: 'rgba(126,184,154,0.04)', pointBackgroundColor: '#7EB89A',
                      tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y',
                    },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  animation: lineAnim,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: tickStyle, grid: gridStyle, border: borderCol },
                    y: { ticks: tickStyle, grid: gridStyle, border: borderCol, position: 'left' },
                  },
                }}
              />
            </div>
            <div className={styles.legend}>
              <span className={styles.legDot} style={{ background: '#7EB89A' }} />RDV pris (fichier RDV)
            </div>
            <div className={styles.subNote} style={{ marginTop: 6 }}>Évolution mensuelle des appels émis non disponible — nécessite un agrégat par mois côté archive Ringover</div>
          </>
        ) : (
          <NotConnected>fichier RDV non chargé ou sans historique mensuel</NotConnected>
        )}
      </Card>
    </div>
      )}
    </Loader>
  );
}
