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

  // Série mensuelle CA / marge — un point par fin de mois sur les 6 derniers mois,
  // en résolvant le snapshot le plus proche de chaque fin de mois
  const monthly = useMemo(() => {
    if (!comptesRows) return null;
    const points = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const endStr = end.toISOString().slice(0, 10);
      const snap = resolveSnapshot(comptesRows, endStr);
      const actifs = snap.filter(c => c.statut === 'Actif');
      const ca     = actifs.reduce((s, c) => s + c.vente_total, 0);
      const achats = actifs.reduce((s, c) => s + c.achat_total, 0);
      points.push({
        label: end.toLocaleDateString('fr-FR', { month: 'short' }),
        ca,
        marge: ca - achats,
        tauxMarge: ca > 0 ? Math.round(((ca - achats) / ca) * 100) : 0,
      });
    }
    return points;
  }, [comptesRows]);

  return { result, monthly, loading, error };
}
