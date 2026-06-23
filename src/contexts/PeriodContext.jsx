import { createContext, useContext, useState } from 'react';
import { getPeriodRange } from '../components/ui/PeriodPicker';

const PeriodContext = createContext(null);

export function PeriodProvider({ children }) {
  const [periodKey, setPeriodKey] = useState('month');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));

  // ── Comparaison ──────────────────────────────────────────────────────────────
  const [compareActive,    setCompareActive]    = useState(false);
  const [comparePeriodKey, setComparePeriodKey] = useState('last-month');
  const [compareFrom,      setCompareFrom]      = useState('');
  const [compareTo,        setCompareTo]        = useState('');

  function onChange({ key, from, to }) {
    setPeriodKey(key);
    if (key === 'custom') { setCustomFrom(from); setCustomTo(to); }
  }

  function toggleCompare() {
    setCompareActive(a => !a);
  }

  function onCompareChange({ key, from, to }) {
    setComparePeriodKey(key);
    if (key === 'custom') { setCompareFrom(from); setCompareTo(to); }
    else {
      const range = getPeriodRange(key, from, to);
      setCompareFrom(range.from);
      setCompareTo(range.to);
    }
  }

  // Plage de dates de la période de comparaison (pré-calculée)
  const compareRange = compareActive
    ? getPeriodRange(comparePeriodKey, compareFrom, compareTo)
    : null;

  return (
    <PeriodContext.Provider value={{
      periodKey, customFrom, customTo, onChange,
      compareActive, comparePeriodKey, compareFrom, compareTo, compareRange,
      toggleCompare, onCompareChange,
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
