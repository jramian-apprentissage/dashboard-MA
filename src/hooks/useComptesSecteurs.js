import { useState, useEffect } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import { fetchAPI } from '../services/api';

/* CA par "Secteur d'activité", scopé à la PÉRIODE choisie — l'endpoint agrège
   mois par mois avec la frontière Excel/Monday (voir /comptes/secteurs).

   Correctif (18/08) : le hook appelait /comptes/secteurs SANS from/to, le
   backend retombait donc sur ses défauts (mois courant) et la carte affichait
   toujours le mois en cours, insensible au sélecteur. On transmet désormais la
   période, comme useSatisfactionClient. */
export function useComptesSecteurs() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { periodKey, customFrom, customTo } = usePeriod();
  const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    fetchAPI(`/comptes/secteurs?${qs}`)
      .then(d => { if (!cancelled) { setData(d); setError(null); } })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  return { data, loading, error };
}
