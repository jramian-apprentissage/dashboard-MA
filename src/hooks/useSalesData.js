import { useState, useCallback, useRef } from 'react';
import {
  computeSalesData, parseRDVSheetCSV, computeRDVData, computeRDVMonthlyEvolution,
  computeCallsMonthlyEvolution, computeRDVStatsForRange,
} from '../services/sheetsParser';
import { fetchAPI } from '../services/api';

/* Les appels viennent de l'archive Postgres (/api/ringover/calls), plus du
   Google Sheet RDV. Deux raisons : le Sheet exposait publiquement numéros
   et enregistrements, et surtout l'archive conserve les agents partis — leur
   compte Ringover étant supprimé, l'API Ringover ne les restitue plus.
   Les RDV restent sur leur feuille, en source secondaire non bloquante.

   Le Sheet RDV ne peut pas être partagé publiquement (comme avant, via
   /export?format=csv) : on passe par une Web App Apps Script bindée au
   fichier (voir scripts/appscript/rdv-sheet-export.gs), qui lit la feuille
   avec les droits du propriétaire et la ressert en CSV sans exposer le
   fichier lui-même. */
const RDV_SHEET_APPSCRIPT_URL = import.meta.env.VITE_RDV_SHEET_APPSCRIPT_URL;
const RDV_SHEET_GID = import.meta.env.VITE_RDV_SHEET_GID || '0';

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fenêtre de récupération élargie : au moins les 6 derniers mois glissants
// (nécessaires au graphe "Évolution mensuelle", toujours ancré sur
// aujourd'hui, indépendamment de la période de référence choisie) ET la
// période de référence elle-même si elle remonte plus loin (ex. période
// personnalisée). Sert à borner /ringover/calls sans casser ni les KPI de
// la période sélectionnée, ni le graphe d'évolution — au lieu de retélécharger
// tout l'historique de l'archive à chaque chargement.
function widenedFetchWindow(from, to) {
  const sixMoAgo = new Date();
  sixMoAgo.setDate(1);
  sixMoAgo.setMonth(sixMoAgo.getMonth() - 5);
  const sixMoAgoStr = fmtDate(sixMoAgo);
  const todayStr = fmtDate(new Date());
  return {
    from: from && from < sixMoAgoStr ? from : sixMoAgoStr,
    to:   to && to > todayStr ? to : todayStr,
  };
}

