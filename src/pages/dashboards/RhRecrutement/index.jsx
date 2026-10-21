import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import heroPipeline from '../../../assets/hero-pipeline.webp';
import { DASHBOARD_TABS } from '../../../data/dashboardTabs';
import Besoins from './Besoins';
import Pipeline from './Pipeline';
import Performance from './Performance';

/* Second dashboard de la commande RH de Clémence, après le Suivi des
 * effectifs. Trois vues, onze indicateurs commandés, plus la transformation
 * des profils demandée en relecture.
 *
 * LA PHOTO EST CELLE QUI SERVAIT AU SUIVI DES EFFECTIFS, déplacée ici le
 * 21/10 : le Suivi des effectifs a reçu une nouvelle image le même jour.
 *
 * LA TEINTE EST L'ABRICOT #E0B99E, relevée dans la maquette (planche 18) et
 * pas la glycine du dashboard voisin. Les deux
 * dashboards RH se suivent dans le menu et partagent leurs filtres : sans
 * couleur propre, on ne sait plus lequel on regarde après un changement
 * d'onglet. Voir .heroAbricot dans DashboardLayout.module.css.
 *
 * LA SOURCE EST LE CLASSEUR FCC, onglet « Suivi de commande RH Q2 », et elle
 * n'est PAS ENCORE INGÉRÉE : aucune table, aucune route. L'inventaire du
 * 21/10 a montré que six indicateurs sur onze reposent sur des colonnes
 * remplies à 97 % ou plus, et que les cinq autres tombent entre 37 et 53 %
 * dès qu'on croise deux colonnes. Le détail est écrit dans chaque vue. */
const subTabs = DASHBOARD_TABS['rh-recrutement'];

export default function RhRecrutement() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab');
  const tab = subTabs.some(t => t.id === tabParam) ? tabParam : subTabs[0].id;

  // Garde l'URL synchronisée avec l'onglet réellement affiché, même motif que
  // les autres dashboards : couvre un ?tab= absent ou invalide.
  useEffect(() => {
    if (tabParam !== tab) navigate(`/rh-recrutement?tab=${tab}`, { replace: true });
  }, [tabParam, tab]); // eslint-disable-line

  return (
    <DashboardLayout
      dashboardId="rh-recrutement"
      dashboardName="Recrutement et"
      dashboardNameEmphasis="pipeline"
      subTabs={subTabs}
      activeSubTab={tab}
      onSubTabChange={id => navigate(`/rh-recrutement?tab=${id}`)}
      heroBgSrc={heroPipeline}
      heroBgPosition="center right"
    >
      {tab === 'besoins'     && <Besoins />}
      {tab === 'pipeline'    && <Pipeline />}
      {tab === 'performance' && <Performance />}
    </DashboardLayout>
  );
}
