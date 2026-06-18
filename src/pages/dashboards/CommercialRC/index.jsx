import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Synthese from './Synthese';
import FocusCommercial from './FocusCommercial';
import FocusClient from './FocusClient';

export default function CommercialRC() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'synthese';

  return (
    <DashboardLayout dashboardName="Commercial & Relation Client">
      {tab === 'synthese'           && <Synthese />}
      {tab === 'focus-commercial'   && <FocusCommercial />}
      {tab === 'focus-client'       && <FocusClient />}
    </DashboardLayout>
  );
}
