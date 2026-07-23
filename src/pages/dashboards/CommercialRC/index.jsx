import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { DASHBOARD_TABS } from '../../../data/dashboardTabs';
import Synthese from './Synthese';
import FocusCommercial from './FocusCommercial';
import FocusClient from './FocusClient';

export default function CommercialRC() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'synthese';

  return (
    // Commercial et Relation Client sont deux pôles à parts égales : même
    // police/couleur pour les deux (pas de mise en emphase de l'un sur l'autre).
    <DashboardLayout
      dashboardName="Commercial & Relation Client"
      subTabs={DASHBOARD_TABS['commercial-rc']}
      activeSubTab={tab}
      onSubTabChange={id => navigate(`/commercial-rc?tab=${id}`)}
    >
      {tab === 'synthese'           && <Synthese />}
      {tab === 'focus-commercial'   && <FocusCommercial />}
      {tab === 'focus-client'       && <FocusClient />}
    </DashboardLayout>
  );
}
