import { useState, useCallback, useRef } from 'react';
import { computeSalesData, parseRDVSheetCSV, computeRDVData } from '../services/sheetsParser';
import { fetchAPI } from '../services/api';

/* Les appels viennent de l'archive Postgres (/api/ringover/calls), plus du
   Google Sheet public. Deux raisons : le Sheet exposait publiquement numéros
   et enregistrements, et surtout l'archive conserve les agents partis — leur
   compte Ringover étant supprimé, l'API Ringover ne les restitue plus.
   Les RDV restent sur leur feuille, en source secondaire non bloquante. */
const RDV_SHEET_ID  = import.meta.env.VITE_RDV_SHEET_ID;
const RDV_SHEET_GID = import.meta.env.VITE_RDV_SHEET_GID || '0';

export function useSalesData() {
  const [result,      setResult]      = useState(null);
  const [rdvResult,   setRdvResult]   = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [rdvError,    setRdvError]    = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const appliedFrom   = useRef(null);
  const appliedTo     = useRef(null);
  const rowsCache     = useRef(null);
  const rdvRowsCache  = useRef(null);

  const fetchData = useCallback(async (from, to, collab = 'Tous') => {
    setLoading(true);
    setError(null);
    try {
      const rdvUrl = RDV_SHEET_ID
        ? `https://docs.google.com/spreadsheets/d/${RDV_SHEET_ID}/export?format=csv&gid=${RDV_SHEET_GID}`
        : null;

      /* La feuille RDV est secondaire : si elle est inaccessible (partage
         retiré → 401 sans en-tête CORS, donc fetch rejeté), on affiche quand
         même toute l'activité Ringover. Sans ce catch, Promise.all rejette
         et l'onglet entier bascule sur les données mock. */
      const [rows, rdvRes] = await Promise.all([
        fetchAPI('/ringover/calls'),
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

      // RDV sheet — échec non bloquant, signalé à part
      if (rdvUrl && !rdvRes) {
        setRdvError('Feuille RDV inaccessible — vérifier son partage Google (« Tous les utilisateurs disposant du lien »)');
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
    }
  }, []);

  // Calcul synchrone depuis le cache pour une période de comparaison
  const computeFromCache = useCallback((from, to, collab = 'Tous') => {
    if (!rowsCache.current) return null;
    return computeSalesData(
      rowsCache.current,
      from ? new Date(from) : null,
      to   ? new Date(to)   : null,
      collab,
    );
  }, []);

  return {
    result,
    rdvResult,
    loading,
    error,
    rdvError,
    lastFetched,
    fetchData,
    recomputeCollab,
    computeFromCache,
    isConnected: true, // archive Postgres, toujours joignable via l'API
    hasData: !!result,
    hasRDV: !!rdvResult,
    hasCachedRows: !!rowsCache.current,
  };
}
