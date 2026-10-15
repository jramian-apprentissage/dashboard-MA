import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { DASHBOARD_TABS } from '../../../data/dashboardTabs';
import Effectifs from './Effectifs';
import Mouvements from './Mouvements';
import Turnover from './Turnover';

const subTabs = DASHBOARD_TABS['rh-effectifs'];

export default function RhEffectifs() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab');
  const tab = subTabs.some(t => t.id === tabParam) ? tabParam : subTabs[0].id;

  // Garde l'URL synchronisée avec l'onglet réellement affiché, même motif que
  // les deux autres dashboards : couvre un ?tab= absent ou invalide.
  useEffect(() => {
    if (tabParam !== tab) navigate(`/rh-effectifs?tab=${tab}`, { replace: true });
  }, [tabParam, tab]); // eslint-disable-line

  return (
    <DashboardLayout
      dashboardId="rh-effectifs"
      dashboardName="Suivi des"
      dashboardNameEmphasis="effectifs"
      subTabs={subTabs}
      activeSubTab={tab}
      onSubTabChange={id => navigate(`/rh-effectifs?tab=${id}`)}
    >
      {tab === 'effectifs'  && <Effectifs />}
      {tab === 'mouvements' && <Mouvements />}
      {tab === 'turnover'   && <Turnover />}
    </DashboardLayout>
  );
}
