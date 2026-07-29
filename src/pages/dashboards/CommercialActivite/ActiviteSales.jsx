import { Bar, Line } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { useRef, useMemo, useState } from 'react';
import { useChartMount } from '../../../hooks/useChartMount';
import { usePeriod } from '../../../contexts/PeriodContext';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import MotifBar from '../../../components/ui/MotifBar';
import NotConnected, { notConnectedKPI } from '../../../components/ui/NotConnected';
import Loader from '../../../components/ui/Loader';
import { TAG_CATEGORIES, dernierJourArchive } from '../../../services/sheetsParser';
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
        // Barre trop courte pour écrire dedans (cas fréquent, tranches à
        // faible volume) → l'info passait silencieusement à la trappe.
        // On l'affiche au-dessus de la barre à la place, jamais masquée.
        if (barHeight >= 18) {
          ctx.fillStyle = 'rgba(142,207,170,0.95)';
          ctx.textBaseline = 'top';
          ctx.fillText(`RDV : ${rdv}`, bar.x, bar.y + 4);
        } else {
          ctx.fillStyle = 'rgba(38,0,31,0.75)';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`RDV : ${rdv}`, bar.x, bar.y - 3);
        }
      });
      ctx.restore();
    },
  };
}

// Tri du tableau "Comparatif individuel" — même principe que la table "À
// relancer" de Commercial & Relation Client (clic sur l'en-tête, tri alpha
// par défaut sur le nom).
function compareCollabRows(a, b, sort) {
  let cmp;
  if (sort.col === 'nom') {
    cmp = a.nom.localeCompare(b.nom, 'fr');
  } else {
    const va = a[sort.col]; const vb = b[sort.col];
    cmp = (va == null ? -Infinity : va) - (vb == null ? -Infinity : vb);
  }
  return sort.dir === 'asc' ? cmp : -cmp;
}

// KPIs depuis l'archive Ringover (seule source pour cet onglet)
function buildKPIs(result, rdvResult, compareResult, comparePeriodKey) {
  const { total, argues, decroche } = result;
  const tauxDec = total > 0 ? Math.round((decroche / total) * 100) : 0;
  const argPct  = total > 0 ? Math.round((argues  / total) * 100) : 0;
  const rdvPris = rdvResult?.rdvPris ?? '—';
  const tauxHon = rdvResult ? `${rdvResult.tauxHonores}%` : '—';
  const rdvSrc  = rdvResult ? 'Fichier RDV' : 'Fichier RDV non chargé';

  const cmp = compareResult;
  const cmpTauxDec = cmp && cmp.total > 0 ? Math.round((cmp.decroche / cmp.total) * 100) : null;
  const nbCollabActifs = Object.values(result.perCollab || {}).filter(c => (c.appels || 0) > 0).length;

  // Ordre "funnel" : on émet un appel, il est décroché, puis argumenté,
  // enfin une fiche est complétée — plus logique à lire que émis→argumenté→décroché.
  return [
    { label: 'Appels émis',              value: total,          unit: '', compare: cmp ? compareValueText(total, cmp.total, comparePeriodKey) : null,        trend: { dir: 'neutral', text: `${nbCollabActifs} collaborateur${nbCollabActifs > 1 ? 's' : ''} actif${nbCollabActifs > 1 ? 's' : ''}` },        color: 'blue' },
    { label: 'Taux décrochés >30s',      value: `${tauxDec}%`, unit: '', compare: cmp ? comparePtsText(tauxDec, cmpTauxDec, comparePeriodKey) : null,        trend: { dir: 'neutral', text: 'Durée > 30 secondes' },     color: 'accent' },
    { label: 'Appels argumentés',        value: argues,         unit: '', compare: cmp ? compareValueText(argues, cmp.argues, comparePeriodKey) : null,      trend: { dir: 'neutral', text: `${argPct}% du total` },     color: 'green' },
    notConnectedKPI('Taux fiches exploitables', 'aucune notion de fiche qualité côté Ringover', 'amber'),
    { label: 'RDV pris',                 value: rdvPris,        unit: '', trend: { dir: 'neutral', text: rdvSrc },                                                                                             color: 'green' },
    { label: 'Taux RDV honorés',         value: tauxHon,        unit: '', trend: { dir: 'neutral', text: rdvSrc },                                                                                             color: 'purple' },
  ];
}

