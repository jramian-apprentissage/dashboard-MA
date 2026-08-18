import { Bar, Line } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { useRef, useMemo, useState } from 'react';
import { useChartMount } from '../../../hooks/useChartMount';
import { usePeriod } from '../../../contexts/PeriodContext';
import { compareValueText, comparePtsText, compareZeroRefText } from '../../../utils/compareText';
import { fmtNumber, partPct, fmtPourcentage } from '../../../utils/formatNumber';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import MotifBar from '../../../components/ui/MotifBar';
import NotConnected from '../../../components/ui/NotConnected';
import NoPeriodData from '../../../components/ui/NoPeriodData';
import Loader, { LoaderMark } from '../../../components/ui/Loader';
import { TAG_CATEGORIES, dernierJourArchive } from '../../../services/sheetsParser';
import DonutChart from '../../../components/ui/DonutChart';
import FreshnessNote from '../../../components/FreshnessNote';
import styles from './Activite.module.css';

Chart.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler);

// Feuille Google "Meetings Bookés" — source des RDV affichés ici.
const RDV_SHEET_URL = import.meta.env.VITE_RDV_SHEET_URL || '';

const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(227,225,216,0.5)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };
const barAnim = { duration: 900, easing: 'easeOutQuart', delay: ctx => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 55 : 0 };
const lineAnim = { duration: 900, easing: 'easeOutQuart' };

/* Hauteur réservée sous l'axe pour la bande des RDV, et position du chiffre
   dans cette bande — sous les libellés horaires, pas dessus. */
const BANDE_RDV = 26;
const BANDE_RDV_Y = 11;
// Nommé une seule fois, dans la bande elle-même.
const LEGENDE_RDV = 'RDV pris';

/* Les RDV, en bande sous l'axe des heures.

   Ils étaient écrits DANS le plot, à même les barres : « RDV : 3 » en vert
   pâle sur des barres bleu pâle, à une hauteur qui changeait d'une tranche à
   l'autre — dedans si la barre était assez haute, au-dessus sinon. Trois
   défauts d'un coup : un contraste clair-sur-clair, une ligne de base
   mouvante que l'œil doit rattraper à chaque colonne, et un préfixe de 40 px
   qui entrait en collision avec la tranche voisine dès que l'écran
   rétrécissait. D'où « moyennement visible » (retour de Jimmy, 18/08).

   La bande règle les trois : ligne de base constante — l'œil sait où
   regarder et balaye la journée d'un passage —, plus aucune superposition
   avec les barres ni avec la courbe, et le mot « RDV » ne s'écrit plus qu'une
   fois, dans la légende. Reste le chiffre seul, 7 px au lieu de 40.

   On reste dans le canvas plutôt que de construire la bande en DOM : les
   positions X sont alors gratuites et exactes, puisqu'on réutilise celles que
   Chart.js a calculées pour les barres. Une bande en DOM demanderait de
   recalculer l'alignement depuis chartArea à chaque redimensionnement, et un
   décalage d'une demi-colonne mentirait sur l'heure au lieu d'être seulement
   pénible à lire.

   Une tranche sans RDV reste vide : afficher « 0 » sur les huit tranches
   improductives remplirait la bande de bruit. */
function makeRdvPlugin(rowsRef) {
  return {
    id: 'rdvSousAxe',
    afterDraw(chart) {
      const rows = rowsRef.current;
      const { ctx } = chart;
      /* On part du bas de l'ÉCHELLE X, pas de chartArea.bottom : les libellés
         horaires occupent précisément l'espace entre les deux, et un chiffre
         posé à un offset fixe depuis chartArea viendrait s'écrire dessus.
         `scales.x.bottom` tombe sous les libellés, quelle que soit leur
         hauteur — donc quelle que soit la police ou la densité de tranches. */
      const axeX = chart.scales?.x;
      if (!axeX) return;
      const y = axeX.bottom + BANDE_RDV_Y;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = 'bold 10px OverusedGrotesk, sans-serif';
      ctx.textBaseline = 'middle';
      // Vert nettement plus soutenu que l'ancien : sur le fond blanc de la
      // carte, le vert pâle d'origine était à la limite du lisible.
      ctx.fillStyle = 'rgba(46,107,79,0.95)';

      /* Le libellé vit DANS la bande, à gauche et sur la même ligne de base
         que les chiffres — pas dans la légende sous le graphe. Posé là, il
         nomme la ligne qu'on est en train de lire au lieu d'obliger l'œil à
         descendre chercher à quoi ces nombres se rapportent (demande de
         Jimmy, 18/08). Même vert que les chiffres : c'est ce qui fait le lien.

         Il se loge dans la gouttière de l'axe des ordonnées, à gauche de la
         zone de tracé. On ne l'écrit que s'il y tient : sur une carte étroite,
         mieux vaut pas de libellé qu'un libellé chevauchant les graduations. */
      const gouttiere = chart.chartArea.left;
      if (ctx.measureText(LEGENDE_RDV).width + 4 <= gouttiere) {
        ctx.textAlign = 'left';
        ctx.fillText(LEGENDE_RDV, 2, y);
      }

      ctx.textAlign = 'center';
      meta.data.forEach((bar, i) => {
        const rdv = rows[i]?.rdv;
        if (!rdv) return;
        ctx.fillText(String(rdv), bar.x, y);
      });
      ctx.restore();
    },
  };
}

