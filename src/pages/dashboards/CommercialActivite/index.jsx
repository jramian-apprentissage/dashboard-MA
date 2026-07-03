import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import heroActivite from '../../../assets/hero-activite.svg';
import ActiviteSales from './ActiviteSales';
import ActiviteTLM from './ActiviteTLM';
import { getPeriodRange } from '../../../components/ui/PeriodPicker';
import { activiteSalesData, activiteTLMData } from '../../../data/mockData';
import { useSalesData } from '../../../hooks/useSalesData';
import { usePeriod } from '../../../contexts/PeriodContext';
import layoutStyles from '../../../components/layout/DashboardLayout.module.css';
import { LoaderMark } from '../../../components/ui/Loader';

export default function CommercialActivite() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'sales';
  const isSales = tab === 'sales';

  const [collab, setCollab] = useState('Tous');
  const { periodKey, customFrom, customTo, compareActive, compareRange } = usePeriod();

  const salesData = useSalesData();
  const [compareResult, setCompareResult] = useState(null);

  const collabRef = useRef(collab);
  collabRef.current = collab;

  // Auto-fetch quand la période principale change
  useEffect(() => {
    if (!isSales) return;
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
    salesData.fetchData(from, to, collabRef.current);
  }, [periodKey, customFrom, customTo, isSales]); // eslint-disable-line

  // Recalcul comparaison depuis le cache
  useEffect(() => {
    if (!compareActive || !compareRange || !salesData.hasCachedRows) {
      setCompareResult(null);
      return;
    }
    setCompareResult(salesData.computeFromCache(compareRange.from, compareRange.to, collabRef.current));
  }, [compareActive, compareRange, salesData.hasCachedRows]); // eslint-disable-line

  useEffect(() => { setCollab('Tous'); }, [tab]);

  function handleCollabChange(e) {
    const v = e.target.value;
    setCollab(v);
    if (isSales) {
      if (salesData.hasData) salesData.recomputeCollab(v);
      else {
        const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
        salesData.fetchData(from, to, v);
      }
    }
  }

  const collabs = isSales
    ? (salesData.result?.collabs || activiteSalesData.tranchesHoraires.cols)
    : activiteTLMData.tranchesHoraires.cols;

  const extraFilters = (
    <>
      <div className={layoutStyles.collabPill}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <select
          className={layoutStyles.collabSelect}
          value={collab}
          onChange={handleCollabChange}
          aria-label="Filtrer par collaborateur"
        >
          {collabs.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isSales && salesData.loading && (
        <div className={layoutStyles.loadingPill}>
          <LoaderMark size={13} />
          Chargement…
        </div>
      )}
    </>
  );

  const activeFilters = collab !== 'Tous' ? [collab] : [];

  return (
    <DashboardLayout dashboardId="commercial-activite" dashboardName="Activité" dashboardNameEmphasis="commerciale" extraFilters={extraFilters} activeFilters={activeFilters} heroBgSrc={heroActivite} heroBgPosition="center 65%">
      {isSales && <ActiviteSales selectedCollab={collab} salesData={salesData} compareResult={compareResult} />}
      {tab === 'tlm' && <ActiviteTLM selectedCollab={collab} />}
    </DashboardLayout>
  );
}
