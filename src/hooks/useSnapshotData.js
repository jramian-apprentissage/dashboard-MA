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
  const [compareCompteKpis, setCompareCompteKpis] = useState(null);

  const { periodKey, customFrom, customTo, compareActive, compareRange } = usePeriod();
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

  // KPIs comptes de la période de comparaison — même route backend, juste
  // rejouée avec compareRange. Les KPIs leads, eux, se recalculent en mémoire
  // (leadsRows déjà chargé), pas besoin d'un second fetch.
  useEffect(() => {
    let cancelled = false;
    if (!compareActive || !compareRange) {
      setCompareCompteKpis(null);
      return;
    }
    const qs = new URLSearchParams();
    qs.set('from', compareRange.from);
    qs.set('to', compareRange.to);
    fetchAPI(`/kpis?${qs}`)
      .then(data => { if (!cancelled) setCompareCompteKpis(data); })
      .catch(() => { if (!cancelled) setCompareCompteKpis(null); });
    return () => { cancelled = true; };
  }, [compareActive, compareRange?.from, compareRange?.to]); // eslint-disable-line

  // Fusion : KPIs comptes (backend) + KPIs leads (snapshot sheet, en mémoire)
  const result = useMemo(() => {
    if (!compteKpis || !leadsRows) return null;
    const leadsSnap = resolveSnapshot(leadsRows, to);
    return { ...compteKpis, ...computeLeadsKPIs(leadsSnap, from, to) };
  }, [compteKpis, leadsRows, from, to]);

  const compareResult = useMemo(() => {
    if (!compareActive || !compareRange || !compareCompteKpis || !leadsRows) return null;
    const leadsSnap = resolveSnapshot(leadsRows, compareRange.to);
    return { ...compareCompteKpis, ...computeLeadsKPIs(leadsSnap, compareRange.from, compareRange.to) };
  }, [compareActive, compareRange, compareCompteKpis, leadsRows]);

  return { result, compareResult, monthly, loading: loading || (!result && !error), error };
}
