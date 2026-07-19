import { useState, useEffect, useMemo } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import {
  parseSnapLeads, resolveSnapshot, computeLeadsKPIs, SNAP_LEADS_URL,
} from '../services/snapshotParser';
import { fetchAPI } from '../services/api';

/* Comptes : API backend Railway (historique SCD2 injecté depuis le compte
   d'exploitation 2023→2026 + webhooks Monday live).
   Leads : toujours le snapshot Google Sheets (pipeline / win rate). */

export function useSnapshotData() {
  const [leadsRows,   setLeadsRows]   = useState(null);
  const [compteKpis,  setCompteKpis]  = useState(null);
  const [monthly,     setMonthly]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const { periodKey, customFrom, customTo } = usePeriod();
  const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

  // Leads sheet + série mensuelle : une seule fois au montage
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(SNAP_LEADS_URL).then(r => {
        if (!r.ok) throw new Error(`Leads sheet: HTTP ${r.status}`);
        return r.text();
      }),
      fetchAPI('/monthly?months=6'),
    ])
      .then(([leadsCsv, monthlyData]) => {
        if (cancelled) return;
        setLeadsRows(parseSnapLeads(leadsCsv));
        setMonthly(monthlyData);
      })
      .catch(e => { if (!cancelled) setError(e.message); });

    return () => { cancelled = true; };
  }, []);

  // KPIs comptes : recalculés par le backend à chaque changement de période
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);

    fetchAPI(`/kpis?${qs}`)
      .then(data => {
        if (cancelled) return;
        setCompteKpis(data);
        setError(null);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [from, to]);

  // Fusion : KPIs comptes (backend) + KPIs leads (snapshot sheet, en mémoire)
  const result = useMemo(() => {
    if (!compteKpis || !leadsRows) return null;
    const leadsSnap = resolveSnapshot(leadsRows, to);
    return { ...compteKpis, ...computeLeadsKPIs(leadsSnap, from, to) };
  }, [compteKpis, leadsRows, from, to]);

  return { result, monthly, loading: loading || (!result && !error), error };
}
