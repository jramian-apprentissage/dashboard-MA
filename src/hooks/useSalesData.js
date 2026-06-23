import { useState, useCallback, useRef } from 'react';
import { parseSheetCSV, computeSalesData, parseRDVSheetCSV, computeRDVData } from '../services/sheetsParser';

const SHEET_ID      = import.meta.env.VITE_SHEET_ID;
const SHEET_GID     = import.meta.env.VITE_SHEET_GID || '0';
const RDV_SHEET_ID  = import.meta.env.VITE_RDV_SHEET_ID;
const RDV_SHEET_GID = import.meta.env.VITE_RDV_SHEET_GID || '0';

export function useSalesData() {
  const [result,      setResult]      = useState(null);
  const [rdvResult,   setRdvResult]   = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const appliedFrom   = useRef(null);
  const appliedTo     = useRef(null);
  const rowsCache     = useRef(null);
  const rdvRowsCache  = useRef(null);

  const fetchData = useCallback(async (from, to, collab = 'Tous') => {
    if (!SHEET_ID) {
      setError('VITE_SHEET_ID manquant dans .env.local');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch Ringover + RDV en parallèle (direct Google Sheets — CORS public)
      const ringoverUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
      const rdvUrl      = RDV_SHEET_ID
        ? `https://docs.google.com/spreadsheets/d/${RDV_SHEET_ID}/export?format=csv&gid=${RDV_SHEET_GID}`
        : null;

      const [ringoverRes, rdvRes] = await Promise.all([
        fetch(ringoverUrl),
        rdvUrl ? fetch(rdvUrl) : Promise.resolve(null),
      ]);

      if (!ringoverRes.ok) throw new Error(`Erreur Google Sheets Ringover (HTTP ${ringoverRes.status})`);
      const csv = await ringoverRes.text();

      const rows = parseSheetCSV(csv);
      if (rows.length === 0) throw new Error('Aucune donnée trouvée dans la feuille Ringover');

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

      // RDV sheet
      if (rdvRes && rdvRes.ok) {
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
    lastFetched,
    fetchData,
    recomputeCollab,
    computeFromCache,
    isConnected: !!SHEET_ID,
    hasData: !!result,
    hasRDV: !!rdvResult,
    hasCachedRows: !!rowsCache.current,
  };
}