export function useSalesData() {
  const [result,          setResult]          = useState(null);
  const [rdvResult,       setRdvResult]       = useState(null);
  const [rdvEvolution,    setRdvEvolution]    = useState(null);
  const [callsEvolution,  setCallsEvolution]  = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [rdvError,        setRdvError]        = useState(null);
  const [lastFetched,     setLastFetched]     = useState(null);

  const appliedFrom   = useRef(null);
  const appliedTo     = useRef(null);
  const rowsCache     = useRef(null);
  const rdvRowsCache  = useRef(null);

  const fetchData = useCallback(async (from, to, collab = 'Tous') => {
    setLoading(true);
    setError(null);
    try {
      const rdvUrl = RDV_SHEET_APPSCRIPT_URL
        ? `${RDV_SHEET_APPSCRIPT_URL}?gid=${RDV_SHEET_GID}`
        : null;

      // Fenêtre bornée (6 derniers mois glissants minimum + période de
      // référence) plutôt que l'archive complète — /ringover/calls supporte
      // from/to côté backend, ce qui évite de retélécharger des mois
      // d'historique à chaque ouverture du dashboard.
      const fetchWindow = widenedFetchWindow(from, to);
      const callsUrl = `/ringover/calls?from=${fetchWindow.from}&to=${fetchWindow.to}`;

      /* La feuille RDV est secondaire : si elle est inaccessible (partage
         retiré → 401 sans en-tête CORS, donc fetch rejeté), on affiche quand
         même toute l'activité Ringover. Sans ce catch, Promise.all rejette
         et l'onglet entier échoue alors que les appels sont disponibles. */
      const [rows, rdvRes] = await Promise.all([
        fetchAPI(callsUrl),
        rdvUrl ? fetch(rdvUrl).catch(() => null) : Promise.resolve(null),
      ]);

      if (!rows.length) throw new Error('Aucun appel dans l\'archive Ringover');

      rowsCache.current   = rows;
      appliedFrom.current = from;
      appliedTo.current   = to;

      const computed = computeSalesData(
        rows,
        from ? new Date(from) : null,
        to   ? new Date(to)   : null,
        collab,
      );
      setResult(computed);
      setCallsEvolution(computeCallsMonthlyEvolution(rows, collab));

      // RDV sheet — échec non bloquant, signalé à part
      if (rdvUrl && !rdvRes) {
        setRdvError('Feuille RDV inaccessible — vérifier que le déploiement Apps Script est actif (VITE_RDV_SHEET_APPSCRIPT_URL)');
      } else if (rdvRes && !rdvRes.ok) {
        setRdvError(`Feuille RDV : HTTP ${rdvRes.status}`);
      } else if (rdvRes && rdvRes.ok) {
        setRdvError(null);
        const rdvCsv  = await rdvRes.text();
        const rdvRows = parseRDVSheetCSV(rdvCsv);
        rdvRowsCache.current = rdvRows;

        // validCollabs = tous les collabs présents dans Ringover (hors Entrant/Management)
        const validCollabs = computed.collabs.filter(c => c !== 'Tous');

        const rdv = computeRDVData(
          rdvRows,
          from ? new Date(from) : null,
          to   ? new Date(to)   : null,
          collab,
          validCollabs,
        );
        setRdvResult(rdv);
        setRdvEvolution(computeRDVMonthlyEvolution(rdvRows, validCollabs, collab));
      }

      setLastFetched(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Recompute from cache when only collab changes — no re-fetch
  const recomputeCollab = useCallback((collab) => {
    if (!rowsCache.current) return;
    const computed = computeSalesData(
      rowsCache.current,
      appliedFrom.current ? new Date(appliedFrom.current) : null,
      appliedTo.current   ? new Date(appliedTo.current)   : null,
      collab,
    );
    setResult(computed);
    setCallsEvolution(computeCallsMonthlyEvolution(rowsCache.current, collab));

    if (rdvRowsCache.current) {
      const validCollabs = computed.collabs.filter(c => c !== 'Tous');
      const rdv = computeRDVData(
        rdvRowsCache.current,
        appliedFrom.current ? new Date(appliedFrom.current) : null,
        appliedTo.current   ? new Date(appliedTo.current)   : null,
        collab,
        validCollabs,
      );
      setRdvResult(rdv);
      setRdvEvolution(computeRDVMonthlyEvolution(rdvRowsCache.current, validCollabs, collab));
    }
  }, []);

  // Comparaison de période ("vs période précédente" / "vs année précédente")
  // — fetch dédié et borné à la plage demandée, plutôt qu'une relecture du
  // cache principal : ce dernier ne couvre que les 6 derniers mois glissants
  // (voir widenedFetchWindow), insuffisant pour "vs année précédente" qui
  // peut pointer bien plus loin en arrière. validCollabs est dérivé des
  // lignes fraîchement récupérées pour CETTE période (pas du cache courant),
  // pour ne pas exclure à tort un collaborateur absent de la période
  // affichée mais présent sur la période comparée.
  const fetchCompareData = useCallback(async (from, to, collab = 'Tous') => {
    try {
      const rows = await fetchAPI(`/ringover/calls?from=${from}&to=${to}`);
      const computed = computeSalesData(rows, null, null, collab);
      let rdv = null;
      if (rdvRowsCache.current) {
        const validCollabs = computed.collabs.filter(c => c !== 'Tous');
        rdv = computeRDVStatsForRange(rdvRowsCache.current, validCollabs, collab, new Date(from), new Date(to));
      }
      return { result: computed, rdv };
    } catch {
      return { result: null, rdv: null };
    }
  }, []);

  return {
    result,
    rdvResult,
    rdvEvolution,
    callsEvolution,
    loading,
    error,
    rdvError,
    lastFetched,
    fetchData,
    recomputeCollab,
    fetchCompareData,
    isConnected: true, // archive Postgres, toujours joignable via l'API
    hasData: !!result,
    hasRDV: !!rdvResult,
    hasCachedRows: !!rowsCache.current,
    // Lignes brutes — sert à afficher la vraie fraîcheur de l'archive
    // (dernier jour synchronisé), indépendante de l'heure de la requête
    // et du filtre de période courant (qui peut légitimement être vide).
    rows: rowsCache.current,
  };
}