export default function ActiviteSales({ selectedCollab = 'Tous', salesData, compareResult = null }) {
  const mounted = useChartMount();
  const hasData = salesData?.hasData && salesData?.result;
  const rdvResult = salesData?.rdvResult ?? null;
  const { comparePeriodKey } = usePeriod();
  const [collabSort, setCollabSort] = useState({ col: 'nom', dir: 'asc' });

  function toggleCollabSort(col) {
    setCollabSort(s => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  }
  function collabSortArrow(col) {
    return collabSort.col === col ? (collabSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  }

  const kpis = hasData ? buildKPIs(salesData.result, rdvResult, compareResult, comparePeriodKey) : null;
  // RDV par tranche horaire : uniquement le tag Ringover "OK" (row.rdv, déjà
  // calculé par computeSalesData) — pas le fichier RDV externe. Décision
  // explicite : la fiabilité de ce chiffre dépend du bon tagging Ringover
  // par les collaborateurs, pas d'une source externe à maintenir.
  const trancheRows = hasData ? salesData.result.tranches : [];

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
      <SectionLabel badge="RINGOVER">Indicateurs principaux</SectionLabel>

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
          <span style={{ color: 'var(--pos)' }}>● Données Ringover</span> — Mise à jour arrêtée au {dernierJourArchive(salesData.rows) || '—'}
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

      <SectionLabel>Performance commerciale des agents</SectionLabel>
      <Card title="Comparatif individuel — principaux leviers">
        {hasData && salesData.result.collabs ? (() => {
          const rows = salesData.result.collabs
            .filter(c => c !== 'Tous')
            .filter(name => (salesData.result.perCollab?.[name]?.appels ?? 0) > 0)
            .map(name => {
              const rdvC = rdvResult?.perCollab?.[name];
              const ring = salesData.result.perCollab?.[name];
              const tauxN = parseInt(ring?.taux);
              return {
                nom: name,
                appels: ring?.appels ?? null,
                tauxDecroche: isNaN(tauxN) ? null : tauxN,
                tauxLabel: ring?.taux ?? '—',
                argues: ring?.argues ?? null,
                rdvPris: rdvC?.rdvPris ?? null,
                rdvHonores: rdvC?.rdvHonores ?? null,
              };
            })
            .sort((a, b) => compareCollabRows(a, b, collabSort));

          return (
            <table className={styles.perfTable}>
              <thead><tr>
                <th onClick={() => toggleCollabSort('nom')} style={{ cursor: 'pointer' }}>Collaborateur{collabSortArrow('nom')}</th>
                <th onClick={() => toggleCollabSort('appels')} style={{ cursor: 'pointer' }}>Appels émis{collabSortArrow('appels')}</th>
                <th onClick={() => toggleCollabSort('tauxDecroche')} style={{ cursor: 'pointer' }}>Taux décroché{collabSortArrow('tauxDecroche')}</th>
                <th onClick={() => toggleCollabSort('argues')} style={{ cursor: 'pointer' }}>Appels argumentés{collabSortArrow('argues')}</th>
                <th onClick={() => toggleCollabSort('rdvPris')} style={{ cursor: 'pointer' }}>RDV pris{collabSortArrow('rdvPris')}</th>
                <th onClick={() => toggleCollabSort('rdvHonores')} style={{ cursor: 'pointer' }}>RDV honorés{collabSortArrow('rdvHonores')}</th>
              </tr></thead>
              <tbody>
                {rows.map(row => {
                  const tauxColor = row.tauxDecroche == null ? undefined : row.tauxDecroche >= 35 ? 'var(--pos)' : row.tauxDecroche >= 25 ? 'var(--warn)' : 'var(--neg)';
                  return (
                    <tr key={row.nom} className={row.nom === selectedCollab ? styles.highlightRow : ''}>
                      <td className={styles.tdName}>{row.nom}</td>
                      <td className={styles.tdNum}>{row.appels ?? '—'}</td>
                      <td className={styles.tdNum}><span className={styles.tauxPill} style={{ color: tauxColor }}>{row.tauxLabel}</span></td>
                      <td className={styles.tdNum}>{row.argues ?? '—'}</td>
                      <td className={styles.tdNum} style={{ color: row.rdvPris != null ? 'var(--pos)' : undefined }}>{row.rdvPris ?? '—'}</td>
                      <td className={styles.tdNum} style={{ color: row.rdvHonores != null ? 'var(--pos)' : undefined }}>{row.rdvHonores ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })() : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Détails des appels</SectionLabel>
      <Card title={`Joignabilité par tranche horaire${selectedCollab !== 'Tous' ? ` — ${selectedCollab}` : ' — Équipe'}`}>
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
                      backgroundColor: 'rgba(123,170,191,0.5)',
                      borderRadius: 4,
                      borderSkipped: false,
                      yAxisID: 'y',
                      order: 1,
                    },
                    {
                      type: 'line',
                      label: 'Joignabilité %',
                      data: trancheRows.map(r => r.appels > 0 ? r.join : null),
                      borderColor: 'rgba(169,141,196,0.9)',
                      backgroundColor: 'rgba(169,141,196,0.04)',
                      pointBackgroundColor: 'rgba(169,141,196,0.9)',
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
                    y2: { ticks: { ...tickStyle, callback: v => v + '%' }, grid: { display: false }, border: borderCol, position: 'right', min: 0, max: 100, title: { display: true, text: 'Joignabilité %', color: 'rgba(169,141,196,0.6)', font: { size: 9 } } },
                  },
                }}
              />
            </div>
            <div className={styles.legend}>
              <span className={styles.legDot} style={{ background: 'rgba(123,170,191,0.7)' }} />Appels émis
              <span style={{ color: 'rgba(142,207,170,0.9)', fontWeight: 600, marginLeft: 14, fontSize: 10 }}>RDV : n</span> affiché sur chaque barre
              <span className={styles.legDot} style={{ background: 'rgba(169,141,196,0.9)', marginLeft: 14 }} />Joignabilité %
            </div>
          </>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <div className={styles.twoCol}>
        {/* Répartition par qualification — c'est le widget que l'équipe appelle
            "Détails des appels" au quotidien, mais le nom exact est repris par
            la section elle-même juste au-dessus (elle couvre aussi Joignabilité
            et Motifs) : éviter le doublon de titre section/widget. */}
        <Card title="Répartition par qualification">
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

        <Card title="Motifs de refus rencontrés">
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
