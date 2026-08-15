import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import MotifBar from '../../../components/ui/MotifBar';
import DonutChart from '../../../components/ui/DonutChart';
import Loader, { LoaderMark } from '../../../components/ui/Loader';
import NotConnected from '../../../components/ui/NotConnected';
import NoPeriodData from '../../../components/ui/NoPeriodData';
import { usePeriod } from '../../../contexts/PeriodContext';
import { getPeriodRange } from '../../../components/ui/PeriodPicker';
import { fetchAPI } from '../../../services/api';
import { compareValueText, comparePtsText, compareZeroRefText } from '../../../utils/compareText';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from './Activite.module.css';

Chart.register(LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler);

const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(227,225,216,0.5)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };
const lineAnim = { duration: 900, easing: 'easeOutQuart' };

// Couleurs des 5 catégories réelles du "Statut des appels" (partition
// mutuellement exclusive des tags CloudTalk, voir migration 020/021).
const STATUT_COLORS = {
  argumente:      'rgba(142,207,170,0.8)',
  nonArgumente:   'rgba(196,135,106,0.55)',
  nonExploitable: 'rgba(196,135,106,0.85)',
  injoignable:    'rgba(167,173,170,0.5)',
  sansTags:       'rgba(123,170,191,0.5)',
};

function trend(text) {
  return { dir: 'neutral', text };
}

// Tri du tableau "Performance des agents" — colonne + sens cliquables,
// même pattern que le tableau de relances (FocusCommercial).
function compareAgentRows(a, b, sort) {
  let cmp;
  if (sort.col === 'agent_label') {
    cmp = (a.agent_label || '').localeCompare(b.agent_label || '', 'fr');
  } else {
    cmp = (a[sort.col] ?? 0) - (b[sort.col] ?? 0);
  }
  return sort.dir === 'asc' ? cmp : -cmp;
}

