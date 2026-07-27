import { createContext, useContext, useState } from 'react';
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
function previousPeriodRange(fromStr, toStr) {
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
  const [periodKey, setPeriodKey] = useState('month');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));

  // ── Comparaison ── deux modes seulement, tous deux dérivés de la période de
  // référence (pas de sélection de dates libre) : "période précédente"
  // (intervalle immédiatement antérieur, même durée) ou "année précédente"
  // (mêmes dates, un an plus tôt).
  const [compareActive,    setCompareActive]    = useState(false);
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

  const referenceRange = getPeriodRange(periodKey, customFrom, customTo);

  const compareRange = compareActive
    ? (comparePeriodKey === 'previous-year'
        ? { from: shiftYears(referenceRange.from, -1), to: shiftYears(referenceRange.to, -1) }
        : previousPeriodRange(referenceRange.from, referenceRange.to))
    : null;

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
