import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';

/* Regroupe les routes /api/leads/* et /api/profils/missions consommées par
   Focus Commercial : funnel, motifs de perte/stand-by, évolution mensuelle,
   opportunités sans action, sources de lead, répartition par mission. */
export function useLeadsAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAPI('/leads/funnel'),
      fetchAPI('/leads/motifs?type=perdu'),
      fetchAPI('/leads/motifs?type=standby'),
      fetchAPI('/leads/evolution-mensuelle?mois=6'),
      fetchAPI('/leads/opportunites-sans-action'),
      fetchAPI('/leads/sources'),
      fetchAPI('/profils/missions'),
    ])
      .then(([funnel, motifsPerdu, motifsStandby, evolutionMensuelle, opportunitesSansAction, sources, missions]) => {
        if (cancelled) return;
        setData({ funnel, motifsPerdu, motifsStandby, evolutionMensuelle, opportunitesSansAction, sources, missions });
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
