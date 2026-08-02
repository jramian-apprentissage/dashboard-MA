import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import heroActivite from '../../../assets/hero-activite.svg';
import ActiviteSales from './ActiviteSales';
import ActiviteTLM from './ActiviteTLM';
import CloudTalkExtract from './CloudTalkExtract';
import { getPeriodRange } from '../../../components/ui/PeriodPicker';
import { DASHBOARD_TABS } from '../../../data/dashboardTabs';
import { useSalesData } from '../../../hooks/useSalesData';
import { usePeriod } from '../../../contexts/PeriodContext';
import layoutStyles from '../../../components/layout/DashboardLayout.module.css';
import { LoaderMark } from '../../../components/ui/Loader';

const subTabs = DASHBOARD_TABS['commercial-activite'];

export default function CommercialActivite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab');
  const tab = subTabs.some(t => t.id === tabParam) ? tabParam : subTabs[0].id;
  const isSales = tab === 'sales';

  const [collab, setCollab] = useState('Tous');
  const [tlmCollabs, setTlmCollabs] = useState(['Tous']);
  const [extractOpen, setExtractOpen] = useState(false);
  const { periodKey, customFrom, customTo, compareActive, compareRange } = usePeriod();

  const salesData = useSalesData();
  const [compareResult, setCompareResult] = useState(null);
  const [compareRdvResult, setCompareRdvResult] = useState(null);

  const collabRef = useRef(collab);
  collabRef.current = collab;

  // Garde l'URL synchronisée avec le tab réellement affiché — couvre le cas
  // d'un ?tab= absent ou invalide.
  useEffect(() => {
    if (tabParam !== tab) navigate(`/commercial-activite?tab=${tab}`, { replace: true });
  }, [tabParam, tab]); // eslint-disable-line

  // Auto-fetch quand la période principale change
  useEffect(() => {
    if (!isSales) return;
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
    salesData.fetchData(from, to, collabRef.current);
  }, [periodKey, customFrom, customTo, isSales]); // eslint-disable-line

  // Comparaison de période — fetch dédié et borné à la plage comparée (voir
  // fetchCompareData), retéclenché aussi sur changement de collaborateur
  // (auparavant lu depuis une ref sans être dans les deps, donc jamais
  // recalculé si on changeait de collaborateur pendant que "Comparer" était
  // actif).
  useEffect(() => {
    if (!isSales || !compareActive || !compareRange) {
      setCompareResult(null);
      setCompareRdvResult(null);
      return;
    }
    let cancelled = false;
    salesData.fetchCompareData(compareRange.from, compareRange.to, collab).then(({ result, rdv }) => {
      if (cancelled) return;
      setCompareResult(result);
      setCompareRdvResult(rdv);
    });
    return () => { cancelled = true; };
  }, [isSales, compareActive, compareRange, collab]); // eslint-disable-line

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

  // TLM : liste des agents CloudTalk réels, remontée par ActiviteTLM une fois
  // /cloudtalk/agents-summary chargé (voir onCollabsChange).
  const collabs = isSales ? (salesData.result?.collabs || ['Tous']) : tlmCollabs;

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

      {/* Uniquement le tout premier chargement — une fois les données là,
          un rechargement suite à un changement de filtre affiche son
          spinner dans le bandeau de fraîcheur du corps de page plutôt
          qu'ici (voir ActiviteSales.jsx / ActiviteTLM.jsx). */}
      {isSales && salesData.loading && !salesData.hasData && (
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
        dashboardName="Activités"
        dashboardNameEmphasis="commerciales"
        subTabs={subTabs}
        activeSubTab={tab}
        onSubTabChange={id => navigate(`/commercial-activite?tab=${id}`)}
        extraFilters={extraFilters}
        activeFilters={activeFilters}
        heroBgSrc={heroActivite}
        heroBgPosition="center 65%"
        onExtraire={tab === 'tlm' ? () => setExtractOpen(true) : undefined}
      >
        {isSales && <ActiviteSales selectedCollab={collab} salesData={salesData} compareResult={compareResult} compareRdvResult={compareRdvResult} />}
        {tab === 'tlm' && <ActiviteTLM selectedCollab={collab} onCollabsChange={setTlmCollabs} />}
      </DashboardLayout>

      {extractOpen && <CloudTalkExtract onClose={() => setExtractOpen(false)} />}
    </>
  );
}
