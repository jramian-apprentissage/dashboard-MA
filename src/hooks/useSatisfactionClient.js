import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';

/* Note de satisfaction IA (colonne Monday board Comptes) + statut Detect
   sentiment. Le raisonnement affiché au survol dans Monday n'est pas
   exposé par l'API — seule la note chiffrée l'est (voir note_limite). */
export function useSatisfactionClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAPI('/comptes/satisfaction')
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
