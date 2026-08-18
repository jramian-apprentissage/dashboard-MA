import { useState, useCallback, useRef } from 'react';
import {
  computeSalesData, computeRDVData, computeRDVMonthlyEvolution,
  computeCallsMonthlyEvolution, computeRDVStatsForRange,
} from '../services/sheetsParser';
import { fetchAPI } from '../services/api';

/* Les appels et les RDV viennent tous les deux de l'archive Postgres
   (/api/ringover/calls, /api/rdv/rows) — plus de fetch direct du Google
   Sheet RDV côté client. La table rdv_sheet est remplacée en intégralité
   chaque soir par le backend (rdvIngestion.js) : les lignes du Sheet
   peuvent être corrigées en cours de journée (ex. RDV honoré ou pas), un
   remplacement complet est donc nécessaire plutôt qu'un upsert. */

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* Fenêtre de récupération élargie : au moins les 6 mois qui s'achèvent avec la
   PÉRIODE DE RÉFÉRENCE (nécessaires au graphe « Évolution mensuelle ») ET la
   période elle-même si elle remonte plus loin. Sert à borner /ringover/calls
   sans casser ni les KPI de la période, ni le graphe — au lieu de
   retélécharger tout l'historique à chaque chargement.

   Les six mois se comptaient à rebours depuis AUJOURD'HUI. Sur une période
   ancienne, on récupérait donc une tranche entièrement postérieure à ce que le
   graphe allait afficher, et les six barres tombaient à zéro : l'ancrage du
   calcul ne suffisait pas, il fallait aussi déplacer celui de la récupération.

   setDate(1) AVANT setMonth : sans ça, reculer de 5 mois depuis un 31 déborde
   sur le mois suivant. */
function widenedFetchWindow(from, to) {
  const sixMoAgo = new Date(`${to}T00:00:00`);
  sixMoAgo.setDate(1);
  sixMoAgo.setMonth(sixMoAgo.getMonth() - 5);
  const sixMoAgoStr = fmtDate(sixMoAgo);
  return {
    from: from && from < sixMoAgoStr ? from : sixMoAgoStr,
    to,
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
  const rdvRowsEnCours = useRef(null);

  /* Lignes RDV (feuille Google), source distincte des appels Ringover.
   *
   * fetchData et fetchCompareData en ont besoin tous les deux et partent en
   * parallèle au montage du dashboard. fetchCompareData se contentait de lire
   * rdvRowsCache : quand elle gagnait la course — le cas normal, le fichier
   * RDV étant plus lent que l'API — elle trouvait le cache vide et renvoyait
   * rdv: null. Rien ne relançait le calcul une fois les lignes arrivées, donc
   * les cartes "RDV pris" et "Taux RDV honorés" restaient indéfiniment sur
   * "Calcul en cours…" alors que les deux chargements avaient réussi.
   *
   * On partage ici une seule requête en vol : le second appelant attend la
   * même promesse au lieu de repartir les mains vides, et aucun des deux ne
   * déclenche de téléchargement en double.
   *
   * Un échec reste non bloquant (null) et remet la promesse à zéro, pour
   * qu'un chargement ultérieur puisse retenter. */
  const chargerLignesRdv = useCallback(() => {
    if (rdvRowsCache.current) return Promise.resolve(rdvRowsCache.current);
    if (!rdvRowsEnCours.current) {
      rdvRowsEnCours.current = fetchAPI('/rdv/rows')
        .then(rows => { rdvRowsCache.current = rows; return rows; })
        .catch(() => { rdvRowsEnCours.current = null; return null; });
    }
    return rdvRowsEnCours.current;
  }, []);

  const fetchData = useCallback(async (from, to, collab = 'Tous') => {
    setLoading(true);
    setError(null);
    try {
      // Fenêtre bornée (6 derniers mois glissants minimum + période de
      // référence) plutôt que l'archive complète — /ringover/calls supporte
      // from/to côté backend, ce qui évite de retélécharger des mois
      // d'historique à chaque ouverture du dashboard.
      const fetchWindow = widenedFetchWindow(from, to);
      const callsUrl = `/ringover/calls?from=${fetchWindow.from}&to=${fetchWindow.to}`;

      /* La table RDV est secondaire : si elle est inaccessible, on affiche
         quand même toute l'activité Ringover. Sans ce catch, Promise.all
         rejette et l'onglet entier échoue alors que les appels sont
         disponibles. */
      const [rows, rdvRows] = await Promise.all([
        fetchAPI(callsUrl),
        chargerLignesRdv(),
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
      setCallsEvolution(computeCallsMonthlyEvolution(rows, collab, to));

      // Table RDV — échec non bloquant, signalé à part
      if (!rdvRows) {
        setRdvError('Archive RDV indisponible');
      } else {
        setRdvError(null);

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
        setRdvEvolution(computeRDVMonthlyEvolution(rdvRows, validCollabs, collab, to));
      }

      setLastFetched(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [chargerLignesRdv]);

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
    setCallsEvolution(computeCallsMonthlyEvolution(rowsCache.current, collab, appliedTo.current));

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
      setRdvEvolution(computeRDVMonthlyEvolution(rdvRowsCache.current, validCollabs, collab, appliedTo.current));
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
      // Les deux partent ensemble : la comparaison n'a pas à attendre le
      // fichier RDV pour interroger l'archive Ringover, ni l'inverse.
      const [rows, rdvRows] = await Promise.all([
        fetchAPI(`/ringover/calls?from=${from}&to=${to}`),
        chargerLignesRdv(),
      ]);
      const computed = computeSalesData(rows, null, null, collab);
      let rdv = null;
      if (rdvRows) {
        const validCollabs = computed.collabs.filter(c => c !== 'Tous');
        rdv = computeRDVStatsForRange(rdvRows, validCollabs, collab, new Date(from), new Date(to));
      }
      return { result: computed, rdv };
    } catch {
      return { result: null, rdv: null };
    }
  }, [chargerLignesRdv]);

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
