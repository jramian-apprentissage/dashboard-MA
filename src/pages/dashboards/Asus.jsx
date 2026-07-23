import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import heroActivite from '../../assets/hero-activite.svg';
import ActiviteASUS from './CommercialActivite/ActiviteASUS';
import { getPeriodRange } from '../../components/ui/PeriodPicker';
import { useAsusData } from '../../hooks/useAsusData';
import { usePeriod } from '../../contexts/PeriodContext';
import layoutStyles from '../../components/layout/DashboardLayout.module.css';
import { LoaderMark } from '../../components/ui/Loader';

// Page unique (pas de sous-onglets) — anciennement un onglet à l'intérieur
// d'Activité commerciale, promu en dashboard indépendant pour un accès plus
// direct (lien de nav propre, plus besoin de passer par Activité commerciale).
export default function Asus() {
  const [collab, setCollab] = useState('Tous');
  const { periodKey, customFrom, customTo } = usePeriod();
  const asusData = useAsusData();

  const collabRef = useRef(collab);
  collabRef.current = collab;

  useEffect(() => {
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
    asusData.fetchData(from, to, collabRef.current);
  }, [periodKey, customFrom, customTo]); // eslint-disable-line

  function handleCollabChange(e) {
    const v = e.target.value;
    setCollab(v);
    if (asusData.hasData) asusData.recomputeCollab(v);
    else {
      const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
      asusData.fetchData(from, to, v);
    }
  }

  const collabs = asusData.result?.collabs || ['Tous'];

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

      {asusData.loading && (
        <div className={layoutStyles.loadingPill}>
          <LoaderMark size={13} />
          Chargement…
        </div>
      )}
    </>
  );

  const activeFilters = collab !== 'Tous' ? [collab] : [];

  return (
    <DashboardLayout
      dashboardId="asus"
      dashboardName="ASUS"
      extraFilters={extraFilters}
      activeFilters={activeFilters}
      heroBgSrc={heroActivite}
      heroBgPosition="center 65%"
    >
      <ActiviteASUS selectedCollab={collab} asusData={asusData} />
    </DashboardLayout>
  );
}