function formatJourMois(isoDate) {
  if (!isoDate) return '—';
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

const EVO_OPTIONS = [
  { key: 'jour',    label: 'Journalier' },
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois',    label: 'Mensuel' },
];

function mondayOf(d) {
  const day = d.getDay(); // 0=dim..6=sam
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

/* Reconstruit les fenêtres jour/semaine/mois à partir d'une série
   journalière déjà agrégée côté serveur (contrairement à computeAsusEvolution,
   qui compte des lignes d'appels brutes — CloudTalk n'expose que des totaux
   déjà quotidiens, donc on somme ces totaux par fenêtre plutôt que de
   compter des lignes). `field` sélectionne la colonne à agréger ('appels' ou
   'fiches') — même fenêtrage réutilisé par les deux graphes à bascule. */
function computeEvolution(dailyRows, granularity, field) {
  const byDate = new Map(dailyRows.map(r => [r.date, r[field]]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function sumRange(start, end) {
    let sum = 0;
    for (const [dateStr, n] of byDate) {
      const d = new Date(`${dateStr}T00:00:00`);
      if (d >= start && d <= end) sum += n;
    }
    return sum;
  }

  if (granularity === 'semaine') {
    const monday = mondayOf(today);
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(monday); start.setDate(start.getDate() - i * 7);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      weeks.push({ start, end });
    }
    return {
      labels: weeks.map(w => `${String(w.start.getDate()).padStart(2, '0')}/${String(w.start.getMonth() + 1).padStart(2, '0')}`),
      counts: weeks.map(w => sumRange(w.start, w.end)),
    };
  }

  if (granularity === 'mois') {
    const months = [];
    for (let i = 5; i >= 0; i--) months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
    return {
      labels: months.map(m => m.toLocaleString('fr-FR', { month: 'short' })),
      counts: months.map(m => sumRange(m, new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59))),
    };
  }

  // 'jour' (défaut) — 7 derniers jours
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(d); }
  return {
    labels: days.map(d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`),
    counts: days.map(d => byDate.get(d.toISOString().slice(0, 10)) || 0),
  };
}

export default function ActiviteTLM({ selectedCollab = 'Tous', onCollabsChange } = {}) {
  const { periodKey, customFrom, customTo, compareActive, compareRange, comparePeriodKey } = usePeriod();
  const [summary, setSummary] = useState(null);
  const [compareSummary, setCompareSummary] = useState(null);
  const [agents, setAgents] = useState([]);
  const [compareAgents, setCompareAgents] = useState([]);
  // Distingue "pas encore chargé" de "chargé, agent absent de la période
  // comparée" (agents-summary n'inclut que les agents ayant émis ≥1 appel —
  // un agent absent après chargement a bien fait 0 appel, pas "en attente").
  const [compareAgentsLoaded, setCompareAgentsLoaded] = useState(false);
  const [appelsQuotidiens, setAppelsQuotidiens] = useState([]);
  const [evoGranularity, setEvoGranularity] = useState('jour');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentSort, setAgentSort] = useState({ col: 'appels_emis', dir: 'desc' });

  function toggleAgentSort(col) {
    setAgentSort(s => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: col === 'agent_label' ? 'asc' : 'desc' }));
  }
  function agentSortArrow(col) {
    return agentSort.col === col ? (agentSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  }

  useEffect(() => {
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
    setLoading(true);
    setError(null);
    fetchAPI(`/cloudtalk/summary?from=${from}&to=${to}`)
      .then(setSummary)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    fetchAPI(`/cloudtalk/agents-summary?from=${from}&to=${to}`)
      .then(setAgents)
      .catch(() => setAgents([]));
  }, [periodKey, customFrom, customTo]);

  useEffect(() => {
    if (!compareActive || !compareRange) { setCompareSummary(null); setCompareAgents([]); setCompareAgentsLoaded(false); return; }
    setCompareAgentsLoaded(false);
    fetchAPI(`/cloudtalk/summary?from=${compareRange.from}&to=${compareRange.to}`)
      .then(setCompareSummary)
      .catch(() => setCompareSummary(null));
    fetchAPI(`/cloudtalk/agents-summary?from=${compareRange.from}&to=${compareRange.to}`)
      .then(setCompareAgents)
      .catch(() => setCompareAgents([]))
      .finally(() => setCompareAgentsLoaded(true));
  }, [compareActive, compareRange]);

  useEffect(() => {
    const agentParam = selectedCollab && selectedCollab !== 'Tous' ? `&agent=${encodeURIComponent(selectedCollab)}` : '';
    fetchAPI(`/cloudtalk/appels-quotidiens?jours=200${agentParam}`).then(setAppelsQuotidiens).catch(() => {});
  }, [selectedCollab]);

  // Remonte la liste des agents réels au parent (index.jsx), qui alimente le
  // sélecteur "Filtrer par collaborateur" partagé avec l'onglet Sales.
  useEffect(() => {
    if (agents.length) onCollabsChange?.(['Tous', ...agents.map(a => a.agent_label)]);
  }, [agents]); // eslint-disable-line

  const appelsEvolution = computeEvolution(appelsQuotidiens, evoGranularity, 'appels');
  const fichesEvolution = computeEvolution(appelsQuotidiens, evoGranularity, 'fiches');

  const hasData = !!summary;
  const firstLoad = loading && !summary && !error;
  // Connecté, données chargées, mais aucun appel sur la période choisie
  // (indépendant du filtre agent — un agent précis à 0 appel n'est pas la
  // même situation) — voir ActiviteSales.jsx.
  const isEmptyPeriod = hasData && (summary?.appels_emis ?? 0) === 0;

  // Un agent précis est sélectionné : les indicateurs qui n'ont pas
  // d'équivalent par agent (motifs, statuts, leads à recycler, évolution
  // quotidienne) deviennent indisponibles — CloudTalk ne renvoie ces
  // décompositions qu'au niveau global, pas par ligne/agent.
  const isFilteredToAgent = !!selectedCollab && selectedCollab !== 'Tous';
  const agentRow        = isFilteredToAgent ? agents.find(a => a.agent_label === selectedCollab) : null;
  const compareAgentRow = isFilteredToAgent ? compareAgents.find(a => a.agent_label === selectedCollab) : null;

  const appelsEmis        = isFilteredToAgent ? (agentRow?.appels_emis ?? 0)          : (summary?.appels_emis ?? 0);
  // `contacts_joints` / `leads_decroches` ne sont plus lus : mesure issue des
  // tags, sous-comptée au point d'être inférieure aux échanges de plus de 30
  // secondes qu'elle est censée contenir (voir la liste des KPIs plus bas).
  const decroches30s      = isFilteredToAgent ? (agentRow?.appels_decroches_30s ?? 0)  : (summary?.appels_decroches_30s ?? 0);
  /* Décroché réel (durée > 1 s). Reste `null` tant que n8n n'agrège pas ce
     seuil — surtout pas 0, qui se lirait « aucun décroché ». Le palier
     s'ajoute alors tout seul à l'entonnoir, sans autre intervention. */
  const decroches1s       = isFilteredToAgent ? (agentRow?.appels_decroches_1s ?? null) : (summary?.appels_decroches_1s ?? null);
  const appelsExploitables = isFilteredToAgent ? (agentRow?.appels_exploitables ?? 0)  : (summary?.appels_exploitables ?? 0);
  const nonExploitables   = isFilteredToAgent ? (agentRow?.appels_non_exploitables ?? 0) : (summary?.data_non_exploitable ?? 0);
  const rdvPris           = isFilteredToAgent ? (agentRow?.rdvs_pris ?? 0)             : (summary?.rdvs_bookes_tlm ?? 0);
  // "Fiches complétées" = fiches complétées + RDV pris — un RDV pris compte
  // comme une fiche complétée (définition validée par Jimmy).
  const fichesCompletees  = (isFilteredToAgent ? (agentRow?.fiches_completees ?? 0) : (summary?.fiches_completees ?? 0)) + rdvPris;
  const leadsARecycler    = isFilteredToAgent ? null : (summary?.leads_a_recycler ?? 0);
  /* Transformation NETTE : la data non exploitable est retirée du dénominateur
     (demande de Christophe, 14/08). Un fichier truffé de faux numéros écrasait
     le taux sans rien dire de la performance des agents — « le client va se
     dire vous avez un taux très faible, mais dans les appels émis on aura
     identifié des faux numéros dont on n'aurait rien pu faire ». Le taux ne
     porte donc que sur la data réellement travaillable. */
  const baseExploitable   = Math.max(appelsEmis - nonExploitables, 0);
  const transfoNette      = baseExploitable > 0 ? Math.round((rdvPris / baseExploitable) * 1000) / 10 : 0;
  /* Les taux des paliers ne sont plus calculés ici : les cartes affichent des
     volumes, et leur part relative se calcule à la volée par `part()` pour
     l'infobulle de survol. Seule la transformation nette reste un taux
     affiché en dur, faute de palier correspondant. */

  // Motif de refus / Statut des appels : aucune décomposition par agent côté
  // CloudTalk — masqués (pas juste à 0) quand un agent précis est sélectionné.
  const motifRefusCategorique  = isFilteredToAgent ? 0 : (summary?.motif_refus_categorique ?? 0);
  const motifBarrageSecretaire = isFilteredToAgent ? 0 : (summary?.motif_barrage_secretaire ?? 0);
  const motifHorsCriteres      = isFilteredToAgent ? 0 : (summary?.motif_hors_criteres ?? 0);
  const motifsTotal = motifRefusCategorique + motifBarrageSecretaire + motifHorsCriteres;
  const motifs = [
    { label: 'Refus catégorique',  count: motifRefusCategorique,  pct: motifsTotal > 0 ? Math.round(motifRefusCategorique / motifsTotal * 100) : 0 },
    { label: 'Hors critères',      count: motifHorsCriteres,      pct: motifsTotal > 0 ? Math.round(motifHorsCriteres / motifsTotal * 100) : 0 },
    { label: 'Barrage secrétaire', count: motifBarrageSecretaire, pct: motifsTotal > 0 ? Math.round(motifBarrageSecretaire / motifsTotal * 100) : 0 },
  ];

  // Statut des appels — 5 catégories réelles, mutuellement exclusives (voir
  // migrations 020/021). "Sans tags" complète la partition à 100% des
  // appels émis (les 4 autres ne couvrent que les appels tagués).
  const statutArgumente      = isFilteredToAgent ? 0 : (summary?.statut_argumente ?? 0);
  const statutNonArgumente   = isFilteredToAgent ? 0 : (summary?.statut_non_argumente ?? 0);
  const statutNonExploitable = isFilteredToAgent ? 0 : (summary?.statut_non_exploitable ?? 0);
  const statutInjoignable    = isFilteredToAgent ? 0 : (summary?.statut_injoignable ?? 0);
  const statutSansTags       = isFilteredToAgent ? 0 : (summary?.statut_sans_tags ?? 0);
  const statuts = [
    { label: 'Argumenté',        count: statutArgumente,      color: STATUT_COLORS.argumente },
    { label: 'Non argumenté',    count: statutNonArgumente,   color: STATUT_COLORS.nonArgumente },
    { label: 'Non exploitable',  count: statutNonExploitable, color: STATUT_COLORS.nonExploitable },
    { label: 'Injoignable',      count: statutInjoignable,    color: STATUT_COLORS.injoignable },
    { label: 'Sans tags',        count: statutSansTags,       color: STATUT_COLORS.sansTags },
  ];
  // Ancré sur appelsEmis (pas la somme des 5 catégories) : c'est le même
  // total que la carte "Appels émis" des indicateurs principaux, et les 5
  // catégories sont censées en couvrir 100% (partition complète avec "Sans
  // tags") — un écart résiduel viendrait d'un backfill partiel, pas d'une
  // vraie exclusion.
  const statutsTotal = appelsEmis || 1;

  // Comparatifs — dérivés de agentRow/compareAgentRow quand un agent précis
  // est sélectionné. Ne renvoie jamais silencieusement null une fois la
  // donnée chargée : un agent absent de la période comparée a fait 0 appel
  // (résultat réel, pas une donnée manquante) — même chose pour un
  // dénominateur nul dans les taux dérivés ci-dessous.
  const compareDataLoaded = isFilteredToAgent ? compareAgentsLoaded : !!compareSummary;
  const cmp = (val, key, agentKey) => {
    if (isFilteredToAgent) {
      if (!agentKey) return false;
      if (!compareAgentsLoaded) return null;
      const ref = compareAgentRow ? (compareAgentRow[agentKey] ?? 0) : 0;
      return compareValueText(val, ref, comparePeriodKey);
    }
    if (!compareSummary) return null;
    return compareValueText(val, compareSummary[key], comparePeriodKey);
  };
  // Fiches complétées de la période de comparaison, même définition combinée
  // (fiches + RDV) que la période courante.
  const compareFichesCompletees = isFilteredToAgent
    ? (compareAgentRow ? (compareAgentRow.fiches_completees ?? 0) + (compareAgentRow.rdvs_pris ?? 0) : 0)
    : (compareSummary ? (compareSummary.fiches_completees ?? 0) + (compareSummary.rdvs_bookes_tlm ?? 0) : 0);
  const cmpFichesCompletees = compareDataLoaded
    ? compareValueText(fichesCompletees, compareFichesCompletees, comparePeriodKey)
    : null;

  // Comparaison en points pour les taux dérivés (recalculés sur la période
  // de comparaison à partir des mêmes champs bruts). Le dénominateur peut
  // être à 0 sur la période comparée (aucune activité) — résultat réel,
  // affiché explicitement plutôt que masqué.
  /* Les comparaisons en points des taux « échanges > 30 s » et « fiches
     exploitables » ont disparu avec leurs cartes : ces deux paliers sont
     désormais affichés en volume, et se comparent donc en volume comme les
     autres. Restent les bases nécessaires à la transformation nette. */
  const compareBaseAppelsEmis = isFilteredToAgent ? (compareAgentRow?.appels_emis ?? 0) : (compareSummary?.appels_emis ?? 0);
  const compareBaseRdv = isFilteredToAgent ? (compareAgentRow?.rdvs_pris ?? 0) : (compareSummary?.rdvs_bookes_tlm ?? 0);
  // Même dénominateur que transfoNette sur la période de référence, sinon la
  // comparaison opposerait un taux net à un taux brut.
  const compareBaseNonExploitables = isFilteredToAgent
    ? (compareAgentRow?.appels_non_exploitables ?? 0)
    : (compareSummary?.data_non_exploitable ?? 0);
  const compareBaseExploitable = Math.max(compareBaseAppelsEmis - compareBaseNonExploitables, 0);
  const cmpTransfoNette = !compareDataLoaded ? null
    : (compareBaseExploitable > 0
        ? comparePtsText(transfoNette, Math.round((compareBaseRdv / compareBaseExploitable) * 1000) / 10, comparePeriodKey)
        : compareZeroRefText(comparePeriodKey));

  /* Les cartes reprennent exactement les paliers de l'entonnoir, dans le même
     ordre et EN NOMBRES : appels émis, échanges > 1 s, échanges > 30 s,
     échanges exploitables, fiches complétées, rendez-vous pris (Christophe,
     14/08). « Si je vois directement le chiffre, je sais qu'il y en a eu 60 ;
     si je ne vois que des pourcentages, je vois un pourcentage de
     pourcentage. »

     Les taux qui doublonnaient un palier sont retirés — « Taux d'échanges
     > 30 s » et « Taux fiches exploitables » disaient en pourcentage ce que
     la carte voisine disait en volume, et la rangée se lisait comme une
     alternance sans logique. Le pourcentage de chaque palier reste accessible
     au survol de l'entonnoir juste en dessous.

     Seule la transformation nette reste un taux : c'est le seul indicateur
     qui ne corresponde à aucun palier, et Christophe l'a explicitement gardé.

     « Contacts joints » est retiré : la mesure venait des tags et
     sous-comptait gravement — 3 700 contacts joints pour 5 119 échanges de
     plus de 30 secondes sur la même période. Un sous-ensemble plus grand que
     son ensemble ; le chiffre ne voulait rien dire. */
  /* Le pourcentage de chaque palier passe au survol de la carte, via le même
     mécanisme que le montant exact (voir KPICard) : lisible d'un geste sur
     ordinateur, accessible au toucher sur mobile par retournement. La carte
     elle-même ne porte que le volume. Chaque part se rapporte au palier
     précédent, comme dans l'entonnoir. */
  const part = (n, base, nomBase) => (base > 0
    ? `${Math.round((n / base) * 100)} % ${nomBase}`
    : undefined);

  const kpis = [
    { label: 'Appels émis',                value: appelsEmis,          unit: '', compare: cmp(appelsEmis, 'appels_emis', 'appels_emis'), trend: trend(isFilteredToAgent ? selectedCollab : `${summary?.nb_clients ?? 0} client${(summary?.nb_clients ?? 0) > 1 ? 's' : ''} TLM avec activité`) },
    // Masqué tant que n8n n'a pas produit le comptage : un zéro se lirait
    // « aucun décroché » au lieu de « pas encore mesuré ».
    ...(decroches1s != null
      ? [{ label: 'Échanges > 1s', value: decroches1s, unit: '', compare: cmp(decroches1s, 'appels_decroches_1s', 'appels_decroches_1s'), trend: trend('Conversation de plus d’une seconde'), exactValue: part(decroches1s, appelsEmis, 'des appels émis') }]
      : []),
    { label: 'Échanges > 30s',             value: decroches30s,        unit: '', compare: cmp(decroches30s, 'appels_decroches_30s', 'appels_decroches_30s'), trend: trend('Conversation de plus de 30 secondes'), exactValue: part(decroches30s, decroches1s ?? appelsEmis, decroches1s != null ? 'des échanges > 1s' : 'des appels émis') },
    { label: 'Échanges exploitables',      value: appelsExploitables,  unit: '', compare: cmp(appelsExploitables, 'appels_exploitables', 'appels_exploitables'), trend: trend('Enquête complétée/partielle, RDV pris, Rappel'), exactValue: part(appelsExploitables, decroches30s, 'des échanges > 30s') },
    { label: 'Fiches complétées',          value: fichesCompletees,    unit: '', compare: cmpFichesCompletees, trend: trend('Enquête complétée + RDV pris'), exactValue: part(fichesCompletees, appelsExploitables, 'des échanges exploitables') },
    { label: 'Rendez-vous pris',           value: rdvPris,             unit: '', compare: cmp(rdvPris, 'rdvs_bookes_tlm', 'rdvs_pris'), trend: trend('Transformation TLM → RDV'), color: 'green', exactValue: part(rdvPris, fichesCompletees, 'des fiches complétées') },
    // Hors parcours, comme dans l'entonnoir : elle explique le taux de
    // transformation sans être une étape.
    { label: 'Data non exploitable',       value: nonExploitables,     unit: '', compare: cmp(nonExploitables, 'data_non_exploitable', 'appels_non_exploitables'), trend: trend('Tags Faux numéro, Doublon, Hors service'), exactValue: part(nonExploitables, appelsEmis, 'des appels émis') },
    { label: 'Transformation nette',       value: `${transfoNette}%`,  unit: '', compare: cmpTransfoNette, trend: trend('RDV pris / appels émis hors data non exploitable') },
    { label: 'Taux RDV honorés',           value: '-',                 unit: '', compare: false, trend: trend('Pas de suivi de présence côté CloudTalk') },
  ];


  /* Entonnoir dans l'ordre arrêté par Christophe (réunion du 14/08) : appels
     émis, décroché > 1s, échanges > 30s, exploitable, fiche complétée, RDV
     pris — puis la data non exploitable, volontairement reléguée en dernier.

     Elle n'est pas une étape du parcours mais son explication : « ça explique
     en grande partie ce pourcentage, et ce n'est pas le KPI qu'on veut
     regarder en priorité ». La mettre en tête aurait fait démarrer l'entonnoir
     sur un échec.

     Le NOMBRE porte la lecture, le pourcentage passe au survol. Christophe a
     tranché dans ce sens après avoir envisagé l'inverse : « si je vois
     directement le chiffre, je sais qu'il y en a eu 60 ; si je ne vois que des
     pourcentages, je vois un pourcentage de pourcentage ». Seul le taux de
     transformation nette reste exprimé en pourcentage.

     « Contact joint » est retiré. Christophe ne savait pas ce que le palier
     recouvrait, et la donnée lui donne raison : il s'appuyait sur
     `leads_decroches`, issu des tags, qui compte 3 700 décrochés là où la
     durée en relève 5 119 de plus de 30 secondes sur la même période. Plus
     d'appels longs que d'appels décrochés est impossible dans un entonnoir :
     les tags sous-comptent, le palier était faux.

     Le palier « décroché > 1 seconde » qu'il a demandé s'intercale dès que la
     donnée existe. Elle vient de la même source que le seuil à 30 secondes —
     Cdr.billsec, que CloudTalk restitue par appel — seule l'agrégation côté
     n8n reste à ajouter (migration 026). Tant qu'elle est absente, le palier
     ne s'affiche pas : mieux vaut un entonnoir à quatre étapes justes qu'à
     cinq dont une inventée. */
  const funnelSteps = [
    { label: 'Appels émis',      value: appelsEmis },
    /* Nomenclature en noms et non en taux, puisque les paliers portent des
       volumes, et suite de libellés homogène : appels émis, échanges > 1 s,
       échanges > 30 s, échanges exploitables, fiches complétées, rendez-vous
       pris (Christophe, 14/08).

       « Échanges » plutôt qu'« appels » dès le deuxième palier : à partir de
       la seconde, il ne s'agit plus d'un appel émis mais d'une conversation
       établie. Le mot reste le même jusqu'au bout du parcours, ce qui évite
       l'alternance appel/échange qui rendait l'entonnoir difficile à suivre.

       Le seuil figure dans le libellé plutôt que le mot « argumenté » que
       Christophe employait : celui-ci désigne déjà un statut issu des tags
       dans la carte « Statut des appels » juste en dessous, et deux
       définitions du même mot sur un écran, c'est ce qui a rendu « Contact
       joint » illisible. */
    ...(decroches1s != null ? [{ label: 'Échanges > 1s', value: decroches1s }] : []),
    { label: 'Échanges > 30s',       value: decroches30s },
    { label: 'Échanges exploitables', value: appelsExploitables },
    { label: 'Fiches complétées',    value: fichesCompletees },
    { label: 'Rendez-vous pris',     value: rdvPris },
    // Hors parcours : ne descend pas du palier précédent, se rapporte aux
    // appels émis. Le rendu la traite donc à part (voir `aPart`).
    { label: 'Data non exploitable', value: nonExploitables, aPart: true },
  ];

  return (
    <Loader loading={firstLoad} label="Récupération des indicateurs CloudTalk…" minHeight={380}>
      {() => (
    <div className={styles.page}>
      <SectionLabel badge="CLOUDTALK">Indicateurs principaux</SectionLabel>

      {error && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(196,135,106,0.4)', background: 'rgba(196,135,106,0.08)' }}>
          <span style={{ color: 'var(--neg)' }}>⚠ Erreur :</span> {error}
        </div>
      )}
      {hasData && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(142,207,170,0.3)', background: 'rgba(142,207,170,0.06)' }}>
          <span style={{ color: 'var(--pos)' }}>● Données CloudTalk</span> — Mise à jour arrêtée au {formatJourMois(summary.dernier_jour)}
          {loading && <span className={styles.dataAlertSpin}><LoaderMark size={14} /></span>}
        </div>
      )}

      {isEmptyPeriod ? (
        <Card><NoPeriodData suggestion="Essayez le mois précédent, ou élargissez la période sélectionnée." /></Card>
      ) : (
      <>
      <div className={styles.kpiGrid5}>
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      <SectionLabel>Performance des agents MA</SectionLabel>
      <Card title="Comparatif individuel — principaux leviers TLM">
        {agents.length > 0 ? (
          <table className={styles.perfTable}>
            <thead><tr>
              <th className={styles.thSortable} onClick={() => toggleAgentSort('agent_label')}>Collaborateur{agentSortArrow('agent_label')}</th>
              <th className={styles.thSortable} onClick={() => toggleAgentSort('appels_emis')}>Appels émis{agentSortArrow('appels_emis')}</th>
              {/* Colonnes dans l'ordre de l'entonnoir, pour qu'on lise ici le
                  parcours d'un agent et l'endroit où il bloque (Christophe,
                  14/08). « Contact joint » est retiré comme ailleurs : mesure
                  issue des tags, inférieure aux échanges de plus de 30 s
                  qu'elle est censée contenir. */}
              <th className={styles.thSortable} onClick={() => toggleAgentSort('appels_decroches_1s')}>Échanges &gt; 1s{agentSortArrow('appels_decroches_1s')}</th>
              <th className={styles.thSortable} onClick={() => toggleAgentSort('appels_decroches_30s')}>Échanges &gt; 30s{agentSortArrow('appels_decroches_30s')}</th>
              <th className={styles.thSortable} onClick={() => toggleAgentSort('appels_exploitables')}>Échanges exploitables{agentSortArrow('appels_exploitables')}</th>
              <th className={styles.thSortable} onClick={() => toggleAgentSort('fichesAgent')}>Fiches complétées{agentSortArrow('fichesAgent')}</th>
              <th className={styles.thSortable} onClick={() => toggleAgentSort('rdvs_pris')}>Rendez-vous pris{agentSortArrow('rdvs_pris')}</th>
              <th className={styles.thSortable} onClick={() => toggleAgentSort('appels_non_exploitables')}>Data non exploitable{agentSortArrow('appels_non_exploitables')}</th>
              <th>Taux RDV honorés</th>
              <th className={styles.thSortable} onClick={() => toggleAgentSort('transfoNette')}>Transformation nette{agentSortArrow('transfoNette')}</th>
            </tr></thead>
            <tbody>
              {agents
                .map(a => {
                  const fichesAgent = a.fiches_completees + a.rdvs_pris;
                  const tauxCompletion = a.appels_exploitables > 0 ? Math.round((fichesAgent / a.appels_exploitables) * 100) : 0;
                  const tauxDecroche30s = a.appels_emis > 0 ? Math.round((a.appels_decroches_30s / a.appels_emis) * 100) : 0;
                  // Même base nette que le KPI : appels émis moins la data non
                  // exploitable, sinon la colonne contredirait la carte.
                  const baseNette = Math.max(a.appels_emis - (a.appels_non_exploitables ?? 0), 0);
                  const transfoNette = baseNette > 0 ? Math.round((a.rdvs_pris / baseNette) * 1000) / 10 : 0;
                  return { ...a, fichesAgent, tauxCompletion, tauxDecroche30s, transfoNette };
                })
                .sort((a, b) => compareAgentRows(a, b, agentSort))
                .map(a => (
                  <tr key={a.agent_label} className={a.agent_label === selectedCollab ? styles.highlightRow : ''}>
                    <td className={styles.tdName}>{a.agent_label}</td>
                    <td className={styles.tdNum}>{fmtNumber(a.appels_emis)}</td>
                    {/* Le volume, le taux au survol — même arbitrage que
                        l'entonnoir : « la valeur numéraire est plus utile ». */}
                    <td className={styles.tdNum} title={a.appels_decroches_1s != null ? `${Math.round((a.appels_decroches_1s / Math.max(a.appels_emis, 1)) * 100)}% des appels émis` : undefined}>{a.appels_decroches_1s != null ? fmtNumber(a.appels_decroches_1s) : '—'}</td>
                    <td className={styles.tdNum} title={`${a.tauxDecroche30s}% des appels émis`}>{fmtNumber(a.appels_decroches_30s)}</td>
                    <td className={styles.tdNum}>{fmtNumber(a.appels_exploitables)}</td>
                    <td className={styles.tdNum}>{fmtNumber(a.fichesAgent)}</td>
                    <td className={styles.tdNum}>{fmtNumber(a.rdvs_pris)}</td>
                    <td className={styles.tdNum}>{fmtNumber(a.appels_non_exploitables)}</td>
                    <td className={styles.tdNum}>-</td>
                    <td className={styles.tdNum}>{a.transfoNette}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.subNote}>Aucune donnée agent sur cette période</div>
        )}
      </Card>

      <SectionLabel>Funnel du taux de transformation nette</SectionLabel>
      <Card>
        <div className={styles.funnelWrap}>
          {funnelSteps.map((s, i) => {
            const pctOfMax = funnelSteps[0].value > 0 ? Math.round((s.value / funnelSteps[0].value) * 100) : 0;
            /* Le nombre porte la lecture, le pourcentage passe au survol.
               Le titre nomme le palier de référence et rappelle son volume :
               « 27% de "Échanges > 30s" (4 221) » se lit sans remonter d'une
               ligne.

               La data non exploitable se rapporte aux appels émis et non au
               palier qui la précède — elle ne descend pas du parcours, un
               pourcentage des RDV pris n'aurait aucun sens. */
            const precedent = s.aPart ? funnelSteps[0] : funnelSteps[i - 1];
            const pctRef = !precedent ? 0
              : (precedent.value > 0 ? Math.round((s.value / precedent.value) * 100) : 0);
            return (
              <div
                key={s.label}
                className={s.aPart ? `${styles.funnelRow} ${styles.funnelAPart}` : styles.funnelRow}
              >
                {/* Infobulle maison plutôt que l'attribut `title` : celui-ci
                    n'apparaît qu'après une seconde d'immobilité, dans un style
                    système que personne ne remarque — le pourcentage y était
                    mais restait invisible. */}
                {precedent && (
                  <div className={styles.funnelBulle}>
                    <strong>{pctRef}%</strong> de « {precedent.label} » ({fmtNumber(precedent.value)})
                  </div>
                )}
                <div className={styles.funnelLabel}>{s.label}</div>
                <div className={styles.funnelTrack}>
                  <div className={styles.funnelFill} style={{ width: `${pctOfMax}%` }} />
                </div>
                <div className={styles.funnelValue}>
                  {fmtNumber(s.value)}
                  {precedent && <span className={styles.funnelPctInline}> · {pctRef}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Détail de l'activité commerciale — sorti de la section "Performance
          des agents" où il n'avait pas sa place (ce n'est pas une donnée par
          collaborateur), regroupé dans sa propre sous-partie. */}
      <SectionLabel>Détails des appels</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="Statut des appels">
          {isFilteredToAgent ? (
            <NotConnected>indisponible pour un collaborateur précis — CloudTalk ne remonte le statut des appels qu'au niveau global</NotConnected>
          ) : (
            <>
              <DonutChart
                variant="donut"
                data={statuts.map(s => s.count)}
                labels={statuts.map(s => s.label)}
                colors={statuts.map(s => s.color)}
                height={200}
                centerValue={statutsTotal}
                centerLabel="appels"
                tooltip={(label, value, pct) => `${label} : ${value} appels (${pct}%)`}
                showDataLabels={false}
              />
              <div className={styles.legend} style={{ justifyContent: 'center' }}>
                {statuts.map(s => (
                  <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span className={styles.legDot} style={{ background: s.color }} />{s.label} {Math.round(s.count / statutsTotal * 100)}%
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Motif de refus pour les appels non exploitables">
          {isFilteredToAgent ? (
            <NotConnected>indisponible pour un collaborateur précis — CloudTalk ne remonte les motifs de refus qu'au niveau global</NotConnected>
          ) : (
            motifs.map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />)
          )}
        </Card>
      </div>

      <SectionLabel>Évolution des appels et fiches complétées</SectionLabel>
      <Card>
        <div className={styles.cardHeadRow}>
          <div className={styles.legend}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className={styles.legDot} style={{ background: 'rgba(38,0,31,0.8)' }} />Appels
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className={styles.legDot} style={{ background: '#7EB89A' }} />Fiches complétées
            </span>
          </div>
          <div className={styles.evoToggle}>
            {EVO_OPTIONS.map(o => (
              <button
                key={o.key}
                type="button"
                className={`${styles.evoToggleBtn} ${evoGranularity === o.key ? styles.evoToggleBtnActive : ''}`}
                onClick={() => setEvoGranularity(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.chartWrap} style={{ height: 220 }}>
          <Line
            data={{
              labels: appelsEvolution.labels,
              datasets: [
                {
                  label: 'Appels',
                  data: appelsEvolution.counts,
                  borderColor: 'rgba(38,0,31,0.8)',
                  backgroundColor: 'rgba(255,249,147,0.18)',
                  pointBackgroundColor: 'rgba(38,0,31,0.8)',
                  tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y',
                },
                {
                  label: 'Fiches complétées',
                  data: fichesEvolution.counts,
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
              // Axes masqués (2 échelles distinctes pour ne pas écraser la
              // série "Fiches complétées", bien plus petite que "Appels" —
              // mais aucune ne doit s'afficher, la légende suffit).
              scales: {
                x: { ticks: { display: false }, grid: { display: false }, border: { display: false } },
                y:  { display: false, beginAtZero: true, position: 'left' },
                y1: { display: false, beginAtZero: true, position: 'right' },
              },
            }}
          />
        </div>
      </Card>

      <SectionLabel>Suivi des leads</SectionLabel>
      <div className={styles.twoCol}>
        <Card>
          <KPICard
            label="Leads à recycler"
            value={isFilteredToAgent ? '-' : leadsARecycler}
            unit=""
            compare={isFilteredToAgent ? false : (compareSummary ? compareValueText(leadsARecycler, compareSummary.leads_a_recycler, comparePeriodKey) : null)}
            trend={trend(isFilteredToAgent ? 'Indisponible pour un collaborateur précis' : 'Pas de réponse, Répondeur, Injoignable, Rappel (ou sans tag)')}
            color="amber"
          />
        </Card>
        <Card>
          <KPICard label="Leads restants à contacter" value="-" unit="" compare={false} trend={trend('Saisi à la main, non calculable via API')} color="amber" />
        </Card>
      </div>
      </>
      )}
    </div>
      )}
    </Loader>
  );
}
