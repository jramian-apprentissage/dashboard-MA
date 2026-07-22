import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import heroActivite from '../../../assets/hero-activite.svg';
import ActiviteSales from './ActiviteSales';
import ActiviteASUS from './ActiviteASUS';
import ActiviteTLM from './ActiviteTLM';
import CloudTalkExtract from './CloudTalkExtract';
import { getPeriodRange } from '../../../components/ui/PeriodPicker';
import { DASHBOARD_TABS } from '../../../data/dashboardTabs';
import { useSalesData } from '../../../hooks/useSalesData';
import { useAsusData } from '../../../hooks/useAsusData';
import { usePeriod } from '../../../contexts/PeriodContext';
import { useAuth } from '../../../contexts/AuthContext';
import layoutStyles from '../../../components/layout/DashboardLayout.module.css';
import { LoaderMark } from '../../../components/ui/Loader';

export default function CommercialActivite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasAccessToDashboard } = useAuth();
  const tabParam = searchParams.get('tab') || 'sales';
  // L'onglet ASUS suit son propre toggle — un accès direct par URL sans
  // autorisation retombe sur Activité Sales plutôt que d'exposer la page.
  const asusAllowed = hasAccessToDashboard(user, 'commercial-activite-asus');
  const tab = tabParam === 'asus' && !asusAllowed ? 'sales' : tabParam;
  const isSales = tab === 'sales';
  const isAsus  = tab === 'asus';
  const tabLabel = DASHBOARD_TABS['commercial-activite'].find(t => t.id === tab)?.label;

  const [collab, setCollab] = useState('Tous');
  const [extractOpen, setExtractOpen] = useState(false);
  const { periodKey, customFrom, customTo, compareActive, compareRange } = usePeriod();

  const salesData = useSalesData();
  const asusData  = useAsusData();
  const [compareResult, setCompareResult] = useState(null);

  const collabRef = useRef(collab);
  collabRef.current = collab;

  useEffect(() => {
    if (tabParam === 'asus' && !asusAllowed) navigate('/commercial-activite?tab=sales', { replace: true });
  }, [tabParam, asusAllowed]); // eslint-disable-line

  // Auto-fetch quand la période principale change
  useEffect(() => {
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
    if (isSales) salesData.fetchData(from, to, collabRef.current);
    if (isAsus)  asusData.fetchData(from, to, collabRef.current);
  }, [periodKey, customFrom, customTo, isSales, isAsus]); // eslint-disable-line

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
    if (isAsus) {
      if (asusData.hasData) asusData.recomputeCollab(v);
      else {
        const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
        asusData.fetchData(from, to, v);
      }
    }
  }

  // TLM n'a aucune source réelle (KAVKOM en stand-by) : pas de filtre collab.
  const collabs = isSales ? (salesData.result?.collabs || ['Tous'])
    : isAsus ? (asusData.result?.collabs || ['Tous'])
    : ['Tous'];

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

      {((isSales && salesData.loading) || (isAsus && asusData.loading)) && (
        <div className={layoutStyles.loadingPill}>
          <LoaderMark size={13} />
          Chargement…
        </div>
      )}
    </>
  );

  const activeFilters = collab !== 'Tous' ? [collab] : [];

  return (
    <>
      <DashboardLayout
        dashboardId="commercial-activite"
        dashboardName="Activité"
        dashboardNameEmphasis="commerciale"
        tabLabel={tabLabel}
        extraFilters={extraFilters}
        activeFilters={activeFilters}
        heroBgSrc={heroActivite}
        heroBgPosition="center 65%"
        onExtraire={() => setExtractOpen(true)}
      >
        {isSales && <ActiviteSales selectedCollab={collab} salesData={salesData} compareResult={compareResult} />}
        {isAsus && <ActiviteASUS selectedCollab={collab} asusData={asusData} />}
        {tab === 'tlm' && <ActiviteTLM selectedCollab={collab} />}
      </DashboardLayout>

      {extractOpen && <CloudTalkExtract onClose={() => setExtractOpen(false)} />}
    </>
  );
}
