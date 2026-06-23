import { Bar, Line } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { useRef, useMemo } from 'react';
import { useChartMount } from '../../../hooks/useChartMount';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import MotifBar from '../../../components/ui/MotifBar';
import { activiteSalesData as d, months } from '../../../data/mockData';
import { TAG_CATEGORIES } from '../../../services/sheetsParser';
import styles from './Activite.module.css';

Chart.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'OverusedGrotesk' } };
const gridStyle = { color: 'rgba(227,225,216,0.04)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };
const barAnim = { duration: 900, easing: 'easeOutQuart', delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 55 : 0 };

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
const lineAnim = { duration: 900, easing: 'easeOutQuart' };

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

// KPIs depuis données réelles (Google Sheets)
function buildRealKPIs(result, rdvResult, compareResult) {
  const { total, argues, decroche } = result;
  const tauxDec = total > 0 ? Math.round((decroche / total) * 100) : 0;
  const argPct  = total > 0 ? Math.round((argues  / total) * 100) : 0;
  const rdvPris    = rdvResult?.rdvPris    ?? '—';
  const tauxHon    = rdvResult ? `${rdvResult.tauxHonores}%` : d.kpis[5].value;
  const rdvSrc     = rdvResult ? 'Fichier RDV' : 'Données mock';

  const cmp = compareResult;
  const cmpTauxDec = cmp && cmp.total > 0 ? Math.round((cmp.decroche / cmp.total) * 100) : null;

  return [
    { label: 'Appels émis',              value: total,          unit: '', trend: cmp ? trendCompare(total,   cmp.total,   'Données Ringover réelles') : { dir: 'neutral', text: 'Données Ringover réelles' }, color: 'blue' },
    { label: 'Appels argumentés',        value: argues,         unit: '', trend: cmp ? trendCompare(argues,  cmp.argues,  `${argPct}% du total`)      : { dir: 'neutral', text: `${argPct}% du total` },     color: 'green' },
    { label: 'Taux décrochés >30s',      value: `${tauxDec}%`, unit: '', trend: cmp ? trendComparePts(tauxDec, cmpTauxDec, 'Durée > 30 secondes')    : { dir: 'neutral', text: 'Durée > 30 secondes' },     color: 'accent' },
    { label: 'Taux fiches exploitables', value: d.kpis[3].value, unit: '', trend: { dir: 'neutral', text: 'Données mock' },                                                                                    color: 'amber' },
    { label: 'RDV pris',                 value: rdvPris,        unit: '', trend: { dir: 'neutral', text: rdvSrc },                                                                                             color: 'green' },
    { label: 'Taux RDV honorés',         value: tauxHon,        unit: '', trend: { dir: 'neutral', text: rdvSrc },                                                                                             color: 'purple' },
  ];
}

// KPIs depuis données mock (fallback)
function getMockKPIs(collab) {
  if (collab === 'Tous') return d.kpis;
  const c = d.collaborateurs.find(x => x.name === collab);
  if (!c) return d.kpis;
  const argPct = Math.round((c.argues / c.appels) * 100);
  return [
    { label: 'Appels émis',          value: c.appels, unit: '', trend: { dir: 'neutral', text: 'Période Jan–Jun 2025' }, color: 'blue' },
    { label: 'Appels argumentés',    value: c.argues, unit: '', trend: { dir: 'neutral', text: `${argPct}% du total` },  color: 'green' },
    { label: 'Taux décrochés >30s',  value: c.taux,   unit: '', trend: { dir: 'neutral', text: 'Taux individuel' },     color: 'accent' },
    { label: 'Taux fiches exploitables', value: d.kpis[3].value, unit: '', trend: { dir: 'neutral', text: 'Données mock' }, color: 'amber' },
    { label: 'RDV pris',             value: c.rdv,    unit: '', trend: { dir: 'neutral', text: 'Période Jan–Jun 2025' }, color: 'green' },
    { label: 'Présence',             value: c.presence, unit: '', trend: { dir: 'neutral', text: 'Temps de présence' }, color: 'purple' },
  ];
}

export default function ActiviteSales({ selectedCollab = 'Tous', salesData, compareResult = null }) {
  const mounted = useChartMount();
  const hasRealData = salesData?.hasData && salesData?.result;
  const rdvResult   = salesData?.rdvResult ?? null;

  // KPIs : réelles si connecté, mock sinon
  const kpis = hasRealData ? buildRealKPIs(salesData.result, rdvResult, compareResult) : getMockKPIs(selectedCollab);

  // Tranches horaires : réelles si connecté, mock sinon
  // Les RDV par tranche viennent de la feuille RDV (byHour) si disponible,
  // sinon on garde les RDV Ringover (tag OK) comme fallback
  const trancheRows = hasRealData
    ? salesData.result.tranches.map(row => ({
        ...row,
        rdv: rdvResult?.byHour != null ? (rdvResult.byHour[row.t] ?? 0) : row.rdv,
      }))
    : (d.tranchesHoraires.data[selectedCollab] || d.tranchesHoraires.data['Tous']);

  // Plugin ref — pointe toujours vers trancheRows courant (évite le cache Chart.js par ID)
  const trancheRowsRef = useRef(trancheRows);
  trancheRowsRef.current = trancheRows;
  const rdvPlugin = useMemo(() => makeRdvPlugin(trancheRowsRef), []); // eslint-disable-line

  return (
    <div className={styles.page}>
      <SectionLabel badge="RINGOVER">Activité Sales — indicateurs clés</SectionLabel>

      {/* Bandeau statut connexion données */}
      {salesData?.error && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(196,135,106,0.4)', background: 'rgba(196,135,106,0.08)' }}>
          <span style={{ color: 'var(--neg)' }}>⚠ Erreur Ringover :</span> {salesData.error} — données mock affichées
        </div>
      )}
      {hasRealData && salesData.lastFetched && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(142,207,170,0.3)', background: 'rgba(142,207,170,0.06)' }}>
          <span style={{ color: 'var(--pos)' }}>● Données Ringover</span> — {salesData.result.total.toLocaleString('fr-FR')} appels chargés · MAJ {salesData.lastFetched.toLocaleTimeString('fr-FR')}
          {selectedCollab !== 'Tous' && <span style={{ color: 'var(--text3)' }}> · filtre : {selectedCollab}</span>}
        </div>
      )}
      {!hasRealData && !salesData?.error && (
        <div className={styles.dataAlert}>
          <span style={{ color: 'var(--text3)' }}>Mode démo</span> — données Ringover en cours de chargement…
        </div>
      )}

      <div className={styles.kpiGrid6}>
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      <SectionLabel>Appels par tranche horaire</SectionLabel>
      <Card title={`Joignabilité & RDV par tranche horaire${selectedCollab !== 'Tous' ? ` — ${selectedCollab}` : ' — Équipe'}`}>
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
      </Card>

      <div className={styles.twoCol}>
        <Card title="Statut par appels — répartition">
          {/* ── Graphe : 5 catégories de tags ── */}
          {(() => {
            const cats = hasRealData
              ? salesData.result.categStats
              : d.statutAppels.map((s, i) => ({ label: s.label, count: s.count, pct: s.pct, color: ['rgba(142,207,170,0.8)','rgba(255,249,147,0.7)','rgba(123,170,191,0.6)','rgba(167,173,170,0.5)','rgba(196,135,106,0.55)'][i] }));
            const catColors = hasRealData
              ? salesData.result.categStats.map(c => c.color)
              : ['rgba(142,207,170,0.8)','rgba(255,249,147,0.7)','rgba(123,170,191,0.6)','rgba(167,173,170,0.5)','rgba(196,135,106,0.55)'];
            return (
              <>
                <div className={styles.chartWrap} style={{ height: 180 }}>
                  <Bar
                    data={{
                      labels: cats.map(c => c.label || c.label),
                      datasets: [{ data: cats.map(c => c.count), backgroundColor: catColors, borderRadius: 5, borderSkipped: false }],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false, animation: barAnim, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} appels (${cats[ctx.dataIndex]?.pct}%)` } } }, scales: { x: { ticks: { ...tickStyle, font: { size: 9 } }, grid: gridStyle, border: borderCol }, y: { ticks: tickStyle, grid: gridStyle, border: borderCol } } }}
                  />
                </div>

                {/* ── Table complète des tags individuels (données réelles uniquement) ── */}
                {hasRealData && salesData.result.tagStats?.length > 0 && (
                  <div className={styles.tagTable}>
                    <div className={styles.tagTableHead}>
                      <span>Tag</span><span>Nb</span><span>%</span>
                    </div>
                    {salesData.result.tagStats.map((t, i) => {
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

                {/* ── Barres de progression (mock uniquement) ── */}
                {!hasRealData && (
                  <div className={styles.statutTable}>
                    {d.statutAppels.map((s, i) => (
                      <div key={s.label} className={styles.statutRow}>
                        <div className={styles.statutLbl}>{s.label}</div>
                        <div className={styles.statutTrack}>
                          <div className={styles.statutFill} style={{ width: mounted ? `${s.pct}%` : '0%', transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 65}ms` }} />
                        </div>
                        <div className={styles.statutVals}><span>{s.count}</span><span className={styles.pct}>{s.pct}%</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </Card>

        <Card title="Motifs de refus en appel">
          <div className={styles.subNote} style={{ marginBottom: 12 }}>Principaux freins rencontrés en prospection</div>
          {(() => {
            const motifs = hasRealData
              ? (salesData.result.tagStats || [])
                  .filter(t => t.tag.toUpperCase().startsWith('PI -'))
                  .map(t => ({ label: t.tag.replace(/^PI\s*-\s*/i, ''), pct: t.pct, count: t.count }))
              : d.motifsRefus;
            return motifs.map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />);
          })()}
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
            <th>RDV honorés</th>
            <th>Taux décroché</th>
          </tr></thead>
          <tbody>
            {(() => {
              if (hasRealData && salesData.result.collabs) {
                // Lignes depuis données réelles Ringover + RDV
                const ringoverCollabs = salesData.result.collabs.filter(c => c !== 'Tous');
                // Agréger les appels par collab depuis les tranches (ou recalculer depuis les rows)
                // On utilise le comparatif mock pour les colonnes non-RDV si pas de per-collab ringover
                return ringoverCollabs.map((name, i) => {
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
                });
              }
              // Fallback mock
              return d.collaborateurs.map((c, i) => (
                <tr key={c.name} className={`${i === 0 ? styles.topRow : ''} ${c.name === selectedCollab ? styles.highlightRow : ''}`}>
                  <td className={styles.tdName}>{c.name}</td>
                  <td className={styles.tdNum}>{c.appels}</td>
                  <td className={styles.tdNum}>{c.argues}</td>
                  <td className={styles.tdNum}>{c.rdv}</td>
                  <td className={styles.tdNum}>—</td>
                  <td className={styles.tdNum}><span className={styles.tauxPill} style={{ color: parseInt(c.taux) >= 55 ? 'var(--pos)' : parseInt(c.taux) >= 45 ? 'var(--warn)' : 'var(--neg)' }}>{c.taux}</span></td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </Card>

      <SectionLabel>Évolution mensuelle</SectionLabel>
      <Card title="Appels émis & RDV pris — évolution mensuelle">
        {(() => {
          // Construire les labels mois depuis les données réelles ou mock
          let evoLabels = months;
          let evoAppels = d.evolutionMensuelle.appels;
          let evoRDV    = d.evolutionMensuelle.rdv;

          if (rdvResult?.monthly) {
            const keys = Object.keys(rdvResult.monthly).sort();
            if (keys.length > 0) {
              evoLabels = keys.map(k => {
                const [y, m] = k.split('-');
                return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('fr-FR', { month: 'short' });
              });
              evoRDV = keys.map(k => rdvResult.monthly[k]);
              // Pour les appels émis, on prend mock si pas de donnée mensuelle Ringover
              evoAppels = keys.map(() => null); // à améliorer quand on aura l'évolution Ringover
            }
          }

          return (
            <>
              <div className={styles.chartWrap} style={{ height: 200 }}>
                <Line
                  data={{
                    labels: evoLabels,
                    datasets: [
                      { label: 'Appels émis', data: evoAppels, borderColor: '#FFF993', backgroundColor: 'rgba(255,249,147,0.05)', pointBackgroundColor: '#FFF993', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y' },
                      { label: 'RDV pris',    data: evoRDV,    borderColor: '#7EB89A', backgroundColor: 'rgba(126,184,154,0.04)', pointBackgroundColor: '#7EB89A', tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y2' },
                    ],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    animation: lineAnim,
                    plugins: { legend: { display: false } },
                    scales: {
                      x:  { ticks: tickStyle, grid: gridStyle, border: borderCol },
                      y:  { ticks: tickStyle, grid: gridStyle, border: borderCol, position: 'left' },
                      y2: { ticks: { ...tickStyle, color: 'rgba(126,184,154,0.5)' }, grid: { display: false }, border: borderCol, position: 'right' },
                    },
                  }}
                />
              </div>
              <div className={styles.legend}>
                <span className={styles.legDot} style={{ background: 'var(--accent)' }} />Appels émis (axe gauche)
                <span className={styles.legDot} style={{ background: '#7EB89A', marginLeft: 14 }} />RDV pris (axe droit)
                {rdvResult && <span style={{ marginLeft: 14, fontSize: 9.5, color: 'var(--text3)' }}>· RDV : données fichier RDV</span>}
              </div>
            </>
          );
        })()}
      </Card>
    </div>
  );
}
