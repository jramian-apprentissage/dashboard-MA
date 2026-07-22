import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { DASHBOARD_TABS } from '../../../data/dashboardTabs';
import Synthese from './Synthese';
import FocusCommercial from './FocusCommercial';
import FocusClient from './FocusClient';

export default function CommercialRC() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'synthese';
  const tabLabel = DASHBOARD_TABS['commercial-rc'].find(t => t.id === tab)?.label;

  return (
    // Commercial et Relation Client sont deux pôles à parts égales : même
    // police/couleur pour les deux (pas de mise en emphase de l'un sur l'autre).
    <DashboardLayout dashboardId="commercial-rc" dashboardName="Commercial & Relation Client" tabLabel={tabLabel}>
      {tab === 'synthese'           && <Synthese />}
      {tab === 'focus-commercial'   && <FocusCommercial />}
      {tab === 'focus-client'       && <FocusClient />}
    </DashboardLayout>
  );
}
