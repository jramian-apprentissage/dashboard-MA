/* Données du Dash RH.
 *
 * Signature volontairement identique à celle de useSnapshotData, le hook des
 * pages Monday : { result, compareResult, loading, error }. Les pages RH se
 * lisent donc comme les autres, et le jour où une page change de source, c'est
 * ce fichier qu'on remplace, pas les écrans.
 *
 * DEUX BORNES ET DEUX NATURES. L'effectif se lit à une DATE, le dernier jour de
 * la période : c'est un stock. Les mouvements se lisent sur l'INTERVALLE : ce
 * sont des flux. La route reçoit donc les deux bornes, sinon le détail affiché
 * sous la carte ne sommerait pas avec l'écart qu'elle annonce.
 */
import { useEffect, useState } from 'react';
import { usePeriod } from '../contexts/PeriodContext';
import { getPeriodRange } from '../components/ui/PeriodPicker';
import { fetchRh } from '../services/apiRh';

export function useRhEffectifs() {
  const { periodKey, customFrom, customTo, compareActive, compareRange } = usePeriod();
  const [etat, setEtat] = useState({ result: null, compareResult: null, loading: true, error: null });

  useEffect(() => {
    let annule = false;
    setEtat(e => ({ ...e, loading: true }));
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

    const appels = [fetchRh(`/effectifs?du=${from}&au=${to}`)];
    /* La comparaison est un second appel borné sur SA propre fenêtre, et non
       un calcul dérivé : l'effectif d'un mois ne se déduit pas de celui du
       suivant moins les mouvements, puisque la règle d'activité se réévalue à
       chaque date. */
    appels.push(compareActive && compareRange
      ? fetchRh(`/effectifs?du=${compareRange.from}&au=${compareRange.to}`)
      : Promise.resolve(null));

    Promise.all(appels)
      .then(([result, compareResult]) => {
        if (!annule) setEtat({ result, compareResult, loading: false, error: null });
      })
      .catch(e => { if (!annule) setEtat({ result: null, compareResult: null, loading: false, error: e.message }); });

    return () => { annule = true; };
  }, [periodKey, customFrom, customTo, compareActive, compareRange]);

  return etat;
}
