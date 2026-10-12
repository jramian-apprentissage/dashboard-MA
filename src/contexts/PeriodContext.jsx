import {createContext, useContext, useState, useMemo} from 'react';
import { getPeriodRange } from '../components/ui/PeriodPicker';

const PeriodContext = createContext(null);

// toISOString() convertit en UTC : pour un fuseau en avance sur UTC (Europe/
// Paris, UTC+1/+2), minuit local sérialisé ainsi retombe sur la veille — d'où
// ce formatage qui reste en heure locale du début à la fin, jamais de
// passage par toISOString() pour une date calendaire.
function fmtLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftYears(dateStr, years) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setFullYear(d.getFullYear() + years);
  return fmtLocal(d);
}

// Intervalle immédiatement antérieur, de même durée que [fromStr, toStr].
// Ex. 01→15 juillet (15 jours) → comparé aux 15 jours précédents (16→30 juin).
/* Décalage en MOIS CALENDAIRES, pour les périodes qui en sont faites.
   Le mois précédent d'un trimestre est un trimestre, pas « 92 jours plus tôt ».
   `n` = nombre de mois de la période, `recul` = de combien on remonte. */
function moisPrecedents(fromStr, n) {
  const d = new Date(`${fromStr}T00:00:00`);
  const debut = new Date(d.getFullYear(), d.getMonth() - n, 1);
  const fin = new Date(debut.getFullYear(), debut.getMonth() + n, 0);
  return { from: fmtLocal(debut), to: fmtLocal(fin) };
}

/* CALENDRIER CONTRE JOURS (corrigé le 07/10). Le décalage se faisait en jours
   pour toutes les périodes, alors que le chiffre d'affaires et la marge
   s'agrègent par mois entier. Sur « Trimestre précédent » (01/07 au 30/09,
   92 jours), la référence tombait au 31/03 : mars entrait tout entier et la
   comparaison portait sur QUATRE mois contre trois. Le signe s'inversait, le
   dashboard annonçait -10 % de CA là où le vrai T2 donne +21 %.
   Les périodes calendaires reculent donc d'un cran de leur propre unité ; le
   jour, la semaine et le libre gardent le décalage en jours, qui leur convient. */
const MOIS_PAR_PERIODE = { month: 1, 'last-month': 1, quarter: 3, 'last-quarter': 3 };

function previousPeriodRange(fromStr, toStr, periodKey) {
  const n = MOIS_PAR_PERIODE[periodKey];
  if (n) return moisPrecedents(fromStr, n);
  const from = new Date(`${fromStr}T00:00:00`);
  const to   = new Date(`${toStr}T00:00:00`);
  const days = Math.round((to - from) / 86400000) + 1;
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days + 1);
  return { from: fmtLocal(prevFrom), to: fmtLocal(prevTo) };
}

export function PeriodProvider({ children }) {
  // "Mois en cours" est presque toujours vide en pratique (facturation pas
  // encore remontée) — un dashboard s'ouvrant dessus affiche "0 €" partout
  // sans que l'utilisateur comprenne pourquoi. Le mois précédent a quasi
  // toujours des données, donc c'est le point d'entrée par défaut.
  const [periodKey, setPeriodKey] = useState('last-month');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));

  // ── Comparaison ── deux modes seulement, tous deux dérivés de la période de
  // référence (pas de sélection de dates libre) : "période précédente"
  // (intervalle immédiatement antérieur, même durée) ou "année précédente"
  // (mêmes dates, un an plus tôt).
  // Comparaison activée par défaut — décision du 27/07 : on veut voir en
  // permanence l'effet "vs période précédente" sur tous les KPIs.
  const [compareActive,    setCompareActive]    = useState(true);
  const [comparePeriodKey, setComparePeriodKey] = useState('previous-period');

  function onChange({ key, from, to }) {
    setPeriodKey(key);
    if (key === 'custom') { setCustomFrom(from); setCustomTo(to); }
  }

  function toggleCompare() {
    setCompareActive(a => !a);
  }

  function setCompareMode(key) {
    setComparePeriodKey(key);
  }

  /* Mémoïsé parce que ces objets sont désormais CONSOMMÉS hors d'ici : les
     fenêtres d'historique s'ancrent sur referenceRange.to (voir
     services/sheetsParser.js). Sans mémo, getPeriodRange rend un objet neuf à
     chaque rendu, et le premier `useEffect(..., [referenceRange])` écrit par
     réflexe partirait en boucle.

     Règle qui va avec : on propage TOUJOURS la chaîne 'YYYY-MM-DD'
     (referenceRange.to), jamais l'objet ni un Date. */
  const referenceRange = useMemo(
    () => getPeriodRange(periodKey, customFrom, customTo),
    [periodKey, customFrom, customTo],
  );

  const compareRange = useMemo(() => (compareActive
    ? (comparePeriodKey === 'previous-year'
        ? { from: shiftYears(referenceRange.from, -1), to: shiftYears(referenceRange.to, -1) }
        : previousPeriodRange(referenceRange.from, referenceRange.to, periodKey))
    : null), [compareActive, comparePeriodKey, referenceRange, periodKey]);

  return (
    <PeriodContext.Provider value={{
      periodKey, customFrom, customTo, onChange, referenceRange,
      compareActive, comparePeriodKey, compareRange,
      toggleCompare, setCompareMode,
    }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod must be used within PeriodProvider');
  return ctx;
}
