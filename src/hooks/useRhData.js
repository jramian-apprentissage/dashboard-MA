/* Données du Dash RH.
 *
 * Signature volontairement identique à celle de useSnapshotData, le hook des
 * pages Monday : { result, loading, error }. Les pages RH se lisent donc comme
 * les autres, et le jour où une page change de source, c'est ce fichier qu'on
 * remplace, pas les écrans.
 *
 * La date d'observation est le dernier jour de la période choisie : tous les
 * indicateurs d'effectif se lisent à une date, jamais sur un intervalle.
 */
import { useEffect, useState } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import { fetchRh } from '../services/apiRh';

export function useRhEffectifs() {
  const { periodKey, customFrom, customTo } = usePeriod();
  const [etat, setEtat] = useState({ result: null, loading: true, error: null });

  useEffect(() => {
    let annule = false;
    setEtat(e => ({ ...e, loading: true }));
    const { to } = getPeriodRange(periodKey, customFrom, customTo);
    fetchRh(`/effectifs?au=${to}`)
      .then(r => { if (!annule) setEtat({ result: r, loading: false, error: null }); })
      .catch(e => { if (!annule) setEtat({ result: null, loading: false, error: e.message }); });
    return () => { annule = true; };
  }, [periodKey, customFrom, customTo]);

  return etat;
}
