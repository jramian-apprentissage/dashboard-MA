import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import NotConnected from '../../../components/ui/NotConnected';
import NoPeriodData from '../../../components/ui/NoPeriodData';
import Loader, { LoaderMark } from '../../../components/ui/Loader';
import DonutChart from '../../../components/ui/DonutChart';
import MotifBar from '../../../components/ui/MotifBar';
import { usePeriod } from '../../../contexts/PeriodContext';
import { compareValueText } from '../../../utils/compareText';
import {fmtNumber, partPct, fmtPourcentage } from '../../../utils/formatNumber';
import { computeAsusEvolution, dernierJourArchive } from '../../../services/sheetsParser';
import styles from './Activite.module.css';

Chart.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(227,225,216,0.5)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };

const EVO_OPTIONS = [
  { key: 'jour',    label: 'Journalier' },
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois',    label: 'Mensuel' },
];

function fmtDuree(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/* Répartition d'une direction d'appels par qualification.
 *
 * Remplace l'alignement d'une dizaine de cartes chiffrées : « aligner une
 * dizaine de KPI appel sortant puis une dizaine appel entrant n'est pas une
 * bonne pratique — ce n'est pas assez visuel, on ne sait pas où regarder »
 * (retour de Clémence, 14/08).
 *
 * Une barre par qualification, longueur proportionnelle au volume, triée par
 * effectif décroissant : la plus longue dit où regarder. Le total reste le
 * seul chiffre mis en avant.
 *
 * Deux groupes séparés, et c'est le point important : ce que l'appel a produit
 * d'un côté, les appels sans interlocuteur de l'autre. Mélangés, répondeurs et
 * NRP prennent l'essentiel du volume et écrasent visuellement les ventes et
 * les rendez-vous, qui sont pourtant la raison d'être du dashboard. */
function QualifBreakdown({ stats, compareStats, comparePeriodKey, titre, entete = true }) {
  const total = stats.total;
  /* Un effectif non nul ne doit jamais s'afficher « 0 % » : « Ventes gagnées
     — 0 % — 2 » se contredit à la lecture (retour de Jimmy, 15/08). Sous 1 %,
     on garde une décimale ; au-dessus, l'entier suffit — écrire « 24,2 % » là
     où « 24 % » dit la même chose n'ajoute que du bruit. */
  const pct = n => partPct(n, total);

  // La comparaison passe au survol plutôt qu'en colonne : elle intéresse qui
  // la cherche, sans alourdir la lecture d'ensemble.
  const survol = (label, count) => {
    if (!compareStats) return undefined;
    const periode = comparePeriodKey === 'previous-year' ? "l'année précédente" : 'la période précédente';
    /* Aucun appel sur la période comparée : il n'y a pas de référence, donc
       pas de progression. Annoncer « +125 » alors que le point de départ
       n'existe pas est faux, et transforme un démarrage de mission en écart
       spectaculaire (retour de Clémence, 14/08 : les zéros affichés en
       période précédente ne mettent pas en valeur le travail des équipes). */
    if (!compareStats.total) return `${fmtNumber(count)} — aucune donnée sur ${periode}, pas de comparaison possible`;

    const ref = label === 'Sans tag'
      ? compareStats.sansTag
      : compareStats.parTag.find(x => x.label === label)?.count;
    if (ref === undefined || ref === null) return undefined;
    const ecart = count - ref;
    if (ecart === 0) return `${fmtNumber(count)} — inchangé vs ${periode}`;
    return `${fmtNumber(count)} — ${ecart > 0 ? '+' : ''}${fmtNumber(ecart)} vs ${periode} (${fmtNumber(ref)})`;
  };

  const lignes = [
    ...stats.parTag,
    { label: 'Sans tag', count: stats.sansTag, technique: true },
  ];
  /* Les qualifications commerciales restent affichées même à zéro : « Ventes
     gagnées — 0 » est un résultat, pas un vide. Les issues techniques à zéro
     sont en revanche masquées — qu'un collaborateur n'ait eu aucun répondeur n'apprend
     rien et remplissait la moitié de la modale de barres vides. */
  const groupes = [
    { nom: 'Qualifications commerciales',    items: lignes.filter(l => !l.technique),                couleur: 'var(--asus-blue)' },
    { nom: 'Sans qualification commerciale', items: lignes.filter(l => l.technique && l.count > 0),  couleur: 'rgba(167,173,170,0.9)' },
  ].filter(g => g.items.length > 0);

  return (
    <>
      {/* `entete={false}` dans la modale par collaborateur : le total y est déjà porté
          par l'en-tête du panneau, le répéter ici ferait doublon. */}
      {entete && (
        <div className={styles.cardHeadRow}>
          <span className={styles.subNote} style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12 }}>{titre}</span>
          <span style={{ fontWeight: 700, color: 'var(--asus-blue)', fontSize: 17, letterSpacing: '-0.02em' }}>{fmtNumber(total)}</span>
        </div>
      )}
      {groupes.map((g, i) => (
        <div key={g.nom} style={{ marginTop: !entete && i === 0 ? 0 : 20 }}>
          <div className={styles.qualifGroupTitle}>{g.nom}</div>
          {[...g.items].sort((a, b) => b.count - a.count).map(i => (
            <MotifBar
              key={i.label}
              label={i.label}
              pct={pct(i.count)}
              count={i.count}
              fillColor={g.couleur}
              title={survol(i.label, i.count)}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function ClickIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

/* Palette de la carte « Nombre total d'appels » — source unique du donut ET
   des pastilles de sa légende.

   Les deux divergeaient sur « Aboutis », et la cause n'était pas un décalage
   d'index : la couleur était écrite `var(--asus-blue)` des deux côtés. Le CSS
   de la légende la résout en #006CE1 ; le canvas du donut, lui, ne connaît pas
   les variables CSS. `ctx.fillStyle` ignore SILENCIEUSEMENT une valeur qu'il
   ne sait pas parser et conserve la précédente — le segment prenait donc la
   couleur de son voisin, sans le moindre avertissement.

   Règle qui en découle : tout ce qui part vers un graphique doit être un
   littéral, jamais un jeton CSS. */
const ASUS_SEGMENTS = {
  aboutis:    '#006CE1',                 // identique à var(--asus-blue)
  nonAboutis: 'rgba(167,173,170,0.5)',
  decroches:  'rgba(126,184,154,0.75)',
  manques:    'rgba(196,135,106,0.75)',
};

export default function ActiviteASUS({ selectedCollab = 'Tous', asusData, compareResult }) {
  const hasData = asusData?.hasData && asusData?.result;
  const r = asusData?.result;
  const { comparePeriodKey, referenceRange } = usePeriod();
  const [qualifOpen, setQualifOpen] = useState(null); // { collab, direction }
  const [evoGranularity, setEvoGranularity] = useState('jour');
  const [infoOpen, setInfoOpen] = useState(false);

  // Même principe que Activité Sales : le tout premier chargement affiche le
  // logo animé plutôt qu'une mosaïque de "Non connecté", pour ne pas donner
  // l'impression que c'est cassé le temps que l'archive arrive.
  const firstLoad = !hasData && asusData?.loading && !asusData?.error;
  // Connecté, données chargées, mais aucun appel sur la période choisie —
  // distinct d'un vrai problème de connexion (voir ActiviteSales.jsx).
  const isEmptyPeriod = hasData && r.totalAppels === 0;

  const perCollabEntries = hasData ? Object.entries(r.perCollab || {}) : [];
  const evolution = hasData ? computeAsusEvolution(asusData.rows || [], evoGranularity, selectedCollab, referenceRange.to) : null;
  const qualifStats = qualifOpen && r.perCollab?.[qualifOpen.collab]
    ? r.perCollab[qualifOpen.collab][qualifOpen.direction]
    : null;

  return (
    <Loader loading={firstLoad} label="Récupération de l'archive Ringover…" minHeight={380}>
      {() => (
    <>
    <div className={styles.page}>
      {/* Fraîcheur de l'archive — tout en haut, avant la première section. */}
      {asusData?.error && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(196,135,106,0.4)', background: 'rgba(196,135,106,0.08)' }}>
          <span style={{ color: 'var(--neg)' }}>⚠ Erreur :</span> {asusData.error}
        </div>
      )}
      {hasData && asusData.lastFetched && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(142,207,170,0.3)', background: 'rgba(142,207,170,0.06)' }}>
          <span style={{ color: 'var(--pos)' }}>● Données Ringover</span> — Mise à jour arrêtée au {dernierJourArchive(asusData.rows) || '—'}
          {selectedCollab !== 'Tous' && <span style={{ color: 'var(--text3)' }}> · filtre : {selectedCollab}</span>}
          {asusData.loading && <span className={styles.dataAlertSpin}><LoaderMark size={14} /></span>}
        </div>
      )}

      {isEmptyPeriod ? (
        <>
        <SectionLabel badge="RINGOVER">Activité commerciale ASUS</SectionLabel>
        <Card><NoPeriodData suggestion="Essayez le mois précédent, ou élargissez la période sélectionnée." /></Card>
        </>
      ) : (
      <>
      <SectionLabel badge="RINGOVER">Activité commerciale ASUS</SectionLabel>
      <Card>
        {hasData ? (
          <>
          <div className={styles.cardHeadRow}>
            <span className={styles.subNote} style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12 }}>Nombre total d'appels</span>
            <div
              className={styles.infoWrap}
              onMouseEnter={() => setInfoOpen(true)}
              onMouseLeave={() => setInfoOpen(false)}
            >
              <button type="button" className={styles.infoBtn} onClick={() => setInfoOpen(o => !o)} aria-label="Définitions Ringover">i</button>
              {infoOpen && (
                <div className={styles.infoTooltip}>
                  <p><strong>Aboutis</strong> : Pris par un collaborateur ou tombés sur la messagerie vocale.</p>
                  <p><strong>Non aboutis</strong> : Impossible de joindre le contact (raccroché avant de faire sonner chez le contact ou échec de la connexion).</p>
                  <p><strong>Décrochés</strong> : Pris par un collaborateur ou par un standard. Lorsque l'option « Considérer comme appel manqué » est désactivée dans votre standard, les appels sont comptabilisés comme décrochés. Les appels décrochés en interne ne sont pas comptabilisés.</p>
                  <p><strong>Manqués</strong> : Non pris par un collaborateur ou par un standard avec l'option « Considérer comme manqué » activée.</p>
                </div>
              )}
            </div>
          </div>
          <div className={styles.asusTotalWrap}>
            <div className={styles.asusTotalDonut}>
              <DonutChart
                variant="donut"
                data={[r.aboutis, r.nonAboutis, r.decroches, r.manques]}
                labels={['Aboutis (sortant)', 'Non aboutis (sortant)', 'Décrochés (entrant)', 'Manqués (entrant)']}
                colors={[ASUS_SEGMENTS.aboutis, ASUS_SEGMENTS.nonAboutis, ASUS_SEGMENTS.decroches, ASUS_SEGMENTS.manques]}
                height={150}
                centerValue={r.totalAppels}
                centerLabel="appels"
                tooltip={(label, value, pct) => `${label} : ${value} appels (${fmtPourcentage(pct)})`}
                showDataLabels={false}
              />
            </div>
            <div className={styles.asusTotalStats}>
              <div className={styles.asusTotalGroup}>
                <div className={styles.asusTotalGroupTitle}>Appels sortants</div>
                <div className={styles.asusTotalRow}>
                  <span className={styles.legDot} style={{ background: ASUS_SEGMENTS.aboutis }} />
                  Aboutis
                  <span className={styles.asusTotalRowVal}>{fmtNumber(r.aboutis)}</span>
                  <span className={styles.asusTotalRowPct}>{fmtPourcentage(partPct(r.aboutis, r.sortant.total))}</span>
                </div>
                <div className={styles.asusTotalRow}>
                  <span className={styles.legDot} style={{ background: ASUS_SEGMENTS.nonAboutis }} />
                  Non aboutis
                  <span className={styles.asusTotalRowVal}>{fmtNumber(r.nonAboutis)}</span>
                  <span className={styles.asusTotalRowPct}>{fmtPourcentage(partPct(r.nonAboutis, r.sortant.total))}</span>
                </div>
              </div>
              <div className={styles.asusTotalGroup}>
                <div className={styles.asusTotalGroupTitle}>Appels entrants</div>
                <div className={styles.asusTotalRow}>
                  <span className={styles.legDot} style={{ background: ASUS_SEGMENTS.decroches }} />
                  Décrochés
                  <span className={styles.asusTotalRowVal}>{fmtNumber(r.decroches)}</span>
                  <span className={styles.asusTotalRowPct}>{fmtPourcentage(partPct(r.decroches, r.entrant.total))}</span>
                </div>
                <div className={styles.asusTotalRow}>
                  <span className={styles.legDot} style={{ background: ASUS_SEGMENTS.manques }} />
                  Manqués
                  <span className={styles.asusTotalRowVal}>{fmtNumber(r.manques)}</span>
                  <span className={styles.asusTotalRowPct}>{fmtPourcentage(partPct(r.manques, r.entrant.total))}</span>
                </div>
              </div>
            </div>
          </div>
          </>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Évolution du nombre d'appels</SectionLabel>
      <Card>
        <div className={styles.cardHeadRow}>
          {/* « Nombre d'appels » seul laissait la question ouverte : entrants,
              sortants, ou les deux ? (retour de Clémence, 14/08).
              computeAsusEvolution ne filtre que par collaborateur et par date,
              c'est donc bien le total. */}
          <span className={styles.subNote} style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12 }}>Nombre total d&apos;appels — entrants et sortants</span>
          <div className={styles.evoToggle}>
            {EVO_OPTIONS.map(o => (
              <button
                key={o.key}
                type="button"
                className={`${styles.evoToggleBtn} ${evoGranularity === o.key ? `${styles.evoToggleBtnActive} ${styles.evoToggleBtnActiveAsus}` : ''}`}
                onClick={() => setEvoGranularity(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {hasData && evolution ? (
          <div className={styles.chartWrap} style={{ height: 220 }}>
            <Line
              data={{
                labels: evolution.labels,
                datasets: [{
                  label: 'Appels',
                  data: evolution.counts,
                  borderColor: 'rgba(0,108,225,0.85)',
                  backgroundColor: 'rgba(0,108,225,0.12)',
                  pointBackgroundColor: 'rgba(0,108,225,0.85)',
                  tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y',
                }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 700, easing: 'easeOutQuart' },
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} appel${ctx.parsed.y > 1 ? 's' : ''}` } },
                },
                scales: {
                  x: { ticks: tickStyle, grid: gridStyle, border: borderCol },
                  y: { ticks: tickStyle, grid: gridStyle, border: borderCol, beginAtZero: true, position: 'left' },
                },
              }}
            />
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Appels sortants</SectionLabel>
      <Card>
        {hasData ? (
          <QualifBreakdown
            stats={r.sortant}
            compareStats={compareResult?.sortant}
            comparePeriodKey={comparePeriodKey}
            titre="Total"
          />
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Appels entrants</SectionLabel>
      <Card>
        {hasData ? (
          <QualifBreakdown
            stats={r.entrant}
            compareStats={compareResult?.entrant}
            comparePeriodKey={comparePeriodKey}
            titre="Total"
          />
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      {/* Sigle développé partout : « TMC » n'était clair pour personne hors de
          l'équipe, et c'est un dashboard client (retour de Clémence, 14/08). */}
      <SectionLabel>Qualité des appels</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGridAuto}>
            <KPICard
              label="Temps moyen de communication"
              value={fmtDuree(r.dureeMoyenneS)}
              unit="min"
              compare={compareResult ? compareValueText(r.dureeMoyenneS, compareResult.dureeMoyenneS, comparePeriodKey) : null}
              trend={{ dir: 'neutral', text: `${fmtDuree(r.dureeMoyenneSortantS)} — appels sortants · ${fmtDuree(r.dureeMoyenneEntrantS)} — appels entrants` }}
              color="default"
            />
            <KPICard label="Bons appels (≥ 5 min)" value={r.bonsAppels} unit="" compare={compareResult ? compareValueText(r.bonsAppels, compareResult.bonsAppels, comparePeriodKey) : null} trend={{ dir: 'neutral', text: `${fmtPourcentage(r.tauxBons)} du total` }} color="default" />
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Statistiques par collaborateur</SectionLabel>
      {/* Sans titre de carte : « Détail des appels par collaborateur » répétait
          le libellé de section juste au-dessus (retour de Clémence, 14/08). */}
      <Card>
        {hasData && perCollabEntries.length > 0 ? (
          <table className={styles.perfTable}>
            <thead><tr>
              <th>Collaborateur</th>
              <th>Appels sortants</th>
              <th>Appels entrants</th>
              <th>Temps moyen de communication</th>
              <th>Bons appels (≥ 5 min)</th>
            </tr></thead>
            <tbody>
              {perCollabEntries.map(([name, c]) => (
                <tr key={name} className={name === selectedCollab ? styles.highlightRow : ''}>
                  <td className={styles.tdName}>{name}</td>
                  <td className={styles.tdNum}>
                    <button type="button" className={styles.clickableStat} onClick={() => setQualifOpen({ collab: name, direction: 'sortant' })}>
                      {fmtNumber(c.sortant.total)}<ClickIcon />
                    </button>
                  </td>
                  <td className={styles.tdNum}>
                    <button type="button" className={styles.clickableStat} onClick={() => setQualifOpen({ collab: name, direction: 'entrant' })}>
                      {fmtNumber(c.entrant.total)}<ClickIcon />
                    </button>
                  </td>
                  <td className={styles.tdNum}>{fmtDuree(c.dureeMoyenneS)}</td>
                  <td className={styles.tdNum}>{fmtNumber(c.bonsAppels)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
        {/* Mode d'emploi retiré : l'icône loupe sur chaque nombre dit déjà
            qu'on peut cliquer (retour de Clémence, 14/08). */}
      </Card>

      </>
      )}
    </div>

    {qualifOpen && qualifStats && (
      <div className={styles.qualifOverlay} onClick={() => setQualifOpen(null)}>
        <div className={`${styles.qualifPanel} ${styles.qualifPanelLarge}`} onClick={e => e.stopPropagation()}>
          <div className={styles.qualifHeader}>
            <div>
              <div className={styles.qualifTitle}>
                {qualifOpen.collab} — {qualifOpen.direction === 'sortant' ? 'Appels sortants' : 'Appels entrants'}
              </div>
              <div className={styles.qualifSub}>Répartition par qualification</div>
            </div>
            {/* Le total quitte la grille pour se poser ici : c'est la référence
                à laquelle toutes les barres se rapportent, pas un indicateur
                parmi d'autres (demande de Jimmy, 15/08). */}
            <div className={styles.qualifHeadRight}>
              <div className={styles.qualifTotalBloc}>
                <span className={styles.qualifTotalVal}>{fmtNumber(qualifStats.total)}</span>
                <span className={styles.qualifTotalUnit}>appels</span>
              </div>
              <button type="button" className={styles.qualifClose} onClick={() => setQualifOpen(null)}>✕</button>
            </div>
          </div>
          {/* Même répartition visuelle que les sections principales, plutôt
              qu'une grille de cartes chiffrées. Aucun comparatif ici : la
              période comparée n'est pas calculée par collaborateur. */}
          <QualifBreakdown stats={qualifStats} entete={false} />
        </div>
      </div>
    )}
    </>
      )}
    </Loader>
  );
}
