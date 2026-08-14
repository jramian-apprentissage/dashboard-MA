import { useState, useEffect } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import { fetchAPI } from '../services/api';

/* Détail des clients perdus (colonne "date de fin de contrat", board Comptes
   Monday live — voir COMPTES_PERDUS_SQL côté API) et leur évolution mensuelle.
   Le détail suit la période sélectionnée ; l'évolution reste sur les 6
   derniers mois, comme le graphique CA/marge de Synthèse. */
export function useClientsPerdus() {
  const [detail,  setDetail]  = useState(null);
  // Profils dont la mission s'arrête alors que le contrat client se poursuit :
  // ce n'est pas une perte de client, et la carte les confondait.
  const [collaborateurs, setCollaborateurs] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const { periodKey, customFrom, customTo } = usePeriod();
  const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

  useEffect(() => {
    let cancelled = false;
    fetchAPI('/comptes/perdus-mensuel?months=6')
      .then(data => { if (!cancelled) setMonthly(data); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    fetchAPI(`/comptes/perdus?${qs}`)
      .then(data => {
        if (cancelled) return;
        setDetail(data.contrats || []);
        setCollaborateurs(data.collaborateurs || []);
        setError(null);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  return { detail, collaborateurs, monthly, loading, error };
}
