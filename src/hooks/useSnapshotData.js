import { useState, useEffect, useMemo } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import { fetchAPI } from '../services/api';

/* Comptes : API backend Railway (historique SCD2 injecté depuis le compte
   d'exploitation 2023→2026 + webhooks Monday live).
   Leads/acquisition : /api/leads/deals, également côté backend — le snapshot
   Google Sheets n'est plus utilisé, il donnait des chiffres différents de
   ceux du funnel pour les mêmes indicateurs (décision de Jimmy, 2026-08-04 :
   "les deals doivent être dans la partie acquisition, basé sur les chiffres
   acquisition"). */

export function useSnapshotData() {
  const [leadsKpis,   setLeadsKpis]   = useState(null);
  const [compteKpis,  setCompteKpis]  = useState(null);
  const [monthly,     setMonthly]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [compareCompteKpis, setCompareCompteKpis] = useState(null);
  const [compareLeadsKpis,  setCompareLeadsKpis]  = useState(null);

  const { periodKey, customFrom, customTo, compareActive, compareRange } = usePeriod();
  const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

  /* Série mensuelle : les 6 mois qui s'achèvent avec la période de référence,
     rechargée à chaque changement de période. C'est la dépendance [to] qui
     fait bouger le graphe — l'URL seule donnerait une fenêtre juste au premier
     rendu, puis figée. On ne propage QUE `to` : la largeur reste de 6 mois,
     elle ne suit pas la durée de la période. */
  useEffect(() => {
    let cancelled = false;
    fetchAPI(`/monthly?months=6&to=${to}`)
      .then(monthlyData => { if (!cancelled) setMonthly(monthlyData); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [to]);

  // KPIs acquisition (deals, win rate, pipeline) — recalculés par le backend
  // à chaque changement de période, même source que le funnel.
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    fetchAPI(`/leads/deals?${qs}`)
      .then(data => { if (!cancelled) setLeadsKpis(data); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [from, to]);

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

  // Période de comparaison — mêmes deux routes backend, rejouées avec
  // compareRange (les KPIs leads ne se calculent plus en mémoire).
  useEffect(() => {
    let cancelled = false;
    if (!compareActive || !compareRange) {
      setCompareCompteKpis(null);
      setCompareLeadsKpis(null);
      return;
    }
    const qs = new URLSearchParams();
    qs.set('from', compareRange.from);
    qs.set('to', compareRange.to);
    fetchAPI(`/kpis?${qs}`)
      .then(data => { if (!cancelled) setCompareCompteKpis(data); })
      .catch(() => { if (!cancelled) setCompareCompteKpis(null); });
    fetchAPI(`/leads/deals?${qs}`)
      .then(data => { if (!cancelled) setCompareLeadsKpis(data); })
      .catch(() => { if (!cancelled) setCompareLeadsKpis(null); });
    return () => { cancelled = true; };
  }, [compareActive, compareRange?.from, compareRange?.to]); // eslint-disable-line

  // Fusion : KPIs comptes + KPIs acquisition, tous deux calculés par le backend
  const result = useMemo(() => {
    if (!compteKpis || !leadsKpis) return null;
    return { ...compteKpis, ...leadsKpis };
  }, [compteKpis, leadsKpis]);

  const compareResult = useMemo(() => {
    if (!compareActive || !compareRange || !compareCompteKpis) return null;
    return { ...compareCompteKpis, ...(compareLeadsKpis || {}) };
  }, [compareActive, compareRange, compareCompteKpis, compareLeadsKpis]);

  return { result, compareResult, monthly, loading: loading || (!result && !error), error };
}
