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

/* Hauteur du graphe, libellés horaires compris. */
const HAUTEUR_GRAPHE = 266;

/* Les RDV, posés au-dessus de leur barre.

   Historique — ils ont d'abord été écrits à même les barres (« RDV : 3 », vert
   pâle sur bleu pâle), puis déplacés en bande sous l'axe pour régler trois
   défauts d'un coup : contraste clair-sur-clair, ligne de base mouvante, et un
   préfixe de 40 px qui percutait la tranche voisine sur écran étroit (retours
   de Jimmy, 18/08).

   Retour à la colonne (Clémence, 20/08) : sur écran large, la bande devenait
   une ligne très longue dont le libellé, écrit une seule fois tout à gauche,
   obligeait l'œil à revenir au début pour savoir ce qu'il lisait.
   Posé sur sa barre, le chiffre n'a plus besoin d'être nommé — sa position le
   rattache.

   Les défauts d'origine ne se reproduisent pas : le préfixe a disparu (le mot
   ne vit plus que dans la légende) et le chiffre s'écrit sur le fond blanc
   AU-DESSUS de la barre, non dessus. Reste la courbe des taux, qui traverse
   cette zone : un liseré blanc détoure le chiffre pour qu'il reste lisible
   quand elle passe derrière.

   Une tranche sans RDV reste vide : afficher « 0 » sur les tranches
   improductives remplirait le graphe de bruit. */
