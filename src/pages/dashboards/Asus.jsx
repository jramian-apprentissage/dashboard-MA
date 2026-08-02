import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import heroAsus from '../../assets/hero-asus.jpg';
import maLogo from '../../assets/logo/logo-full-myrtille.svg';
import asusLogo from '../../assets/asus-logo.svg';
import ActiviteASUS from './CommercialActivite/ActiviteASUS';
import { getPeriodRange } from '../../components/ui/PeriodPicker';
import { useAsusData } from '../../hooks/useAsusData';
import { computeAsusData } from '../../services/sheetsParser';
import { usePeriod } from '../../contexts/PeriodContext';
import CollabPicker from '../../components/ui/CollabPicker';
import { exportDashboardPdf } from '../../utils/exportPdf';

const PERIOD_LABELS = {
  today: "d'aujourd'hui", yesterday: "d'hier", month: 'du mois en cours',
  'last-month': 'du mois précédent', week: 'de la semaine en cours',
  'last-week': 'de la semaine précédente', quarter: 'du trimestre en cours',
  'last-quarter': 'du trimestre précédent',
};

// Page unique (pas de sous-onglets) — anciennement un onglet à l'intérieur
// d'Activité commerciale, promu en dashboard indépendant pour un accès plus
// direct (lien de nav propre, plus besoin de passer par Activité commerciale).
export default function Asus() {
  const [collab, setCollab] = useState('Tous');
  const { periodKey, customFrom, customTo, compareActive, compareRange, comparePeriodKey } = usePeriod();
  const asusData = useAsusData();
  const [compareResult, setCompareResult] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const contentRef = useRef(null);

  const collabRef = useRef(collab);
  collabRef.current = collab;

  async function handleExport() {
    setExportLoading(true);
    try {
      const periodLabel = `${PERIOD_LABELS[periodKey] || 'de la période sélectionnée'}${compareActive ? ` · vs ${comparePeriodKey === 'previous-year' ? "l'année précédente" : 'la période précédente'}` : ''}`;
      await exportDashboardPdf({
        contentEl: contentRef.current,
        fileName: `Dashboard-Performance-Agent-Asus-${new Date().toISOString().slice(0, 10)}.pdf`,
        title: 'Dashboard Performance Agent - Asus',
        periodLabel,
        maLogoSrc: maLogo,
        clientLogoSrc: asusLogo,
      });
    } catch (e) {
      alert(`Échec de l'export PDF : ${e.message}`);
    } finally {
      setExportLoading(false);
    }
  }

  useEffect(() => {
    const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
    asusData.fetchData(from, to, collabRef.current);
  }, [periodKey, customFrom, customTo]); // eslint-disable-line

  // Recalcul comparaison depuis le cache (même pattern qu'Activité commerciale)
  useEffect(() => {
    if (!compareActive || !compareRange || !asusData.hasCachedRows) {
      setCompareResult(null);
      return;
    }
    setCompareResult(computeAsusData(
      asusData.rows,
      new Date(compareRange.from),
      new Date(compareRange.to),
      collabRef.current,
    ));
  }, [compareActive, compareRange, asusData.hasCachedRows]); // eslint-disable-line

  function handleCollabChange(v) {
    setCollab(v);
    if (asusData.hasData) asusData.recomputeCollab(v);
    else {
      const { from, to } = getPeriodRange(periodKey, customFrom, customTo);
      asusData.fetchData(from, to, v);
    }
  }

  const collabs = asusData.result?.collabs || ['Tous'];

  const extraFilters = (
    <CollabPicker value={collab} options={collabs} onChange={handleCollabChange} theme="asus" />
  );

  const activeFilters = collab !== 'Tous' ? [collab] : [];

  return (
    <DashboardLayout
      dashboardId="asus"
      dashboardName="Dashboard Performance Agent - Asus"
      clientFacingSubtitle
      extraFilters={extraFilters}
      activeFilters={activeFilters}
      heroBgSrc={heroAsus}
      heroBgPosition="center 30%"
      onExtraire={handleExport}
      extraireLoading={exportLoading}
      contentRef={contentRef}
    >
      <ActiviteASUS selectedCollab={collab} asusData={asusData} compareResult={compareResult} />
    </DashboardLayout>
  );
}
