import { useState, useEffect, useMemo } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import {
  parseSnapLeads, parseSnapComptes,
  resolveSnapshot, computeCRMKPIs,
  SNAP_LEADS_URL, SNAP_COMPTES_URL,
} from '../services/snapshotParser';

export function useSnapshotData() {
  const [leadsRows,   setLeadsRows]   = useState(null);
  const [comptesRows, setComptesRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const { periodKey, customFrom, customTo } = usePeriod();

  // Fetch both sheets once on mount — data changes only weekly
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(SNAP_LEADS_URL).then(r => {
        if (!r.ok) throw new Error(`Leads sheet: HTTP ${r.status}`);
        return r.text();
      }),
      fetch(SNAP_COMPTES_URL).then(r => {
        if (!r.ok) throw new Error(`Comptes sheet: HTTP ${r.status}`);
        return r.text();
      }),
    ])
      .then(([leadsCsv, comptesCsv]) => {
        if (cancelled) return;
        setLeadsRows(parseSnapLeads(leadsCsv));
        setComptesRows(parseSnapComptes(comptesCsv));
        setError(null);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // Recompute KPIs when period or data changes (pure in-memory, fast)
  const result = useMemo(() => {
    if (!leadsRows || !comptesRows) return null;
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
    const leadsSnap   = resolveSnapshot(leadsRows,   to);
    const comptesSnap = resolveSnapshot(comptesRows, to);
    return computeCRMKPIs(comptesSnap, leadsSnap, from, to);
  }, [leadsRows, comptesRows, periodKey, customFrom, customTo]);

  return { result, loading, error };
}
