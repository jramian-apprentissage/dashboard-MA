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

/* La série des six derniers mois : le stock en courbe, les deux flux en barres.
 *
 * HOOK SÉPARÉ DE useRhEffectifs, ET C'EST VOULU. Les deux ne répondent pas à la
 * même question — un stock sur une période contre une série sur six mois — et
 * surtout ils n'ont pas le même coût : la série lance dix-huit sous-comptages.
 * Les fondre dans le même hook ferait recalculer l'historique à chaque appel de
 * comparaison, pour rien.
 *
 * CONSÉQUENCE ASSUMÉE : la carte du graphique a son propre état de chargement.
 * Elle se remplit donc après les quatre tuiles du dessus, ce qui est préférable
 * à quatre tuiles qui attendent un graphique. */
export function useRhEvolution(mois = 6) {
  const { periodKey, customFrom, customTo } = usePeriod();
  const [etat, setEtat] = useState({ points: null, loading: true, error: null });

  useEffect(() => {
    let annule = false;
    setEtat(e => ({ ...e, loading: true }));
    const { to } = getPeriodRange(periodKey, customFrom, customTo);

    fetchRh(`/evolution?au=${to}&mois=${mois}`)
      .then(r => { if (!annule) setEtat({ points: r.points, loading: false, error: null }); })
      .catch(e => { if (!annule) setEtat({ points: null, loading: false, error: e.message }); });

    return () => { annule = true; };
  }, [periodKey, customFrom, customTo, mois]);

  return etat;
}

/* La cohorte par année d'entrée. Elle ne dépend que de la FIN de période, pas
 * de son début : chaque ligne couvre une année civile entière, et seule la
 * date à laquelle on demande « qui est encore là » bouge avec le sélecteur. */
export function useRhAnnuel() {
  const { periodKey, customFrom, customTo } = usePeriod();
  const [etat, setEtat] = useState({ lignes: null, loading: true, error: null });

  useEffect(() => {
    let annule = false;
    setEtat(e => ({ ...e, loading: true }));
    const { to } = getPeriodRange(periodKey, customFrom, customTo);

    fetchRh(`/annuel?au=${to}`)
      .then(r => { if (!annule) setEtat({ lignes: r.lignes, loading: false, error: null }); })
      .catch(e => { if (!annule) setEtat({ lignes: null, loading: false, error: e.message }); });

    return () => { annule = true; };
  }, [periodKey, customFrom, customTo]);

  return etat;
}

/* Vue 3, « Turnover et fidélisation ».
 *
 * HOOK SÉPARÉ DE useRhEffectifs, pour la même raison que la série : ce n'est
 * pas la même question ni le même coût. L'effectif moyen fait un sous-comptage
 * par mois de la période, donc dix à douze sur une année. Le fondre dans le
 * hook de la page 1 ferait payer ce balayage à des écrans qui n'en ont pas
 * besoin.
 *
 * DEUX BORNES, parce que le taux est un flux rapporté à un stock moyen : les
 * sorties se comptent sur l'intervalle, et l'effectif moyen se calcule sur ce
 * même intervalle. Une seule date ne suffirait ni à l'un ni à l'autre. */
export function useRhTurnover() {
  const { periodKey, customFrom, customTo, compareActive, compareRange } = usePeriod();
  const [etat, setEtat] = useState({ result: null, compareResult: null, loading: true, error: null });

  useEffect(() => {
    let annule = false;
    setEtat(e => ({ ...e, loading: true }));
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

    Promise.all([
      fetchRh(`/turnover?du=${from}&au=${to}`),
      compareActive && compareRange
        ? fetchRh(`/turnover?du=${compareRange.from}&au=${compareRange.to}`)
        : Promise.resolve(null),
    ])
      .then(([result, compareResult]) => {
        if (!annule) setEtat({ result, compareResult, loading: false, error: null });
      })
      .catch(e => { if (!annule) setEtat({ result: null, compareResult: null, loading: false, error: e.message }); });

    return () => { annule = true; };
  }, [periodKey, customFrom, customTo, compareActive, compareRange]);

  return etat;
}

/* Vue 1 du dashboard Recrutement, « Besoins et recrutements ».
 *
 * LA PÉRIODE BORNE LA DATE DE COMMANDE, PAS L'ÉTAT. Arbitrage de Jimmy du
 * 22/10, et c'est le point à comprendre avant de lire le chiffre : on compte,
 * parmi les besoins ARRIVÉS sur la période, ceux qui sont encore ouverts
 * AUJOURD'HUI. Sur septembre, 2 encore ouverts sur 11 arrivés.
 *
 * Le stock à une date passée, qui serait la lecture naturelle, n'est pas
 * calculable : le classeur FCC ne porte aucune date de changement de statut.
 * On sait qu'une commande est aujourd'hui terminée, jamais quand elle l'est
 * devenue.
 *
 * CONSÉQUENCE POUR L'ÉCRAN : le dénominateur doit toujours accompagner la
 * valeur. « 2 » seul est illisible et sous-entend une charge de deux besoins,
 * alors que 27 sont ouverts ce jour-là. */
export function useRhBesoins() {
  const { periodKey, customFrom, customTo, compareActive, compareRange } = usePeriod();
  const [etat, setEtat] = useState({ result: null, compareResult: null, loading: true, error: null });

  useEffect(() => {
    let annule = false;
    setEtat(e => ({ ...e, loading: true }));
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

    Promise.all([
      fetchRh(`/besoins?du=${from}&au=${to}`),
      compareActive && compareRange
        ? fetchRh(`/besoins?du=${compareRange.from}&au=${compareRange.to}`)
        : Promise.resolve(null),
    ])
      .then(([result, compareResult]) => {
        if (!annule) setEtat({ result, compareResult, loading: false, error: null });
      })
      .catch(e => { if (!annule) setEtat({ result: null, compareResult: null, loading: false, error: e.message }); });

    return () => { annule = true; };
  }, [periodKey, customFrom, customTo, compareActive, compareRange]);

  return etat;
}

/* Vue 2 du dashboard Recrutement, « Pipeline candidats et délais ».
 *
 * MÊME LECTURE EN COHORTE QUE LA VUE 1, et ce n'est pas un détail : les deux
 * pages doivent compter la même chose sur la même période, sinon elles se
 * contredisent d'un onglet à l'autre sans que personne ne sache laquelle a
 * raison. La période borne la date de commande, jamais l'état. */
export function useRhPipeline() {
  const { periodKey, customFrom, customTo, compareActive, compareRange } = usePeriod();
  const [etat, setEtat] = useState({ result: null, compareResult: null, loading: true, error: null });

  useEffect(() => {
    let annule = false;
    setEtat(e => ({ ...e, loading: true }));
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);

    Promise.all([
      fetchRh(`/pipeline?du=${from}&au=${to}`),
      compareActive && compareRange
        ? fetchRh(`/pipeline?du=${compareRange.from}&au=${compareRange.to}`)
        : Promise.resolve(null),
    ])
      .then(([result, compareResult]) => {
        if (!annule) setEtat({ result, compareResult, loading: false, error: null });
      })
      .catch(e => { if (!annule) setEtat({ result: null, compareResult: null, loading: false, error: e.message }); });

    return () => { annule = true; };
  }, [periodKey, customFrom, customTo, compareActive, compareRange]);

  return etat;
}

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
