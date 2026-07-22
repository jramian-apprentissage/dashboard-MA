import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import { useLeadsAnalytics } from '../../../hooks/useLeadsAnalytics';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import Pill from '../../../components/ui/Pill';
import MotifBar from '../../../components/ui/MotifBar';
import DonutChart from '../../../components/ui/DonutChart';
import NotConnected from '../../../components/ui/NotConnected';
import styles from './FocusCommercial.module.css';

Chart.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip);

const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(0)} K€` : `${v}€`;
const tickStyle = { color: 'rgba(22,5,18,0.35)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(22,5,18,0.06)' };
const borderStyle = { color: 'rgba(22,5,18,0.08)' };

const evoBarOpts = {
  responsive: true, maintainAspectRatio: false,
  animation: { duration: 900, easing: 'easeOutQuart' },
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: tickStyle, grid: gridStyle, border: borderStyle },
    y: { ticks: { ...tickStyle, stepSize: 1 }, grid: gridStyle, border: borderStyle, min: 0 },
  },
};

const missionLabels = { SO: 'Commercial (SO)', AV: 'Administratif (AV)', CS: 'Customer Success (CS)', IT: 'Informatique (IT)', DS: 'Digital Services (DS)' };
const missionColors = ['rgba(255,249,147,0.95)', 'rgba(38,0,31,0.8)', 'rgba(196,135,106,0.85)', 'rgba(123,170,191,0.75)', 'rgba(142,207,170,0.75)'];
const sourceColors  = ['rgba(255,249,147,0.8)', 'rgba(123,170,191,0.7)', 'rgba(169,141,196,0.7)', 'rgba(196,135,106,0.55)', 'rgba(142,207,170,0.6)'];
const AUTRES_SOURCE_COLOR = 'rgba(167,173,170,0.5)';

// Ordre du funnel commercial — sert à trier "Opportunités sans prochaine
// action" par étape plutôt que par opportunité, et à colorer chaque étape de
// façon stable (même code visuel partout, étapes d'attente regroupées).
const ETAPE_ORDER = ['Recherche profil', 'Présentation profil', 'Point de cadrage', 'Relance en cours', 'Relance à faire', 'Attente retour client', 'ATRC après prez'];
const ETAPE_PILL_VARIANT = {
  'Recherche profil':      'blue',
  'Présentation profil':   'accent',
  'Point de cadrage':      'gray',
  'Relance en cours':      'amber',
  'Relance à faire':       'red',
  'Attente retour client': 'gray',
  'ATRC après prez':       'green',
};

function fmtDateRelance(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function moisLabel(m) {
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleString('fr-FR', { month: 'short' });
}

export default function FocusCommercial() {
  const mounted = useChartMount();
  const { result, loading, error } = useSnapshotData();
  const leads = useLeadsAnalytics();

  const circumference = 276.5;
  const winRate = result?.winRate ?? 0;
  const dashTarget = winRate * (circumference / 100);

  return (
    <div className={styles.page}>

      {/* ══ Ligne 1 — L'entonnoir en chiffres : entrée → conversion → sortie ══ */}
      <SectionLabel badge="Monday">Pipeline, conversion, signatures</SectionLabel>
      <Loader loading={loading} label="Chargement des données CRM…" size={44} minHeight={110} />
      {error && (
        <div style={{ padding: '20px 0', color: 'var(--neg)', fontSize: 13 }}>Erreur de chargement : {error}</div>
      )}
      {result && (
        <>
          <div className={styles.kpiRow4}>
            <KPICard
              label="Pipeline total"
              value={fmt(result.montantPipeline)}
              trend={{ dir: 'neutral', text: 'Opportunités en cours' }}
              color="blue"
            />
            <KPICard
              label="Pipeline pondéré"
              value={fmt(result.montantPipelinePondere)}
              trend={{ dir: 'neutral', text: 'Seuil ≥ 30% de probabilité' }}
              color="green"
            />
            <KPICard
              label="Win rate"
              value={`${winRate}%`}
              trend={{ dir: winRate >= 50 ? 'up' : 'down', text: 'Gagnés ÷ (Gagnés + Perdus)' }}
              color={winRate >= 50 ? 'green' : 'amber'}
            />
            <KPICard
              label="Deals gagnés"
              value={result.nbDealsGagnes}
              unit=" deals"
              trend={{ dir: result.nbDealsGagnes > 0 ? 'up' : 'neutral', text: `CA associé : ${fmt(result.sommeVentesGagnes)}` }}
              color="green"
            />
          </div>

          {/* ══ Ligne 2 — Diagnostic du flux : où sont les opps, que valent-elles ══ */}
          <SectionLabel>Diagnostic du pipeline</SectionLabel>
          <div className={styles.threeCol}>
            {/* Funnel par étape — colonne "Etat" du board Leads/Prospects */}
            <Card title="Funnel par étape commerciale">
              {leads.error ? (
                <NotConnected>{leads.error}</NotConnected>
              ) : leads.data?.funnel ? (
                <>
                  <div className={styles.pipeTotal}>
                    <div className={styles.metaSub}>Opportunités en cours</div>
                    <div className={styles.metaVal}>{leads.data.funnel.totalOpportunites}</div>
                  </div>
                  {(() => {
                    const maxCount = Math.max(...leads.data.funnel.etapes.map(s => s.count), 1);
                    return leads.data.funnel.etapes.map(s => (
                      <div key={s.etat} className={styles.barRow}>
                        <div className={styles.barLbl}>{s.etat}</div>
                        <div className={styles.barTrack}>
                          <div className={styles.barFill} style={{ width: `${(s.count / maxCount) * 100}%` }} />
                        </div>
                        <div className={styles.barVal}>{s.count}<span>{s.pct}%</span></div>
                      </div>
                    ));
                  })()}
                  <div className={styles.subnote} style={{ marginTop: 8 }}>Part du total des opps ouvertes par étape · âge moyen et durée de cycle non disponibles</div>
                </>
              ) : (
                <NotConnected>chargement…</NotConnected>
              )}
            </Card>

            {/* Pipeline pondéré par probabilité */}
            <Card title="Pipeline pondéré par probabilité">
              <div className={styles.pipelineHeader}>
                <div>
                  <div className={styles.metaSub}>Pipeline total</div>
                  <div className={styles.metaVal}>{fmt(result.montantPipeline)}</div>
                </div>
                <div>
                  <div className={styles.metaSub}>Pipeline pondéré</div>
                  <div className={styles.metaVal} style={{ color: 'var(--myrtille)' }}>{fmt(result.montantPipelinePondere)}</div>
                </div>
              </div>
              <div className={styles.sep} />
              {result.pipelineBreakdown.map((p, i) => (
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
              {result.pipelineBreakdown.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 12 }}>Aucune opportunité en pipeline</div>
              )}
            </Card>

            {/* Win rate — jauge + détail des issues */}
            <Card title="Win rate — détail des résultats">
              <div className={styles.donutWrap} style={{ height: 'auto' }}>
                <svg viewBox="0 0 110 110" width={120} height={120}>
                  <defs>
                    <linearGradient id="winGradFC" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#26001F" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#26001F" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <circle cx="55" cy="55" r="44" fill="none" stroke="rgba(167,173,170,0.25)" strokeWidth="11" />
                  {/* Repère cible 50% */}
                  <line x1="55" y1="4" x2="55" y2="16" stroke="rgba(38,0,31,0.3)" strokeWidth="2" transform="rotate(180 55 55)" />
                  <circle
                    cx="55" cy="55" r="44" fill="none"
                    stroke="url(#winGradFC)" strokeWidth="11"
                    strokeDasharray={mounted ? `${dashTarget} ${circumference}` : `0 ${circumference}`}
                    strokeLinecap="round"
                    transform="rotate(-90 55 55)"
                    style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)' }}
                  />
                </svg>
                <div className={styles.donutCenter}>
                  <div className={styles.donutVal}>{winRate}%</div>
                  <div className={styles.donutLbl}>Win rate</div>
                </div>
              </div>
              <div className={styles.donutStats}>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--pos)' }}>{result.dealStats.gagnes}</div>
                  <div className={styles.dl}>Deals gagnés</div>
                </div>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--neg)' }}>{result.dealStats.perdus}</div>
                  <div className={styles.dl}>Deals perdus</div>
                </div>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--warn)' }}>{result.dealStats.standby}</div>
                  <div className={styles.dl}>Deals stand-by</div>
                </div>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--text2)' }}>{result.dealStats.enCours}</div>
                  <div className={styles.dl}>Deals en cours</div>
                </div>
              </div>
              <div className={styles.subnote}>
                {result.dealStats.gagnes} affaire{result.dealStats.gagnes > 1 ? 's' : ''} signée{result.dealStats.gagnes > 1 ? 's' : ''} sur {result.dealStats.gagnes + result.dealStats.perdus} affaire{(result.dealStats.gagnes + result.dealStats.perdus) > 1 ? 's' : ''} totale{(result.dealStats.gagnes + result.dealStats.perdus) > 1 ? 's' : ''}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ══ Ligne 3 — Pourquoi on perd : tendance + causes sur la même ligne ══ */}
      <SectionLabel badge="Monday — colonnes Etat / Motif de refus">Évolution mensuelle des deals</SectionLabel>
      <div className={styles.threeCol}>
        <Card title="Deals gagnés / perdus / stand-by — par mois">
          {leads.error ? (
            <NotConnected>{leads.error}</NotConnected>
          ) : leads.data?.evolutionMensuelle ? (
            <>
              <div className={styles.lineWrap} style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: leads.data.evolutionMensuelle.mois.map(m => moisLabel(m.mois)),
                    datasets: [
                      { label: 'Gagnés',   data: leads.data.evolutionMensuelle.mois.map(m => m.gagnes),  backgroundColor: 'rgba(142,207,170,0.75)', borderRadius: 3, borderSkipped: false },
                      { label: 'Perdus',   data: leads.data.evolutionMensuelle.mois.map(m => m.perdus),  backgroundColor: 'rgba(196,135,106,0.75)', borderRadius: 3, borderSkipped: false },
                      { label: 'Stand-by', data: leads.data.evolutionMensuelle.mois.map(m => m.standby), backgroundColor: 'rgba(212,168,75,0.7)',   borderRadius: 3, borderSkipped: false },
                    ],
                  }}
                  options={evoBarOpts}
                />
              </div>
              <div className={styles.legend}>
                <span className={styles.legDot} style={{ background: '#8ECFAA' }} />Gagnés
                <span className={styles.legDot} style={{ background: '#C4876A', marginLeft: 12 }} />Perdus
                <span className={styles.legDot} style={{ background: '#D4A84B', marginLeft: 12 }} />Stand-by
              </div>
              <div className={styles.subnote}>{leads.data.evolutionMensuelle.note_limite}</div>
            </>
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}
        </Card>
        <Card title="Motifs des deals perdus">
          {leads.error ? (
            <NotConnected>{leads.error}</NotConnected>
          ) : leads.data?.motifsPerdu ? (
            leads.data.motifsPerdu.motifs.length > 0 ? (
              <>
                {leads.data.motifsPerdu.motifs.slice(0, 8).map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />)}
                <div className={styles.subnote}>
                  {leads.data.motifsPerdu.total} deals perdus au total — {leads.data.motifsPerdu.sansMotif} sans motif renseigné
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>Aucun motif renseigné sur les deals perdus</div>
            )
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}
        </Card>
        <Card title="Motifs des deals stand-by">
          {leads.error ? (
            <NotConnected>{leads.error}</NotConnected>
          ) : leads.data?.motifsStandby ? (
            leads.data.motifsStandby.motifs.length > 0 ? (
              <>
                {leads.data.motifsStandby.motifs.slice(0, 8).map(m => <MotifBar key={m.label} {...m} fillColor="var(--warn)" />)}
                <div className={styles.subnote}>
                  {leads.data.motifsStandby.total} deals en stand-by au total — {leads.data.motifsStandby.sansMotif} sans motif renseigné
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>Aucun motif renseigné sur les deals stand-by</div>
            )
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}
        </Card>
      </div>

      {/* ══ Ligne 4 — L'action immédiate : la to-do de la réunion d'équipe ══ */}
      <SectionLabel badge="Monday — Etat + Date de relance">À traiter cette semaine</SectionLabel>
      <Card title="Opportunités sans prochaine action">
        {leads.error ? (
          <NotConnected>{leads.error}</NotConnected>
        ) : leads.data?.opportunitesSansAction ? (
          <>
            <div className={styles.alertCount}>
              <span className={styles.alertNum}>{leads.data.opportunitesSansAction.length}</span>
              <span className={styles.alertSub}>affaires sans date de relance planifiée (ou passée) — à traiter</span>
            </div>
            <table className={styles.tbl}>
              <thead><tr>
                <th>Opportunité</th><th>Étape</th><th>Date de relance</th><th>Âge</th>
              </tr></thead>
              <tbody>
                {[...leads.data.opportunitesSansAction]
                  .sort((a, b) => {
                    const ia = ETAPE_ORDER.indexOf(a.etat);
                    const ib = ETAPE_ORDER.indexOf(b.etat);
                    return (ia === -1 ? ETAPE_ORDER.length : ia) - (ib === -1 ? ETAPE_ORDER.length : ib);
                  })
                  .slice(0, 20)
                  .map(o => (
                    <tr key={o.itemId}>
                      <td><strong>{o.nom}</strong></td>
                      <td><Pill variant={ETAPE_PILL_VARIANT[o.etat] || 'gray'}>{o.etat}</Pill></td>
                      <td>{fmtDateRelance(o.dateRelance) || '—'}</td>
                      <td>{o.ageJours != null ? `${o.ageJours} j` : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        ) : (
          <NotConnected>chargement…</NotConnected>
        )}
      </Card>

      {/* ══ Ligne 5 — Segments : lecture stratégique ══ */}
      <SectionLabel>Performance par segment</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="CA par secteur d'activité">
          <NotConnected>aucune colonne secteur/activité sur le board Comptes Monday</NotConnected>
        </Card>
        {/* Sources de lead — colonne "Canaux d'acquisition" du board Leads */}
        <Card title="Performance par source de lead">
          {leads.error ? (
            <NotConnected>{leads.error}</NotConnected>
          ) : leads.data?.sources?.length > 0 ? (
            (() => {
              // Illisible sur mobile avec 9-10 sources détaillées en légende.
              // On ne garde que les 5 premières + "Autres" — le détail (%,
              // valeur) passe dans le tooltip au clic plutôt que d'être
              // affiché en permanence sur le graphe.
              const sorted = [...leads.data.sources].sort((a, b) => b.pct - a.pct);
              const top    = sorted.slice(0, 5);
              const reste  = sorted.slice(5);
              const autres = reste.length > 0 ? [{
                label: 'Autres',
                pct:   reste.reduce((s, r) => s + r.pct, 0),
                count: reste.reduce((s, r) => s + r.count, 0),
              }] : [];
              const shown  = [...top, ...autres];
              const colors = [...sourceColors.slice(0, top.length), ...(autres.length ? [AUTRES_SOURCE_COLOR] : [])];
              const countByLabel = Object.fromEntries(shown.map(s => [s.label, s.count]));

              return (
                <>
                  <DonutChart
                    variant="rose"
                    data={shown.map(s => s.pct)}
                    labels={shown.map(s => s.label)}
                    colors={colors}
                    height={210}
                    tooltip={(label, value) => `${label} : ${value}% (${countByLabel[label] ?? '—'})`}
                  />
                  <div className={styles.donutLegend}>
                    {shown.map((s, i) => (
                      <span key={s.label} className={styles.legItem}>
                        <span className={styles.legDot} style={{ background: colors[i] }} />{s.label}
                      </span>
                    ))}
                  </div>
                </>
              );
            })()
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}
        </Card>
      </div>

      {/* ══ Ligne 6 — Missions MA : part du tout en donut + chiffres exacts à côté ══ */}
      <SectionLabel badge="Monday — colonne Poste (profils)">Revenue par type de mission MA</SectionLabel>
      <Card title="Répartition du revenue par type de mission">
        {leads.error ? (
          <NotConnected>{leads.error}</NotConnected>
        ) : leads.data?.missions?.length > 0 ? (
          <div className={styles.missionSplit}>
            <div style={{ flex: '0 0 240px' }}>
              <DonutChart
                variant="half-rose"
                data={leads.data.missions.map(m => m.revenue)}
                labels={leads.data.missions.map(m => missionLabels[m.label] || m.label)}
                colors={missionColors}
                height={145}
                tooltip={(label, value, pct) => `${label} : ${fmt(value)} (${pct}%)`}
              />
            </div>
            <div className={styles.missionList}>
              {leads.data.missions.map((m, i) => (
                <div key={m.label} className={styles.missionCard}>
                  <div className={styles.missionName}>
                    <span className={styles.legDot} style={{ background: missionColors[i % missionColors.length], marginRight: 7 }} />
                    {missionLabels[m.label] || m.label}
                  </div>
                  <div>
                    <div className={styles.missionRev}>{fmt(m.revenue)} <span className={styles.missionPct}>· {m.pct}%</span></div>
                    <div className={styles.missionAvg}>Moy. {fmt(m.moyenne)} / profil · {m.count} profil(s)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <NotConnected>chargement…</NotConnected>
        )}
      </Card>

    </div>
  );
}
