import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import ActiviteSales from './ActiviteSales';
import ActiviteTLM from './ActiviteTLM';

export default function CommercialActivite() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'sales';

  return (
    <DashboardLayout dashboardName="Commercial & Activité">
      {tab === 'sales' && <ActiviteSales />}
      {tab === 'tlm'   && <ActiviteTLM />}
    </DashboardLayout>
  );
}