// Tri du tableau "Principaux leviers" — même principe que la table "À
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
function buildKPIs(result, rdvResult, compareResult, compareRdvResult, comparePeriodKey) {
  /* `decroches` et `argues` ne sont plus des cartes : le décroché est
     désormais porté par « Échanges > 1s » — un appel décroché dont la
     conversation dépasse la seconde — et « Appels argumentés » a fusionné
     avec « Fiches exploitables » en « Échanges exploitables ». Les deux
     restent calculés dans computeSalesData, où le tableau par collaborateur
     les consomme. */
  const { total, echanges1s, echanges30s, fichesExploitables } = result;
  /* Les taux de décroché, d'échanges > 30 s et de fiches exploitables ne sont
     plus calculés ici : ces paliers s'affichent en volume. La part relative
     reste lisible dans le tableau par collaborateur, où elle sert à comparer
     des agents entre eux — c'est là qu'un pourcentage a du sens. */
  /* Part relative de chaque palier, affichée au survol de la carte via le
     mécanisme d'infobulle de KPICard — la carte ne porte que le volume. */
  const part = (n, base, nomBase) => (base > 0 ? `${fmtPourcentage(partPct(n, base))} ${nomBase}` : undefined);

  const rdvPris    = rdvResult?.rdvPris ?? '—';
  const rdvHonores = rdvResult?.rdvHonores ?? '—';
  const tauxHon = rdvResult ? fmtPourcentage(rdvResult.tauxHonores) : '—';
  // Source des RDV : la feuille Google "Meetings Bookés". L'URL vit dans
  // VITE_RDV_SHEET_URL et non en dur — le backend, lui, ne connaît que
  // l'Apps Script qui l'expose en CSV, pas l'adresse de la feuille. Sans
  // l'URL configurée, on affiche le libellé sans lien plutôt qu'un lien mort.
  const rdvSrc = !rdvResult
    ? 'Fichier RDV non chargé'
    : (RDV_SHEET_URL ? (
        <a
          href={RDV_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sourceLink}
          // La carte entière est cliquable sur mobile (retournement) — sans
          // ça, ouvrir le lien déclencherait aussi le flip derrière.
          onClick={e => e.stopPropagation()}
        >
          Source : Google Sheet « Meetings Bookés »
        </a>
      ) : 'Source : Google Sheet « Meetings Bookés »');

  const cmp = compareResult;
  // Le total de la période comparée peut être à 0 (aucun appel) — un vrai
  // résultat, pas une donnée manquante : comparePtsText doit recevoir un
  // taux "0" explicite dans ce cas, jamais null (qui signifierait "pas
  // encore chargé" pour KPICard et masquerait la ligne à tort).
  /* Les comparaisons en points ont disparu avec les cartes de taux : décroché,
     échanges > 30 s et fiches exploitables s'affichent désormais en volume et
     se comparent donc en volume, comme les autres paliers. */
  const nbCollabActifs = Object.values(result.perCollab || {}).filter(c => (c.appels || 0) > 0).length;

  // Comparatif RDV — même logique : 0 RDV sur la période comparée est un
  // résultat explicite, pas une absence de donnée. Reste null tant que
  // rdvResult (valeur courante) ou compareRdvResult (référence) n'est pas
  // encore arrivé, pour que KPICard affiche "Calcul en cours…" à ce moment-là.
  const cmpRdv = !rdvResult ? null : (compareRdvResult
    ? (compareRdvResult.rdvPris > 0
        ? compareValueText(rdvResult.rdvPris, compareRdvResult.rdvPris, comparePeriodKey)
        : compareZeroRefText(comparePeriodKey))
    : null);
  const cmpRdvHonores = !rdvResult ? null : (compareRdvResult
    ? (compareRdvResult.rdvHonores > 0
        ? compareValueText(rdvResult.rdvHonores, compareRdvResult.rdvHonores, comparePeriodKey)
        : compareZeroRefText(comparePeriodKey))
    : null);
  const cmpTauxHon = !rdvResult ? null : (compareRdvResult
    ? (compareRdvResult.rdvPris > 0
        ? comparePtsText(rdvResult.tauxHonores, compareRdvResult.tauxHonores, comparePeriodKey)
        : compareZeroRefText(comparePeriodKey))
    : null);

  /* Entonnoir Sales, strictement calqué sur celui du TLM (Jimmy, 15/08) :
     appels émis, échanges > 1 s, échanges > 30 s, échanges exploitables,
     rendez-vous pris, rendez-vous honorés, puis le taux d'honoration en
     dernier — le seul taux de la rangée.

     « Appels argumentés » et « Fiches exploitables » fusionnent en un unique
     palier « Échanges exploitables » : le prospect a écouté le pitch, qu'il
     ait dit oui, non, ou qu'il ait donné l'information par mail
     (OK + PI + CNA - Mail). Deux cartes pour deux nuances du même fait
     coupaient l'entonnoir en deux sans rien apprendre. */
  return [
    { label: 'Appels émis',              value: total,              unit: '', compare: cmp ? compareValueText(total, cmp.total, comparePeriodKey) : null, trend: { dir: 'neutral', text: `${nbCollabActifs} collaborateur${nbCollabActifs > 1 ? 's' : ''} actif${nbCollabActifs > 1 ? 's' : ''}` }, color: 'blue' },
    { label: 'Échanges > 1s',            value: echanges1s,         unit: '', compare: cmp ? compareValueText(echanges1s, cmp.echanges1s, comparePeriodKey) : null, trend: { dir: 'neutral', text: 'Conversation de plus d’une seconde, hors sonnerie' }, exactValue: part(echanges1s, total, 'des appels émis') },
    { label: 'Échanges > 30s',           value: echanges30s,        unit: '', compare: cmp ? compareValueText(echanges30s, cmp.echanges30s, comparePeriodKey) : null, trend: { dir: 'neutral', text: 'Conversation de plus de 30 secondes, hors sonnerie' }, exactValue: part(echanges30s, echanges1s, 'des échanges > 1s') },
    { label: 'Échanges exploitables',    value: fichesExploitables, unit: '', compare: cmp ? compareValueText(fichesExploitables, cmp.fichesExploitables, comparePeriodKey) : null, trend: { dir: 'neutral', text: 'Conversation ayant apporté des informations sur l’entreprise' }, color: 'amber', exactValue: part(fichesExploitables, echanges30s, 'des échanges > 30s') },
    { label: 'RDV pris',                 value: rdvPris,            unit: '', compare: cmpRdv,     trend: { dir: 'neutral', text: rdvSrc }, color: 'green' },
    { label: 'RDV honorés',              value: rdvHonores,         unit: '', compare: cmpRdvHonores, trend: { dir: 'neutral', text: rdvSrc }, color: 'green' },
    { label: 'Taux RDV honorés',         value: tauxHon,            unit: '', compare: cmpTauxHon, trend: { dir: 'neutral', text: rdvSrc }, color: 'purple' },
  ];

}

