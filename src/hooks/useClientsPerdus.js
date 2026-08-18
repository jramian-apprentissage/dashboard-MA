import { useState, useEffect } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import { fetchAPI } from '../services/api';

/* Missions arrêtées sur la période et leur évolution mensuelle.

   L'unité est le profil, pas le client : une mission s'arrête, elle vaut un
   montant, à une date, chez un client (arbitrage de Jimmy, 14/08). Le modèle
   précédent partait de la date de fin de contrat du compte — colonne qui
   n'existe que sur les comptes Monday, jamais alimentée par l'import Excel,
   ce qui rendait l'indicateur aveugle à tout l'historique d'avant Monday.

   `profils`   — liste à plat, ordonnée par date de fin décroissante.
   `parClient` — même donnée regroupée, pour un affichage par client.

   Le détail ET l'évolution suivent la période sélectionnée : l'évolution
   couvre les 6 mois qui s'achèvent avec elle, comme le graphique CA/marge de
   Synthèse. */
export function useClientsPerdus() {
  const [profils,   setProfils]   = useState(null);
  const [parClient, setParClient] = useState(null);
  const [monthly,   setMonthly]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const { periodKey, customFrom, customTo } = usePeriod();
  const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

  useEffect(() => {
    let cancelled = false;
    fetchAPI(`/comptes/perdus-mensuel?months=6&to=${to}`)
      .then(data => { if (!cancelled) setMonthly(data); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    fetchAPI(`/comptes/perdus?${qs}`)
      .then(data => {
        if (cancelled) return;
        setProfils(data.profils || []);
        setParClient(data.parClient || []);
        setError(null);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  return { profils, parClient, monthly, loading, error };
}
