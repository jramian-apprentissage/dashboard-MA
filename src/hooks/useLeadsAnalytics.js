import { useState, useEffect } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import { fetchAPI } from '../services/api';

/* Regroupe les routes /api/leads/* et /api/profils/missions consommées par
   Focus Commercial : funnel, motifs de perte/stand-by, évolution mensuelle,
   opportunités sans action, sources de lead, répartition par mission. */
export function useLeadsAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { periodKey, customFrom, customTo } = usePeriod();
  const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

  /* Évolution mensuelle : les 6 mois qui s'achèvent avec la période de
     référence, rechargée quand la période change. */
  useEffect(() => {
    let cancelled = false;
    fetchAPI(`/leads/evolution-mensuelle?mois=6&to=${to}`)
      .then(evolutionMensuelle => { if (!cancelled) setData(d => ({ ...d, evolutionMensuelle })); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [to]);

  /* Opportunités sans action : liste « à traiter maintenant », filtrée sur la
     date du jour côté serveur — ce n'est pas une notion de période. Effet
     séparé, chargé une seule fois : la laisser dans l'effet ci-dessus la
     ferait refetcher à chaque changement de période sans qu'un seul résultat
     ne bouge. C'est aussi elle qui éteint le loader, pour qu'un retour ne
     l'éteigne pas alors que l'autre série n'est pas arrivée. */
  useEffect(() => {
    let cancelled = false;
    fetchAPI('/leads/opportunites-sans-action')
      .then(opportunitesSansAction => { if (!cancelled) setData(d => ({ ...d, opportunitesSansAction })); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Funnel, motifs, sources — filtrés par Date RDV (date de référence unique
  // côté Leads/Prospects, cf. computeLeadsKPIs), recalculés à chaque
  // changement de période.
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    Promise.all([
      fetchAPI(`/leads/funnel?${qs}`),
      fetchAPI(`/leads/motifs?type=perdu&${qs}`),
      fetchAPI(`/leads/motifs?type=standby&${qs}`),
      fetchAPI(`/leads/sources?${qs}`),
    ])
      .then(([funnel, motifsPerdu, motifsStandby, sources]) => {
        if (cancelled) return;
        setData(d => ({ ...d, funnel, motifsPerdu, motifsStandby, sources }));
      })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [from, to]);

  // Missions (Comptes, via profils_history legacy) — recalculé à chaque
  // changement de période pour que le total corresponde toujours au CA
  // affiché ailleurs sur la même période.
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    fetchAPI(`/profils/missions?${qs}`)
      .then(missions => { if (!cancelled) setData(d => ({ ...d, missions })); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [from, to]);

  return { data, loading, error };
}
