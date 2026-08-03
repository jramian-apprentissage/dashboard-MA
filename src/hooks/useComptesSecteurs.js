import { useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';

/* CA par "Secteur d'activité" (board Comptes Monday, live) — comme la
   satisfaction client, instantané des comptes actuels, pas de notion de
   période (la colonne n'existe pas côté historique legacy). */
export function useComptesSecteurs() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAPI('/comptes/secteurs')
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