function makeRdvPlugin(rowsRef) {
  return {
    id: 'rdvSurBarre',
    /* Après les datasets : le chiffre doit passer PAR-DESSUS la courbe des
       taux, pas disparaître dessous. */
    afterDatasetsDraw(chart) {
      const rows = rowsRef.current;
      const { ctx, chartArea } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = 'bold 10px OverusedGrotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.fillStyle = 'rgba(46,107,79,0.95)';
      meta.data.forEach((bar, i) => {
        const rdv = rows[i]?.rdv;
        if (!rdv) return;
        /* Au-dessus du sommet de la barre. Si elle monte trop haut pour qu'il
           y tienne, on bascule juste sous le sommet plutôt que d'écrire hors
           du cadre. */
        const dessus = bar.y - 5;
        const y = dessus >= chartArea.top + 10 ? dessus : bar.y + 14;
        ctx.strokeText(String(rdv), bar.x, y);
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
  const rdvEchus  = rdvResult?.rdvEchus ?? null;
  const rdvAVenir = rdvResult?.rdvAVenir ?? '—';
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
    { label: 'Taux RDV honorés',         value: tauxHon,            unit: '', compare: cmpTauxHon, trend: { dir: 'neutral', text: rdvSrc }, color: 'purple', exactValue: rdvEchus != null ? `sur ${rdvEchus} rendez-vous déjà passés` : undefined },
    /* Placée APRÈS le taux, et non avant : elle explique l'écart entre les
       rendez-vous pris et le dénominateur du taux. Sans comparaison de
       période — un stock de rendez-vous à venir se lit à l'instant présent,
       le comparer au stock d'il y a un mois n'apprend rien. */
    { label: 'RDV à venir',              value: rdvAVenir,          unit: '', compare: null, trend: { dir: 'neutral', text: 'Créneau non encore arrivé, hors calcul du taux' }, color: 'green' },
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
        <div className={styles.kpiGrid7}>
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
                joursActifs: ring?.joursActifs ?? null,
                appelsParJour: ring?.appelsParJour ?? null,
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
                /* Repris de computeRDVData, jamais recalculé ici : le taux de
                   ligne doit être celui de l'en-tête, honorés échus rapportés
                   aux échus. L'ancien `partPct(rdvHonores, rdvPris)` divisait
                   par tous les rendez-vous pris et donnait donc un chiffre
                   différent de la carte, sans que rien ne le signale. */
                rdvEchus: rdvC?.rdvEchus ?? null,
                rdvAVenir: rdvC?.rdvAVenir ?? null,
                tauxRdvHonores: rdvC?.tauxHonores ?? null,
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
                <th onClick={() => toggleCollabSort('appelsParJour')} style={{ cursor: 'pointer' }}>Appels / jour{collabSortArrow('appelsParJour')}</th>
                <th onClick={() => toggleCollabSort('echanges1s')} style={{ cursor: 'pointer' }}>Échanges &gt; 1s{collabSortArrow('echanges1s')}</th>
                <th onClick={() => toggleCollabSort('echanges30s')} style={{ cursor: 'pointer' }}>Échanges &gt; 30s{collabSortArrow('echanges30s')}</th>
                <th onClick={() => toggleCollabSort('fichesExploitables')} style={{ cursor: 'pointer' }}>Échanges exploitables{collabSortArrow('fichesExploitables')}</th>
                <th onClick={() => toggleCollabSort('rdvPris')} style={{ cursor: 'pointer' }}>RDV pris{collabSortArrow('rdvPris')}</th>
                <th onClick={() => toggleCollabSort('rdvHonores')} style={{ cursor: 'pointer' }}>RDV honorés{collabSortArrow('rdvHonores')}</th>
                <th onClick={() => toggleCollabSort('tauxRdvHonores')} style={{ cursor: 'pointer' }}>Taux RDV honorés{collabSortArrow('tauxRdvHonores')}</th>
                <th onClick={() => toggleCollabSort('rdvAVenir')} style={{ cursor: 'pointer' }}>RDV à venir{collabSortArrow('rdvAVenir')}</th>
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
                      {/* Moyenne sur les seules journées travaillées. Le dénominateur
                          est rappelé au survol : sans lui, on ne peut pas savoir si
                          un écart vient de la cadence ou du nombre de jours. */}
                      <td className={styles.tdNum} title={row.joursActifs ? `${row.appels} appels sur ${row.joursActifs} jour${row.joursActifs > 1 ? 's' : ''} travaillé${row.joursActifs > 1 ? 's' : ''}` : undefined}>{row.appelsParJour != null ? row.appelsParJour.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}</td>
                      <td className={styles.tdNum} title={row.tauxLabel !== '—' ? `${row.tauxLabel} des appels émis` : undefined}><span className={styles.tauxPill} style={{ color: tauxColor }}>{fmtNumber(row.echanges1s) ?? '—'}</span></td>
                      <td className={styles.tdNum}>{fmtNumber(row.echanges30s) ?? '—'}</td>
                      <td className={styles.tdNum}>{fmtNumber(row.fichesExploitables) ?? '—'}</td>
                      <td className={styles.tdNum}><span className={styles.tauxPill} style={{ color: row.rdvPris != null ? 'var(--pos)' : undefined }}>{fmtNumber(row.rdvPris) ?? '—'}</span></td>
                      <td className={styles.tdNum}><span className={styles.tauxPill} style={{ color: row.rdvHonores != null ? 'var(--pos)' : undefined }}>{fmtNumber(row.rdvHonores) ?? '—'}</span></td>
                      <td className={styles.tdNum} title={row.rdvEchus != null ? `${row.rdvHonores} honoré${row.rdvHonores > 1 ? 's' : ''} sur ${row.rdvEchus} rendez-vous déjà passé${row.rdvEchus > 1 ? 's' : ''}` : undefined}><span className={styles.tauxPill} style={{ color: row.tauxRdvHonores != null ? 'var(--pos)' : undefined }}>{row.tauxRdvHonores != null ? fmtPourcentage(row.tauxRdvHonores) : '—'}</span></td>
                      <td className={styles.tdNum}>{fmtNumber(row.rdvAVenir) ?? '—'}</td>
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
      <Card title={`Taux d’échanges par tranche horaire${selectedCollab !== 'Tous' ? ` — ${selectedCollab}` : ''}`}>
        {hasData && trancheRows.length > 0 ? (
          <>
            <div className={styles.chartWrap} style={{ height: HAUTEUR_GRAPHE }}>
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
                    /* Second palier de l'entonnoir, même base que le premier
                       (part des appels émis) : les deux courbes se lisent donc
                       l'une sous l'autre sur le même axe. Trait plus fin et
                       points plus petits — c'est le > 1s qui reste la lecture
                       principale de la carte. */
                    {
                      type: 'line',
                      label: 'Taux d’échanges > 30s %',
                      data: trancheRows.map(r => r.appels > 0 ? r.echange30s : null),
                      borderColor: 'rgba(196,151,58,0.9)',
                      backgroundColor: 'rgba(196,151,58,0.04)',
                      pointBackgroundColor: 'rgba(196,151,58,0.9)',
                      tension: 0.35,
                      fill: false,
                      pointRadius: 3,
                      borderWidth: 1.5,
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
                  scales: {
                    x: { ticks: { ...tickStyle, font: { size: 9 }, maxRotation: 0 }, grid: gridStyle, border: borderCol },
                    y: { ticks: tickStyle, grid: gridStyle, border: borderCol, position: 'left', title: { display: true, text: 'Nb appels', color: 'rgba(167,173,170,0.4)', font: { size: 9 } } },
                    y2: { ticks: { ...tickStyle, callback: v => v + '%' }, grid: { display: false }, border: borderCol, position: 'right', min: 0, max: 100, title: { display: true, text: 'Taux d’échanges %', color: 'rgba(169,141,196,0.6)', font: { size: 9 } } },
                  },
                }}
              />
            </div>
            <div className={styles.legend}>
              <span className={styles.legDot} style={{ background: 'rgba(123,170,191,0.7)' }} />Appels émis
              <span className={styles.legDot} style={{ background: 'rgba(169,141,196,0.9)', marginLeft: 14 }} />Taux d’échanges &gt; 1s %
              <span className={styles.legDot} style={{ background: 'rgba(196,151,58,0.9)', marginLeft: 14 }} />Taux d’échanges &gt; 30s %
              <span className={styles.legDot} style={{ background: 'rgba(46,107,79,0.95)', marginLeft: 14 }} />RDV pris
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
