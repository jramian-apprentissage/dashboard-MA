import { useState, useEffect } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import { fetchAPI } from '../services/api';

/* Note de satisfaction IA (colonne Monday board Comptes) + statut Detect
   sentiment, scopé aux clients ACTIFS sur la période (mêmes clients que
   "Portefeuille de clients actifs") — pas un instantané de tous les comptes
   live sans distinction d'activité. Le raisonnement affiché au survol dans
   Monday n'est pas exposé par l'API — seule la note chiffrée l'est (voir
   note_limite). */
export function useSatisfactionClient() {
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
    fetchAPI(`/comptes/satisfaction?${qs}`)
      .then(d => { if (!cancelled) { setData(d); setError(null); } })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  return { data, loading, error };
}