export default function ActiviteSales({ selectedCollab = 'Tous', salesData, compareResult = null, compareRdvResult = null }) {
  const mounted = useChartMount();
  const hasData = salesData?.hasData && salesData?.result;
  const rdvResult = salesData?.rdvResult ?? null;
  const rdvEvolution = salesData?.rdvEvolution ?? null;
  const callsEvolution = salesData?.callsEvolution ?? null;
  const { comparePeriodKey } = usePeriod();
  const [collabSort, setCollabSort] = useState({ col: 'nom', dir: 'asc' });

  function toggleCollabSort(col) {
    setCollabSort(s => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  }
  function collabSortArrow(col) {
    return collabSort.col === col ? (collabSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  }

  const kpis = hasData ? buildKPIs(salesData.result, rdvResult, compareResult, compareRdvResult, comparePeriodKey) : null;
  // Connecté, données chargées, mais aucun appel sur la période choisie
  // (ex. mois en cours tout juste commencé) — distinct d'un vrai problème
  // de connexion : un seul message clair plutôt qu'une mosaïque de cartes
  // "Non connecté" en dessous.
  const isEmptyPeriod = hasData && salesData.result.total === 0;
  /* RDV par tranche horaire : le fichier « Meetings Bookés », pas le tag
     Ringover « OK ».

     C'était l'inverse jusqu'ici, et c'était un choix défendable tant que les
     commerciaux taguaient. Ils ne taguent plus : sur juillet 2026, 40 appels
     tagués sur 3 810 (1 %), et aucun de catégorie OK. L'annotation dessinait
     donc « RDV : 0 » dans ses onze barres pendant que la carte en haut de la
     même page affichait « RDV pris : 10 ». Une page qui se contredit vaut
     moins qu'une page qui dépend d'une source externe.

     Le fichier RDV est de toute façon déjà la source des cartes « RDV pris »
     et « RDV honorés » : le graphe en devient une décomposition exacte, au
     lieu d'une seconde mesure du même mot. */
  const trancheRows = useMemo(() => {
    const base = hasData ? salesData.result.tranches : [];
    const parHeure = rdvResult?.byHour;
    if (!parHeure) return base;
    const parHeureCollab = rdvResult.byHourCollab || {};
    return base.map(r => ({
      ...r,
      rdv: parHeure[r.t] || 0,
      agents: r.agents.map(a => ({ ...a, rdv: parHeureCollab[r.t]?.[a.nom] || 0 })),
    }));
  }, [hasData, salesData?.result, rdvResult]);

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

      {isEmptyPeriod ? (
        <Card><NoPeriodData suggestion="Essayez le mois précédent, ou élargissez la période sélectionnée." /></Card>
      ) : (
      <>
      {kpis ? (
        <div className={styles.kpiGrid6}>
          {kpis.map(k => <KPICard key={k.label} {...k} />)}
        </div>
      ) : (
        <Card><NotConnected>{salesData?.error ? 'échec du chargement, voir erreur ci-dessus' : 'en attente de l\'archive Ringover'}</NotConnected></Card>
      )}

      <SectionLabel>Performance commerciale des agents</SectionLabel>
      <Card title="Principaux leviers">
        {hasData && salesData.result.collabs ? (() => {
          const rows = salesData.result.collabs
            .filter(c => c !== 'Tous')
            .filter(name => (salesData.result.perCollab?.[name]?.appels ?? 0) > 0)
            .map(name => {
              const rdvC = rdvResult?.perCollab?.[name];
              const ring = salesData.result.perCollab?.[name];
              const tauxN = parseInt(ring?.taux);
              const rdvPris = rdvC?.rdvPris ?? null;
              const rdvHonores = rdvC?.rdvHonores ?? null;
              return {
                nom: name,
                appels: ring?.appels ?? null,
                echanges1s: ring?.echanges1s ?? null,
                echanges30s: ring?.echanges30s ?? null,
                tauxDecroche: isNaN(tauxN) ? null : tauxN,
                tauxLabel: ring?.taux ?? '—',
                tauxEchange30s: ring?.tauxEchange30s ?? null,
                argues: ring?.argues ?? null,
                fichesExploitables: ring?.fichesExploitables ?? null,
                tauxFichesExploit: ring?.tauxFichesExploit ?? null,
                rdvPris,
                rdvHonores,
                tauxRdvHonores: rdvPris > 0 ? partPct(rdvHonores, rdvPris) : null,
              };
            })
            .sort((a, b) => compareCollabRows(a, b, collabSort));

          return (
            <table className={styles.perfTable}>
              <thead><tr>
                <th onClick={() => toggleCollabSort('nom')} style={{ cursor: 'pointer' }}>Collaborateur{collabSortArrow('nom')}</th>
                <th onClick={() => toggleCollabSort('appels')} style={{ cursor: 'pointer' }}>Appels émis{collabSortArrow('appels')}</th>
                {/* Exactement les paliers des cartes d'en-tête, en volumes et
                    dans le même ordre : c'est le jeu d'indicateurs qu'on
                    reprend pour tous les tableaux par collaborateur (Jimmy,
                    15/08). Le taux de décroché reste porté par la pastille de
                    couleur, qui situe l'agent d'un coup d'œil. */}
                <th onClick={() => toggleCollabSort('echanges1s')} style={{ cursor: 'pointer' }}>Échanges &gt; 1s{collabSortArrow('echanges1s')}</th>
                <th onClick={() => toggleCollabSort('echanges30s')} style={{ cursor: 'pointer' }}>Échanges &gt; 30s{collabSortArrow('echanges30s')}</th>
                <th onClick={() => toggleCollabSort('fichesExploitables')} style={{ cursor: 'pointer' }}>Échanges exploitables{collabSortArrow('fichesExploitables')}</th>
                <th onClick={() => toggleCollabSort('rdvPris')} style={{ cursor: 'pointer' }}>RDV pris{collabSortArrow('rdvPris')}</th>
                <th onClick={() => toggleCollabSort('rdvHonores')} style={{ cursor: 'pointer' }}>RDV honorés{collabSortArrow('rdvHonores')}</th>
                <th onClick={() => toggleCollabSort('tauxRdvHonores')} style={{ cursor: 'pointer' }}>Taux RDV honorés{collabSortArrow('tauxRdvHonores')}</th>
              </tr></thead>
              <tbody>
                {rows.map(row => {
                  /* Seuils recalibrés sur la nouvelle métrique. Les anciens
                     (35 % bon, 25 % moyen) visaient le taux d'appels de plus
                     de 30 secondes ; le décroché se situe entre 59 % et 92 %
                     selon les collaborateurs, médiane 85 %. Tout le monde
                     serait vert avec l'ancien barème. */
                  const tauxColor = row.tauxDecroche == null ? undefined : row.tauxDecroche >= 85 ? 'var(--pos)' : row.tauxDecroche >= 70 ? 'var(--warn)' : 'var(--neg)';
                  return (
                    <tr key={row.nom} className={row.nom === selectedCollab ? styles.highlightRow : ''}>
                      <td className={styles.tdName}>{row.nom}</td>
                      <td className={styles.tdNum}>{fmtNumber(row.appels) ?? '—'}</td>
                      <td className={styles.tdNum} title={row.tauxLabel !== '—' ? `${row.tauxLabel} des appels émis` : undefined}><span className={styles.tauxPill} style={{ color: tauxColor }}>{fmtNumber(row.echanges1s) ?? '—'}</span></td>
                      <td className={styles.tdNum}>{fmtNumber(row.echanges30s) ?? '—'}</td>
                      <td className={styles.tdNum}>{fmtNumber(row.fichesExploitables) ?? '—'}</td>
                      <td className={styles.tdNum} style={{ color: row.rdvPris != null ? 'var(--pos)' : undefined }}>{fmtNumber(row.rdvPris) ?? '—'}</td>
                      <td className={styles.tdNum} style={{ color: row.rdvHonores != null ? 'var(--pos)' : undefined }}>{fmtNumber(row.rdvHonores) ?? '—'}</td>
                      <td className={styles.tdNum} style={{ color: row.tauxRdvHonores != null ? 'var(--pos)' : undefined }}>{row.tauxRdvHonores != null ? fmtPourcentage(row.tauxRdvHonores) : '—'}</td>
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
      <Card title={`Taux d’échanges > 1s par tranche horaire${selectedCollab !== 'Tous' ? ` — ${selectedCollab}` : ''}`}>
        {hasData && trancheRows.length > 0 ? (
          <>
            <div className={styles.chartWrap} style={{ height: 240 + BANDE_RDV }}>
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
                      label: 'Taux d’échanges > 1s %',
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
                        label: ctx => ctx.dataset.label === 'Taux d’échanges > 1s %'
                          ? `${ctx.dataset.label}: ${fmtPourcentage(ctx.parsed.y)}`
                          : `${ctx.dataset.label}: ${ctx.parsed.y} appels`,
                        /* Détail par agent de la tranche survolée (demande de
                           Christophe, 14/08). Un creux de joignabilité à 14h
                           ne se pilote pas tant qu'on ignore s'il vient de
                           toute l'équipe ou d'une seule personne absente.

                           N'apparaît que sur la vue Équipe : filtré sur un
                           collaborateur, la ventilation n'aurait qu'une ligne,
                           déjà lisible dans le titre de la carte. */
                        afterBody: ctx => {
                          if (selectedCollab !== 'Tous') return [];
                          const agents = trancheRows[ctx[0].dataIndex]?.agents || [];
                          if (agents.length < 2) return [];
                          // Au-delà de 6 agents l'infobulle dépasse la carte.
                          const visibles = agents.slice(0, 6);
                          const reste = agents.length - visibles.length;
                          return [
                            '',
                            ...visibles.map(a =>
                              `${a.nom} — ${a.appels} appel${a.appels > 1 ? 's' : ''}, ${a.join}%${a.rdv ? `, ${a.rdv} RDV` : ''}`),
                            ...(reste > 0 ? [`+ ${reste} autre${reste > 1 ? 's' : ''}`] : []),
                          ];
                        },
                      },
                    },
                  },
                  // Espace réservé sous l'axe pour la bande des RDV : sans
                  // lui, le plugin dessinerait hors du canvas visible.
                  layout: { padding: { bottom: BANDE_RDV } },
                  scales: {
                    x: { ticks: { ...tickStyle, font: { size: 9 }, maxRotation: 0 }, grid: gridStyle, border: borderCol },
                    y: { ticks: tickStyle, grid: gridStyle, border: borderCol, position: 'left', title: { display: true, text: 'Nb appels', color: 'rgba(167,173,170,0.4)', font: { size: 9 } } },
                    y2: { ticks: { ...tickStyle, callback: v => v + '%' }, grid: { display: false }, border: borderCol, position: 'right', min: 0, max: 100, title: { display: true, text: 'Taux d’échanges > 1s %', color: 'rgba(169,141,196,0.6)', font: { size: 9 } } },
                  },
                }}
              />
            </div>
            <div className={styles.legend}>
              <span className={styles.legDot} style={{ background: 'rgba(123,170,191,0.7)' }} />Appels émis
              <span className={styles.legDot} style={{ background: 'rgba(169,141,196,0.9)', marginLeft: 14 }} />Taux d’échanges &gt; 1s %
            </div>
          </>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <div className={styles.twoCol}>
        {/* Répartition par qualification — c'est le widget que l'équipe appelle
            "Détails des appels" au quotidien, mais le nom exact est repris par
            la section elle-même juste au-dessus (elle couvre aussi le taux de
            décroché et les motifs) : éviter le doublon section/widget. */}
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
                tooltip={(label, value, pct) => `${label} : ${value} appels (${fmtPourcentage(pct)})`}
              />
              <div className={styles.legend} style={{ justifyContent: 'center' }}>
                {salesData.result.categStats.map(c => (
                  <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span className={styles.legDot} style={{ background: c.color }} />{c.label} {fmtPourcentage(c.pct)}
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
                        <span className={styles.tagPct}>{fmtPourcentage(t.pct)}</span>
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
      <Card title="Appels émis & RDV pris">
        {rdvEvolution && callsEvolution ? (
          <>
            <div className={styles.chartWrap} style={{ height: 200 }}>
              <Line
                data={{
                  labels: callsEvolution.labels,
                  datasets: [
                    {
                      label: 'Appels émis',
                      data: callsEvolution.counts,
                      borderColor: 'rgba(38,0,31,0.8)', backgroundColor: 'rgba(255,249,147,0.18)', pointBackgroundColor: 'rgba(38,0,31,0.8)',
                      tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y',
                    },
                    {
                      label: 'RDV pris',
                      data: rdvEvolution.counts,
                      borderColor: '#7EB89A', backgroundColor: 'rgba(126,184,154,0.04)', pointBackgroundColor: '#7EB89A',
                      tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y1',
                    },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  animation: lineAnim,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label} : ${ctx.parsed.y}` } },
                  },
                  // Axes masqués (2 échelles indépendantes : "Appels émis" est
                  // bien plus grand que "RDV pris", même principe que le
                  // graphe équivalent de l'onglet TLM).
                  scales: {
                    x:  { ticks: { ...tickStyle, font: { size: 9 }, maxRotation: 0 }, grid: { display: false }, border: { display: false } },
                    y:  { display: false, beginAtZero: true, position: 'left' },
                    y1: { display: false, beginAtZero: true, position: 'right' },
                  },
                }}
              />
            </div>
            <div className={styles.legend}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className={styles.legDot} style={{ background: 'rgba(38,0,31,0.8)' }} />Appels émis
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className={styles.legDot} style={{ background: '#7EB89A' }} />RDV pris (fichier RDV)
              </span>
              <span className={styles.subNote}> — sur 6 mois</span>
            </div>
          </>
        ) : (
          <NotConnected>fichier RDV non chargé ou sans historique mensuel</NotConnected>
        )}
      </Card>
      </>
      )}

      <FreshnessNote source="Données Ringover" date={dernierJourArchive(salesData.rows)} loading={salesData.loading} />
    </div>
      )}
    </Loader>
  );
}
