import { useState, useCallback, useRef } from 'react';
import { computeAsusData } from '../services/sheetsParser';
import { fetchAPI } from '../services/api';

/* Même principe que useSalesData : les lignes sont chargées une fois puis
   filtrées/recalculées côté client (période, collaborateur), sans
   re-fetch — le volume ASUS reste modeste. */
export function useAsusData() {
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const appliedFrom = useRef(null);
  const appliedTo   = useRef(null);
  const rowsCache   = useRef(null);

  const fetchData = useCallback(async (from, to, collab = 'Tous') => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAPI('/ringover/asus');
      rowsCache.current   = rows;
      appliedFrom.current = from;
      appliedTo.current   = to;
      setResult(computeAsusData(
        rows,
        from ? new Date(from) : null,
        to   ? new Date(to)   : null,
        collab,
      ));
      setLastFetched(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const recomputeCollab = useCallback((collab) => {
    if (!rowsCache.current) return;
    setResult(computeAsusData(
      rowsCache.current,
      appliedFrom.current ? new Date(appliedFrom.current) : null,
      appliedTo.current   ? new Date(appliedTo.current)   : null,
      collab,
    ));
  }, []);

  return {
    result,
    loading,
    error,
    lastFetched,
    fetchData,
    recomputeCollab,
    hasData: !!result,
    hasCachedRows: !!rowsCache.current,
    // Lignes brutes — utilisées par le graphe d'évolution, qui a sa propre
    // fenêtre glissante (7j/4sem/6mois) indépendante du filtre de période
    // de la page.
    rows: rowsCache.current,
  };
}
